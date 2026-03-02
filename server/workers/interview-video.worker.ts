import { Worker } from 'bullmq';
import IORedis from 'ioredis';
import pool from '../database/connection.js';
import { generateInterviewFeedback } from '../jobs/interview-feedback.js';
import type { ProcessInterviewVideoJobData } from '../queues/interview-video.queue.js';

function getRedisConnection() {
  const url = process.env.REDIS_URL;
  if (url && url.trim().length > 0) {
    return new IORedis(url, {
      maxRetriesPerRequest: null,
    });
  }

  return new IORedis({
    host: process.env.REDIS_HOST || '127.0.0.1' || '172.17.252.184',
    port: process.env.REDIS_PORT ? Number(process.env.REDIS_PORT) : 6379,
    password: process.env.REDIS_PASSWORD || undefined,
    maxRetriesPerRequest: null,
  });
}

async function getQuestionWeight(questionId?: number): Promise<number> {
  if (!questionId) return 1;

  // Try custom questions first
  let weightResult = await pool.query(`SELECT question_weight FROM ai_interview_custom_questions WHERE id = $1`, [
    questionId,
  ]);

  // If not found, try generated questions
  if (weightResult.rows.length === 0) {
    weightResult = await pool.query(`SELECT question_weight FROM ai_generated_questions WHERE id = $1`, [questionId]);
  }

  if (weightResult.rows.length > 0) {
    return weightResult.rows[0].question_weight || 1;
  }

  return 1;
}

async function ensureReport(interviewId: number, inviteId: number): Promise<number> {
  const reportResult = await pool.query(
    `SELECT id FROM ai_interview_reports
     WHERE interview_id = $1 AND ai_interview_invite_id = $2 AND discarded_at IS NULL
     ORDER BY created_at DESC
     LIMIT 1`,
    [interviewId, inviteId]
  );

  if (reportResult.rows.length > 0) return reportResult.rows[0].id;

  const createResult = await pool.query(
    `INSERT INTO ai_interview_reports (interview_id, ai_interview_invite_id, interview_start_at, created_at, updated_at)
     VALUES ($1, $2, NOW(), NOW(), NOW())
     RETURNING id`,
    [interviewId, inviteId]
  );

  return createResult.rows[0].id;
}

async function insertOrUpdateReportDetail(params: {
  reportId: number;
  inviteId: number;
  question: string;
  transcriptText: string;
  videoUrl: string;
  queType: string;
  questionWeight: number;
}) {
  // Prevent duplicates:
  // The frontend saves transcript via `/answer` and uploads video via `/upload_video`.
  // We want ONE row per question per invite.
  //
  // Strategy:
  // - Find the latest row for (inviteId + question text)
  // - If exists, update it with video_url/transcript/weight/type
  // - Else, insert a new row
  const existing = await pool.query(
    `SELECT id
     FROM ai_interview_report_details
     WHERE ai_interview_invite_id = $1
       AND LOWER(TRIM(COALESCE(question, ''))) = LOWER(TRIM($2))
     ORDER BY id DESC
     LIMIT 1`,
    [params.inviteId, params.question || '']
  );

  if (existing.rows.length > 0) {
    await pool.query(
      `UPDATE ai_interview_report_details
       SET transcript_text = COALESCE(NULLIF($1, ''), transcript_text),
           video_url = COALESCE(NULLIF($2, ''), video_url),
           que_type = COALESCE(NULLIF($3, ''), que_type),
           question_weight = COALESCE($4, question_weight),
           updated_at = NOW()
       WHERE id = $5`,
      [
        params.transcriptText || '',
        params.videoUrl || '',
        params.queType || 'general',
        params.questionWeight || 1,
        existing.rows[0].id,
      ]
    );
    return existing.rows[0].id as number;
  }

  const inserted = await pool.query(
    `INSERT INTO ai_interview_report_details
     (ai_interview_report_id, ai_interview_invite_id, question, transcript_text, video_url, que_type, question_weight, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
     RETURNING id`,
    [
      params.reportId,
      params.inviteId,
      params.question || '',
      params.transcriptText || '',
      params.videoUrl,
      params.queType || 'general',
      params.questionWeight || 1,
    ]
  );

  return inserted.rows[0].id as number;
}

async function markInviteCompleted(inviteId: number) {
  await pool.query(`UPDATE ai_interview_invites SET status = $1, updated_at = NOW() WHERE id = $2`, [
    'Completed',
    inviteId,
  ]);
}

async function markInvitePartiallyCompleted(inviteId: number) {
  await pool.query(
    `UPDATE ai_interview_invites
     SET status = CASE
       WHEN LOWER(status) IN ('completed','complete') THEN status
       ELSE 'Partially Completed'
     END,
     updated_at = NOW()
     WHERE id = $1`,
    [inviteId]
  );
}

async function markReportEnded(reportId: number) {
  // Some DBs don't have `interview_end_at` column. Keep worker compatible by only touching updated_at.
  await pool.query(`UPDATE ai_interview_reports SET updated_at = NOW() WHERE id = $1`, [reportId]);
}

export function startInterviewVideoWorker() {
  const connection = getRedisConnection();

  const worker = new Worker<ProcessInterviewVideoJobData>(
    'interview-video',
    async job => {
      const data = job.data;

      const interviewId = Number(data.interviewId);
      const inviteId = Number(data.inviteId);

      if (!interviewId || !inviteId) {
        throw new Error('Missing interviewId/inviteId');
      }

      const reportId = await ensureReport(interviewId, inviteId);

      // Match Rails behavior:
      // - Always store a report detail row with video_url
      // - Always store transcript_text (we already have it from frontend; Rails transcribes server-side)
      // - Always mark invite as Partially Completed on any progress
      // - On final question, mark Completed and generate AI feedback
      const questionWeight = await getQuestionWeight(data.questionId);

      await insertOrUpdateReportDetail({
        reportId,
        inviteId,
        question: data.question || '',
        transcriptText: data.transcript || '',
        videoUrl: data.videoPath, // now a FULL URL from the route
        queType: data.queType || 'general',
        questionWeight,
      });

      // Any saved progress should reflect partial completion (unless already completed)
      await markInvitePartiallyCompleted(inviteId);

      // If this was the final question upload, mark completed.
      if (data.isCompleted) {
        await markReportEnded(reportId);
        await markInviteCompleted(inviteId);

        // Generate scoring + feedback (same behavior as submit_report)
        try {
          await generateInterviewFeedback(reportId);
        } catch (e) {
          console.warn('Worker: failed to generate feedback:', e);
        }
      }

      return { reportId };
    },
    {
      connection,
      concurrency: process.env.INTERVIEW_VIDEO_WORKER_CONCURRENCY
        ? Number(process.env.INTERVIEW_VIDEO_WORKER_CONCURRENCY)
        : 2,
    }
  );

  worker.on('completed', job => {
    console.log(`✅ interview-video job completed: ${job.id}`);
  });

  worker.on('failed', (job, err) => {
    console.error(`❌ interview-video job failed: ${job?.id}`, err);
  });

  console.log('🎧 Interview video worker started (queue: interview-video)');
  return worker;
}

// Allow running as a standalone process: `tsx server/workers/interview-video.worker.ts`
if (import.meta.url === `file://${process.argv[1]}`) {
  startInterviewVideoWorker();
}

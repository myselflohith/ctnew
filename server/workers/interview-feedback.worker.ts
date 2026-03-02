import { Worker } from 'bullmq';
import IORedis from 'ioredis';
import pool from '../database/connection.js';
import { generateInterviewFeedback } from '../jobs/interview-feedback.js';
import type { ScoreInterviewFeedbackJobData } from '../queues/interview-feedback.queue.js';

function getRedisConnection() {
  const url = process.env.REDIS_URL;
  if (url && url.trim().length > 0) {
    return new IORedis(url, {
      maxRetriesPerRequest: null,
    });
  }

  return new IORedis({
    host: (process.env.REDIS_HOST || '127.0.0.1').toString(),
    port: process.env.REDIS_PORT ? Number(process.env.REDIS_PORT) : 6379,
    password: process.env.REDIS_PASSWORD ? process.env.REDIS_PASSWORD.toString() : undefined,
    maxRetriesPerRequest: null,
  });
}

async function shouldScore(reportId: number, inviteId: number, force = false) {
  const res = await pool.query(
    `
    SELECT
      air.id,
      air.ai_feedback,
      air.rating,
      air.score,
      aii.status as invite_status,
      (
        SELECT COUNT(*)::int
        FROM ai_interview_report_details aird
        WHERE aird.ai_interview_report_id = air.id
          AND LENGTH(TRIM(COALESCE(aird.transcript_text, ''))) > 0
      ) as details_count
    FROM ai_interview_reports air
    INNER JOIN ai_interview_invites aii ON aii.id = air.ai_interview_invite_id
    WHERE air.id = $1
      AND air.ai_interview_invite_id = $2
      AND air.discarded_at IS NULL
    LIMIT 1
    `,
    [reportId, inviteId]
  );

  if (res.rows.length === 0) return { ok: false, reason: 'report_not_found' };

  const row = res.rows[0];

  // DB fields:
  // - ai_interview_reports.rating => overall rating (e.g. Great/Average/Poor)
  // - ai_interview_reports.score  => JSON/text payload (we store final_score JSON)
  // - ai_interview_reports.ai_feedback => full feedback JSON payload
  //
  // For partial interviews, we still want to (re)score when:
  //  - force=true (end/exit), OR
  //  - rating/score are missing (previous run may have stored only ai_feedback or only rating).
  const alreadyScored = !!row.ai_feedback && !!row.rating && !!row.score;
  if (alreadyScored && !force) return { ok: false, reason: 'already_scored' };

  const detailsCount = Number(row.details_count || 0);
  if (detailsCount <= 0) return { ok: false, reason: 'no_details' };

  const status = (row.invite_status || '').toString();
  if (!['Completed', 'Partially Completed', 'In Progress'].includes(status)) {
    return { ok: false, reason: `status_${status}` };
  }

  return { ok: true as const, reason: 'ok' };
}

export function startInterviewFeedbackWorker() {
  const connection = getRedisConnection();

  const worker = new Worker<ScoreInterviewFeedbackJobData>(
    'interview-feedback',
    async job => {
      const { reportId, inviteId, force } = job.data as any;

      if (!reportId || !inviteId) throw new Error('Missing reportId/inviteId');

      const check = await shouldScore(Number(reportId), Number(inviteId), !!force);
      if (!check.ok) {
        console.log(`⏭️ interview-feedback: skip report ${reportId} (${check.reason})`);
        return { skipped: true, reason: check.reason };
      }

      try {
        // generateInterviewFeedback() will only score answered questions (non-empty transcript_text).
        // After scoring, ensure the invite status is at least "Partially Completed" so employer screens
        // can show overall_rating for partial exits.
        await generateInterviewFeedback(Number(reportId));

        try {
          await pool.query(
            `UPDATE ai_interview_invites
             SET status = CASE
               WHEN LOWER(status) IN ('completed','complete') THEN status
               ELSE 'Partially Completed'
             END,
             updated_at = NOW()
             WHERE id = $1`,
            [Number(inviteId)]
          );
        } catch (statusErr) {
          console.warn(`⚠️ interview-feedback: failed to normalize invite status for ${inviteId}`, statusErr);
        }

        return { scored: true, reportId };
      } catch (e) {
        console.warn(`⚠️ interview-feedback: scoring failed for report ${reportId}`, e);
        throw e;
      }
    },
    {
      connection,
      concurrency: process.env.INTERVIEW_FEEDBACK_WORKER_CONCURRENCY
        ? Number(process.env.INTERVIEW_FEEDBACK_WORKER_CONCURRENCY)
        : 2,
    }
  );

  worker.on('completed', job => {
    console.log(`✅ interview-feedback job completed: ${job.id}`);
  });

  worker.on('failed', (job, err) => {
    console.error(`❌ interview-feedback job failed: ${job?.id}`, err);
  });

  console.log('🧠 Interview feedback worker started (queue: interview-feedback)');
  return worker;
}

// Allow running as a standalone process: `tsx server/workers/interview-feedback.worker.ts`
if (import.meta.url === `file://${process.argv[1]}`) {
  startInterviewFeedbackWorker();
}

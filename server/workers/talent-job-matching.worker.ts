import { Worker } from 'bullmq';
import pool from '../database/connection.js';
import { getAvailableJobsForMatching } from '../services/job.service.js';
import {
  getResumeTextForUser,
  getDefaultResumeUrlForUser,
  callResumeMatchApi,
} from '../services/resume.service.js';
import type { TalentJobMatchingJobData } from '../queues/talent-job-matching.queue.js';

export async function query<T = any>(sql: string, params?: any[]): Promise<{ rows: T[] }> {
  const res = await pool.query(sql, params);
  return { rows: res.rows };
}

// ---- Redis connection options ----

function getRedisConnectionOptions(): {
  url?: string;
  host?: string;
  port?: number;
  password?: string;
  maxRetriesPerRequest: null;
} {
  const url = process.env.REDIS_URL;
  if (url && url.trim().length > 0) {
    return { url: url.trim(), maxRetriesPerRequest: null };
  }
  return {
    host: process.env.REDIS_HOST || '127.0.0.1',
    port: process.env.REDIS_PORT ? Number(process.env.REDIS_PORT) : 6379,
    password: process.env.REDIS_PASSWORD || undefined,
    maxRetriesPerRequest: null,
  };
}

// ---- Talent Job Matching Worker ----

export function startTalentJobMatchingWorker() {
  const connection = getRedisConnectionOptions();

  const worker = new Worker<TalentJobMatchingJobData>(
    'talent-job-matching',
    async job => {
      const { userId } = job.data;
      const userIdStr = String(userId);
      console.log('[talent-job-matching] Job started', { userId, jobId: job.id });

      // Get person_id (nullable), fallback to userId
      const personIdResult = await query(
        'SELECT person_id FROM users WHERE id = $1',
        [userId]
      );
      const personId: number = (personIdResult.rows[0]?.person_id as number) ?? Number(userId);
      console.log('[talent-job-matching] person_id', {
        userId,
        personId,
        fromDb: personIdResult.rows[0]?.person_id != null,
      });

      // Fetch resume text
      let resumeText = '';
      try {
        resumeText = await getResumeTextForUser(userIdStr);
      } catch (e) {
        console.warn('[talent-job-matching] getResumeTextForUser failed:', (e as Error)?.message);
      }
      console.log('[talent-job-matching] resumeText length', resumeText.length);

      let resumeUrl = '';
      try {
        resumeUrl = await getDefaultResumeUrlForUser(userIdStr);
      } catch (e) {
        console.warn('[talent-job-matching] getDefaultResumeUrlForUser failed:', (e as Error)?.message);
      }
      if (resumeUrl) console.log('[talent-job-matching] resume URL', resumeUrl);

      const resumeServiceUrls = [{ id: userIdStr, url: resumeUrl, resume_text: resumeText }];

      // Fetch available jobs
      const jobs = await getAvailableJobsForMatching(userIdStr);
      console.log('[talent-job-matching] available jobs count', jobs.length);
      if (jobs.length === 0) return { computed: 0 };

      let computed = 0;

      for (const job of jobs) {
        try {
          const { results } = await callResumeMatchApi(
            job.description ?? '',
            job.add_notes ?? null,
            resumeServiceUrls
          );

          const first = results?.[0];
          const score = first != null && typeof first.score === 'number' ? first.score : null;
          const scoreSummary = first?.summary != null ? String(first.summary) : null;
          const detailResponse = first != null ? JSON.stringify(first) : null;

          await query(
            `INSERT INTO employer_auto_matched_candidates 
               (person_id, job_id, match_score, score_summary, detail_response, source_type, created_at, updated_at)
             VALUES ($1, $2, $3, $4, $5, 'talent', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
            [personId, job.id, score, scoreSummary, detailResponse]
          );

          computed += 1;
        } catch (e) {
          console.warn(`[talent-job-matching] match API failed for job ${job.id}:`, (e as Error)?.message);
          await query(
            `INSERT INTO employer_auto_matched_candidates
               (person_id, job_id, match_score, score_summary, detail_response, source_type, created_at, updated_at)
             VALUES ($1, $2, NULL, NULL, NULL, 'talent', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
            [personId, job.id]
          );
        }
      }

      console.log('[talent-job-matching] Job finished', { userId, personId, computed });
      return { computed };
    },
    {
      connection,
      concurrency: 1,
    }
  );

  worker.on('completed', job => {
    console.log(`✅ talent-job-matching job completed: ${job.id}`, job.returnvalue);
  });

  worker.on('failed', (job, err) => {
    console.error(`❌ talent-job-matching job failed: ${job?.id}`, err?.message ?? err, err?.stack);
  });

  console.log('📋 Talent job matching worker started (queue: talent-job-matching)');
  return worker;
}

// Run worker if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  startTalentJobMatchingWorker();
}
import '../polyfills/node18-web-file.js';

import { Worker } from 'bullmq';
import { query } from '../database/connection.js';
import type { JobAutopilotSourcingJobData } from '../queues/job-autopilot-sourcing.queue.js';
import { getMatchScoreData } from '../services/resume-match.service.js';
import { generateOrFetchJobTitleAlternatives } from '../services/job-title-alternative.service.js';
/**
 * NOTE (local dev mode):
 * We are sourcing from `users` (role=4 talent) instead of Elasticsearch + `people`.
 * This avoids the ES dependency and lets us test the autopilot flow end-to-end.
 */

function getRedisConnectionOptions(): { url?: string; host?: string; port?: number; password?: string; maxRetriesPerRequest: null } {
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


async function getJob(jobId: number): Promise<{
  id: number;
  name: string | null;
  skills: string | null;
  description: string | null;
  add_notes: string | null;
  location: string | null;
  work_type: string | null;
}> {
  const r = await query(
    `SELECT id, name, skills, description, add_notes, location, work_type
     FROM jobs
     WHERE id = $1 AND discarded_at IS NULL`,
    [jobId]
  );
  if (r.rows.length === 0) throw new Error(`Job not found: ${jobId}`);
  return r.rows[0];
}

async function ensureNoDuplicates(jobId: number): Promise<Set<number>> {
  const r = await query(
    `SELECT person_id
     FROM employer_auto_matched_candidates
     WHERE job_id = $1 AND source_type = 'job_post' AND discarded_at IS NULL`,
    [jobId]
  );
  return new Set<number>(r.rows.map((x: any) => Number(x.person_id)));
}

async function insertCandidates(params: {
  jobId: number;
  rows: Array<{ personId: number; score: number; summary: string; detail: any }>;
}) {
  if (params.rows.length === 0) return;

  // NOTE:
  // Our DB currently does NOT have a unique constraint that matches:
  //   ON CONFLICT (job_id, person_id, source_type)
  // because source_type is de-duped using an expression index on COALESCE(source_type,'').
  // So instead we do an idempotent "insert if not exists" per row.
  for (const r of params.rows) {
    await query(
      `INSERT INTO employer_auto_matched_candidates
       (person_id, job_id, match_score, score_summary, detail_response, source_type)
       SELECT $1, $2, $3, $4, $5, 'job_post'
       WHERE NOT EXISTS (
         SELECT 1
         FROM employer_auto_matched_candidates e
         WHERE e.job_id = $2
           AND e.person_id = $1
           AND COALESCE(e.source_type,'') = 'job_post'
           AND e.discarded_at IS NULL
       )`,
      [r.personId, params.jobId, Number(r.score), r.summary, JSON.stringify(r.detail ?? {})]
    );
  }
}

export function startJobAutopilotSourcingWorker() {
  const connection = getRedisConnectionOptions();

  const worker = new Worker<JobAutopilotSourcingJobData>(
    'job-autopilot-sourcing',
    async bullJob => {
      const jobId = Number(bullJob.data.jobId);
      if (!jobId) throw new Error('Missing jobId');

      const requestedTarget =
        bullJob.data.targetCount === undefined || bullJob.data.targetCount === null
          ? undefined
          : Math.max(1, Number(bullJob.data.targetCount));

      const job_info = await getJob(jobId);

      try {
        const workType = job_info.work_type || 'onsite';

        const job_description = `${job_info.description || ''}\n Job Location is ${job_info.location || ''} and Work Type is ${workType}`;

        const equivalent_titles = await generateOrFetchJobTitleAlternatives(job_info.name || '');
        const job_title = equivalent_titles.join(',');
        const job_location = job_info.location || '';
        const job_note = job_info.add_notes || ' ';
        const skills = job_info.skills || '';

        // No-op: previously we had a `people` sanity check. In users-sourcing mode, we don't touch `people`.

        const processPersonResult = await query(
          `SELECT person_id
           FROM employer_auto_matched_candidates
           WHERE job_id = $1 AND source_type = 'job_post' AND discarded_at IS NULL`,
          [jobId]
        );
        const process_person_id = processPersonResult.rows.map((r: any) => Number(r.person_id));

        // target_count behavior (goal): if we already have enough stored, stop.
        const defaultTarget = 100;
        const targetCount = requestedTarget ?? defaultTarget;
        if (process_person_id.length >= targetCount) {
          return { ok: true, skipped: true, reason: 'target_count_reached', targetCount };
        }

        const already_process_ids = (process_person_id.length > 0 ? process_person_id : [0]).join(',');

        // Candidate pool: users(role=4). We map users.id -> person_id in employer_auto_matched_candidates.
        // IMPORTANT: RESUME_MATCH_API expects resume text or URL. Users in this schema store resumes in `resumes` table.
        // For now we use the user's default resume file_path as a "url" (it may be a local path) and send blank resume_text if missing.
        const remaining = Math.max(0, targetCount - process_person_id.length);

        const candidatesListResult = await query(
          `SELECT u.id,
                  u.email,
                  r.file_path,
                  r.name
           FROM users u
           LEFT JOIN LATERAL (
             SELECT r1.*
             FROM resumes r1
             WHERE r1.user_id = u.id
             ORDER BY r1.is_default DESC, r1.created_at DESC
             LIMIT 1
           ) r ON true
           WHERE u.role = 4
             AND u.id <> ALL($1::int[])
           ORDER BY u.id DESC
           LIMIT $2`,
          [process_person_id, Math.min(100, Math.max(25, remaining))]
        );

        const candidates_list = candidatesListResult.rows as Array<{ id: number; email: string; file_path: string | null; name: string | null }>;

        console.log(`[autopilot] jobId=${jobId} targetCount=${targetCount} alreadyStored=${process_person_id.length} candidatesFetched=${candidates_list.length}`);
        if (candidates_list.length > 0) {
          console.log(`[autopilot] jobId=${jobId} candidateIds=${candidates_list.map(c => c.id).join(',')}`);

          for (let i = 0; i < candidates_list.length; i += 10) {
            // Stop if we've reached target_count while iterating.
            const currentCountResult = await query(
              `SELECT COUNT(*)::int AS c
               FROM employer_auto_matched_candidates
               WHERE job_id = $1 AND source_type = 'job_post' AND discarded_at IS NULL`,
              [jobId]
            );
            const currentCount = Number(currentCountResult.rows[0]?.c ?? 0);
            if (currentCount >= targetCount) break;

            const candidate_chunk = candidates_list.slice(i, i + 10);

            const promises = candidate_chunk.map(async candidate => {
              // Resume-match expects either:
              // - a publicly reachable URL (http/https) OR
              // - resume_text containing the resume content.
              //
              // Our `resumes.file_path` is a local filesystem path (uploads/resumes/...) which the external
              // resume-match service cannot fetch. In that case we must send resume_text.
              //
              // For now we degrade gracefully:
              // - If file_path looks like http(s), pass it as url.
              // - Otherwise, put a placeholder resume_text to avoid API 500s (real fix is to extract text).
              const fp = candidate.file_path ? String(candidate.file_path) : '';
              const looksLikeUrl = /^https?:\/\//i.test(fp);
              const resume_service_urls = [
                {
                  id: String(candidate.id),
                  url: looksLikeUrl ? fp : '',
                  // TODO: replace with real extracted text from the uploaded resume file.
                  // Without resume text, the resume-match service may 500.
                  resume_text: looksLikeUrl ? '' : 'Resume text not available in this environment.',
                },
              ];

              const resume_data = {
                job_description,
                notes: job_note || ' ',
                resume_service_urls,
              };

              const match_result: any = await getMatchScoreData(resume_data);
              const results = match_result?.results;
              console.log(
                `[autopilot] jobId=${jobId} candidateId=${candidate.id} matchResultsLen=${Array.isArray(results) ? results.length : 'non-array'}`
              );

              // In CTNEW "users(role=4)" sourcing mode, the match API's `results[].id` is not reliable
              // for identifying the candidate to insert. We already know which candidate we scored.
              // So we persist using `candidate.id` as `person_id` (until we switch to true ES `people` parity).
              const res0 = Array.isArray(results) && results.length > 0 ? results[0] : null;
              if (!res0) return [];

              const personId = Number(candidate.id);
              if (!personId) return [];
              if (process_person_id.includes(personId)) return [];

              return [
                {
                  personId,
                  score: Number(res0?.score ?? 0),
                  summary: String(res0?.summary ?? ''),
                  detail: res0,
                },
              ];
            });

            const results = await Promise.all(promises);
            let match_data = results.flat().filter(Boolean) as Array<{ personId: number; score: number; summary: string; detail: any }>;

            // Cap inserts to remaining slots.
            const afterCountResult = await query(
              `SELECT COUNT(*)::int AS c
               FROM employer_auto_matched_candidates
               WHERE job_id = $1 AND source_type = 'job_post' AND discarded_at IS NULL`,
              [jobId]
            );
            const afterCount = Number(afterCountResult.rows[0]?.c ?? 0);
            const remainingSlots = Math.max(0, targetCount - afterCount);
            if (remainingSlots <= 0) break;

            if (match_data.length > remainingSlots) {
              match_data = match_data.slice(0, remainingSlots);
            }

            console.log(`[autopilot] jobId=${jobId} chunkStart=${i} matchDataLen=${match_data.length}`);
            if (match_data.length > 0) {
              await insertCandidates({ jobId, rows: match_data });
              console.log(`[autopilot] jobId=${jobId} inserted=${match_data.length}`);
            }
          }
        }
      } catch (e: any) {
        // The previous log printed `[object Object]` for many fetch/network errors.
        // Log more safely so we can see the real cause (HTTP error body, stack, etc).
        const msg = e?.message || String(e);
        const stack = e?.stack ? String(e.stack) : '';
        const extra = e && typeof e === 'object' ? JSON.stringify(e, Object.getOwnPropertyNames(e)) : '';
        console.error(`Error processing ${jobId}: ${msg}`);
        if (stack) console.error(stack);
        if (extra && extra !== '{}') console.error(extra);
        // Make BullMQ mark the job as failed so we can see it in queue diagnostics.
        throw e;
      }

      return { ok: true };
    },
    {
      connection,
      concurrency: process.env.JOB_AUTOPILOT_WORKER_CONCURRENCY ? Number(process.env.JOB_AUTOPILOT_WORKER_CONCURRENCY) : 1,
    }
  );

  worker.on('completed', job => console.log(`✅ job-autopilot-sourcing completed: ${job.id}`));
  worker.on('failed', (job, err) => console.error(`❌ job-autopilot-sourcing failed: ${job?.id}`, err));

  console.log('🤖 Job autopilot sourcing worker started (queue: job-autopilot-sourcing)');
  return worker;
}


// Allow running as a standalone process: `tsx server/workers/job-autopilot-sourcing.worker.ts`
if (import.meta.url === `file://${process.argv[1]}`) {
  startJobAutopilotSourcingWorker();
}

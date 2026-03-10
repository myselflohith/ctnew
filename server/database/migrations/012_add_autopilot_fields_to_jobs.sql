-- Migration: Add autopilot fields to jobs table (ctnew)
-- Purpose:
--   - Support "Auto Source Candidates" feature on job post (mirrors ch-job-marketplace usage)
--   - Allow UI to show "Recommended Candidates" button based on jobs.autopilot_sourcing
--   - Store optional target_count cap for how many candidates to store
--
-- Notes:
--   - We use BOOLEAN + INTEGER in Postgres.
--   - Defaults chosen to be safe and backward compatible.

ALTER TABLE jobs
  ADD COLUMN IF NOT EXISTS autopilot_sourcing BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE jobs
  ADD COLUMN IF NOT EXISTS target_count INTEGER NULL;

CREATE INDEX IF NOT EXISTS idx_jobs_autopilot_sourcing ON jobs(autopilot_sourcing);

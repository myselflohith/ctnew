-- Migration: Add autopilot fields to jobs table (ctnew)
-- Purpose:
--   - Support "Auto Source Candidates" feature on job post (mirrors ch-job-marketplace usage)
--   - Allow UI to show "Recommended Candidates" button based on jobs.autopilot_sourcing
--   - Store optional target_count cap for how many candidates to store
--
-- Notes:
--   - We use BOOLEAN + INTEGER in Postgres.
--   - Defaults chosen to be safe and backward compatible.

-- NOTE:
-- Production schema already uses:
--   is_automation INTEGER NULL DEFAULT 0,
--   automation_limit INTEGER NULL DEFAULT 0,
--   last_automation_at TIMESTAMP NULL
-- So we should NOT add duplicate autopilot_sourcing / target_count columns.
--
-- Keep this migration as a no-op for environments that already have the automation columns.
-- (Safe to run multiple times.)
SELECT 1;

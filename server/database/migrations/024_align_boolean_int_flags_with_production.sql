-- Migration 024: Align boolean/int flags with production schema
-- Purpose:
--   In some environments these columns were created as BOOLEAN (old local)
--   while in production they are INTEGER 0/1. This migration normalizes
--   both schemas to use INTEGER so application queries using COALESCE(..., 0)
--   work consistently in all environments.
--
-- Changes:
--   - jobs.autopilot_sourcing : BOOLEAN/INTEGER -> INTEGER DEFAULT 0 (NULLABLE)
--   - employer_auto_matched_candidates.person_save_job    : BOOLEAN/INTEGER -> INTEGER DEFAULT 0 (NULLABLE)
--   - employer_auto_matched_candidates.person_reject_job  : BOOLEAN/INTEGER -> INTEGER DEFAULT 0 (NULLABLE)
--
-- Notes:
--   - We use USING casts so this is safe when the column is already INTEGER.
--   - We keep NULL allowed, with explicit 0/1 flags used by the app logic.

BEGIN;

-- Normalize jobs.autopilot_sourcing to INTEGER DEFAULT 0
ALTER TABLE jobs
  ALTER COLUMN autopilot_sourcing DROP DEFAULT,
  ALTER COLUMN autopilot_sourcing TYPE INTEGER USING autopilot_sourcing::integer,
  ALTER COLUMN autopilot_sourcing SET DEFAULT 0;

-- Normalize employer_auto_matched_candidates.person_save_job to INTEGER DEFAULT 0
ALTER TABLE employer_auto_matched_candidates
  ALTER COLUMN person_save_job DROP DEFAULT,
  ALTER COLUMN person_save_job TYPE INTEGER USING person_save_job::integer,
  ALTER COLUMN person_save_job SET DEFAULT 0;

-- Normalize employer_auto_matched_candidates.person_reject_job to INTEGER DEFAULT 0
ALTER TABLE employer_auto_matched_candidates
  ALTER COLUMN person_reject_job DROP DEFAULT,
  ALTER COLUMN person_reject_job TYPE INTEGER USING person_reject_job::integer,
  ALTER COLUMN person_reject_job SET DEFAULT 0;

COMMIT;

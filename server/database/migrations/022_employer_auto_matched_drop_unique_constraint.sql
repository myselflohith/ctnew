-- Migration: Drop unique constraint on employer_auto_matched_candidates (person_id, job_id, source_type)
-- Matches production schema where this combination is not unique.
-- Uses DROP CONSTRAINT IF EXISTS for idempotency.

ALTER TABLE employer_auto_matched_candidates
  DROP CONSTRAINT IF EXISTS employer_auto_matched_candidates_person_id_job_id_source_type_key;


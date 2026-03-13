-- Migration: Drop actual unique constraint on employer_auto_matched_candidates
-- Drops the unique on (person_id, job_id, source_type) named
-- employer_auto_matched_candidat_person_id_job_id_source_type_key, which
-- is causing duplicate key errors when inserting multiple matches.
-- Uses DROP CONSTRAINT IF EXISTS for idempotency.

ALTER TABLE employer_auto_matched_candidates
  DROP CONSTRAINT IF EXISTS employer_auto_matched_candidat_person_id_job_id_source_type_key;


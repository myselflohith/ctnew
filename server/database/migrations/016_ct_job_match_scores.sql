-- Job–resume match scores: same table/fields as Ruby (employer_auto_matched_candidates).
-- Talent-worker writes here with source_type = 'talent'; recommended jobs read by person_id.
-- Drop legacy table if it was created by a previous migration.
DROP TABLE IF EXISTS ct_job_match_scores;

CREATE TABLE IF NOT EXISTS employer_auto_matched_candidates (
  id SERIAL PRIMARY KEY,
  person_id INTEGER NOT NULL,
  job_id INTEGER NOT NULL,
  match_score DOUBLE PRECISION NULL,
  score_summary TEXT NULL,
  detail_response TEXT NULL,
  source_type VARCHAR(255) NOT NULL DEFAULT 'talent',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(person_id, job_id, source_type)
);

CREATE INDEX IF NOT EXISTS idx_employer_auto_matched_candidates_person_id ON employer_auto_matched_candidates(person_id);
CREATE INDEX IF NOT EXISTS idx_employer_auto_matched_candidates_job_id ON employer_auto_matched_candidates(job_id);
CREATE INDEX IF NOT EXISTS idx_employer_auto_matched_candidates_source_type ON employer_auto_matched_candidates(source_type);

-- Migration: Align ctnew autopilot storage with ch-job-marketplace fields
-- ch-job-marketplace uses table: employer_auto_matched_candidates
-- Fields used by JobPostMatchingWorker:
--   person_id, job_id, match_score, score_summary, detail_response, source_type
-- plus other workflow fields added later (interested, email_sent_at, etc.)

CREATE TABLE IF NOT EXISTS employer_auto_matched_candidates (
  id SERIAL PRIMARY KEY,
  person_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  job_id INTEGER NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  match_score DOUBLE PRECISION NULL,
  score_summary TEXT NULL,
  detail_response TEXT NULL,
  source_type VARCHAR NULL,
  interested INTEGER DEFAULT 0,
  email_sent_at TIMESTAMP NULL,
  discarded_at TIMESTAMP NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_emp_auto_match_job_id ON employer_auto_matched_candidates(job_id);
CREATE INDEX IF NOT EXISTS idx_emp_auto_match_person_id ON employer_auto_matched_candidates(person_id);
CREATE INDEX IF NOT EXISTS idx_emp_auto_match_source_type ON employer_auto_matched_candidates(source_type);
CREATE INDEX IF NOT EXISTS idx_emp_auto_match_discarded_at ON employer_auto_matched_candidates(discarded_at);

-- Prevent duplicate pairs per source_type
CREATE UNIQUE INDEX IF NOT EXISTS uq_emp_auto_match_job_person_source
  ON employer_auto_matched_candidates(job_id, person_id, COALESCE(source_type,''));

-- Trigger for updated_at
DROP TRIGGER IF EXISTS update_employer_auto_matched_candidates_updated_at ON employer_auto_matched_candidates;
CREATE TRIGGER update_employer_auto_matched_candidates_updated_at
  BEFORE UPDATE ON employer_auto_matched_candidates
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

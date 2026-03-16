-- Migration: Create job autopilot candidates table
-- Stores results from Auto Source Candidates / autopilot sourcing runs.

CREATE TABLE IF NOT EXISTS job_autopilot_candidates (
  id SERIAL PRIMARY KEY,
  job_id INTEGER NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  candidate_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  source_type VARCHAR(50) NOT NULL DEFAULT 'job_post',
  match_score INTEGER NULL,
  score_summary TEXT NULL,
  detail_response JSONB NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(job_id, candidate_user_id, source_type)
);

CREATE INDEX IF NOT EXISTS idx_job_autopilot_candidates_job_id ON job_autopilot_candidates(job_id);
CREATE INDEX IF NOT EXISTS idx_job_autopilot_candidates_candidate_user_id ON job_autopilot_candidates(candidate_user_id);

-- Trigger for updated_at
DROP TRIGGER IF EXISTS update_job_autopilot_candidates_updated_at ON job_autopilot_candidates;
CREATE TRIGGER update_job_autopilot_candidates_updated_at
  BEFORE UPDATE ON job_autopilot_candidates
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Migration: Create job_title_alternatives
-- Rails parity for JobTitleAlternative.generate_or_fetch cache table.

CREATE TABLE IF NOT EXISTS job_title_alternatives (
  id SERIAL PRIMARY KEY,
  original_title TEXT NOT NULL,
  alternative_title TEXT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_job_title_alternatives_original_title ON job_title_alternatives(original_title);

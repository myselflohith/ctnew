-- Add rank/score columns to people (from Rails ch-job-marketplace: rank API response storage)
-- See: users/registrations_controller.rb @person.update(rank_score:, score_edu:, ...)
ALTER TABLE people
  ADD COLUMN IF NOT EXISTS rank_score DOUBLE PRECISION NULL,
  ADD COLUMN IF NOT EXISTS score_edu DOUBLE PRECISION NULL,
  ADD COLUMN IF NOT EXISTS score_company DOUBLE PRECISION NULL,
  ADD COLUMN IF NOT EXISTS highest_school VARCHAR NULL,
  ADD COLUMN IF NOT EXISTS highest_company VARCHAR NULL,
  ADD COLUMN IF NOT EXISTS company_ranked VARCHAR NULL,
  ADD COLUMN IF NOT EXISTS school_ranked VARCHAR NULL,
  ADD COLUMN IF NOT EXISTS latest_company VARCHAR NULL,
  ADD COLUMN IF NOT EXISTS latest_school VARCHAR NULL;

CREATE INDEX IF NOT EXISTS idx_people_rank_score ON people(rank_score);

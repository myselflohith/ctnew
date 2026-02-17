-- Migration: Point ct_jobs_saved and ct_job_applications to jobs table instead of ct_job
-- Ensures saved jobs and applications reference jobs(id).

-- ct_jobs_saved: drop FK to ct_job, add FK to jobs
ALTER TABLE ct_jobs_saved
  DROP CONSTRAINT IF EXISTS ct_jobs_saved_job_id_fkey;

ALTER TABLE ct_jobs_saved
  ADD CONSTRAINT ct_jobs_saved_job_id_fkey
  FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE;

-- ct_job_applications: drop FK to ct_job, add FK to jobs
ALTER TABLE ct_job_applications
  DROP CONSTRAINT IF EXISTS ct_job_applications_job_id_fkey;

ALTER TABLE ct_job_applications
  ADD CONSTRAINT ct_job_applications_job_id_fkey
  FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE;

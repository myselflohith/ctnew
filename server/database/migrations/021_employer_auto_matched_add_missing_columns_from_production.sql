-- Migration: Add missing employer_auto_matched_candidates columns from production
-- Adds columns that exist in production employer_auto_matched_candidates table but are missing locally.
-- Uses ADD COLUMN IF NOT EXISTS for idempotency.

ALTER TABLE employer_auto_matched_candidates
  ADD COLUMN IF NOT EXISTS interested INTEGER NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS email_sent_at TIMESTAMP NULL,
  ADD COLUMN IF NOT EXISTS discarded_at TIMESTAMP NULL,
  ADD COLUMN IF NOT EXISTS account_manager_id INTEGER NULL,
  ADD COLUMN IF NOT EXISTS is_am_approve INTEGER NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS is_emp_approve INTEGER NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS sent_employer_at TIMESTAMP NULL,
  ADD COLUMN IF NOT EXISTS sent_candidate_at TIMESTAMP NULL,
  ADD COLUMN IF NOT EXISTS ai_free_phone_call_log_id INTEGER NULL,
  ADD COLUMN IF NOT EXISTS is_candidate_approve INTEGER NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS match BOOLEAN NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS reason VARCHAR NULL,
  ADD COLUMN IF NOT EXISTS emp_approve_at TIMESTAMP NULL,
  ADD COLUMN IF NOT EXISTS timeslot_process_candidate INTEGER NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS timeslot_process_at TIMESTAMP NULL,
  ADD COLUMN IF NOT EXISTS timeslot_sent_at TIMESTAMP NULL,
  ADD COLUMN IF NOT EXISTS selected_time_slot VARCHAR NULL,
  ADD COLUMN IF NOT EXISTS match_feedback TEXT NULL,
  ADD COLUMN IF NOT EXISTS candidate_type VARCHAR NULL,
  ADD COLUMN IF NOT EXISTS time_slot_candidate VARCHAR NULL,
  ADD COLUMN IF NOT EXISTS feedback_type VARCHAR NULL,
  ADD COLUMN IF NOT EXISTS feedback_text TEXT NULL,
  ADD COLUMN IF NOT EXISTS person_applied_at TIMESTAMP NULL,
  ADD COLUMN IF NOT EXISTS person_save_job INTEGER NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS person_reject_job INTEGER NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS automation_email_sending_log_id INTEGER NULL;


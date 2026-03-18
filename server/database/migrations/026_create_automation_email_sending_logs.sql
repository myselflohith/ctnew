-- 026_create_automation_email_sending_logs.sql
-- Rails parity table for email outreach history shown in recommended candidates (Last Email).
-- Mirrors ch-job-marketplace `automation_email_sending_logs` (core columns + commonly used later additions).

CREATE TABLE IF NOT EXISTS public.automation_email_sending_logs (
  id BIGSERIAL PRIMARY KEY,
  person_id INTEGER NOT NULL,
  job_id INTEGER NOT NULL,

  first_name VARCHAR(255),
  last_name VARCHAR(255),
  email VARCHAR(255) NOT NULL,
  phone_number VARCHAR(255),

  body TEXT,
  subject VARCHAR(255),
  status VARCHAR(255),
  response TEXT,

  discarded_at TIMESTAMP NULL,

  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),

  -- Additional fields that exist in production dumps / later Rails migrations
  is_followup INTEGER DEFAULT 0,
  followup_at TIMESTAMP NULL,
  followup_body TEXT NULL,

  is_forwarded INTEGER DEFAULT 0,
  forwarded_at TIMESTAMP NULL,

  is_texted INTEGER DEFAULT 0,

  forward_id INTEGER NULL,
  forward_body TEXT NULL,

  candidate_auto_submission_id INTEGER NULL,
  texted_at TIMESTAMP NULL,

  is_external_outreach INTEGER DEFAULT 0,

  sequnce_2_body TEXT NULL,
  sequnce_2_process_at TIMESTAMP NULL,

  sequnce_3_body TEXT NULL,
  sequnce_3_process_at TIMESTAMP NULL,

  auto_submit_client_at TIMESTAMP NULL,
  candidate_response_evaluation VARCHAR(255) NULL,

  using_gmail_account INTEGER DEFAULT 0,
  outreach_user_id INTEGER NULL
);

CREATE INDEX IF NOT EXISTS index_automation_email_sending_logs_on_person_id
  ON public.automation_email_sending_logs (person_id);

CREATE INDEX IF NOT EXISTS index_automation_email_sending_logs_on_job_id
  ON public.automation_email_sending_logs (job_id);

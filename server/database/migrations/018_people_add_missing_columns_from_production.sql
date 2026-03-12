-- Migration: Add missing people columns from production
-- Adds columns that exist in production people table but were missing locally.
-- Alters contact_num to match production type (character varying).
-- Uses ADD COLUMN IF NOT EXISTS for idempotency.

-- Add missing columns (same name and datatype as production)
ALTER TABLE people ADD COLUMN IF NOT EXISTS incoming_mail_id INTEGER NULL;
ALTER TABLE people ADD COLUMN IF NOT EXISTS education_level INTEGER NULL;
ALTER TABLE people ADD COLUMN IF NOT EXISTS industries TEXT NULL;
ALTER TABLE people ADD COLUMN IF NOT EXISTS industry_process_at TIMESTAMP NULL;
ALTER TABLE people ADD COLUMN IF NOT EXISTS is_opt_in INTEGER NULL DEFAULT 0;
ALTER TABLE people ADD COLUMN IF NOT EXISTS hourly_rate VARCHAR NULL;
ALTER TABLE people ADD COLUMN IF NOT EXISTS notice_period VARCHAR NULL;
ALTER TABLE people ADD COLUMN IF NOT EXISTS expected_rate VARCHAR NULL;
ALTER TABLE people ADD COLUMN IF NOT EXISTS experience_skill VARCHAR NULL;
ALTER TABLE people ADD COLUMN IF NOT EXISTS is_certified INTEGER NULL;
ALTER TABLE people ADD COLUMN IF NOT EXISTS job_type VARCHAR NULL;
ALTER TABLE people ADD COLUMN IF NOT EXISTS top_manual INTEGER NULL DEFAULT 0;
ALTER TABLE people ADD COLUMN IF NOT EXISTS work_preference VARCHAR NULL;
ALTER TABLE people ADD COLUMN IF NOT EXISTS open_to_relocation VARCHAR NULL;
ALTER TABLE people ADD COLUMN IF NOT EXISTS offer_reward INTEGER NULL DEFAULT 0;
ALTER TABLE people ADD COLUMN IF NOT EXISTS offer_reward_on VARCHAR NULL;
ALTER TABLE people ADD COLUMN IF NOT EXISTS offer_reward_percentage DOUBLE PRECISION NULL DEFAULT 0.0;
ALTER TABLE people ADD COLUMN IF NOT EXISTS offer_reward_approve_on TIMESTAMP NULL;
ALTER TABLE people ADD COLUMN IF NOT EXISTS is_offer_reward_approve INTEGER NULL DEFAULT 0;
ALTER TABLE people ADD COLUMN IF NOT EXISTS offer_reward_agreement_url VARCHAR NULL;
ALTER TABLE people ADD COLUMN IF NOT EXISTS re_rank INTEGER NULL DEFAULT 0;
ALTER TABLE people ADD COLUMN IF NOT EXISTS company_stage VARCHAR NULL;
ALTER TABLE people ADD COLUMN IF NOT EXISTS exclude_security_clearance VARCHAR NULL;
ALTER TABLE people ADD COLUMN IF NOT EXISTS location_distance VARCHAR NULL;
ALTER TABLE people ADD COLUMN IF NOT EXISTS work_types VARCHAR NULL;
ALTER TABLE people ADD COLUMN IF NOT EXISTS job_prefrence_provided INTEGER NULL DEFAULT 0;
ALTER TABLE people ADD COLUMN IF NOT EXISTS job_prefrence_match_process_at TIMESTAMP NULL;
ALTER TABLE people ADD COLUMN IF NOT EXISTS accreditation_proof_url VARCHAR NULL;

-- Align contact_num type with production (character varying)
ALTER TABLE people
  ALTER COLUMN contact_num TYPE VARCHAR USING (contact_num::text);

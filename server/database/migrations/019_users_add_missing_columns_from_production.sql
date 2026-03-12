-- Migration: Add missing users columns from production
-- Adds columns that exist in production users table but were missing locally.
-- Uses ADD COLUMN IF NOT EXISTS for idempotency.

ALTER TABLE users ADD COLUMN IF NOT EXISTS api_token CHAR NULL;
ALTER TABLE users ADD COLUMN IF NOT EXISTS customer_token TEXT NULL;
ALTER TABLE users ADD COLUMN IF NOT EXISTS customer_uid VARCHAR NULL;
ALTER TABLE users ADD COLUMN IF NOT EXISTS customer_payment_complete VARCHAR NULL;
ALTER TABLE users ADD COLUMN IF NOT EXISTS customer_password VARCHAR NULL;
ALTER TABLE users ADD COLUMN IF NOT EXISTS customer_server_create BOOLEAN NULL;
ALTER TABLE users ADD COLUMN IF NOT EXISTS customer_server_id VARCHAR NULL;
ALTER TABLE users ADD COLUMN IF NOT EXISTS customer_last_campaign BOOLEAN NULL;
ALTER TABLE users ADD COLUMN IF NOT EXISTS job_credit INTEGER NULL DEFAULT 3;
ALTER TABLE users ADD COLUMN IF NOT EXISTS referral_code VARCHAR NULL;
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_contingency_fee_employer INTEGER NULL DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS fee_agreement_sign_date TIMESTAMP NULL;
ALTER TABLE users ADD COLUMN IF NOT EXISTS fee_agreement_url VARCHAR NULL;
ALTER TABLE users ADD COLUMN IF NOT EXISTS contingency_fee_employer_requested_on TIMESTAMP NULL;
ALTER TABLE users ADD COLUMN IF NOT EXISTS contingency_action_on TIMESTAMP NULL;
ALTER TABLE users ADD COLUMN IF NOT EXISTS contingency_action_by INTEGER NULL;
ALTER TABLE users ADD COLUMN IF NOT EXISTS req_host VARCHAR NULL;
ALTER TABLE users ADD COLUMN IF NOT EXISTS info_email_admin_at TIMESTAMP NULL;
ALTER TABLE users ADD COLUMN IF NOT EXISTS agreement_type_employer VARCHAR NULL;
ALTER TABLE users ADD COLUMN IF NOT EXISTS commission_is_working VARCHAR NULL;
ALTER TABLE users ADD COLUMN IF NOT EXISTS commission_current_compnay VARCHAR NULL;
ALTER TABLE users ADD COLUMN IF NOT EXISTS success_fee_requested_on TIMESTAMP NULL;

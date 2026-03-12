-- Migration: Alter users table to match new schema (add columns, rename password_hash)

-- Rename password_hash to encrypted_password (keep existing auth data)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'password_hash'
  ) THEN
    ALTER TABLE users RENAME COLUMN password_hash TO encrypted_password;
  END IF;
END $$;

-- Remove old constraint if it exists (Devise/Rails schema leftover)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'users_invitation_token_key'
  ) THEN
    ALTER TABLE users DROP CONSTRAINT users_invitation_token_key;
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'users_reset_password_token_key'
  ) THEN
    ALTER TABLE users DROP CONSTRAINT users_reset_password_token_key;
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'users_unlock_token_key'
  ) THEN
    ALTER TABLE users DROP CONSTRAINT users_unlock_token_key;
  END IF;
END $$;

-- Add new columns (ignore if column already exists; each in its own block so one failure doesn't stop the rest)
DO $$
BEGIN
  BEGIN ALTER TABLE users ADD COLUMN reset_password_token VARCHAR NULL; EXCEPTION WHEN duplicate_column THEN NULL; END;
  BEGIN ALTER TABLE users ADD COLUMN reset_password_sent_at TIMESTAMP NULL; EXCEPTION WHEN duplicate_column THEN NULL; END;
  BEGIN ALTER TABLE users ADD COLUMN remember_created_at TIMESTAMP NULL; EXCEPTION WHEN duplicate_column THEN NULL; END;
  BEGIN ALTER TABLE users ADD COLUMN sign_in_count INTEGER NOT NULL DEFAULT 0; EXCEPTION WHEN duplicate_column THEN NULL; END;
  BEGIN ALTER TABLE users ADD COLUMN current_sign_in_at TIMESTAMP NULL; EXCEPTION WHEN duplicate_column THEN NULL; END;
  BEGIN ALTER TABLE users ADD COLUMN last_sign_in_at TIMESTAMP NULL; EXCEPTION WHEN duplicate_column THEN NULL; END;
  BEGIN ALTER TABLE users ADD COLUMN current_sign_in_ip INET NULL; EXCEPTION WHEN duplicate_column THEN NULL; END;
  BEGIN ALTER TABLE users ADD COLUMN last_sign_in_ip INET NULL; EXCEPTION WHEN duplicate_column THEN NULL; END;
  BEGIN ALTER TABLE users ADD COLUMN failed_attempts INTEGER NOT NULL DEFAULT 0; EXCEPTION WHEN duplicate_column THEN NULL; END;
  BEGIN ALTER TABLE users ADD COLUMN unlock_token VARCHAR NULL; EXCEPTION WHEN duplicate_column THEN NULL; END;
  BEGIN ALTER TABLE users ADD COLUMN locked_at TIMESTAMP NULL; EXCEPTION WHEN duplicate_column THEN NULL; END;
  BEGIN ALTER TABLE users ADD COLUMN provider VARCHAR NULL; EXCEPTION WHEN duplicate_column THEN NULL; END;
  BEGIN ALTER TABLE users ADD COLUMN uid VARCHAR NULL; EXCEPTION WHEN duplicate_column THEN NULL; END;
  BEGIN ALTER TABLE users ADD COLUMN name VARCHAR NULL; EXCEPTION WHEN duplicate_column THEN NULL; END;
  BEGIN ALTER TABLE users ADD COLUMN full_name VARCHAR NULL; EXCEPTION WHEN duplicate_column THEN NULL; END;
  BEGIN ALTER TABLE users ADD COLUMN person_id INTEGER NULL; EXCEPTION WHEN duplicate_column THEN NULL; END;
  BEGIN ALTER TABLE users ADD COLUMN username VARCHAR NULL; EXCEPTION WHEN duplicate_column THEN NULL; END;
  BEGIN ALTER TABLE users ADD COLUMN notes_id INTEGER NULL; EXCEPTION WHEN duplicate_column THEN NULL; END;
  BEGIN ALTER TABLE users ADD COLUMN invitation_token VARCHAR NULL; EXCEPTION WHEN duplicate_column THEN NULL; END;
  BEGIN ALTER TABLE users ADD COLUMN invitation_created_at TIMESTAMP NULL; EXCEPTION WHEN duplicate_column THEN NULL; END;
  BEGIN ALTER TABLE users ADD COLUMN invitation_sent_at TIMESTAMP NULL; EXCEPTION WHEN duplicate_column THEN NULL; END;
  BEGIN ALTER TABLE users ADD COLUMN invitation_accepted_at TIMESTAMP NULL; EXCEPTION WHEN duplicate_column THEN NULL; END;
  BEGIN ALTER TABLE users ADD COLUMN invitation_limit INTEGER NULL; EXCEPTION WHEN duplicate_column THEN NULL; END;
  BEGIN ALTER TABLE users ADD COLUMN invited_by_type VARCHAR NULL; EXCEPTION WHEN duplicate_column THEN NULL; END;
  BEGIN ALTER TABLE users ADD COLUMN invited_by_id INTEGER NULL; EXCEPTION WHEN duplicate_column THEN NULL; END;
  BEGIN ALTER TABLE users ADD COLUMN invitations_count INTEGER NULL DEFAULT 0; EXCEPTION WHEN duplicate_column THEN NULL; END;
  BEGIN ALTER TABLE users ADD COLUMN identity_id INTEGER NULL; EXCEPTION WHEN duplicate_column THEN NULL; END;
  BEGIN ALTER TABLE users ADD COLUMN date_of_birth DATE NULL; EXCEPTION WHEN duplicate_column THEN NULL; END;
  BEGIN ALTER TABLE users ADD COLUMN location VARCHAR NULL; EXCEPTION WHEN duplicate_column THEN NULL; END;
  BEGIN ALTER TABLE users ADD COLUMN signuprole VARCHAR NULL; EXCEPTION WHEN duplicate_column THEN NULL; END;
  BEGIN ALTER TABLE users ADD COLUMN phone_number VARCHAR NULL; EXCEPTION WHEN duplicate_column THEN NULL; END;
  BEGIN ALTER TABLE users ADD COLUMN job_title VARCHAR NULL; EXCEPTION WHEN duplicate_column THEN NULL; END;
  BEGIN ALTER TABLE users ADD COLUMN company_name VARCHAR NULL; EXCEPTION WHEN duplicate_column THEN NULL; END;
  BEGIN ALTER TABLE users ADD COLUMN company_url VARCHAR NULL; EXCEPTION WHEN duplicate_column THEN NULL; END;
  BEGIN ALTER TABLE users ADD COLUMN remote_interest VARCHAR NULL; EXCEPTION WHEN duplicate_column THEN NULL; END;
  BEGIN ALTER TABLE users ADD COLUMN skills TEXT[] NULL DEFAULT '{}'; EXCEPTION WHEN duplicate_column THEN NULL; END;
  BEGIN ALTER TABLE users ADD COLUMN location_interest_bh BOOLEAN NULL; EXCEPTION WHEN duplicate_column THEN NULL; END;
  BEGIN ALTER TABLE users ADD COLUMN position_interest VARCHAR NULL; EXCEPTION WHEN duplicate_column THEN NULL; END;
  BEGIN ALTER TABLE users ADD COLUMN experience_years VARCHAR NULL; EXCEPTION WHEN duplicate_column THEN NULL; END;
  BEGIN ALTER TABLE users ADD COLUMN supervising_num INTEGER NULL; EXCEPTION WHEN duplicate_column THEN NULL; END;
  BEGIN ALTER TABLE users ADD COLUMN salary_expectations VARCHAR NULL; EXCEPTION WHEN duplicate_column THEN NULL; END;
  BEGIN ALTER TABLE users ADD COLUMN work_authorization_status BOOLEAN NULL; EXCEPTION WHEN duplicate_column THEN NULL; END;
  BEGIN ALTER TABLE users ADD COLUMN visa_status BOOLEAN NULL; EXCEPTION WHEN duplicate_column THEN NULL; END;
  BEGIN ALTER TABLE users ADD COLUMN linkedin_profile_url VARCHAR NULL; EXCEPTION WHEN duplicate_column THEN NULL; END;
  BEGIN ALTER TABLE users ADD COLUMN github_url VARCHAR NULL; EXCEPTION WHEN duplicate_column THEN NULL; END;
  BEGIN ALTER TABLE users ADD COLUMN personal_site VARCHAR NULL; EXCEPTION WHEN duplicate_column THEN NULL; END;
  BEGIN ALTER TABLE users ADD COLUMN stack_overflow_url VARCHAR NULL; EXCEPTION WHEN duplicate_column THEN NULL; END;
  BEGIN ALTER TABLE users ADD COLUMN position_desc TEXT NULL; EXCEPTION WHEN duplicate_column THEN NULL; END;
  BEGIN ALTER TABLE users ADD COLUMN employment_sought VARCHAR NULL; EXCEPTION WHEN duplicate_column THEN NULL; END;
  BEGIN ALTER TABLE users ADD COLUMN resume_file_name VARCHAR NULL; EXCEPTION WHEN duplicate_column THEN NULL; END;
  BEGIN ALTER TABLE users ADD COLUMN resume_content_type VARCHAR NULL; EXCEPTION WHEN duplicate_column THEN NULL; END;
  BEGIN ALTER TABLE users ADD COLUMN resume_file_size INTEGER NULL; EXCEPTION WHEN duplicate_column THEN NULL; END;
  BEGIN ALTER TABLE users ADD COLUMN resume_updated_at TIMESTAMP NULL; EXCEPTION WHEN duplicate_column THEN NULL; END;
  BEGIN ALTER TABLE users ADD COLUMN accepts BOOLEAN NULL; EXCEPTION WHEN duplicate_column THEN NULL; END;
  BEGIN ALTER TABLE users ADD COLUMN employer_hiring_location VARCHAR NULL; EXCEPTION WHEN duplicate_column THEN NULL; END;
  BEGIN ALTER TABLE users ADD COLUMN employer_roles VARCHAR NULL; EXCEPTION WHEN duplicate_column THEN NULL; END;
  BEGIN ALTER TABLE users ADD COLUMN employer_roles_type VARCHAR NULL; EXCEPTION WHEN duplicate_column THEN NULL; END;
  BEGIN ALTER TABLE users ADD COLUMN employer_remoteness BOOLEAN NULL; EXCEPTION WHEN duplicate_column THEN NULL; END;
  BEGIN ALTER TABLE users ADD COLUMN employer_timeframe VARCHAR NULL; EXCEPTION WHEN duplicate_column THEN NULL; END;
  BEGIN ALTER TABLE users ADD COLUMN employer_pricing_authorization BOOLEAN NULL; EXCEPTION WHEN duplicate_column THEN NULL; END;
  BEGIN ALTER TABLE users ADD COLUMN company_size VARCHAR NULL; EXCEPTION WHEN duplicate_column THEN NULL; END;
  BEGIN ALTER TABLE users ADD COLUMN document_content_type VARCHAR NULL; EXCEPTION WHEN duplicate_column THEN NULL; END;
  BEGIN ALTER TABLE users ADD COLUMN crelate_id VARCHAR NULL; EXCEPTION WHEN duplicate_column THEN NULL; END;
  BEGIN ALTER TABLE users ADD COLUMN userstateid VARCHAR NULL; EXCEPTION WHEN duplicate_column THEN NULL; END;
  BEGIN ALTER TABLE users ADD COLUMN accepts_date TIMESTAMP NULL; EXCEPTION WHEN duplicate_column THEN NULL; END;
  BEGIN ALTER TABLE users ADD COLUMN job_search_stage VARCHAR NULL; EXCEPTION WHEN duplicate_column THEN NULL; END;
  BEGIN ALTER TABLE users ADD COLUMN account_manager_id INTEGER NULL; EXCEPTION WHEN duplicate_column THEN NULL; END;
  BEGIN ALTER TABLE users ADD COLUMN utf8 VARCHAR NULL; EXCEPTION WHEN duplicate_column THEN NULL; END;
  BEGIN ALTER TABLE users ADD COLUMN _method VARCHAR NULL; EXCEPTION WHEN duplicate_column THEN NULL; END;
  BEGIN ALTER TABLE users ADD COLUMN authenticity_token VARCHAR NULL; EXCEPTION WHEN duplicate_column THEN NULL; END;
  BEGIN ALTER TABLE users ADD COLUMN commit VARCHAR NULL; EXCEPTION WHEN duplicate_column THEN NULL; END;
  BEGIN ALTER TABLE users ADD COLUMN current_position VARCHAR NULL; EXCEPTION WHEN duplicate_column THEN NULL; END;
  BEGIN ALTER TABLE users ADD COLUMN current_employer VARCHAR NULL; EXCEPTION WHEN duplicate_column THEN NULL; END;
  BEGIN ALTER TABLE users ADD COLUMN public_profile_url JSON NULL; EXCEPTION WHEN duplicate_column THEN NULL; END;
  BEGIN ALTER TABLE users ADD COLUMN api_standard_profile_request JSON NULL; EXCEPTION WHEN duplicate_column THEN NULL; END;
  BEGIN ALTER TABLE users ADD COLUMN industry JSON NULL; EXCEPTION WHEN duplicate_column THEN NULL; END;
  BEGIN ALTER TABLE users ADD COLUMN current_share JSON NULL; EXCEPTION WHEN duplicate_column THEN NULL; END;
  BEGIN ALTER TABLE users ADD COLUMN num_connections JSON NULL; EXCEPTION WHEN duplicate_column THEN NULL; END;
  BEGIN ALTER TABLE users ADD COLUMN num_connections_capped JSON NULL; EXCEPTION WHEN duplicate_column THEN NULL; END;
  BEGIN ALTER TABLE users ADD COLUMN summary JSON NULL; EXCEPTION WHEN duplicate_column THEN NULL; END;
  BEGIN ALTER TABLE users ADD COLUMN specialties JSON NULL; EXCEPTION WHEN duplicate_column THEN NULL; END;
  BEGIN ALTER TABLE users ADD COLUMN positions JSON NULL; EXCEPTION WHEN duplicate_column THEN NULL; END;
  BEGIN ALTER TABLE users ADD COLUMN picture_url JSON NULL; EXCEPTION WHEN duplicate_column THEN NULL; END;
  BEGIN ALTER TABLE users ADD COLUMN site_standard_profile_request JSON NULL; EXCEPTION WHEN duplicate_column THEN NULL; END;
  BEGIN ALTER TABLE users ADD COLUMN "user" VARCHAR NULL; EXCEPTION WHEN duplicate_column THEN NULL; END;
  BEGIN ALTER TABLE users ADD COLUMN roles_held TEXT[] NULL; EXCEPTION WHEN duplicate_column THEN NULL; END;
  BEGIN ALTER TABLE users ADD COLUMN address_line_1 VARCHAR NULL; EXCEPTION WHEN duplicate_column THEN NULL; END;
  BEGIN ALTER TABLE users ADD COLUMN address_line_2 VARCHAR NULL; EXCEPTION WHEN duplicate_column THEN NULL; END;
  BEGIN ALTER TABLE users ADD COLUMN city VARCHAR NULL; EXCEPTION WHEN duplicate_column THEN NULL; END;
  BEGIN ALTER TABLE users ADD COLUMN state VARCHAR NULL; EXCEPTION WHEN duplicate_column THEN NULL; END;
  BEGIN ALTER TABLE users ADD COLUMN zipcode VARCHAR NULL; EXCEPTION WHEN duplicate_column THEN NULL; END;
  BEGIN ALTER TABLE users ADD COLUMN location_interest_usa TEXT[] NULL DEFAULT '{}'; EXCEPTION WHEN duplicate_column THEN NULL; END;
  BEGIN ALTER TABLE users ADD COLUMN user_approved BOOLEAN NULL; EXCEPTION WHEN duplicate_column THEN NULL; END;
  BEGIN ALTER TABLE users ADD COLUMN referred_from VARCHAR NULL; EXCEPTION WHEN duplicate_column THEN NULL; END;
  BEGIN ALTER TABLE users ADD COLUMN employer_hiring_roles VARCHAR NULL; EXCEPTION WHEN duplicate_column THEN NULL; END;
  BEGIN ALTER TABLE users ADD COLUMN bulk_message_count INTEGER NOT NULL DEFAULT 0; EXCEPTION WHEN duplicate_column THEN NULL; END;
  BEGIN ALTER TABLE users ADD COLUMN avatar_file_name VARCHAR NULL; EXCEPTION WHEN duplicate_column THEN NULL; END;
  BEGIN ALTER TABLE users ADD COLUMN avatar_content_type VARCHAR NULL; EXCEPTION WHEN duplicate_column THEN NULL; END;
  BEGIN ALTER TABLE users ADD COLUMN avatar_file_size INTEGER NULL; EXCEPTION WHEN duplicate_column THEN NULL; END;
  BEGIN ALTER TABLE users ADD COLUMN avatar_updated_at TIMESTAMP NULL; EXCEPTION WHEN duplicate_column THEN NULL; END;
  BEGIN ALTER TABLE users ADD COLUMN google_token VARCHAR NULL; EXCEPTION WHEN duplicate_column THEN NULL; END;
  BEGIN ALTER TABLE users ADD COLUMN google_refresh_token VARCHAR NULL; EXCEPTION WHEN duplicate_column THEN NULL; END;
  BEGIN ALTER TABLE users ADD COLUMN calendly_link TEXT NULL; EXCEPTION WHEN duplicate_column THEN NULL; END;
  BEGIN ALTER TABLE users ADD COLUMN organization_id UUID NULL; EXCEPTION WHEN duplicate_column THEN NULL; END;
  BEGIN ALTER TABLE users ADD COLUMN title VARCHAR NULL; EXCEPTION WHEN duplicate_column THEN NULL; END;
  BEGIN ALTER TABLE users ADD COLUMN active_job_seeker VARCHAR NULL; EXCEPTION WHEN duplicate_column THEN NULL; END;
  BEGIN ALTER TABLE users ADD COLUMN address VARCHAR NULL; EXCEPTION WHEN duplicate_column THEN NULL; END;
  BEGIN ALTER TABLE users ADD COLUMN email_confirmed BOOLEAN NULL DEFAULT false; EXCEPTION WHEN duplicate_column THEN NULL; END;
  BEGIN ALTER TABLE users ADD COLUMN confirm_token VARCHAR NULL; EXCEPTION WHEN duplicate_column THEN NULL; END;
  BEGIN ALTER TABLE users ADD COLUMN sync_job BOOLEAN NULL DEFAULT false; EXCEPTION WHEN duplicate_column THEN NULL; END;
  BEGIN ALTER TABLE users ADD COLUMN auto_scroll BOOLEAN NULL DEFAULT false; EXCEPTION WHEN duplicate_column THEN NULL; END;
  BEGIN ALTER TABLE users ADD COLUMN send_email_request BOOLEAN NULL DEFAULT false; EXCEPTION WHEN duplicate_column THEN NULL; END;
  BEGIN ALTER TABLE users ADD COLUMN user_verification_status VARCHAR NULL; EXCEPTION WHEN duplicate_column THEN NULL; END;
  BEGIN ALTER TABLE users ADD COLUMN discarded_at TIMESTAMP NULL; EXCEPTION WHEN duplicate_column THEN NULL; END;
  BEGIN ALTER TABLE users ADD COLUMN integrated_email VARCHAR NULL; EXCEPTION WHEN duplicate_column THEN NULL; END;
  BEGIN ALTER TABLE users ADD COLUMN on_demand_recruiter INTEGER NULL DEFAULT 0; EXCEPTION WHEN duplicate_column THEN NULL; END;
  BEGIN ALTER TABLE users ADD COLUMN designation INTEGER NULL; EXCEPTION WHEN duplicate_column THEN NULL; END;
  BEGIN ALTER TABLE users ADD COLUMN account_email_verified BOOLEAN NULL DEFAULT false; EXCEPTION WHEN duplicate_column THEN NULL; END;
  BEGIN ALTER TABLE users ADD COLUMN agency_id INTEGER NULL DEFAULT 0; EXCEPTION WHEN duplicate_column THEN NULL; END;
  BEGIN ALTER TABLE users ADD COLUMN agency_password_changed BOOLEAN NULL DEFAULT false; EXCEPTION WHEN duplicate_column THEN NULL; END;
  BEGIN ALTER TABLE users ADD COLUMN audio_video_file VARCHAR NULL; EXCEPTION WHEN duplicate_column THEN NULL; END;
  BEGIN ALTER TABLE users ADD COLUMN slack_member_id VARCHAR NULL; EXCEPTION WHEN duplicate_column THEN NULL; END;
  BEGIN ALTER TABLE users ADD COLUMN invited VARCHAR NULL; EXCEPTION WHEN duplicate_column THEN NULL; END;
  BEGIN ALTER TABLE users ADD COLUMN notification BOOLEAN NULL DEFAULT true; EXCEPTION WHEN duplicate_column THEN NULL; END;
  BEGIN ALTER TABLE users ADD COLUMN slack_notification BOOLEAN NULL DEFAULT true; EXCEPTION WHEN duplicate_column THEN NULL; END;
  BEGIN ALTER TABLE users ADD COLUMN recruiter_rate NUMERIC(10,2) NULL; EXCEPTION WHEN duplicate_column THEN NULL; END;
  BEGIN ALTER TABLE users ADD COLUMN email_campaign_api_token TEXT NULL; EXCEPTION WHEN duplicate_column THEN NULL; END;
  BEGIN ALTER TABLE users ADD COLUMN email_campaign_user_id VARCHAR NULL; EXCEPTION WHEN duplicate_column THEN NULL; END;
  BEGIN ALTER TABLE users ADD COLUMN email_campaign_user_password VARCHAR NULL; EXCEPTION WHEN duplicate_column THEN NULL; END;
  BEGIN ALTER TABLE users ADD COLUMN email_campaign_server_create BOOLEAN NULL; EXCEPTION WHEN duplicate_column THEN NULL; END;
  BEGIN ALTER TABLE users ADD COLUMN email_campaign_server_id VARCHAR NULL; EXCEPTION WHEN duplicate_column THEN NULL; END;
  BEGIN ALTER TABLE users ADD COLUMN email_campaign_last_execute BOOLEAN NULL; EXCEPTION WHEN duplicate_column THEN NULL; END;
  BEGIN ALTER TABLE users ADD COLUMN is_commission_recruiter VARCHAR NULL; EXCEPTION WHEN duplicate_column THEN NULL; END;
  BEGIN ALTER TABLE users ADD COLUMN ein_number VARCHAR NULL; EXCEPTION WHEN duplicate_column THEN NULL; END;
  BEGIN ALTER TABLE users ADD COLUMN pingseeker_client_id VARCHAR NULL; EXCEPTION WHEN duplicate_column THEN NULL; END;
  BEGIN ALTER TABLE users ADD COLUMN community_notification BOOLEAN NULL DEFAULT true; EXCEPTION WHEN duplicate_column THEN NULL; END;
  BEGIN ALTER TABLE users ADD COLUMN commission_info VARCHAR NULL; EXCEPTION WHEN duplicate_column THEN NULL; END;
  BEGIN ALTER TABLE users ADD COLUMN commission_info_skip_at TIMESTAMP NULL; EXCEPTION WHEN duplicate_column THEN NULL; END;
  BEGIN ALTER TABLE users ADD COLUMN commission_agency TEXT NULL; EXCEPTION WHEN duplicate_column THEN NULL; END;
  BEGIN ALTER TABLE users ADD COLUMN commission_type_candidate TEXT NULL; EXCEPTION WHEN duplicate_column THEN NULL; END;
  BEGIN ALTER TABLE users ADD COLUMN commission_job_info TEXT NULL; EXCEPTION WHEN duplicate_column THEN NULL; END;
END $$;

-- Create indexes on users
CREATE INDEX IF NOT EXISTS idx_users_account_manager_id ON users(account_manager_id);
CREATE INDEX IF NOT EXISTS idx_users_crelate_id ON users(crelate_id);
CREATE INDEX IF NOT EXISTS idx_users_discarded_at ON users(discarded_at);
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_invitation_token ON users(invitation_token) WHERE invitation_token IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_users_identity_id ON users(identity_id);
CREATE INDEX IF NOT EXISTS idx_users_invited_by_id ON users(invited_by_id);
CREATE INDEX IF NOT EXISTS idx_users_invitations_count ON users(invitations_count);
CREATE INDEX IF NOT EXISTS idx_users_notes_id ON users(notes_id);
CREATE INDEX IF NOT EXISTS idx_users_person_id ON users(person_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_reset_password_token ON users(reset_password_token) WHERE reset_password_token IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_unlock_token ON users(unlock_token) WHERE unlock_token IS NOT NULL;

-- Add foreign keys from users to people, notes, identities (only if tables exist and constraints don't)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'users_person_id_fkey') THEN
    ALTER TABLE users ADD CONSTRAINT users_person_id_fkey
      FOREIGN KEY (person_id) REFERENCES people(id) ON DELETE NO ACTION ON UPDATE NO ACTION;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'users_notes_id_fkey') THEN
    ALTER TABLE users ADD CONSTRAINT users_notes_id_fkey
      FOREIGN KEY (notes_id) REFERENCES notes(id) ON DELETE NO ACTION ON UPDATE NO ACTION;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'users_identity_id_fkey') THEN
    ALTER TABLE users ADD CONSTRAINT users_identity_id_fkey
      FOREIGN KEY (identity_id) REFERENCES identities(id) ON DELETE NO ACTION ON UPDATE NO ACTION;
  END IF;
END $$;

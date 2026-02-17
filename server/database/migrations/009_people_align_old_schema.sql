-- Migration: Align people table with OLD schema
-- 1) created_at, updated_at: drop DEFAULT
-- 2) email_address: NOT NULL (set empty string for existing NULLs first)
-- 3) cv_url: text[] → varchar (single value; use first element)
-- 4) Add all OLD-table indexes

-- 1) Drop timestamp defaults
ALTER TABLE people
  ALTER COLUMN created_at DROP DEFAULT,
  ALTER COLUMN updated_at DROP DEFAULT;

-- 2) email_address: NOT NULL like OLD (backfill NULLs with empty string first)
UPDATE people SET email_address = '' WHERE email_address IS NULL;
ALTER TABLE people
  ALTER COLUMN email_address SET NOT NULL;

-- 3) cv_url: text[] → varchar (first element; null/empty array → NULL)
ALTER TABLE people
  ALTER COLUMN cv_url TYPE VARCHAR USING (
    CASE WHEN cv_url IS NULL OR array_length(cv_url, 1) IS NULL THEN NULL
         ELSE cv_url[1]
    END
  );

-- 4) Add OLD-table indexes (IF NOT EXISTS so safe to re-run)
CREATE INDEX IF NOT EXISTS idx_people_links ON people(links);
CREATE INDEX IF NOT EXISTS idx_people_account_id ON people(account_id);
CREATE INDEX IF NOT EXISTS idx_people_active ON people(active);
CREATE INDEX IF NOT EXISTS idx_people_active_set_by_user_id ON people(active_set_by_user_id);
CREATE INDEX IF NOT EXISTS idx_people_approve_for_job_id ON people(approve_for_job_id);
CREATE INDEX IF NOT EXISTS idx_people_contact_merge_id ON people(contact_merge_id);
CREATE INDEX IF NOT EXISTS idx_people_contact_source_id ON people(contact_source_id);
CREATE INDEX IF NOT EXISTS idx_people_contact_status_id ON people(contact_status_id);
CREATE INDEX IF NOT EXISTS idx_people_created_by_id ON people(created_by_id);
CREATE INDEX IF NOT EXISTS idx_people_crelate_id ON people(crelate_id);
CREATE INDEX IF NOT EXISTS idx_people_email_available ON people(email_available);
CREATE INDEX IF NOT EXISTS idx_people_ethnicity_id ON people(ethnicity_id);
CREATE INDEX IF NOT EXISTS idx_people_gender_id ON people(gender_id);
CREATE INDEX IF NOT EXISTS idx_people_github_available ON people(github_available);
CREATE INDEX IF NOT EXISTS idx_people_icon_attachment_id ON people(icon_attachment_id);
CREATE INDEX IF NOT EXISTS idx_people_inbound_user_id ON people(inbound_user_id);
CREATE INDEX IF NOT EXISTS idx_people_last_activity_regarding_id ON people(last_activity_regarding_id);
CREATE INDEX IF NOT EXISTS idx_people_lever_candidate_id ON people(lever_candidate_id);
CREATE INDEX IF NOT EXISTS idx_people_linkedin_available ON people(linkedin_available);
CREATE INDEX IF NOT EXISTS idx_people_linkedin_profile_id_id ON people(linkedin_profile_id_id);
CREATE INDEX IF NOT EXISTS idx_people_note_id ON people(note_id);
CREATE INDEX IF NOT EXISTS idx_people_phone_number_available ON people(phone_number_available);
CREATE INDEX IF NOT EXISTS idx_people_recently_added ON people(recently_added);
CREATE INDEX IF NOT EXISTS idx_people_top_five_percent_status ON people(top_five_percent_status);
CREATE INDEX IF NOT EXISTS idx_people_top_one_percent_status ON people(top_one_percent_status);
CREATE INDEX IF NOT EXISTS idx_people_top_ten_percent_status ON people(top_ten_percent_status);

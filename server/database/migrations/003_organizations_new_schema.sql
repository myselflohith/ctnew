-- Migration: Replace organizations table with new schema (id uuid, owner_id, etc.)
-- ct_org_job_requirements will reference organizations(id) as UUID.

-- Ensure UUID extension exists
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Drop FK from ct_org_job_requirements (references organizations)
ALTER TABLE ct_org_job_requirements
  DROP CONSTRAINT IF EXISTS ct_org_job_requirements_organization_id_fkey;

-- Drop old organizations table
DROP TABLE IF EXISTS organizations CASCADE;

-- Create organizations with new schema
CREATE TABLE organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR NULL,
  owner_id BIGINT NULL REFERENCES users(id) ON DELETE NO ACTION ON UPDATE NO ACTION,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  description VARCHAR NULL,
  status VARCHAR NULL,
  is_deleted BOOLEAN NULL DEFAULT false,
  company_size INTEGER NULL,
  location VARCHAR NULL,
  industry VARCHAR NULL,
  min_size INTEGER NULL DEFAULT 1,
  max_size INTEGER NULL DEFAULT 0,
  country VARCHAR[] NULL,
  region VARCHAR[] NULL,
  city VARCHAR[] NULL,
  member_organization_id UUID NULL,
  image_url TEXT NULL,
  file_name VARCHAR NULL,
  website_url VARCHAR NULL,
  discarded_at TIMESTAMP NULL,
  slug VARCHAR[] NULL,
  subdomain VARCHAR[] NULL,
  account_manager_id INTEGER NULL,
  organization_type VARCHAR NULL,
  marketer_id INTEGER NULL,
  agreement_start_date TIMESTAMP NULL,
  agreement_end_date TIMESTAMP NULL,
  monitor_mailbox VARCHAR NULL,
  agency_id INTEGER NULL DEFAULT 0
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_organizations_discarded_at ON organizations(discarded_at);
CREATE INDEX IF NOT EXISTS idx_organizations_image_url ON organizations(image_url);
CREATE INDEX IF NOT EXISTS idx_organizations_owner_id ON organizations(owner_id);

-- Trigger for updated_at
DROP TRIGGER IF EXISTS update_organizations_updated_at ON organizations;
CREATE TRIGGER update_organizations_updated_at
  BEFORE UPDATE ON organizations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Update ct_org_job_requirements: organization_id must become UUID
-- Drop old column and add new (existing rows will have NULL organization_id unless we migrate data)
ALTER TABLE ct_org_job_requirements
  DROP COLUMN IF EXISTS organization_id;

ALTER TABLE ct_org_job_requirements
  ADD COLUMN organization_id UUID NULL REFERENCES organizations(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_org_job_requirements_org_id ON ct_org_job_requirements(organization_id);

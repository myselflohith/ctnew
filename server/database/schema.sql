-- CardinalTalent Database Schema
-- PostgreSQL Database Schema for Local Development

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table for authentication
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  first_name VARCHAR(100),
  last_name VARCHAR(100),
  company_name VARCHAR(255),
  role VARCHAR(50) NOT NULL CHECK (role IN ('talent', 'employer', 'recruiter', 'admin')),
  email_verified BOOLEAN DEFAULT false,
  verification_token VARCHAR(255),
  reset_token VARCHAR(255),
  reset_token_expires TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Sessions table for session management
CREATE TABLE IF NOT EXISTS sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token VARCHAR(500) NOT NULL UNIQUE,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Resumes table
CREATE TABLE IF NOT EXISTS resumes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size INTEGER,
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Organizations table
CREATE TABLE IF NOT EXISTS organizations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  company_name VARCHAR(255) UNIQUE NOT NULL,
  industry VARCHAR(255),
  size VARCHAR(100),
  founded INTEGER,
  headquarters VARCHAR(255),
  description TEXT,
  website VARCHAR(255),
  linkedin_url VARCHAR(255),
  twitter_url VARCHAR(255),
  benefits TEXT,
  culture TEXT,
  logo_path TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Organization Job Requirements table
CREATE TABLE IF NOT EXISTS ct_org_job_requirements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  requirement_text TEXT NOT NULL,
  requirement_type VARCHAR(50) NOT NULL CHECK (requirement_type IN ('mustHave', 'niceToHave')),
  weight INTEGER DEFAULT 5 CHECK (weight >= 1 AND weight <= 10),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Jobs table
CREATE TABLE IF NOT EXISTS ct_job (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title VARCHAR(255) NOT NULL,
  company VARCHAR(255) NOT NULL,
  location VARCHAR(255) NOT NULL,
  type VARCHAR(50) NOT NULL CHECK (type IN ('remote', 'hybrid', 'onsite')),
  salary VARCHAR(100),
  posted_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  match_score INTEGER,
  skills TEXT[], -- Array of skills
  description TEXT,
  status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'paused', 'closed')),
  status_reason TEXT,
  paused_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Saved Jobs table
CREATE TABLE IF NOT EXISTS ct_jobs_saved (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  job_id UUID NOT NULL REFERENCES ct_job(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, job_id)
);

-- Job Applications table
CREATE TABLE IF NOT EXISTS ct_job_applications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  job_id UUID NOT NULL REFERENCES ct_job(id) ON DELETE CASCADE,
  resume_id UUID REFERENCES resumes(id) ON DELETE SET NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'Application Sent' CHECK (status IN ('Application Sent', 'Under Review', 'Interview Scheduled', 'Rejected', 'Accepted')),
  applied_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, job_id)
);

-- Interviews table
CREATE TABLE IF NOT EXISTS ct_interviews (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  application_id UUID NOT NULL REFERENCES ct_job_applications(id) ON DELETE CASCADE,
  interview_type VARCHAR(50) NOT NULL CHECK (interview_type IN ('Video', 'Phone', 'Onsite')),
  scheduled_date DATE,
  scheduled_time TIME,
  interviewer VARCHAR(255),
  status VARCHAR(50) NOT NULL DEFAULT 'Scheduled' CHECK (status IN ('Scheduled', 'Completed', 'Cancelled', 'Rescheduled')),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(token);
CREATE INDEX IF NOT EXISTS idx_resumes_user_id ON resumes(user_id);
CREATE INDEX IF NOT EXISTS idx_jobs_saved_user_id ON ct_jobs_saved(user_id);
CREATE INDEX IF NOT EXISTS idx_jobs_saved_job_id ON ct_jobs_saved(job_id);
CREATE INDEX IF NOT EXISTS idx_job_applications_user_id ON ct_job_applications(user_id);
CREATE INDEX IF NOT EXISTS idx_job_applications_job_id ON ct_job_applications(job_id);
CREATE INDEX IF NOT EXISTS idx_interviews_user_id ON ct_interviews(user_id);
CREATE INDEX IF NOT EXISTS idx_interviews_application_id ON ct_interviews(application_id);
CREATE INDEX IF NOT EXISTS idx_organizations_company_name ON organizations(company_name);
CREATE INDEX IF NOT EXISTS idx_org_job_requirements_org_id ON ct_org_job_requirements(organization_id);
CREATE INDEX IF NOT EXISTS idx_job_status ON ct_job(status);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for users table
DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Trigger for resumes table
DROP TRIGGER IF EXISTS update_resumes_updated_at ON resumes;
CREATE TRIGGER update_resumes_updated_at
  BEFORE UPDATE ON resumes
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Trigger for ct_job table
DROP TRIGGER IF EXISTS update_ct_job_updated_at ON ct_job;
CREATE TRIGGER update_ct_job_updated_at
  BEFORE UPDATE ON ct_job
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Trigger for ct_job_applications table
DROP TRIGGER IF EXISTS update_ct_job_applications_updated_at ON ct_job_applications;
CREATE TRIGGER update_ct_job_applications_updated_at
  BEFORE UPDATE ON ct_job_applications
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Trigger for ct_interviews table
DROP TRIGGER IF EXISTS update_ct_interviews_updated_at ON ct_interviews;
CREATE TRIGGER update_ct_interviews_updated_at
  BEFORE UPDATE ON ct_interviews
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Trigger for organizations table
DROP TRIGGER IF EXISTS update_organizations_updated_at ON organizations;
CREATE TRIGGER update_organizations_updated_at
  BEFORE UPDATE ON organizations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Trigger for ct_org_job_requirements table
DROP TRIGGER IF EXISTS update_ct_org_job_requirements_updated_at ON ct_org_job_requirements;
CREATE TRIGGER update_ct_org_job_requirements_updated_at
  BEFORE UPDATE ON ct_org_job_requirements
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();



-- Insert default admin user (password: admin123 - CHANGE IN PRODUCTION)
-- Password hash for 'admin123' using bcrypt
INSERT INTO users (email, password_hash, first_name, last_name, role, email_verified)
VALUES (
  'admin@cardinaltalent.com',
  '$2b$10$rKzqJZjXbS5YFv3qN8vQJ.xGzXqH7xQx5xQ7xQ7xQ7xQ7xQ7xQ7xO',
  'Admin',
  'User',
  'admin',
  true
) ON CONFLICT (email) DO NOTHING;

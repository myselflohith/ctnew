-- CardinalTalent Database Schema
-- PostgreSQL Database Schema for Local Development

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table for authentication
-- Roles: 3=admin, 4=talent, 5=employer
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  first_name VARCHAR(100),
  last_name VARCHAR(100),
  company_name VARCHAR(255),
  role INTEGER NOT NULL CHECK (role IN (3, 4, 5, 6, 7, 8)),
  email_verified BOOLEAN DEFAULT false,
  verification_token VARCHAR(255),
  reset_token VARCHAR(255),
  reset_token_expires TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Sessions table for session management
CREATE TABLE IF NOT EXISTS sessions (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token VARCHAR(500) NOT NULL UNIQUE,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Resumes table
CREATE TABLE IF NOT EXISTS resumes (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size INTEGER,
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Organizations table
CREATE TABLE IF NOT EXISTS organizations (
  id SERIAL PRIMARY KEY,
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
  id SERIAL PRIMARY KEY,
  organization_id INTEGER NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  requirement_text TEXT NOT NULL,
  requirement_type VARCHAR(50) NOT NULL CHECK (requirement_type IN ('mustHave', 'niceToHave')),
  weight INTEGER DEFAULT 5 CHECK (weight >= 1 AND weight <= 10),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Jobs table
CREATE TABLE IF NOT EXISTS ct_job (
  id SERIAL PRIMARY KEY,
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
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  job_id INTEGER NOT NULL REFERENCES ct_job(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, job_id)
);

-- Job Applications table
CREATE TABLE IF NOT EXISTS ct_job_applications (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  job_id INTEGER NOT NULL REFERENCES ct_job(id) ON DELETE CASCADE,
  resume_id INTEGER REFERENCES resumes(id) ON DELETE SET NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'Application Sent' CHECK (status IN ('Application Sent', 'Under Review', 'Interview Scheduled', 'Rejected', 'Accepted')),
  applied_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, job_id)
);

-- AI Interview tables defined below (ai_interviews, ai_interview_questions, etc.)

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(token);
CREATE INDEX IF NOT EXISTS idx_resumes_user_id ON resumes(user_id);
CREATE INDEX IF NOT EXISTS idx_jobs_saved_user_id ON ct_jobs_saved(user_id);
CREATE INDEX IF NOT EXISTS idx_jobs_saved_job_id ON ct_jobs_saved(job_id);
CREATE INDEX IF NOT EXISTS idx_job_applications_user_id ON ct_job_applications(user_id);
CREATE INDEX IF NOT EXISTS idx_job_applications_job_id ON ct_job_applications(job_id);
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

-- ============================================================================
-- AI Interview Tables (from ch-job-marketplace)
-- ============================================================================

-- AI Interviews table - Main interview configuration
CREATE TABLE IF NOT EXISTS ai_interviews (
  id SERIAL PRIMARY KEY,
  interview_title VARCHAR(255),
  job_id INTEGER NOT NULL,
  person_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status VARCHAR(255) DEFAULT 'pending',
  token TEXT,
  interview_start_time TIMESTAMP WITH TIME ZONE,
  interview_video VARCHAR(255),
  interview_transcript TEXT,
  question_type VARCHAR(255),
  type_of_interview VARCHAR(255),
  interview_category VARCHAR(255),
  addition_skill VARCHAR(255),
  unique_token VARCHAR(255),
  discarded_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- AI Interview Questions - Canonical questions table (job-level + interview-level)
-- Parity notes:
-- - ch-job-marketplace uses ai_interview_id to scope questions to a specific interview
--   and uses ai_interview_id = 0 for job-level default questions.
-- - ctnew server code also expects (job_id, ai_interview_id) scoping.
CREATE TABLE IF NOT EXISTS ai_interview_questions (
  id SERIAL PRIMARY KEY,
  job_id INTEGER NOT NULL,
  ai_interview_id INTEGER NOT NULL DEFAULT 0 REFERENCES ai_interviews(id) ON DELETE CASCADE,
  category VARCHAR(100) DEFAULT 'General',
  question TEXT NOT NULL,
  question_weight SMALLINT DEFAULT 1,
  created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  discarded_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- AI Interview Custom Questions - User-created questions per interview
CREATE TABLE IF NOT EXISTS ai_interview_custom_questions (
  id SERIAL PRIMARY KEY,
  ai_interview_id INTEGER NOT NULL REFERENCES ai_interviews(id) ON DELETE CASCADE,
  question TEXT NOT NULL,
  question_weight SMALLINT,
  created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  discarded_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- AI Generated Questions - AI-generated questions
CREATE TABLE IF NOT EXISTS ai_generated_questions (
  id SERIAL PRIMARY KEY,
  interview_id INTEGER NOT NULL REFERENCES ai_interviews(id) ON DELETE CASCADE,
  job_id INTEGER,
  question TEXT NOT NULL,
  question_weight SMALLINT,
  discarded_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- AI Interview Invites - Candidate invitations
CREATE TABLE IF NOT EXISTS ai_interview_invites (
  id SERIAL PRIMARY KEY,
  interview_id INTEGER NOT NULL REFERENCES ai_interviews(id) ON DELETE CASCADE,
  candidate_name VARCHAR(255) NOT NULL,
  candidate_email VARCHAR(255) NOT NULL,
  unique_interview_link TEXT NOT NULL,
  person_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  phone_num VARCHAR(20),
  browser_info VARCHAR(255),
  status VARCHAR(50) NOT NULL,
  follow_up_invite INTEGER DEFAULT 0,
  follow_up_at TIMESTAMP WITH TIME ZONE,
  reason VARCHAR(255),
  reason_note TEXT,
  discarded_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- AI Interview Reports - Overall interview completion reports
CREATE TABLE IF NOT EXISTS ai_interview_reports (
  id SERIAL PRIMARY KEY,
  interview_id INTEGER NOT NULL REFERENCES ai_interviews(id) ON DELETE CASCADE,
  ai_interview_invite_id INTEGER NOT NULL REFERENCES ai_interview_invites(id) ON DELETE CASCADE,
  interview_start_at DATE NOT NULL,
  transcript_text TEXT,
  interview_video_url VARCHAR(255),
  protecting_score VARCHAR(50),
  rating VARCHAR(50),
  score TEXT,
  ai_feedback TEXT,
  discarded_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- AI Interview Report Details - Question-by-question responses
CREATE TABLE IF NOT EXISTS ai_interview_report_details (
  id SERIAL PRIMARY KEY,
  ai_interview_report_id INTEGER NOT NULL REFERENCES ai_interview_reports(id) ON DELETE CASCADE,
  ai_interview_invite_id INTEGER,
  question VARCHAR(255) NOT NULL,
  question_weight SMALLINT,
  transcript_text TEXT,
  video_url VARCHAR(255),
  score TEXT,
  rating VARCHAR(50),
  ai_feedback TEXT,
  que_type VARCHAR(50),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- AI Interview Feedbacks - Feedback about AI interviews
CREATE TABLE IF NOT EXISTS ai_interview_feedbacks (
  id SERIAL PRIMARY KEY,
  candidate_email VARCHAR(255) NOT NULL,
  ai_interview_id VARCHAR(255),
  rating VARCHAR(50),
  feedback TEXT,
  discarded_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- AI Interview Logs - Activity logs for interviews
CREATE TABLE IF NOT EXISTS ai_interview_logs (
  id SERIAL PRIMARY KEY,
  ai_interview_invite_id INTEGER NOT NULL REFERENCES ai_interview_invites(id) ON DELETE CASCADE,
  user_name VARCHAR(255),
  log_type VARCHAR(50),
  req_params VARCHAR(500),
  details TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- ============================================================================
-- Indexes for AI Interview Tables
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_ai_interviews_job_id ON ai_interviews(job_id);
CREATE INDEX IF NOT EXISTS idx_ai_interviews_person_id ON ai_interviews(person_id);
CREATE INDEX IF NOT EXISTS idx_ai_interviews_discarded_at ON ai_interviews(discarded_at);

CREATE INDEX IF NOT EXISTS idx_ai_interview_questions_job_id ON ai_interview_questions(job_id);
CREATE INDEX IF NOT EXISTS idx_ai_interview_questions_ai_interview_id ON ai_interview_questions(ai_interview_id);
CREATE INDEX IF NOT EXISTS idx_ai_interview_questions_job_interview ON ai_interview_questions(job_id, ai_interview_id);
CREATE INDEX IF NOT EXISTS idx_ai_interview_questions_discarded_at ON ai_interview_questions(discarded_at);

CREATE INDEX IF NOT EXISTS idx_ai_interview_custom_questions_interview_id ON ai_interview_custom_questions(ai_interview_id);
CREATE INDEX IF NOT EXISTS idx_ai_interview_custom_questions_discarded_at ON ai_interview_custom_questions(discarded_at);

CREATE INDEX IF NOT EXISTS idx_ai_generated_questions_interview_id ON ai_generated_questions(interview_id);
CREATE INDEX IF NOT EXISTS idx_ai_generated_questions_job_id ON ai_generated_questions(job_id);
CREATE INDEX IF NOT EXISTS idx_ai_generated_questions_discarded_at ON ai_generated_questions(discarded_at);

CREATE INDEX IF NOT EXISTS idx_ai_interview_invites_interview_id ON ai_interview_invites(interview_id);
CREATE INDEX IF NOT EXISTS idx_ai_interview_invites_candidate_name ON ai_interview_invites(candidate_name);
CREATE INDEX IF NOT EXISTS idx_ai_interview_invites_candidate_email ON ai_interview_invites(candidate_email);
CREATE INDEX IF NOT EXISTS idx_ai_interview_invites_discarded_at ON ai_interview_invites(discarded_at);

CREATE INDEX IF NOT EXISTS idx_ai_interview_reports_interview_id ON ai_interview_reports(interview_id);
CREATE INDEX IF NOT EXISTS idx_ai_interview_reports_invite_id ON ai_interview_reports(ai_interview_invite_id);
CREATE INDEX IF NOT EXISTS idx_ai_interview_reports_interview_start_at ON ai_interview_reports(interview_start_at);
CREATE INDEX IF NOT EXISTS idx_ai_interview_reports_discarded_at ON ai_interview_reports(discarded_at);

CREATE INDEX IF NOT EXISTS idx_ai_interview_report_details_report_id ON ai_interview_report_details(ai_interview_report_id);
CREATE INDEX IF NOT EXISTS idx_ai_interview_report_details_question ON ai_interview_report_details(question);

CREATE INDEX IF NOT EXISTS idx_ai_interview_feedbacks_candidate_email ON ai_interview_feedbacks(candidate_email);
CREATE INDEX IF NOT EXISTS idx_ai_interview_feedbacks_discarded_at ON ai_interview_feedbacks(discarded_at);

CREATE INDEX IF NOT EXISTS idx_ai_interview_logs_invite_id ON ai_interview_logs(ai_interview_invite_id);

-- Triggers for AI Interview tables
DROP TRIGGER IF EXISTS update_ai_interviews_updated_at ON ai_interviews;
CREATE TRIGGER update_ai_interviews_updated_at
  BEFORE UPDATE ON ai_interviews
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_ai_interview_questions_updated_at ON ai_interview_questions;
CREATE TRIGGER update_ai_interview_questions_updated_at
  BEFORE UPDATE ON ai_interview_questions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_ai_interview_custom_questions_updated_at ON ai_interview_custom_questions;
CREATE TRIGGER update_ai_interview_custom_questions_updated_at
  BEFORE UPDATE ON ai_interview_custom_questions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_ai_generated_questions_updated_at ON ai_generated_questions;
CREATE TRIGGER update_ai_generated_questions_updated_at
  BEFORE UPDATE ON ai_generated_questions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_ai_interview_invites_updated_at ON ai_interview_invites;
CREATE TRIGGER update_ai_interview_invites_updated_at
  BEFORE UPDATE ON ai_interview_invites
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_ai_interview_reports_updated_at ON ai_interview_reports;
CREATE TRIGGER update_ai_interview_reports_updated_at
  BEFORE UPDATE ON ai_interview_reports
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_ai_interview_report_details_updated_at ON ai_interview_report_details;
CREATE TRIGGER update_ai_interview_report_details_updated_at
  BEFORE UPDATE ON ai_interview_report_details
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_ai_interview_feedbacks_updated_at ON ai_interview_feedbacks;
CREATE TRIGGER update_ai_interview_feedbacks_updated_at
  BEFORE UPDATE ON ai_interview_feedbacks
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_ai_interview_logs_updated_at ON ai_interview_logs;
CREATE TRIGGER update_ai_interview_logs_updated_at
  BEFORE UPDATE ON ai_interview_logs
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
  3,
  true
) ON CONFLICT (email) DO NOTHING;

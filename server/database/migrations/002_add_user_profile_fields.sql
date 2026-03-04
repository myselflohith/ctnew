-- Migration: Add user profile fields needed for Talent Profile page
-- Adds optional fields: phone, city_state, linkedin_profile_url, photo_url, skills (text array)

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS phone VARCHAR(50),
  ADD COLUMN IF NOT EXISTS city_state VARCHAR(255),
  ADD COLUMN IF NOT EXISTS linkedin_profile_url VARCHAR(255),
  ADD COLUMN IF NOT EXISTS photo_url TEXT,
  ADD COLUMN IF NOT EXISTS skills TEXT[];

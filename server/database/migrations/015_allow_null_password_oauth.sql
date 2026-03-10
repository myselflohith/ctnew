-- Allow NULL encrypted_password for OAuth (e.g. Google) sign-in only users
ALTER TABLE users
  ALTER COLUMN encrypted_password DROP NOT NULL;

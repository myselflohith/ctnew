-- Migration: Ensure invitation_token, reset_password_token, unlock_token have UNIQUE constraints (match OLD table)
-- Use ALTER TABLE ADD CONSTRAINT so they show as UNIQUE in table structure (not just INDEX).

-- Drop any existing index on these columns (by scanning pg_indexes)
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT indexname FROM pg_indexes
    WHERE schemaname = 'public' AND tablename = 'users'
      AND ( indexdef ~ '\(invitation_token\)' OR indexdef ~ '\(reset_password_token\)' OR indexdef ~ '\(unlock_token\)' )
  LOOP
    -- Some of these indexes may back constraints (e.g. users_invitation_token_key).
    -- Dropping such an index directly raises 2BP01; instead, we rely on dropping
    -- the constraint below. Swallow any errors here so the migration can proceed.
    BEGIN
      EXECUTE format('DROP INDEX IF EXISTS %I', r.indexname);
    EXCEPTION
      WHEN others THEN
        NULL;
    END;
  END LOOP;
END $$;

-- Drop existing unique constraints if they exist (so we can recreate cleanly)
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_invitation_token_key;
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_reset_password_token_key;
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_unlock_token_key;

-- Add UNIQUE constraints (shows as UNIQUE in table structure; allows multiple NULLs)
ALTER TABLE users ADD CONSTRAINT users_invitation_token_key UNIQUE (invitation_token);
ALTER TABLE users ADD CONSTRAINT users_reset_password_token_key UNIQUE (reset_password_token);
ALTER TABLE users ADD CONSTRAINT users_unlock_token_key UNIQUE (unlock_token);

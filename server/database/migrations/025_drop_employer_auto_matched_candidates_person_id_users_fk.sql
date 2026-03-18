-- Migration 025: Drop FK on employer_auto_matched_candidates.person_id -> users(id)
-- Reason:
--   Remove only the foreign key constraint that references users(id) with
--   ON DELETE CASCADE (and typically ON UPDATE NO ACTION).
--
-- Notes:
--   - Constraint names can differ by environment, so we locate and drop by definition.
--   - Idempotent: if the FK does not exist, this is a no-op.

BEGIN;

DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT ns.nspname AS schema_name, c.conname
    FROM pg_constraint c
    JOIN pg_class t ON t.oid = c.conrelid
    JOIN pg_namespace ns ON ns.oid = t.relnamespace
    WHERE c.contype = 'f'
      AND t.relname = 'employer_auto_matched_candidates'
      AND ns.nspname NOT IN ('pg_catalog', 'information_schema')
      AND pg_get_constraintdef(c.oid) ILIKE '%FOREIGN KEY (person_id)%REFERENCES users(id)%'
      AND pg_get_constraintdef(c.oid) ILIKE '%ON DELETE CASCADE%'
  LOOP
    EXECUTE format(
      'ALTER TABLE %I.%I DROP CONSTRAINT %I',
      r.schema_name,
      'employer_auto_matched_candidates',
      r.conname
    );
  END LOOP;
END $$;

COMMIT;
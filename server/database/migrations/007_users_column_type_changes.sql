-- Migration: Align users column types with OLD table spec
-- created_at, updated_at → timestamptz with default; calendly_link → text (single); email → varchar(255)

-- created_at: timestamp → timestamptz DEFAULT CURRENT_TIMESTAMP
ALTER TABLE users
  ALTER COLUMN created_at TYPE TIMESTAMP WITH TIME ZONE USING created_at AT TIME ZONE 'UTC',
  ALTER COLUMN created_at SET DEFAULT CURRENT_TIMESTAMP;

-- updated_at: timestamp → timestamptz DEFAULT CURRENT_TIMESTAMP
ALTER TABLE users
  ALTER COLUMN updated_at TYPE TIMESTAMP WITH TIME ZONE USING updated_at AT TIME ZONE 'UTC',
  ALTER COLUMN updated_at SET DEFAULT CURRENT_TIMESTAMP;

-- calendly_link: keep as TEXT (single value). If it was created as text[], convert back to text (first element).
DO $$
DECLARE
  col_udt text;
BEGIN
  SELECT udt_name INTO col_udt
  FROM information_schema.columns
  WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'calendly_link';
  IF col_udt = '_text' THEN
    -- Column is text[]; convert to text using first element
    ALTER TABLE users
      ALTER COLUMN calendly_link TYPE TEXT USING (
        CASE WHEN calendly_link IS NULL OR array_length(calendly_link, 1) IS NULL THEN NULL
             ELSE calendly_link[1]
        END
      );
  END IF;
END $$;

-- email: character varying → character varying(255)
ALTER TABLE users
  ALTER COLUMN email TYPE VARCHAR(255);

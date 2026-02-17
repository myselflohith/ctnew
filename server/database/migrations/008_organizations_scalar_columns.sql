-- Migration: Align organizations with OLD schema
-- 1) country, region, city, slug, subdomain: varchar[] → varchar (single value; use first element)
-- 2) created_at, updated_at: drop DEFAULT so they match old (timestamp, no auto default)

-- Convert array columns to scalar (first element; null/empty → NULL)
ALTER TABLE organizations
  ALTER COLUMN country TYPE VARCHAR USING (
    CASE WHEN country IS NULL OR array_length(country, 1) IS NULL THEN NULL
         ELSE country[1]
    END
  ),
  ALTER COLUMN region TYPE VARCHAR USING (
    CASE WHEN region IS NULL OR array_length(region, 1) IS NULL THEN NULL
         ELSE region[1]
    END
  ),
  ALTER COLUMN city TYPE VARCHAR USING (
    CASE WHEN city IS NULL OR array_length(city, 1) IS NULL THEN NULL
         ELSE city[1]
    END
  ),
  ALTER COLUMN slug TYPE VARCHAR USING (
    CASE WHEN slug IS NULL OR array_length(slug, 1) IS NULL THEN NULL
         ELSE slug[1]
    END
  ),
  ALTER COLUMN subdomain TYPE VARCHAR USING (
    CASE WHEN subdomain IS NULL OR array_length(subdomain, 1) IS NULL THEN NULL
         ELSE subdomain[1]
    END
  );

-- Drop automatic defaults on timestamps to match old schema
ALTER TABLE organizations
  ALTER COLUMN created_at DROP DEFAULT,
  ALTER COLUMN updated_at DROP DEFAULT;

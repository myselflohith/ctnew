-- Case-insensitive unique organization name (prevent duplicates).
-- Multiple NULL names remain allowed.
CREATE UNIQUE INDEX IF NOT EXISTS idx_organizations_name_lower_unique
  ON organizations (LOWER(TRIM(name)))
  WHERE name IS NOT NULL AND TRIM(name) != '';

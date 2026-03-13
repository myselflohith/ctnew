-- DB column is named days_in_office
ALTER TABLE people ADD COLUMN IF NOT EXISTS days_in_office INTEGER NULL;

-- Migration: Convert Early Access to Admin Users
-- Date: 2025-06-05
-- Purpose: Rename receive_early field to is_admin for expanded admin functionality

BEGIN;

-- Step 1: Add the new is_admin column
ALTER TABLE subscribers 
ADD COLUMN is_admin BOOLEAN DEFAULT FALSE;

-- Step 2: Copy data from receive_early to is_admin
UPDATE subscribers 
SET is_admin = receive_early 
WHERE receive_early IS NOT NULL;

-- Step 3: Set default for existing users
UPDATE subscribers 
SET is_admin = FALSE 
WHERE is_admin IS NULL;

-- Step 4: Make is_admin NOT NULL
ALTER TABLE subscribers 
ALTER COLUMN is_admin SET NOT NULL;

-- Step 5: Drop the old receive_early column
ALTER TABLE subscribers 
DROP COLUMN receive_early;

-- Verify the migration
SELECT 
  phone_number, 
  is_admin,
  created_at
FROM subscribers 
WHERE is_admin = TRUE
ORDER BY created_at;

COMMIT;

-- Rollback instructions (in case needed):
-- ALTER TABLE subscribers ADD COLUMN receive_early BOOLEAN;
-- UPDATE subscribers SET receive_early = is_admin;
-- ALTER TABLE subscribers DROP COLUMN is_admin; 
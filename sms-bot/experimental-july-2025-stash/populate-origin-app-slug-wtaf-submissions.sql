-- Add and populate origin_app_slug for wtaf_submissions table
-- app_id column contains the app identifier, fill origin_app_slug column

-- Step 1: Add origin_app_slug column if it doesn't exist
ALTER TABLE wtaf_submissions 
ADD COLUMN IF NOT EXISTS origin_app_slug TEXT;

-- Step 2: Backfill existing records - try both UUID and slug matching
UPDATE wtaf_submissions 
SET origin_app_slug = wtaf_content.app_slug
FROM wtaf_content 
WHERE wtaf_submissions.app_id = wtaf_content.id::varchar
  AND wtaf_submissions.origin_app_slug IS NULL;

UPDATE wtaf_submissions 
SET origin_app_slug = wtaf_content.app_slug
FROM wtaf_content 
WHERE wtaf_submissions.app_id = wtaf_content.app_slug
  AND wtaf_submissions.origin_app_slug IS NULL;

-- Step 3: Create function to auto-populate origin_app_slug
CREATE OR REPLACE FUNCTION populate_wtaf_submissions_origin_app_slug()
RETURNS TRIGGER AS $$
BEGIN
  -- Try to find app_slug by matching app_id as UUID first
  SELECT app_slug INTO NEW.origin_app_slug
  FROM wtaf_content 
  WHERE id::varchar = NEW.app_id;
  
  -- If not found, try matching as app_slug
  IF NEW.origin_app_slug IS NULL THEN
    SELECT app_slug INTO NEW.origin_app_slug
    FROM wtaf_content 
    WHERE app_slug = NEW.app_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 4: Drop existing triggers if they exist
DROP TRIGGER IF EXISTS trigger_populate_wtaf_submissions_origin_app_slug ON wtaf_submissions;
DROP TRIGGER IF EXISTS trigger_update_wtaf_submissions_origin_app_slug ON wtaf_submissions;

-- Step 5: Create trigger for INSERT
CREATE TRIGGER trigger_populate_wtaf_submissions_origin_app_slug
  BEFORE INSERT ON wtaf_submissions
  FOR EACH ROW
  EXECUTE FUNCTION populate_wtaf_submissions_origin_app_slug();

-- Step 6: Create trigger for UPDATE when app_id changes
CREATE TRIGGER trigger_update_wtaf_submissions_origin_app_slug
  BEFORE UPDATE ON wtaf_submissions
  FOR EACH ROW
  WHEN (OLD.app_id IS DISTINCT FROM NEW.app_id)
  EXECUTE FUNCTION populate_wtaf_submissions_origin_app_slug();

-- Step 7: Add index for performance
CREATE INDEX IF NOT EXISTS idx_wtaf_submissions_origin_app_slug 
ON wtaf_submissions(origin_app_slug);

-- Step 8: Verify results
SELECT 
  COUNT(*) as total_records,
  COUNT(origin_app_slug) as filled_records,
  COUNT(CASE WHEN origin_app_slug IS NULL THEN 1 END) as still_null
FROM wtaf_submissions; 
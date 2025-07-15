-- FIXED VERSION: Handle BOTH UUIDs and app slugs in app_id field
-- Some app_id values are UUIDs, others are app slugs

-- Step 1: Backfill existing records - handle both UUID and slug cases
UPDATE wtaf_zero_admin_collaborative 
SET origin_app_slug = wtaf_content.app_slug
FROM wtaf_content 
WHERE (
  -- Case 1: app_id is a UUID, match on wtaf_content.id
  (wtaf_zero_admin_collaborative.app_id ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' 
   AND wtaf_zero_admin_collaborative.app_id::uuid = wtaf_content.id)
  OR
  -- Case 2: app_id is an app slug, match on wtaf_content.app_slug  
  (wtaf_zero_admin_collaborative.app_id !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
   AND wtaf_zero_admin_collaborative.app_id = wtaf_content.app_slug)
)
AND wtaf_zero_admin_collaborative.origin_app_slug IS NULL
AND wtaf_content.app_slug IS NOT NULL;

-- Step 2: Create/replace function to auto-populate origin_app_slug
CREATE OR REPLACE FUNCTION populate_origin_app_slug()
RETURNS TRIGGER AS $$
BEGIN
  -- If app_id is provided, look up the corresponding app_slug
  IF NEW.app_id IS NOT NULL THEN
    -- Check if app_id looks like a UUID
    IF NEW.app_id ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
      -- app_id is a UUID, match on wtaf_content.id
      SELECT app_slug INTO NEW.origin_app_slug
      FROM wtaf_content 
      WHERE id = NEW.app_id::uuid;
    ELSE
      -- app_id is an app slug, match on wtaf_content.app_slug
      SELECT app_slug INTO NEW.origin_app_slug
      FROM wtaf_content 
      WHERE app_slug = NEW.app_id;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 3: Drop existing triggers if they exist
DROP TRIGGER IF EXISTS trigger_populate_origin_app_slug ON wtaf_zero_admin_collaborative;
DROP TRIGGER IF EXISTS trigger_update_origin_app_slug ON wtaf_zero_admin_collaborative;

-- Step 4: Create trigger for INSERT
CREATE TRIGGER trigger_populate_origin_app_slug
  BEFORE INSERT ON wtaf_zero_admin_collaborative
  FOR EACH ROW
  EXECUTE FUNCTION populate_origin_app_slug();

-- Step 5: Create trigger for UPDATE
CREATE TRIGGER trigger_update_origin_app_slug
  BEFORE UPDATE ON wtaf_zero_admin_collaborative
  FOR EACH ROW
  WHEN (OLD.app_id IS DISTINCT FROM NEW.app_id)
  EXECUTE FUNCTION populate_origin_app_slug();

-- Step 6: Verify results
SELECT 
  COUNT(*) as total_records,
  COUNT(origin_app_slug) as records_with_app_slug,
  COUNT(CASE WHEN origin_app_slug IS NULL THEN 1 END) as missing_app_slug
FROM wtaf_zero_admin_collaborative;
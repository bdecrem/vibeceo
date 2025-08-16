-- Webtoys Edit Agent Database Migration (v2 - Separate Revisions Table)
-- Run this in Supabase SQL Editor or via psql

-- Step 1: Add current_revision pointer to wtaf_content (NULL = use original)
ALTER TABLE wtaf_content 
ADD COLUMN IF NOT EXISTS current_revision INTEGER DEFAULT NULL;

-- Step 2: Create separate revisions table
CREATE TABLE IF NOT EXISTS wtaf_revisions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  content_id UUID REFERENCES wtaf_content(uuid) ON DELETE CASCADE,
  revision_id INTEGER NOT NULL,
  html_content TEXT NOT NULL,
  edit_request TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by TEXT NOT NULL,
  ai_summary TEXT,
  
  -- Prevent duplicate revision numbers for same content
  UNIQUE(content_id, revision_id)
);

-- Step 3: Create edit requests table (unchanged)
CREATE TABLE IF NOT EXISTS wtaf_edit_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  content_id UUID REFERENCES wtaf_content(uuid) ON DELETE CASCADE,
  app_slug TEXT NOT NULL,
  edit_request TEXT NOT NULL,
  user_phone TEXT NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'validating', 'completed', 'failed', 'rolled_back')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  processed_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  error_message TEXT,
  revision_id INTEGER,
  ai_summary TEXT
);

-- Step 4: Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_revisions_content_id ON wtaf_revisions(content_id);
CREATE INDEX IF NOT EXISTS idx_revisions_content_revision ON wtaf_revisions(content_id, revision_id);
CREATE INDEX IF NOT EXISTS idx_edit_requests_status ON wtaf_edit_requests(status);
CREATE INDEX IF NOT EXISTS idx_edit_requests_app_slug ON wtaf_edit_requests(app_slug);
CREATE INDEX IF NOT EXISTS idx_edit_requests_user_phone ON wtaf_edit_requests(user_phone);

-- Step 5: Create function to get current HTML for display
CREATE OR REPLACE FUNCTION get_current_html(content_record wtaf_content)
RETURNS TEXT AS $$
DECLARE
  revision_html TEXT;
BEGIN
  -- If current_revision is NULL, return original HTML
  IF content_record.current_revision IS NULL THEN
    RETURN content_record.html_content;
  END IF;
  
  -- Get the HTML from the specific revision
  SELECT html_content INTO revision_html
  FROM wtaf_revisions 
  WHERE content_id = content_record.uuid 
  AND revision_id = content_record.current_revision;
  
  -- If revision not found, fallback to original
  RETURN COALESCE(revision_html, content_record.html_content);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Step 6: Create function to add a new revision
CREATE OR REPLACE FUNCTION add_revision(
  p_content_id UUID,
  p_html_content TEXT,
  p_edit_request TEXT,
  p_created_by TEXT,
  p_ai_summary TEXT DEFAULT NULL
)
RETURNS INTEGER AS $$
DECLARE
  new_revision_id INTEGER;
BEGIN
  -- Get the next revision ID
  SELECT COALESCE(MAX(revision_id), 0) + 1
  INTO new_revision_id
  FROM wtaf_revisions
  WHERE content_id = p_content_id;
  
  -- Insert the new revision
  INSERT INTO wtaf_revisions (
    content_id, 
    revision_id, 
    html_content, 
    edit_request, 
    created_by, 
    ai_summary
  ) VALUES (
    p_content_id,
    new_revision_id,
    p_html_content,
    p_edit_request,
    p_created_by,
    p_ai_summary
  );
  
  -- Update the main content record to point to new revision
  UPDATE wtaf_content 
  SET 
    current_revision = new_revision_id,
    updated_at = NOW()
  WHERE uuid = p_content_id;
  
  RETURN new_revision_id;
END;
$$ LANGUAGE plpgsql;

-- Step 7: Create function to revert to a specific revision
CREATE OR REPLACE FUNCTION revert_to_revision(
  p_content_id UUID,
  p_revision_id INTEGER DEFAULT NULL  -- NULL = revert to original
)
RETURNS BOOLEAN AS $$
BEGIN
  -- If NULL, revert to original (current_revision = NULL)
  IF p_revision_id IS NULL THEN
    UPDATE wtaf_content 
    SET 
      current_revision = NULL,
      updated_at = NOW()
    WHERE uuid = p_content_id;
    RETURN TRUE;
  END IF;
  
  -- Check if specific revision exists
  IF EXISTS (
    SELECT 1 FROM wtaf_revisions 
    WHERE content_id = p_content_id 
    AND revision_id = p_revision_id
  ) THEN
    -- Update to point to specific revision
    UPDATE wtaf_content 
    SET 
      current_revision = p_revision_id,
      updated_at = NOW()
    WHERE uuid = p_content_id;
    RETURN TRUE;
  ELSE
    RETURN FALSE;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Step 8: Create function to clean up old revisions
CREATE OR REPLACE FUNCTION cleanup_old_revisions(
  p_content_id UUID,
  p_keep_count INTEGER DEFAULT 5
)
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  -- Delete all but the most recent N revisions
  WITH old_revisions AS (
    SELECT id
    FROM wtaf_revisions
    WHERE content_id = p_content_id
    ORDER BY revision_id DESC
    OFFSET p_keep_count
  )
  DELETE FROM wtaf_revisions
  WHERE id IN (SELECT id FROM old_revisions);
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Step 9: Test the migration
SELECT 
  'wtaf_content' as table_name,
  EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'wtaf_content' 
    AND column_name = 'current_revision'
  ) as has_current_revision_column,
  (
    SELECT COUNT(*) 
    FROM wtaf_content 
    WHERE current_revision IS NOT NULL
  ) as apps_with_revisions

UNION ALL

SELECT 
  'wtaf_revisions' as table_name,
  EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_name = 'wtaf_revisions'
  ) as table_exists,
  (
    SELECT COUNT(*) 
    FROM wtaf_revisions
  ) as total_revisions

UNION ALL

SELECT 
  'wtaf_edit_requests' as table_name,
  EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_name = 'wtaf_edit_requests'
  ) as table_exists,
  (
    SELECT COUNT(*) 
    FROM wtaf_edit_requests
  ) as total_requests;

-- SUCCESS MESSAGE
SELECT 'Database migration v2 completed successfully! 🎉' AS status;
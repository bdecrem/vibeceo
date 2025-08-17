-- Webtoys Edit Agent Database Migration
-- Run this in Supabase SQL Editor or via psql

-- Step 1: Add revision fields to existing wtaf_content table
ALTER TABLE wtaf_content 
ADD COLUMN IF NOT EXISTS revisions JSONB DEFAULT '[]',
ADD COLUMN IF NOT EXISTS current_revision INTEGER DEFAULT 0;

-- Step 2: Create edit requests table
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

-- Step 3: Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_edit_requests_status ON wtaf_edit_requests(status);
CREATE INDEX IF NOT EXISTS idx_edit_requests_app_slug ON wtaf_edit_requests(app_slug);
CREATE INDEX IF NOT EXISTS idx_edit_requests_user_phone ON wtaf_edit_requests(user_phone);
CREATE INDEX IF NOT EXISTS idx_edit_requests_created_at ON wtaf_edit_requests(created_at);

-- Step 4: Create a function to get current HTML for display
CREATE OR REPLACE FUNCTION get_current_html(content_record wtaf_content)
RETURNS TEXT AS $$
BEGIN
  -- If no revisions or current_revision is 0, return original HTML
  IF content_record.revisions IS NULL 
     OR jsonb_array_length(content_record.revisions) = 0 
     OR content_record.current_revision = 0 THEN
    RETURN content_record.html_content;
  END IF;
  
  -- Find and return the current revision's HTML
  RETURN (
    SELECT (revision->>'html_content')::TEXT
    FROM jsonb_array_elements(content_record.revisions) AS revision
    WHERE (revision->>'revision_id')::INTEGER = content_record.current_revision
    LIMIT 1
  );
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Step 5: Create a function to add a new revision
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
  updated_revisions JSONB;
BEGIN
  -- Get the next revision ID
  SELECT COALESCE(MAX((revision->>'revision_id')::INTEGER), 0) + 1
  INTO new_revision_id
  FROM wtaf_content, jsonb_array_elements(revisions) AS revision
  WHERE uuid = p_content_id;
  
  -- If no revisions exist, start with 1
  IF new_revision_id IS NULL THEN
    new_revision_id := 1;
  END IF;
  
  -- Create the new revision object
  updated_revisions := (
    SELECT COALESCE(revisions, '[]'::jsonb) || jsonb_build_object(
      'revision_id', new_revision_id,
      'html_content', p_html_content,
      'edit_request', p_edit_request,
      'created_at', NOW(),
      'created_by', p_created_by,
      'ai_summary', p_ai_summary
    )
    FROM wtaf_content
    WHERE uuid = p_content_id
  );
  
  -- Update the content record
  UPDATE wtaf_content 
  SET 
    revisions = updated_revisions,
    current_revision = new_revision_id,
    updated_at = NOW()
  WHERE uuid = p_content_id;
  
  RETURN new_revision_id;
END;
$$ LANGUAGE plpgsql;

-- Step 6: Create a function to revert to a specific revision
CREATE OR REPLACE FUNCTION revert_to_revision(
  p_content_id UUID,
  p_revision_id INTEGER
)
RETURNS BOOLEAN AS $$
BEGIN
  -- Check if revision exists (0 is always valid for original)
  IF p_revision_id = 0 OR EXISTS (
    SELECT 1 
    FROM wtaf_content, jsonb_array_elements(revisions) AS revision
    WHERE uuid = p_content_id 
    AND (revision->>'revision_id')::INTEGER = p_revision_id
  ) THEN
    -- Update current_revision pointer
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

-- Step 7: Test the migration (verify tables exist)
SELECT 
  'wtaf_content' as table_name,
  EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'wtaf_content' 
    AND column_name = 'revisions'
  ) as has_revisions_column,
  EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'wtaf_content' 
    AND column_name = 'current_revision'
  ) as has_current_revision_column

UNION ALL

SELECT 
  'wtaf_edit_requests' as table_name,
  EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_name = 'wtaf_edit_requests'
  ) as table_exists,
  TRUE as placeholder;

-- SUCCESS MESSAGE
SELECT 'Database migration completed successfully! 🎉' AS status;
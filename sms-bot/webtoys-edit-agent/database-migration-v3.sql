-- Webtoys Edit Agent Database Migration (v3 - Single Table Design)
-- Run this in Supabase SQL Editor or via psql

-- Step 1: Add current_revision pointer to wtaf_content (NULL = use original)
ALTER TABLE wtaf_content 
ADD COLUMN IF NOT EXISTS current_revision INTEGER DEFAULT NULL;

-- Step 2: Create unified revisions/requests table
CREATE TABLE IF NOT EXISTS wtaf_revisions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  content_id UUID REFERENCES wtaf_content(uuid) ON DELETE CASCADE,
  revision_id INTEGER,                      -- NULL while pending, assigned when completed
  edit_request TEXT NOT NULL,               -- What user requested
  html_content TEXT,                        -- NULL while pending, filled when completed
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  user_phone TEXT NOT NULL,                 -- Who requested the edit
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  processed_at TIMESTAMP WITH TIME ZONE,   -- When agent started processing
  completed_at TIMESTAMP WITH TIME ZONE,   -- When agent finished
  error_message TEXT,                       -- If status = 'failed'
  ai_summary TEXT,                          -- What Claude changed
  
  -- Ensure completed revisions have unique revision_ids per content
  UNIQUE(content_id, revision_id)
);

-- Step 3: Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_revisions_status ON wtaf_revisions(status);
CREATE INDEX IF NOT EXISTS idx_revisions_content_id ON wtaf_revisions(content_id);
CREATE INDEX IF NOT EXISTS idx_revisions_user_phone ON wtaf_revisions(user_phone);
CREATE INDEX IF NOT EXISTS idx_revisions_content_revision ON wtaf_revisions(content_id, revision_id) WHERE status = 'completed';
CREATE INDEX IF NOT EXISTS idx_revisions_created_at ON wtaf_revisions(created_at);

-- Step 4: Create function to get current HTML for display
CREATE OR REPLACE FUNCTION get_current_html(content_record wtaf_content)
RETURNS TEXT AS $$
DECLARE
  revision_html TEXT;
BEGIN
  -- If current_revision is NULL, return original HTML
  IF content_record.current_revision IS NULL THEN
    RETURN content_record.html_content;
  END IF;
  
  -- Get the HTML from the specific completed revision
  SELECT html_content INTO revision_html
  FROM wtaf_revisions 
  WHERE content_id = content_record.uuid 
  AND revision_id = content_record.current_revision
  AND status = 'completed';
  
  -- If revision not found or not completed, fallback to original
  RETURN COALESCE(revision_html, content_record.html_content);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Step 5: Create function to queue an edit request
CREATE OR REPLACE FUNCTION queue_edit_request(
  p_content_id UUID,
  p_edit_request TEXT,
  p_user_phone TEXT
)
RETURNS UUID AS $$
DECLARE
  request_id UUID;
BEGIN
  -- Insert the edit request in pending state
  INSERT INTO wtaf_revisions (
    content_id, 
    edit_request, 
    user_phone,
    status
  ) VALUES (
    p_content_id,
    p_edit_request,
    p_user_phone,
    'pending'
  ) RETURNING id INTO request_id;
  
  RETURN request_id;
END;
$$ LANGUAGE plpgsql;

-- Step 6: Create function to complete an edit request
CREATE OR REPLACE FUNCTION complete_edit_request(
  p_request_id UUID,
  p_html_content TEXT,
  p_ai_summary TEXT DEFAULT NULL
)
RETURNS INTEGER AS $$
DECLARE
  new_revision_id INTEGER;
  content_uuid UUID;
BEGIN
  -- Get the content_id for this request
  SELECT content_id INTO content_uuid
  FROM wtaf_revisions
  WHERE id = p_request_id;
  
  -- Get the next revision ID for this content
  SELECT COALESCE(MAX(revision_id), 0) + 1
  INTO new_revision_id
  FROM wtaf_revisions
  WHERE content_id = content_uuid
  AND status = 'completed';
  
  -- Update the request with the completed data
  UPDATE wtaf_revisions 
  SET 
    revision_id = new_revision_id,
    html_content = p_html_content,
    status = 'completed',
    completed_at = NOW(),
    ai_summary = p_ai_summary
  WHERE id = p_request_id;
  
  -- Update the main content record to point to new revision
  UPDATE wtaf_content 
  SET 
    current_revision = new_revision_id,
    updated_at = NOW()
  WHERE uuid = content_uuid;
  
  RETURN new_revision_id;
END;
$$ LANGUAGE plpgsql;

-- Step 7: Create function to fail an edit request
CREATE OR REPLACE FUNCTION fail_edit_request(
  p_request_id UUID,
  p_error_message TEXT
)
RETURNS BOOLEAN AS $$
BEGIN
  UPDATE wtaf_revisions 
  SET 
    status = 'failed',
    completed_at = NOW(),
    error_message = p_error_message
  WHERE id = p_request_id;
  
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql;

-- Step 8: Create function to revert to a specific revision
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
  
  -- Check if specific completed revision exists
  IF EXISTS (
    SELECT 1 FROM wtaf_revisions 
    WHERE content_id = p_content_id 
    AND revision_id = p_revision_id
    AND status = 'completed'
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

-- Step 9: Create function to clean up old revisions
CREATE OR REPLACE FUNCTION cleanup_old_revisions(
  p_content_id UUID,
  p_keep_count INTEGER DEFAULT 5
)
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  -- Delete completed revisions beyond the keep count
  WITH old_revisions AS (
    SELECT id
    FROM wtaf_revisions
    WHERE content_id = p_content_id
    AND status = 'completed'
    ORDER BY revision_id DESC
    OFFSET p_keep_count
  )
  DELETE FROM wtaf_revisions
  WHERE id IN (SELECT id FROM old_revisions);
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Step 10: Test the migration
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
  ) as total_records;

-- SUCCESS MESSAGE
SELECT 'Database migration v3 completed successfully! 🎉' AS status,
       'Single table design: wtaf_revisions handles both queue and storage' AS note;
-- Create table for user uploads (images and potentially other files)
-- This table tracks all files uploaded by users for use in their WEBTOYS creations

CREATE TABLE IF NOT EXISTS public.wtaf_user_uploads (
  -- Primary key
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  
  -- User relationship
  user_id UUID NOT NULL,
  user_slug TEXT NOT NULL,
  
  -- Upload numbering (sequential per user)
  upload_number INTEGER NOT NULL,
  
  -- File metadata
  file_name TEXT NOT NULL,
  display_name TEXT, -- Optional user-provided name
  file_url TEXT NOT NULL, -- Full URL to file in storage
  file_path TEXT NOT NULL, -- Path in storage bucket
  file_type TEXT NOT NULL DEFAULT 'image', -- 'image', 'video', 'document', etc.
  mime_type TEXT NOT NULL,
  file_size INTEGER NOT NULL, -- Size in bytes
  
  -- Image-specific metadata (null for non-images)
  width INTEGER,
  height INTEGER,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Status
  status TEXT NOT NULL DEFAULT 'active', -- 'active', 'deleted'
  
  -- Constraints
  CONSTRAINT wtaf_user_uploads_pkey PRIMARY KEY (id),
  CONSTRAINT wtaf_user_uploads_user_id_fkey FOREIGN KEY (user_id) 
    REFERENCES sms_subscribers (id) ON DELETE CASCADE,
  CONSTRAINT unique_user_upload_number UNIQUE (user_slug, upload_number),
  CONSTRAINT wtaf_user_uploads_status_check CHECK (
    status IN ('active', 'deleted')
  ),
  CONSTRAINT wtaf_user_uploads_file_type_check CHECK (
    file_type IN ('image', 'video', 'document', 'audio', 'other')
  )
) TABLESPACE pg_default;

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_wtaf_uploads_user_slug 
  ON public.wtaf_user_uploads USING btree (user_slug) 
  TABLESPACE pg_default;

CREATE INDEX IF NOT EXISTS idx_wtaf_uploads_user_id 
  ON public.wtaf_user_uploads USING btree (user_id) 
  TABLESPACE pg_default;

CREATE INDEX IF NOT EXISTS idx_wtaf_uploads_status 
  ON public.wtaf_user_uploads USING btree (status) 
  TABLESPACE pg_default
  WHERE status = 'active';

CREATE INDEX IF NOT EXISTS idx_wtaf_uploads_user_number 
  ON public.wtaf_user_uploads USING btree (user_slug, upload_number) 
  TABLESPACE pg_default
  WHERE status = 'active';

CREATE INDEX IF NOT EXISTS idx_wtaf_uploads_created 
  ON public.wtaf_user_uploads USING btree (created_at DESC) 
  TABLESPACE pg_default;

-- Function to get next upload number for a user
CREATE OR REPLACE FUNCTION get_next_upload_number(p_user_slug TEXT)
RETURNS INTEGER AS $$
DECLARE
  next_number INTEGER;
BEGIN
  SELECT COALESCE(MAX(upload_number), 0) + 1 
  INTO next_number
  FROM wtaf_user_uploads
  WHERE user_slug = p_user_slug;
  
  RETURN next_number;
END;
$$ LANGUAGE plpgsql;

-- Function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_wtaf_uploads_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update updated_at
CREATE TRIGGER update_wtaf_uploads_updated_at_trigger
  BEFORE UPDATE ON public.wtaf_user_uploads
  FOR EACH ROW
  EXECUTE FUNCTION update_wtaf_uploads_updated_at();

-- Row Level Security (RLS) policies
ALTER TABLE public.wtaf_user_uploads ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own uploads
CREATE POLICY "Users can view own uploads" ON public.wtaf_user_uploads
  FOR SELECT
  USING (auth.uid() = user_id OR status = 'active');

-- Policy: Users can insert their own uploads (if DEGEN or higher role)
CREATE POLICY "DEGEN+ users can insert uploads" ON public.wtaf_user_uploads
  FOR INSERT
  WITH CHECK (
    auth.uid() = user_id AND 
    EXISTS (
      SELECT 1 FROM sms_subscribers 
      WHERE id = auth.uid() 
      AND role IN ('degen', 'admin', 'operator')
    )
  );

-- Policy: Users can update their own uploads
CREATE POLICY "Users can update own uploads" ON public.wtaf_user_uploads
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can soft delete their own uploads
CREATE POLICY "Users can delete own uploads" ON public.wtaf_user_uploads
  FOR DELETE
  USING (auth.uid() = user_id);

-- Add comment to table
COMMENT ON TABLE public.wtaf_user_uploads IS 'Stores user-uploaded files (images, etc.) for use in WEBTOYS creations';
COMMENT ON COLUMN public.wtaf_user_uploads.upload_number IS 'Sequential number per user, used for easy reference in SMS commands';
COMMENT ON COLUMN public.wtaf_user_uploads.display_name IS 'Optional user-friendly name for the upload';
COMMENT ON COLUMN public.wtaf_user_uploads.file_path IS 'Path within the og-images bucket (format: user-uploads/{user_id}/{filename})';
COMMENT ON COLUMN public.wtaf_user_uploads.file_url IS 'Full public URL to access the file from og-images bucket';
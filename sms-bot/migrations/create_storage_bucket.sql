-- Create storage bucket for user uploads
-- This needs to be run in the Supabase SQL editor

-- Create the bucket (if not exists)
INSERT INTO storage.buckets (id, name, public, avif_autodetection, file_size_limit, allowed_mime_types)
VALUES (
  'user-uploads',
  'user-uploads', 
  true, -- Public bucket so images can be displayed in apps
  false, -- No AVIF auto-detection for now
  5242880, -- 5MB file size limit
  ARRAY[
    'image/jpeg',
    'image/jpg', 
    'image/png',
    'image/gif',
    'image/webp',
    'image/svg+xml'
  ]::text[]
)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for the user-uploads bucket

-- Policy: Anyone can view files (public bucket)
CREATE POLICY "Public Access" ON storage.objects
  FOR SELECT
  USING (bucket_id = 'user-uploads');

-- Policy: Authenticated users with DEGEN+ role can upload
CREATE POLICY "DEGEN+ users can upload" ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'user-uploads' AND
    auth.role() = 'authenticated' AND
    EXISTS (
      SELECT 1 FROM sms_subscribers 
      WHERE supabase_id = auth.uid() 
      AND role IN ('degen', 'admin', 'operator')
    )
  );

-- Policy: Users can update their own files
CREATE POLICY "Users can update own files" ON storage.objects
  FOR UPDATE
  USING (
    bucket_id = 'user-uploads' AND
    auth.uid()::text = (storage.foldername(name))[1]
  )
  WITH CHECK (
    bucket_id = 'user-uploads' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- Policy: Users can delete their own files
CREATE POLICY "Users can delete own files" ON storage.objects
  FOR DELETE
  USING (
    bucket_id = 'user-uploads' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- Note: Files will be organized in folders by user_id
-- Path structure: user-uploads/{user_id}/{upload_number}_{filename}
-- Example: user-uploads/123e4567-e89b-12d3-a456-426614174000/1_birthday.jpg
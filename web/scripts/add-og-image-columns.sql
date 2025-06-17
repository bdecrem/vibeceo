-- Add OG image columns to wtaf_content table
-- These columns will store cached OG image URLs and timestamps

ALTER TABLE wtaf_content 
ADD COLUMN og_image_url TEXT,
ADD COLUMN og_image_cached_at TIMESTAMP WITH TIME ZONE;

-- Add comments to document the columns
COMMENT ON COLUMN wtaf_content.og_image_url IS 'Cached OG image URL from Supabase Storage (e.g., https://project.supabase.co/storage/v1/object/public/og-images/bart-amber-eagle-soaring.png)';
COMMENT ON COLUMN wtaf_content.og_image_cached_at IS 'Timestamp when the OG image was generated and cached';

-- Create index for faster queries on cached images
CREATE INDEX IF NOT EXISTS idx_wtaf_content_og_cached 
ON wtaf_content(og_image_url, og_image_cached_at) 
WHERE og_image_url IS NOT NULL; 
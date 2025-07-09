-- Add admin_token column to wtaf_content for secure admin access

BEGIN;

-- Add admin_token column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'wtaf_content' AND column_name = 'admin_token'
    ) THEN
        ALTER TABLE wtaf_content ADD COLUMN admin_token TEXT;
        
        -- Generate random tokens for existing apps
        UPDATE wtaf_content 
        SET admin_token = encode(gen_random_bytes(16), 'hex')
        WHERE admin_token IS NULL;
        
        RAISE NOTICE 'Added admin_token column and generated tokens for existing apps';
    ELSE
        RAISE NOTICE 'admin_token column already exists';
    END IF;
END $$;

COMMIT;

-- Verify the column was added
SELECT COUNT(*) as total_apps, 
       COUNT(admin_token) as apps_with_tokens
FROM wtaf_content; 
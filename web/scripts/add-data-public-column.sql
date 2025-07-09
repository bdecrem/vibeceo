-- Add data_is_public column to wtaf_content for submission data privacy control
-- NULL is treated as FALSE (private) in application logic

BEGIN;

-- Add data_is_public column if it doesn't exist (no default value)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'wtaf_content' AND column_name = 'data_is_public'
    ) THEN
        ALTER TABLE wtaf_content ADD COLUMN data_is_public BOOLEAN;
        
        RAISE NOTICE 'Added data_is_public column (NULL = private, TRUE = public)';
    ELSE
        RAISE NOTICE 'data_is_public column already exists';
    END IF;
END $$;

COMMIT;

-- Verify the column was added
SELECT COUNT(*) as total_apps, 
       COUNT(CASE WHEN data_is_public = true THEN 1 END) as apps_with_public_data,
       COUNT(CASE WHEN data_is_public IS NULL THEN 1 END) as apps_with_null_data
FROM wtaf_content; 
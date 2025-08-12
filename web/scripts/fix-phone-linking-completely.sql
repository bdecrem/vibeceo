-- This will properly set up bart's account to receive the email during merge
-- Run this BEFORE trying to link again

-- 1. Make sure bart's account exists with your phone but NO email
UPDATE sms_subscribers 
SET email = NULL,
    supabase_id = NULL
WHERE phone_number = '+16508989508';

-- 2. Check it worked
SELECT id, slug, phone_number, email, supabase_id 
FROM sms_subscribers 
WHERE phone_number = '+16508989508';
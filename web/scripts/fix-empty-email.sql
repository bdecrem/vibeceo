-- Check what's in the email field for bart's account
SELECT 
    id,
    slug,
    phone_number,
    email,
    CASE 
        WHEN email IS NULL THEN 'NULL'
        WHEN email = '' THEN 'EMPTY STRING'
        ELSE email
    END as email_status,
    supabase_id
FROM sms_subscribers
WHERE slug = 'bart' OR phone_number = '+16508989508';

-- Fix the empty email
UPDATE sms_subscribers
SET email = 'bdecrem@gmail.com'
WHERE slug = 'bart' AND (email = '' OR email IS NULL);
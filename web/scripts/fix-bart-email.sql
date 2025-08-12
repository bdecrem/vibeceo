-- Check if bart's account exists and what email it has
SELECT 
    id,
    slug,
    phone_number,
    email,
    supabase_id,
    role,
    created_at
FROM sms_subscribers
WHERE slug = 'bart'
OR phone_number LIKE '%2223334' -- bart's phone
OR email IS NOT NULL AND email LIKE '%bdecrem%';

-- If bart's account exists but email is missing, update it
-- Uncomment and run this after checking the above:
/*
UPDATE sms_subscribers
SET email = 'bdecrem@gmail.com'
WHERE slug = 'bart';
*/
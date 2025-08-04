-- Check all variations of bart/bdecrem emails
SELECT 
    id,
    slug,
    phone_number,
    email,
    supabase_id,
    role,
    created_at
FROM sms_subscribers
WHERE 
    email LIKE '%decrem%'
    OR slug = 'bart'
    OR phone_number = '+16508989508'
ORDER BY created_at;
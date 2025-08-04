-- Check all accounts for bdecrem@gmail.com
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
    email = 'bdecrem@gmail.com'
    OR supabase_id = 'e4c6ff1c-034b-4ce0-9d46-792ec659130f' -- The ID from the console logs
ORDER BY created_at DESC;
-- Simple SQL to clone a user for testing
-- Run this in Supabase SQL Editor

-- Replace this UUID with the one you want to clone
DO $$
DECLARE
    source_uuid UUID := 'a5167b9a-a718-4567-a22d-312b7bf9e773';  -- <-- CHANGE THIS
BEGIN
    -- Clone the record with phone number + 1 and modified slug
    INSERT INTO sms_subscribers (
        phone_number,
        slug,
        role,
        email,
        confirmed,
        consent_given,
        unsubscribed,
        is_admin,
        index_file,
        total_remix_credits,
        verification_code,
        verification_expires,
        created_at,
        updated_at
    )
    SELECT 
        -- Add 1 to the last digit of phone number
        CASE 
            WHEN phone_number IS NULL THEN NULL
            ELSE left(phone_number, -1) || (right(phone_number, 1)::int + 1)::text
        END,
        slug || '-test-' || extract(epoch from now())::int,  -- Add timestamp to make unique
        role,
        email,
        confirmed,
        consent_given,
        unsubscribed,
        is_admin,
        index_file,
        total_remix_credits,
        verification_code,
        verification_expires,
        NOW(),  -- New created_at timestamp (this triggers the email)
        NOW()
    FROM sms_subscribers
    WHERE id = source_uuid;
END $$;

-- To delete test users later:
-- DELETE FROM sms_subscribers WHERE slug LIKE '%-test-%';
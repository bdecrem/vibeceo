-- Create a web subscriber for bdecrem@gmail.com so phone linking can work
INSERT INTO sms_subscribers (
    supabase_id,
    email,
    slug,
    phone_number,
    role,
    consent_given,
    confirmed,
    email_confirmed,
    created_at
) VALUES (
    'e4c6ff1c-034b-4ce0-9d46-792ec659130f',
    'bdecrem@gmail.com',
    'testwebuser' || floor(random() * 1000), -- Random slug to avoid conflicts
    '+1555' || floor(1000000 + random() * 9000000)::text, -- Fake phone
    'coder',
    true,
    true,
    true,
    NOW()
);
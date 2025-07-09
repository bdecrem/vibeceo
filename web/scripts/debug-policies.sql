-- Debug script to check all policies and permissions

-- Check all policies on sms_subscribers
SELECT 
    schemaname, 
    tablename, 
    policyname, 
    roles,
    cmd as command_type,
    qual as using_clause,
    with_check as with_check_clause
FROM pg_policies 
WHERE tablename = 'sms_subscribers'
ORDER BY policyname;

-- Check table grants
SELECT 
    table_schema,
    table_name, 
    privilege_type, 
    grantee,
    is_grantable
FROM information_schema.role_table_grants 
WHERE table_name = 'sms_subscribers'
AND grantee IN ('anon', 'public', 'authenticated')
ORDER BY grantee, privilege_type;

-- Check if view exists and its grants
SELECT 
    table_schema,
    table_name, 
    privilege_type, 
    grantee,
    is_grantable
FROM information_schema.role_table_grants 
WHERE table_name = 'sms_subscribers_public'
ORDER BY grantee, privilege_type;

-- Check view definition
SELECT definition 
FROM pg_views 
WHERE viewname = 'sms_subscribers_public'; 
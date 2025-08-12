-- Delete a Supabase auth user
-- WARNING: This will prevent login with this email until they sign up again

-- First, check if the user exists in auth.users
SELECT id, email, created_at 
FROM auth.users 
WHERE email = 'bdecrem@gmail.com';

-- To delete the user, uncomment and run:
/*
DELETE FROM auth.users 
WHERE email = 'bdecrem@gmail.com';
*/

-- Note: This will cascade delete from auth.identities and other auth tables
-- The user will need to sign up again with this email
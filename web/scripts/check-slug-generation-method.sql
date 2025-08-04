-- Check for any default values, triggers, or functions related to slug generation

-- 1. Check column defaults
SELECT 
    column_name, 
    column_default,
    data_type
FROM information_schema.columns 
WHERE table_name = 'sms_subscribers' 
AND column_name = 'slug';

-- 2. Check for triggers on the table
SELECT 
    trigger_name,
    event_manipulation,
    action_statement
FROM information_schema.triggers
WHERE event_object_table = 'sms_subscribers';

-- 3. Look for any functions that might generate slugs
SELECT 
    routine_name,
    routine_definition
FROM information_schema.routines
WHERE routine_schema = 'public'
AND (routine_name LIKE '%slug%' OR routine_name LIKE '%generate%');

-- 4. Check if there are any RLS policies or other rules
SELECT * FROM pg_policies WHERE tablename = 'sms_subscribers';
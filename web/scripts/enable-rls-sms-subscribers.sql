-- Step 1: Enable Row Level Security on sms_subscribers table
-- This will immediately block all access until we create policies

BEGIN;

-- Enable RLS on sms_subscribers
ALTER TABLE sms_subscribers ENABLE ROW LEVEL SECURITY;

-- Show current RLS status
SELECT schemaname, tablename, rowsecurity, policyname
FROM pg_tables t
LEFT JOIN pg_policies p ON t.tablename = p.tablename
WHERE t.tablename = 'sms_subscribers';

COMMIT;

-- After running this:
-- ✅ RLS will be enabled
-- ❌ All access will be blocked until we create policies
-- 🔧 Next step: Create policies to allow legitimate access 
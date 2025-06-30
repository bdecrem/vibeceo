-- DATABASE RACE CONDITION PROTECTION
-- Add constraints to prevent duplicate/corrupted data during concurrent requests
-- Run this in Supabase SQL editor

-- 1. Prevent duplicate apps from same user (main race condition risk)
ALTER TABLE wtaf_content 
ADD CONSTRAINT unique_user_app_slug 
UNIQUE (user_slug, app_slug);

-- 2. Ensure user slugs are unique across all subscribers
ALTER TABLE sms_subscribers 
ADD CONSTRAINT unique_subscriber_slug 
UNIQUE (slug);

-- 3. Prevent duplicate phone numbers (should already exist, but ensuring)
ALTER TABLE sms_subscribers 
ADD CONSTRAINT unique_phone_number 
UNIQUE (phone_number);

-- 4. Prevent duplicate submission entries per app (skip if table structure unknown)
-- ALTER TABLE wtaf_submissions 
-- ADD CONSTRAINT unique_submission_per_app 
-- UNIQUE (app_id, created_at);  -- Uncomment if needed

-- These constraints will:
-- ✅ Prevent same user creating duplicate app slugs (MAIN PROTECTION)
-- ✅ Prevent slug collisions between users  
-- ✅ Prevent phone number registration conflicts
-- ✅ Make database operations fail gracefully instead of corrupting data

-- Note: If constraints already exist, these commands will show warnings but won't break anything 
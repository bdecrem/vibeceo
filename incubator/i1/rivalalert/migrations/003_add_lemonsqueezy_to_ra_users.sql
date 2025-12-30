-- Migration: Add LemonSqueezy subscription tracking to ra_users
-- Date: 2025-12-29
-- Purpose: Track subscription status for payment integration

ALTER TABLE ra_users
ADD COLUMN IF NOT EXISTS lemon_squeezy_subscription_id TEXT,
ADD COLUMN IF NOT EXISTS lemon_squeezy_customer_id TEXT,
ADD COLUMN IF NOT EXISTS subscription_status TEXT DEFAULT 'trial',
ADD COLUMN IF NOT EXISTS max_competitors INTEGER DEFAULT 3;

-- Create index for faster lookups by subscription ID
CREATE INDEX IF NOT EXISTS idx_ra_users_ls_subscription ON ra_users(lemon_squeezy_subscription_id);

-- Update existing users to have max_competitors based on plan
UPDATE ra_users
SET max_competitors = CASE
  WHEN plan = 'pro' THEN 10
  WHEN plan = 'standard' THEN 3
  ELSE 3
END
WHERE max_competitors IS NULL;

COMMENT ON COLUMN ra_users.lemon_squeezy_subscription_id IS 'LemonSqueezy subscription ID for webhook handling';
COMMENT ON COLUMN ra_users.lemon_squeezy_customer_id IS 'LemonSqueezy customer ID';
COMMENT ON COLUMN ra_users.subscription_status IS 'Subscription status: trial, active, cancelled, past_due, etc.';
COMMENT ON COLUMN ra_users.max_competitors IS 'Maximum number of competitors user can track based on plan';

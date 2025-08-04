-- Add payment and subscription fields to sms_subscribers table
-- This migration adds provider-neutral payment fields to support Lemon Squeezy or other payment providers

-- Add payment customer ID (provider-neutral)
ALTER TABLE sms_subscribers 
ADD COLUMN IF NOT EXISTS payment_customer_id VARCHAR(255);

-- Add subscription ID
ALTER TABLE sms_subscribers 
ADD COLUMN IF NOT EXISTS subscription_id VARCHAR(255);

-- Add subscription status
-- Values: 'active', 'canceled', 'past_due', 'trialing', 'paused'
ALTER TABLE sms_subscribers 
ADD COLUMN IF NOT EXISTS subscription_status VARCHAR(50);

-- Add subscription plan/tier
-- Values: 'free', 'pro', 'enterprise', or custom plan names
ALTER TABLE sms_subscribers 
ADD COLUMN IF NOT EXISTS subscription_plan VARCHAR(50) DEFAULT 'free';

-- Add subscription expiration date
ALTER TABLE sms_subscribers 
ADD COLUMN IF NOT EXISTS subscription_expires_at TIMESTAMP;

-- Add indexes for common queries
CREATE INDEX IF NOT EXISTS idx_sms_subscribers_payment_customer_id 
ON sms_subscribers(payment_customer_id);

CREATE INDEX IF NOT EXISTS idx_sms_subscribers_subscription_status 
ON sms_subscribers(subscription_status);

CREATE INDEX IF NOT EXISTS idx_sms_subscribers_subscription_plan 
ON sms_subscribers(subscription_plan);

-- Add comments for documentation
COMMENT ON COLUMN sms_subscribers.payment_customer_id IS 'Payment provider customer ID (e.g., Lemon Squeezy customer ID)';
COMMENT ON COLUMN sms_subscribers.subscription_id IS 'Payment provider subscription ID';
COMMENT ON COLUMN sms_subscribers.subscription_status IS 'Current subscription status: active, canceled, past_due, trialing, paused';
COMMENT ON COLUMN sms_subscribers.subscription_plan IS 'Subscription tier: free, pro, enterprise, etc.';
COMMENT ON COLUMN sms_subscribers.subscription_expires_at IS 'When the current subscription period ends';
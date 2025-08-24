-- Add credit tracking and payment fields to sms_subscribers table
-- This extends the existing payment fields migration with credit tracking

-- Add credit tracking fields
ALTER TABLE sms_subscribers 
ADD COLUMN IF NOT EXISTS credits_remaining INTEGER DEFAULT 0;

ALTER TABLE sms_subscribers 
ADD COLUMN IF NOT EXISTS usage_count INTEGER DEFAULT 0;

ALTER TABLE sms_subscribers 
ADD COLUMN IF NOT EXISTS last_usage_date TIMESTAMP;

-- Create payment transactions table for tracking purchases
CREATE TABLE IF NOT EXISTS payment_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    phone_number VARCHAR(20) NOT NULL,
    subscriber_id UUID REFERENCES sms_subscribers(id),
    
    -- LemonSqueezy fields
    lemonsqueezy_order_id VARCHAR(255) UNIQUE,
    lemonsqueezy_customer_id VARCHAR(255),
    
    -- Transaction details
    amount_cents INTEGER NOT NULL,
    currency VARCHAR(3) DEFAULT 'USD',
    credits_purchased INTEGER NOT NULL,
    
    -- Status tracking
    status VARCHAR(50) DEFAULT 'pending', -- pending, completed, failed, refunded
    
    -- Metadata
    payment_method VARCHAR(50),
    customer_email VARCHAR(255),
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT NOW(),
    completed_at TIMESTAMP,
    
    -- Store the raw webhook data for debugging
    webhook_data JSONB
);

-- Add indexes for common queries
CREATE INDEX IF NOT EXISTS idx_payment_transactions_phone_number 
ON payment_transactions(phone_number);

CREATE INDEX IF NOT EXISTS idx_payment_transactions_subscriber_id 
ON payment_transactions(subscriber_id);

CREATE INDEX IF NOT EXISTS idx_payment_transactions_lemonsqueezy_order_id 
ON payment_transactions(lemonsqueezy_order_id);

CREATE INDEX IF NOT EXISTS idx_payment_transactions_status 
ON payment_transactions(status);

CREATE INDEX IF NOT EXISTS idx_sms_subscribers_credits_remaining 
ON sms_subscribers(credits_remaining);

-- Add comments for documentation
COMMENT ON COLUMN sms_subscribers.credits_remaining IS 'Number of app creation credits remaining';
COMMENT ON COLUMN sms_subscribers.usage_count IS 'Total number of apps created by this user';
COMMENT ON COLUMN sms_subscribers.last_usage_date IS 'When the user last created an app';

COMMENT ON TABLE payment_transactions IS 'Tracks all payment transactions from LemonSqueezy';
COMMENT ON COLUMN payment_transactions.lemonsqueezy_order_id IS 'Order ID from LemonSqueezy webhook';
COMMENT ON COLUMN payment_transactions.credits_purchased IS 'Number of credits purchased in this transaction';
COMMENT ON COLUMN payment_transactions.webhook_data IS 'Raw webhook payload for debugging';
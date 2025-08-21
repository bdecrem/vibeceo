-- Add payment verification flag to distinguish payment verification from regular SMS verification
-- This prevents verification codes from being used across different flows for security

ALTER TABLE sms_subscribers 
ADD COLUMN IF NOT EXISTS payment_verification_active BOOLEAN DEFAULT NULL;

-- Add index for payment verification queries
CREATE INDEX IF NOT EXISTS idx_sms_subscribers_payment_verification 
ON sms_subscribers(payment_verification_active);

-- Add comment for documentation
COMMENT ON COLUMN sms_subscribers.payment_verification_active IS 'TRUE when verification code is for payment flow, NULL for regular SMS verification';
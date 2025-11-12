-- Add pending AIR subscription tracking to sms_subscribers
-- This allows subscription confirmations to persist across SMS requests
ALTER TABLE sms_subscribers
    ADD COLUMN IF NOT EXISTS pending_air_subscription JSONB;

-- Example structure:
-- {
--   "originalQuery": "reinforcement learning papers from California",
--   "cleanedQuery": "reinforcement learning papers from California",
--   "hasResults": true,
--   "timestamp": 1699876543210
-- }

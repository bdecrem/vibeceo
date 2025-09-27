-- Add AI Daily subscription tracking to sms_subscribers
ALTER TABLE sms_subscribers
    ADD COLUMN IF NOT EXISTS ai_daily_subscribed BOOLEAN DEFAULT false;

ALTER TABLE sms_subscribers
    ADD COLUMN IF NOT EXISTS ai_daily_last_sent_at TIMESTAMPTZ;

-- Index for faster lookup of subscribers who opted into AI Daily
CREATE INDEX IF NOT EXISTS idx_sms_subscribers_ai_daily_subscribed
    ON sms_subscribers (ai_daily_subscribed)
    WHERE ai_daily_subscribed = true;

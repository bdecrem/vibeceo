-- Migration: Add announcements subscription fields
-- Created: 2025-11-25
-- Description: Adds announcements_subscribed and announcements_last_sent_at fields to sms_subscribers table

ALTER TABLE sms_subscribers
ADD COLUMN IF NOT EXISTS announcements_subscribed boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS announcements_last_sent_at timestamptz;

-- Add comment for clarity
COMMENT ON COLUMN sms_subscribers.announcements_subscribed IS 'User opted in to receive periodic Kochi announcements/updates';
COMMENT ON COLUMN sms_subscribers.announcements_last_sent_at IS 'Timestamp of last announcement sent to this user';
 
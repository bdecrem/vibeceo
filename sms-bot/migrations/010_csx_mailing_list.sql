-- CTRL SHIFT Lab mailing list subscribers
-- Created: 2025-01-06

CREATE TABLE IF NOT EXISTS csx_mailing_list (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  name TEXT,
  subscribed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  unsubscribed_at TIMESTAMPTZ,
  source TEXT DEFAULT 'website',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for email lookups
CREATE INDEX IF NOT EXISTS idx_csx_mailing_list_email ON csx_mailing_list(email);

-- Index for active subscribers
CREATE INDEX IF NOT EXISTS idx_csx_mailing_list_active ON csx_mailing_list(subscribed_at)
  WHERE unsubscribed_at IS NULL;

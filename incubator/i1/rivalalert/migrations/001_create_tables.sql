-- RivalAlert Database Schema
-- Migration: 001_create_tables
-- Date: 2025-12-12

-- Users table
CREATE TABLE ra_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  plan TEXT DEFAULT 'starter', -- starter, pro
  max_competitors INT DEFAULT 3,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  lemon_customer_id TEXT,
  lemon_subscription_id TEXT
);

-- Tracked Competitors
CREATE TABLE ra_competitors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES ra_users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  website_url TEXT NOT NULL,
  monitor_pricing BOOLEAN DEFAULT true,
  monitor_jobs BOOLEAN DEFAULT false,
  monitor_features BOOLEAN DEFAULT true,
  last_checked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Website Snapshots (stores page content for diff comparison)
CREATE TABLE ra_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  competitor_id UUID REFERENCES ra_competitors(id) ON DELETE CASCADE,
  snapshot_type TEXT DEFAULT 'full', -- 'pricing', 'features', 'jobs', 'full'
  content_hash TEXT NOT NULL,
  content JSONB,
  captured_at TIMESTAMPTZ DEFAULT NOW()
);

-- Detected Changes
CREATE TABLE ra_changes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  competitor_id UUID REFERENCES ra_competitors(id) ON DELETE CASCADE,
  change_type TEXT NOT NULL, -- 'pricing', 'feature', 'job_posting', 'content'
  summary TEXT, -- AI-generated summary of the change
  old_value JSONB,
  new_value JSONB,
  ai_analysis TEXT,
  notified BOOLEAN DEFAULT false,
  detected_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for common queries
CREATE INDEX idx_ra_competitors_user ON ra_competitors(user_id);
CREATE INDEX idx_ra_snapshots_competitor ON ra_snapshots(competitor_id);
CREATE INDEX idx_ra_snapshots_captured ON ra_snapshots(captured_at DESC);
CREATE INDEX idx_ra_changes_competitor ON ra_changes(competitor_id);
CREATE INDEX idx_ra_changes_detected ON ra_changes(detected_at DESC);
CREATE INDEX idx_ra_changes_notified ON ra_changes(notified) WHERE notified = false;

-- Row Level Security
ALTER TABLE ra_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE ra_competitors ENABLE ROW LEVEL SECURITY;
ALTER TABLE ra_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE ra_changes ENABLE ROW LEVEL SECURITY;

-- RLS Policies (service role bypasses these)
CREATE POLICY "Users can view own data" ON ra_users
  FOR SELECT USING (auth.uid()::text = id::text);

CREATE POLICY "Users can view own competitors" ON ra_competitors
  FOR ALL USING (user_id IN (SELECT id FROM ra_users WHERE auth.uid()::text = id::text));

CREATE POLICY "Users can view own snapshots" ON ra_snapshots
  FOR SELECT USING (competitor_id IN (
    SELECT id FROM ra_competitors WHERE user_id IN (
      SELECT id FROM ra_users WHERE auth.uid()::text = id::text
    )
  ));

CREATE POLICY "Users can view own changes" ON ra_changes
  FOR SELECT USING (competitor_id IN (
    SELECT id FROM ra_competitors WHERE user_id IN (
      SELECT id FROM ra_users WHERE auth.uid()::text = id::text
    )
  ));

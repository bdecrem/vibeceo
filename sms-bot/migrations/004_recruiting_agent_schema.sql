-- Recruiting Agent Schema
-- Migration 004: Add Supabase support for recruiting agent with learning system

-- Single table for all recruiting candidates and tracking
-- Each user can have multiple recruiting projects (e.g., "React devs", "ML engineers")
CREATE TABLE IF NOT EXISTS recruiting_candidates (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  subscriber_id uuid NOT NULL REFERENCES sms_subscribers(id) ON DELETE CASCADE,

  -- Project tracking (allows multiple recruiting projects per user)
  project_id uuid NOT NULL,  -- Links to project in agent_subscriptions.preferences

  -- Candidate data
  name text NOT NULL,
  title text,
  company text,
  company_size text,  -- 'startup', 'midsize', 'enterprise'
  location text,
  linkedin_url text,
  twitter_handle text,
  match_reason text,  -- Why this candidate matches the query
  recent_activity text,  -- Recent tweets/signals
  source text,  -- 'linkedin', 'twitter', 'both'

  -- Raw data for AI learning (full profile from Apify)
  raw_profile jsonb DEFAULT '{}',

  -- Report tracking
  report_type text,  -- 'setup' (initial 10) or 'daily' (3 per day), NULL if not yet shown
  report_date date,  -- Date shown to user, NULL if not yet shown
  position_in_report int,  -- 1-10 (setup) or 1-3 (daily), NULL if not yet shown

  -- Scoring & learning
  user_score int CHECK (user_score >= 1 AND user_score <= 5),  -- 1-5 rating, NULL until scored
  scored_at timestamptz,

  created_at timestamptz DEFAULT now(),

  -- Prevent duplicate candidates per project (either by LinkedIn or Twitter)
  UNIQUE(project_id, linkedin_url),
  UNIQUE(project_id, twitter_handle)
);

-- Indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_recruiting_candidates_project
  ON recruiting_candidates(project_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_recruiting_candidates_not_shown
  ON recruiting_candidates(project_id)
  WHERE report_date IS NULL;

CREATE INDEX IF NOT EXISTS idx_recruiting_candidates_scored
  ON recruiting_candidates(project_id, user_score)
  WHERE user_score IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_recruiting_candidates_report_date
  ON recruiting_candidates(project_id, report_date DESC)
  WHERE report_date IS NOT NULL;

COMMENT ON TABLE recruiting_candidates IS 'All recruiting candidates with scoring and tracking. Single table for both setup and daily reports.';
COMMENT ON COLUMN recruiting_candidates.project_id IS 'UUID identifying the recruiting project (e.g., "React developers", "ML engineers"). Stored in agent_subscriptions.preferences.projects map.';
COMMENT ON COLUMN recruiting_candidates.report_type IS 'Type of report where shown: "setup" for initial 10 diverse candidates, "daily" for 3 matched candidates, NULL if not yet shown';
COMMENT ON COLUMN recruiting_candidates.report_date IS 'Date this candidate was shown to user, NULL if not yet shown';
COMMENT ON COLUMN recruiting_candidates.user_score IS 'User rating 1-5 stars where 5=great match, 1=poor match, NULL until scored';
COMMENT ON COLUMN recruiting_candidates.raw_profile IS 'Full profile data from Apify for AI learning and pattern analysis';

-- Enable Row Level Security (RLS)
ALTER TABLE recruiting_candidates ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Only service role can access (server-side only)
DROP POLICY IF EXISTS "Service role can manage recruiting_candidates" ON recruiting_candidates;

CREATE POLICY "Service role can manage recruiting_candidates"
  ON recruiting_candidates
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Verification queries (run these manually to verify migration)
-- SELECT table_name FROM information_schema.tables WHERE table_name = 'recruiting_candidates';
-- SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'recruiting_candidates' ORDER BY ordinal_position;

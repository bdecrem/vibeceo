-- Migration: Create Tokenshots Tables
-- Description: Tables for tracking research papers/ideas for the Tokenshots daily show
-- Created: 2025-12-11

-- ============================================================================
-- Enable pg_trgm extension for fuzzy title matching
-- ============================================================================
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- ============================================================================
-- Table: tokenshots_papers
-- Stores all ingested papers/ideas with screening results and feature tracking
-- ============================================================================

CREATE TABLE IF NOT EXISTS tokenshots_papers (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Source identification
  source_type text NOT NULL,  -- 'arxiv', 'hackernews', 'reddit', 'curated'
  source_id text NOT NULL,    -- arxiv_id, hn_id, reddit_id, or curated slug
  arxiv_id text,              -- Normalized arxiv ID if available (for cross-source dedup)

  -- Content
  title text NOT NULL,
  abstract text,
  url text,
  authors text[],             -- Author names if available

  -- Screening results
  stage1_passed boolean DEFAULT false,
  stage1_tags text[],         -- ['capability_unlock', 'efficiency_jump', etc.]
  stage1_reason text,
  stage2_passed boolean DEFAULT false,
  stage2_score integer,       -- 0-100 score
  desperate_user text,        -- Who is suffering without this?
  obvious_business text,      -- What's the commercial play?

  -- Feature tracking (prevents re-featuring)
  featured_in_episode boolean DEFAULT false,
  featured_date date,
  featured_rank integer,      -- 1-4 position in episode

  -- Timestamps
  ingested_at timestamptz NOT NULL DEFAULT now(),
  screened_at timestamptz,

  -- Constraints
  UNIQUE(source_type, source_id)
);

-- Unique constraint on arxiv_id when present (allows NULL)
CREATE UNIQUE INDEX idx_tokenshots_arxiv_unique
  ON tokenshots_papers(arxiv_id)
  WHERE arxiv_id IS NOT NULL;

-- For fuzzy title matching (pg_trgm)
CREATE INDEX idx_tokenshots_title_trgm
  ON tokenshots_papers USING gin(title gin_trgm_ops);

-- For querying featured papers
CREATE INDEX idx_tokenshots_featured
  ON tokenshots_papers(featured_in_episode, featured_date DESC)
  WHERE featured_in_episode = true;

-- For source lookups
CREATE INDEX idx_tokenshots_source
  ON tokenshots_papers(source_type, source_id);

-- For recent ingestion queries
CREATE INDEX idx_tokenshots_ingested
  ON tokenshots_papers(ingested_at DESC);

-- For screening pipeline queries
CREATE INDEX idx_tokenshots_screening
  ON tokenshots_papers(stage1_passed, stage2_passed, stage2_score DESC);

-- ============================================================================
-- Table: tokenshots_episodes
-- Metadata about each day's episode
-- ============================================================================

CREATE TABLE IF NOT EXISTS tokenshots_episodes (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Episode identification
  episode_date date UNIQUE NOT NULL,

  -- Content paths
  report_path text,           -- Supabase Storage path for markdown
  audio_path text,            -- Supabase Storage path for MP3
  report_url text,            -- Public URL to report
  audio_url text,             -- Public URL to audio

  -- Episode metadata
  title text,                 -- Episode title
  summary text,               -- SMS-friendly summary
  paper_count integer DEFAULT 4,

  -- Generation stats
  total_papers_ingested integer,
  stage1_survivors integer,
  stage2_survivors integer,
  generation_duration_seconds integer,

  -- Timestamps
  generated_at timestamptz NOT NULL DEFAULT now(),
  published_at timestamptz
);

CREATE INDEX idx_tokenshots_episodes_date
  ON tokenshots_episodes(episode_date DESC);

-- ============================================================================
-- Comments for documentation
-- ============================================================================

COMMENT ON TABLE tokenshots_papers IS 'All papers/ideas ingested for Tokenshots with screening results and feature tracking';
COMMENT ON TABLE tokenshots_episodes IS 'Metadata for each Tokenshots episode';

COMMENT ON COLUMN tokenshots_papers.arxiv_id IS 'Normalized arxiv ID extracted from any URL - enables cross-source dedup';
COMMENT ON COLUMN tokenshots_papers.stage1_tags IS 'Tags from stage 1 screening: capability_unlock, efficiency_jump, automation, problem_clarity';
COMMENT ON COLUMN tokenshots_papers.stage2_score IS 'Composite score from Q1 (agent delivery) + Q2 (desperate user) + Q3 (obvious business)';
COMMENT ON COLUMN tokenshots_papers.featured_rank IS '1-4 position in the episode (1 = first item discussed)';

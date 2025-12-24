-- Progressive Search Agent System - Initial Schema
-- Migration: 001
-- Description: Create core tables for progressive search workflow

-- ============================================================================
-- Table: ps_projects
-- Core project record tracking search workflow state
-- ============================================================================

CREATE TABLE ps_projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Category & Status
  category VARCHAR(50) NOT NULL,  -- 'leadgen', 'recruiting', 'job_search', 'pet_adoption', etc.
  status VARCHAR(20) DEFAULT 'refining_query',  -- 'refining_query', 'discovering_channels', 'searching', 'completed'

  -- Search Subject
  initial_subject TEXT NOT NULL,  -- What user first asked for
  clarified_subject TEXT,  -- Refined subject after Step 1
  clarified_at TIMESTAMPTZ,

  -- Completion
  is_complete BOOLEAN DEFAULT false,
  winner_result_id UUID,  -- Reference to ps_results.id (set when user marks winner)
  completed_at TIMESTAMPTZ,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by VARCHAR(100),  -- User ID or 'system'

  CONSTRAINT valid_status CHECK (status IN ('refining_query', 'discovering_channels', 'searching', 'completed'))
);

CREATE INDEX idx_ps_projects_status ON ps_projects(status);
CREATE INDEX idx_ps_projects_category ON ps_projects(category);
CREATE INDEX idx_ps_projects_created_by ON ps_projects(created_by);

-- ============================================================================
-- Table: ps_conversation
-- Conversation history for each step (one row per message)
-- ============================================================================

CREATE TABLE ps_conversation (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES ps_projects(id) ON DELETE CASCADE,

  -- Step tracking
  step INTEGER NOT NULL,  -- 1 (clarify), 2 (discover), 3 (search)

  -- Message
  role VARCHAR(20) NOT NULL,  -- 'user', 'assistant'
  content TEXT NOT NULL,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT valid_step CHECK (step IN (1, 2, 3)),
  CONSTRAINT valid_role CHECK (role IN ('user', 'assistant'))
);

CREATE INDEX idx_ps_conversation_project ON ps_conversation(project_id, step, created_at);

-- ============================================================================
-- Table: ps_channels
-- Discovered channels (websites/sources) with ratings
-- ============================================================================

CREATE TABLE ps_channels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES ps_projects(id) ON DELETE CASCADE,

  -- Channel info
  name VARCHAR(200) NOT NULL,  -- "LinkedIn Jobs", "Indeed", "GitHub", etc.
  url TEXT,  -- Base URL or search URL template
  description TEXT,
  channel_type VARCHAR(50),  -- 'job_board', 'professional_network', 'code_repo', etc.

  -- Rating (agent sets initially, user can update)
  rating INTEGER NOT NULL DEFAULT 5,  -- 1-10

  -- Status
  is_approved BOOLEAN DEFAULT false,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT valid_rating CHECK (rating >= 1 AND rating <= 10)
);

CREATE INDEX idx_ps_channels_project ON ps_channels(project_id);
CREATE INDEX idx_ps_channels_approved ON ps_channels(project_id, is_approved) WHERE is_approved = true;

-- ============================================================================
-- Table: ps_results
-- Search results (leads, candidates, jobs, listings)
-- Agent checks previous results in context to avoid duplicates
-- ============================================================================

CREATE TABLE ps_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES ps_projects(id) ON DELETE CASCADE,
  channel_id UUID REFERENCES ps_channels(id) ON DELETE SET NULL,

  -- Result data
  title VARCHAR(500) NOT NULL,  -- Person name, job title, company name, etc.
  subtitle VARCHAR(500),  -- Location, company, role, etc.
  description TEXT,  -- Bio, job description, details
  url TEXT NOT NULL,  -- Link to profile, listing, posting

  -- Additional fields (flexible JSON for category-specific data)
  metadata JSONB DEFAULT '{}',  -- Email, phone, salary, experience, etc.

  -- Dates (nullable - not all categories need these)
  deadline TIMESTAMPTZ,  -- For job postings, application deadlines, etc.
  last_updated TIMESTAMPTZ,  -- When listing was last updated on source site
  found_at TIMESTAMPTZ DEFAULT NOW(),  -- When agent found this

  -- User feedback
  user_rating INTEGER,  -- 1-10
  user_notes TEXT,
  is_favorite BOOLEAN DEFAULT false,
  is_contacted BOOLEAN DEFAULT false,
  is_winner BOOLEAN DEFAULT false,  -- Final selection

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT valid_user_rating CHECK (user_rating IS NULL OR (user_rating >= 1 AND user_rating <= 10))
);

CREATE INDEX idx_ps_results_project ON ps_results(project_id, created_at DESC);
CREATE INDEX idx_ps_results_favorites ON ps_results(project_id, is_favorite) WHERE is_favorite = true;
CREATE INDEX idx_ps_results_winner ON ps_results(project_id, is_winner) WHERE is_winner = true;

-- ============================================================================
-- Comments for documentation
-- ============================================================================

COMMENT ON TABLE ps_projects IS 'Core project records for progressive search workflow';
COMMENT ON TABLE ps_conversation IS 'Conversation history - one row per message for each project step';
COMMENT ON TABLE ps_channels IS 'Discovered search channels with user-updatable ratings';
COMMENT ON TABLE ps_results IS 'Search results with user feedback (ratings, notes, favorites)';

COMMENT ON COLUMN ps_projects.status IS 'Workflow stage: refining_query -> discovering_channels -> searching -> completed';
COMMENT ON COLUMN ps_conversation.step IS 'Which step this conversation belongs to: 1=clarify, 2=discover, 3=search';
COMMENT ON COLUMN ps_channels.rating IS 'Agent sets initial rating, user can update (1-10 scale)';
COMMENT ON COLUMN ps_results.metadata IS 'Flexible JSON for category-specific fields (salary, experience, etc)';

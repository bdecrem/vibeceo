-- Migration: Create arXiv Research Agent Tables
-- Description: Tables for storing AI research papers from arXiv.org with author tracking and notability scoring
-- Created: 2025-10-20

-- ============================================================================
-- Table 1: arxiv_papers
-- Stores ALL AI papers fetched from arXiv, with significance signals
-- ============================================================================

CREATE TABLE IF NOT EXISTS arxiv_papers (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Core arXiv metadata
  arxiv_id text UNIQUE NOT NULL,  -- e.g., "2501.12345v1"
  title text NOT NULL,
  abstract text,
  categories text[] NOT NULL,  -- ["cs.AI", "cs.LG", "cs.CV"]
  published_date date NOT NULL,
  arxiv_url text NOT NULL,
  pdf_url text NOT NULL,

  -- Significance signals (updated over time)
  author_notability_score integer DEFAULT 0,  -- Sum of all authors' scores
  huggingface_trending boolean DEFAULT false,
  huggingface_upvotes integer DEFAULT 0,
  citation_count integer DEFAULT 0,  -- For future: Semantic Scholar API

  -- Curation metadata (for featured papers in daily report)
  featured_in_report boolean DEFAULT false,
  featured_date date,  -- Date when featured
  featured_rank integer,  -- 1-10 ranking in that day's report
  curation_reason text,  -- Why Claude selected this paper

  -- Timestamps
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Indexes for arxiv_papers
CREATE INDEX IF NOT EXISTS idx_arxiv_papers_arxiv_id ON arxiv_papers(arxiv_id);
CREATE INDEX IF NOT EXISTS idx_arxiv_papers_published_date ON arxiv_papers(published_date DESC);
CREATE INDEX IF NOT EXISTS idx_arxiv_papers_featured ON arxiv_papers(featured_in_report, featured_date DESC) WHERE featured_in_report = true;
CREATE INDEX IF NOT EXISTS idx_arxiv_papers_notability ON arxiv_papers(author_notability_score DESC);
CREATE INDEX IF NOT EXISTS idx_arxiv_papers_categories ON arxiv_papers USING gin(categories);

-- ============================================================================
-- Table 2: arxiv_authors
-- Stores ALL unique authors with notability tracking and external profiles
-- ============================================================================

CREATE TABLE IF NOT EXISTS arxiv_authors (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Identity
  name text UNIQUE NOT NULL,  -- Normalized author name

  -- External profiles (for future enrichment)
  github_username text,
  huggingface_username text,
  twitter_username text,
  google_scholar_id text,
  homepage_url text,

  -- Notability signals (updated over time)
  notability_score integer DEFAULT 0,  -- Calculated composite score
  paper_count integer DEFAULT 0,  -- Total papers authored
  featured_paper_count integer DEFAULT 0,  -- Number of top-10 featured papers
  h_index integer,  -- For future: Google Scholar API
  github_stars integer DEFAULT 0,  -- Sum of stars across all repos

  -- Metadata
  affiliations text[],  -- ["Stanford University", "Google Brain"]
  research_areas text[],  -- Extracted from paper categories
  first_seen_date date,  -- First paper we saw from this author
  last_paper_date date,  -- Most recent paper

  -- Timestamps
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Indexes for arxiv_authors
CREATE INDEX IF NOT EXISTS idx_arxiv_authors_name ON arxiv_authors(name);
CREATE INDEX IF NOT EXISTS idx_arxiv_authors_notability ON arxiv_authors(notability_score DESC);
CREATE INDEX IF NOT EXISTS idx_arxiv_authors_github ON arxiv_authors(github_username) WHERE github_username IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_arxiv_authors_paper_count ON arxiv_authors(paper_count DESC);
CREATE INDEX IF NOT EXISTS idx_arxiv_authors_last_paper ON arxiv_authors(last_paper_date DESC);

-- ============================================================================
-- Table 3: arxiv_paper_authors
-- Junction table for many-to-many relationship between papers and authors
-- ============================================================================

CREATE TABLE IF NOT EXISTS arxiv_paper_authors (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),

  paper_id uuid NOT NULL REFERENCES arxiv_papers(id) ON DELETE CASCADE,
  author_id uuid NOT NULL REFERENCES arxiv_authors(id) ON DELETE CASCADE,
  author_position integer NOT NULL,  -- 1 = first author, 2 = second, etc.

  UNIQUE(paper_id, author_id)
);

-- Indexes for arxiv_paper_authors
CREATE INDEX IF NOT EXISTS idx_paper_authors_paper ON arxiv_paper_authors(paper_id);
CREATE INDEX IF NOT EXISTS idx_paper_authors_author ON arxiv_paper_authors(author_id);
CREATE INDEX IF NOT EXISTS idx_paper_authors_position ON arxiv_paper_authors(author_position);

-- ============================================================================
-- Table 4: arxiv_daily_reports
-- Metadata about each day's curated report
-- ============================================================================

CREATE TABLE IF NOT EXISTS arxiv_daily_reports (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Report identification
  report_date date UNIQUE NOT NULL,

  -- Report statistics
  total_papers_fetched integer NOT NULL,  -- How many papers were available
  featured_papers_count integer NOT NULL,  -- How many we curated (5-10)
  notable_authors_count integer,  -- Authors highlighted in report

  -- Storage paths
  report_path text NOT NULL,  -- Supabase Storage path (e.g., "arxiv-daily/reports/2025-10-20.md")
  report_url text NOT NULL,  -- Public URL to report
  summary text NOT NULL,  -- Executive summary for SMS

  -- Generation metadata
  generation_duration_seconds integer,
  generated_at timestamptz NOT NULL DEFAULT now()
);

-- Indexes for arxiv_daily_reports
CREATE INDEX IF NOT EXISTS idx_arxiv_reports_date ON arxiv_daily_reports(report_date DESC);

-- ============================================================================
-- Helper Functions
-- ============================================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers to auto-update updated_at
CREATE TRIGGER update_arxiv_papers_updated_at BEFORE UPDATE ON arxiv_papers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_arxiv_authors_updated_at BEFORE UPDATE ON arxiv_authors
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- Comments for documentation
-- ============================================================================

COMMENT ON TABLE arxiv_papers IS 'Stores all AI/ML papers fetched from arXiv.org with curation metadata';
COMMENT ON TABLE arxiv_authors IS 'Tracks all unique authors with notability scores and external profiles';
COMMENT ON TABLE arxiv_paper_authors IS 'Many-to-many relationship between papers and authors with authorship position';
COMMENT ON TABLE arxiv_daily_reports IS 'Metadata for each day''s curated research report';

COMMENT ON COLUMN arxiv_papers.author_notability_score IS 'Sum of notability scores of all authors on this paper';
COMMENT ON COLUMN arxiv_papers.featured_in_report IS 'Whether this paper was featured in a daily report (top 5-10)';
COMMENT ON COLUMN arxiv_authors.notability_score IS 'Composite score based on papers, citations, GitHub stars, etc.';
COMMENT ON COLUMN arxiv_paper_authors.author_position IS '1-indexed position in author list (1=first author)';

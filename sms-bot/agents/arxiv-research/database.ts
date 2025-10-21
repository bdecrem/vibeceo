/**
 * Database module for arXiv Research Agent
 *
 * Handles all database operations for arxiv_papers, arxiv_authors,
 * arxiv_paper_authors, and arxiv_daily_reports tables.
 *
 * Follows the storage-manager pattern: ALL Supabase calls isolated here.
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// ============================================================================
// Type Definitions
// ============================================================================

export interface ArxivPaper {
  arxiv_id: string;
  title: string;
  abstract: string;
  categories: string[];
  published_date: string; // YYYY-MM-DD
  arxiv_url: string;
  pdf_url: string;
  primary_category?: string;
}

export interface ArxivAuthor {
  name: string;
  affiliation?: string | null;
}

export interface PaperAuthorLink {
  arxiv_id: string; // Paper identifier
  author_name: string; // Author identifier
  position: number; // 1-indexed author position
}

export interface FeaturedPaper {
  arxiv_id: string;
  featured_rank: number;
  curation_reason: string;
}

export interface StoredPaper {
  id: string;
  arxiv_id: string;
  title: string;
  abstract: string;
  categories: string[];
  published_date: string;
  arxiv_url: string;
  pdf_url: string;
  author_notability_score: number;
  featured_in_report: boolean;
  created_at: string;
}

export interface StoredAuthor {
  id: string;
  name: string;
  notability_score: number;
  paper_count: number;
  featured_paper_count: number;
  affiliations: string[];
  research_areas: string[];
  first_seen_date: string;
  last_paper_date: string;
  github_username: string | null;
  huggingface_username: string | null;
  google_scholar_id: string | null;
  github_stars: number | null;
  h_index: number | null;
}

export interface DailyReportMetadata {
  report_date: string;
  total_papers_fetched: number;
  featured_papers_count: number;
  notable_authors_count: number | null;
  report_path: string;
  report_url: string;
  summary: string;
  generation_duration_seconds: number | null;
}

// ============================================================================
// Paper Operations
// ============================================================================

/**
 * Store all papers from daily fetch
 * Returns array of stored paper IDs
 */
export async function storePapers(papers: ArxivPaper[]): Promise<string[]> {
  if (papers.length === 0) {
    return [];
  }

  const paperRecords = papers.map((paper) => ({
    arxiv_id: paper.arxiv_id,
    title: paper.title,
    abstract: paper.abstract,
    categories: paper.categories,
    published_date: paper.published_date,
    arxiv_url: paper.arxiv_url,
    pdf_url: paper.pdf_url,
  }));

  const { data, error } = await supabase
    .from('arxiv_papers')
    .upsert(paperRecords, {
      onConflict: 'arxiv_id',
      ignoreDuplicates: false, // Update if already exists
    })
    .select('id');

  if (error) {
    throw new Error(`Failed to store papers: ${error.message}`);
  }

  return data.map((row) => row.id);
}

/**
 * Mark specific papers as featured in daily report
 */
export async function markPapersFeatured(
  featuredPapers: FeaturedPaper[],
  featuredDate: string
): Promise<void> {
  if (featuredPapers.length === 0) {
    return;
  }

  // Update each featured paper
  for (const featured of featuredPapers) {
    const { error } = await supabase
      .from('arxiv_papers')
      .update({
        featured_in_report: true,
        featured_date: featuredDate,
        featured_rank: featured.featured_rank,
        curation_reason: featured.curation_reason,
      })
      .eq('arxiv_id', featured.arxiv_id);

    if (error) {
      throw new Error(`Failed to mark paper as featured: ${error.message}`);
    }
  }
}

/**
 * Get paper by arXiv ID
 */
export async function getPaperByArxivId(arxivId: string): Promise<StoredPaper | null> {
  const { data, error } = await supabase
    .from('arxiv_papers')
    .select('*')
    .eq('arxiv_id', arxivId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      // Not found
      return null;
    }
    throw new Error(`Failed to get paper: ${error.message}`);
  }

  return data;
}

/**
 * Check if paper already exists
 */
export async function checkDuplicatePaper(arxivId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('arxiv_papers')
    .select('arxiv_id')
    .eq('arxiv_id', arxivId)
    .single();

  if (error && error.code !== 'PGRST116') {
    throw new Error(`Failed to check duplicate: ${error.message}`);
  }

  return data !== null;
}

// ============================================================================
// Author Operations
// ============================================================================

/**
 * Upsert authors (insert new, update existing)
 * Returns map of author name to author ID
 *
 * @param authors - Array of authors to upsert
 * @param authorDates - Map of author name to their most recent paper date
 */
export async function upsertAuthors(
  authors: ArxivAuthor[],
  authorDates: Map<string, string>
): Promise<Map<string, string>> {
  if (authors.length === 0) {
    return new Map();
  }

  const authorMap = new Map<string, string>();

  for (const author of authors) {
    // Get this author's most recent paper date
    const paperDate = authorDates.get(author.name);
    if (!paperDate) {
      console.warn(`No date found for author ${author.name}, skipping`);
      continue;
    }

    // Check if author exists
    const { data: existing, error: selectError } = await supabase
      .from('arxiv_authors')
      .select('id, first_seen_date, last_paper_date, affiliations')
      .eq('name', author.name)
      .single();

    if (selectError && selectError.code !== 'PGRST116') {
      throw new Error(`Failed to check author: ${selectError.message}`);
    }

    if (existing) {
      // Author exists - update last_paper_date only if this paper is newer
      const updatedAffiliations = existing.affiliations || [];
      if (author.affiliation && !updatedAffiliations.includes(author.affiliation)) {
        updatedAffiliations.push(author.affiliation);
      }

      // Only update last_paper_date if this paper is newer than existing
      const shouldUpdateDate = !existing.last_paper_date || paperDate > existing.last_paper_date;

      const { error: updateError } = await supabase
        .from('arxiv_authors')
        .update({
          last_paper_date: shouldUpdateDate ? paperDate : existing.last_paper_date,
          affiliations: updatedAffiliations,
        })
        .eq('name', author.name);

      if (updateError) {
        throw new Error(`Failed to update author: ${updateError.message}`);
      }

      authorMap.set(author.name, existing.id);
    } else {
      // New author - insert
      const { data: inserted, error: insertError } = await supabase
        .from('arxiv_authors')
        .insert({
          name: author.name,
          affiliations: author.affiliation ? [author.affiliation] : [],
          first_seen_date: paperDate,
          last_paper_date: paperDate,
          paper_count: 0, // Will be updated after linking
          featured_paper_count: 0,
          notability_score: 0,
        })
        .select('id')
        .single();

      if (insertError) {
        throw new Error(`Failed to insert author: ${insertError.message}`);
      }

      authorMap.set(author.name, inserted.id);
    }
  }

  return authorMap;
}

/**
 * Get author by name
 */
export async function getAuthorByName(name: string): Promise<StoredAuthor | null> {
  const { data, error } = await supabase
    .from('arxiv_authors')
    .select('*')
    .eq('name', name)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return null;
    }
    throw new Error(`Failed to get author: ${error.message}`);
  }

  return data;
}

/**
 * Get author by ID
 */
export async function getAuthorById(authorId: string): Promise<StoredAuthor | null> {
  const { data, error } = await supabase
    .from('arxiv_authors')
    .select('*')
    .eq('id', authorId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return null;
    }
    throw new Error(`Failed to get author: ${error.message}`);
  }

  return data;
}

// ============================================================================
// Paper-Author Link Operations
// ============================================================================

/**
 * Link papers to authors via junction table
 */
export async function linkPaperAuthors(links: PaperAuthorLink[]): Promise<void> {
  if (links.length === 0) {
    return;
  }

  // Get paper IDs and author IDs
  for (const link of links) {
    const paper = await getPaperByArxivId(link.arxiv_id);
    const author = await getAuthorByName(link.author_name);

    if (!paper || !author) {
      console.error(`Cannot link: paper or author not found`, link);
      continue;
    }

    // Insert link (ignore if already exists)
    const { error } = await supabase
      .from('arxiv_paper_authors')
      .upsert(
        {
          paper_id: paper.id,
          author_id: author.id,
          author_position: link.position,
        },
        {
          onConflict: 'paper_id,author_id',
          ignoreDuplicates: true,
        }
      );

    if (error) {
      throw new Error(`Failed to link paper-author: ${error.message}`);
    }
  }
}

/**
 * Get all papers by an author
 */
export async function getPapersByAuthor(authorId: string): Promise<StoredPaper[]> {
  const { data, error } = await supabase
    .from('arxiv_paper_authors')
    .select('paper_id, arxiv_papers(*)')
    .eq('author_id', authorId);

  if (error) {
    throw new Error(`Failed to get papers by author: ${error.message}`);
  }

  return data.map((row: any) => row.arxiv_papers);
}

/**
 * Get all authors of a paper
 */
export async function getAuthorsByPaper(paperId: string): Promise<StoredAuthor[]> {
  const { data, error } = await supabase
    .from('arxiv_paper_authors')
    .select('author_id, author_position, arxiv_authors(*)')
    .eq('paper_id', paperId)
    .order('author_position', { ascending: true });

  if (error) {
    throw new Error(`Failed to get authors by paper: ${error.message}`);
  }

  return data.map((row: any) => row.arxiv_authors);
}

// ============================================================================
// Author Notability Scoring
// ============================================================================

/**
 * Calculate and update notability score for an author
 * Returns the new score
 */
export async function updateAuthorNotability(authorId: string): Promise<number> {
  const author = await getAuthorById(authorId);
  if (!author) {
    throw new Error(`Author not found: ${authorId}`);
  }

  // Count total papers and featured papers
  const { count: totalPapers, error: countError } = await supabase
    .from('arxiv_paper_authors')
    .select('*', { count: 'exact', head: true })
    .eq('author_id', authorId);

  if (countError) {
    throw new Error(`Failed to count papers: ${countError.message}`);
  }

  // Count featured papers
  const { data: featuredLinks, error: featuredError } = await supabase
    .from('arxiv_paper_authors')
    .select('paper_id, arxiv_papers!inner(featured_in_report)')
    .eq('author_id', authorId)
    .eq('arxiv_papers.featured_in_report', true);

  if (featuredError) {
    throw new Error(`Failed to count featured papers: ${featuredError.message}`);
  }

  const featuredCount = featuredLinks?.length || 0;
  const paperCount = totalPapers || 0;

  // Calculate notability score
  // Formula: (paper_count * 5) + (featured_count * 50) + (github_stars / 10) + bonuses
  let score = 0;

  score += paperCount * 5; // 5 points per paper
  score += featuredCount * 50; // 50 points per featured paper

  // Add GitHub stars if available
  if (author.github_stars) {
    score += Math.floor(author.github_stars / 10); // 1 point per 10 stars
  }

  // Add h-index if available
  if (author.h_index) {
    score += author.h_index * 10; // 10 points per h-index point
  }

  // Bonuses for profile presence
  if (author.github_username) score += 20;
  if (author.huggingface_username) score += 20;
  if (author.google_scholar_id) score += 30;

  // Update the author record
  const { error: updateError } = await supabase
    .from('arxiv_authors')
    .update({
      paper_count: paperCount,
      featured_paper_count: featuredCount,
      notability_score: score,
    })
    .eq('id', authorId);

  if (updateError) {
    throw new Error(`Failed to update author notability: ${updateError.message}`);
  }

  return score;
}

/**
 * Update author notability score for a paper (sum of all author scores)
 */
export async function updatePaperAuthorNotability(arxivId: string): Promise<number> {
  const paper = await getPaperByArxivId(arxivId);
  if (!paper) {
    throw new Error(`Paper not found: ${arxivId}`);
  }

  const authors = await getAuthorsByPaper(paper.id);

  // Sum all author notability scores
  const totalScore = authors.reduce((sum, author) => sum + author.notability_score, 0);

  // Update paper
  const { error } = await supabase
    .from('arxiv_papers')
    .update({ author_notability_score: totalScore })
    .eq('id', paper.id);

  if (error) {
    throw new Error(`Failed to update paper author notability: ${error.message}`);
  }

  return totalScore;
}

// ============================================================================
// Query Functions
// ============================================================================

/**
 * Get top authors by notability score
 */
export async function getTopAuthors(limit: number = 10): Promise<StoredAuthor[]> {
  const { data, error } = await supabase
    .from('arxiv_authors')
    .select('*')
    .order('notability_score', { ascending: false })
    .limit(limit);

  if (error) {
    throw new Error(`Failed to get top authors: ${error.message}`);
  }

  return data;
}

/**
 * Get authors who published on a specific date
 */
export async function getAuthorsOnDate(date: string): Promise<StoredAuthor[]> {
  const { data, error } = await supabase
    .from('arxiv_authors')
    .select('*')
    .eq('last_paper_date', date)
    .order('notability_score', { ascending: false });

  if (error) {
    throw new Error(`Failed to get authors on date: ${error.message}`);
  }

  return data;
}

/**
 * Search authors by name (case-insensitive partial match)
 */
export async function searchAuthorsByName(query: string): Promise<StoredAuthor[]> {
  const { data, error } = await supabase
    .from('arxiv_authors')
    .select('*')
    .ilike('name', `%${query}%`)
    .order('notability_score', { ascending: false})
    .limit(20);

  if (error) {
    throw new Error(`Failed to search authors: ${error.message}`);
  }

  return data;
}

// ============================================================================
// Daily Report Operations
// ============================================================================

/**
 * Store daily report metadata
 */
export async function storeDailyReport(metadata: DailyReportMetadata): Promise<void> {
  const { error } = await supabase
    .from('arxiv_daily_reports')
    .upsert(
      {
        report_date: metadata.report_date,
        total_papers_fetched: metadata.total_papers_fetched,
        featured_papers_count: metadata.featured_papers_count,
        notable_authors_count: metadata.notable_authors_count,
        report_path: metadata.report_path,
        report_url: metadata.report_url,
        summary: metadata.summary,
        generation_duration_seconds: metadata.generation_duration_seconds,
      },
      {
        onConflict: 'report_date',
        ignoreDuplicates: false,
      }
    );

  if (error) {
    throw new Error(`Failed to store daily report: ${error.message}`);
  }
}

/**
 * Get latest daily report
 */
export async function getLatestDailyReport(): Promise<DailyReportMetadata | null> {
  const { data, error } = await supabase
    .from('arxiv_daily_reports')
    .select('*')
    .order('report_date', { ascending: false })
    .limit(1)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return null;
    }
    throw new Error(`Failed to get latest report: ${error.message}`);
  }

  return data;
}

/**
 * Get daily report by date
 */
export async function getDailyReportByDate(date: string): Promise<DailyReportMetadata | null> {
  const { data, error } = await supabase
    .from('arxiv_daily_reports')
    .select('*')
    .eq('report_date', date)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return null;
    }
    throw new Error(`Failed to get report by date: ${error.message}`);
  }

  return data;
}

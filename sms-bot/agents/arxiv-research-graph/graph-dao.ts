import neo4j, { Driver, Integer, Session } from 'neo4j-driver';

export interface GraphFeaturedPaperInput {
  arxivId: string;
  featuredRank: number;
  curationReason: string;
  starRating?: number | null;
}

export interface GraphReportUpsertInput {
  reportDate: string;
  summary: string;
  totalPapers: number;
  featuredCount: number;
  notableAuthorsCount: number;
  durationSeconds: number;
  reportPath: string;
  metadataPath: string;
  storageBucket: string;
  reportUrl: string | null;
  viewerUrl: string | null;
  reportShortLink: string | null;
  podcastShortLink: string | null;
  podcastEpisodeId: string | null;
  podcastAudioUrl: string | null;
  podcastTopicId: string | null;
  notableAuthorNames: string[];
  createdAtIso: string;
}

export interface GraphReportMetadata {
  reportDate: string;
  summary: string;
  totalPapers: number;
  featuredCount: number;
  notableAuthorsCount: number;
  durationSeconds: number | null;
  reportPath: string;
  metadataPath: string;
  storageBucket: string;
  reportUrl: string | null;
  viewerUrl: string | null;
  reportShortLink: string | null;
  podcastShortLink: string | null;
  podcastEpisodeId: string | null;
  podcastAudioUrl: string | null;
  podcastTopicId: string | null;
  notableAuthorNames: string[];
  createdAtIso: string | null;
  featuredPapers: Array<{
    arxivId: string;
    featuredRank: number | null;
    curationReason: string | null;
    starRating: number | null;
  }>;
}

export interface GraphAuthorStats {
  name: string;
  paperCount: number;
  featuredPaperCount: number;
  notabilityScore: number;
  hIndex: number | null;
  citationCount: number | null;
  githubStars: number | null;
  affiliation: string | null;
  openalexMatchedName?: string | null;
  openalexMatchType?: string | null;
  openalexMatchConfidence?: string | null;
  openalexRelevanceScore?: number | null;
  firstSeen?: string | null;
  lastSeen?: string | null;
}

const {
  NEO4J_URI,
  NEO4J_USERNAME,
  NEO4J_PASSWORD,
  NEO4J_DATABASE = 'neo4j',
} = process.env;

let driver: Driver | null = null;

function ensureEnv(variable: string | undefined, name: string): string {
  if (!variable || !variable.trim()) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return variable;
}

export function getDriver(): Driver {
  if (driver) {
    return driver;
  }

  const uri = ensureEnv(NEO4J_URI, 'NEO4J_URI');
  const username = ensureEnv(NEO4J_USERNAME, 'NEO4J_USERNAME');
  const password = ensureEnv(NEO4J_PASSWORD, 'NEO4J_PASSWORD');

  driver = neo4j.driver(uri, neo4j.auth.basic(username, password), {
    disableLosslessIntegers: true,
  });

  return driver;
}

function toNumber(value: Integer | number | null | undefined): number | null {
  if (value === null || value === undefined) {
    return null;
  }

  if (typeof value === 'number') {
    return value;
  }

  return (value as Integer).toNumber();
}

function toStringList(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => (typeof item === 'string' ? item : null))
    .filter((item): item is string => Boolean(item && item.trim()))
    .map((item) => item.trim());
}

async function withSession<T>(
  mode: 'READ' | 'WRITE',
  callback: (session: Session) => Promise<T>
): Promise<T> {
  const session = getDriver().session({
    database: NEO4J_DATABASE,
    defaultAccessMode: mode === 'READ' ? neo4j.session.READ : neo4j.session.WRITE,
  });

  try {
    return await callback(session);
  } finally {
    await session.close();
  }
}

export async function markPapersFeatured(
  papers: GraphFeaturedPaperInput[],
  reportDate: string
): Promise<void> {
  if (!papers.length) {
    return;
  }

  const payload = papers.map((paper) => ({
    arxiv_id: paper.arxivId,
    featured_rank: paper.featuredRank,
    curation_reason: paper.curationReason,
    star_rating:
      typeof paper.starRating === 'number' ? paper.starRating : null,
  }));

  await withSession('WRITE', async (session) => {
    await session.run(
      `
      UNWIND $papers AS paper
      MATCH (p:Paper {arxiv_id: paper.arxiv_id})
      SET p.featured_in_report = true,
          p.featured_rank = paper.featured_rank,
          p.curation_reason = paper.curation_reason,
          p.featured_date = date($reportDate),
          p.star_rating = paper.star_rating
      RETURN count(p) AS updated
      `,
      {
        papers: payload,
        reportDate,
      }
    );
  });
}

export async function updateAuthorMetricsForDate(reportDate: string): Promise<number> {
  const result = await withSession('WRITE', async (session) => {
    const records = await session.run(
      `
      MATCH (a:Author)-[:AUTHORED]->(:Paper {published_date: date($reportDate)})
      WITH DISTINCT a
      MATCH (a)-[:AUTHORED]->(p:Paper)
      WITH a,
           count(p) AS totalPapers,
           sum(CASE WHEN p.featured_in_report THEN 1 ELSE 0 END) AS featuredPapers,
           max(p.published_date) AS lastSeen,
           min(p.published_date) AS firstSeen,
           coalesce(a.github_stars, 0) AS githubStars,
           coalesce(a.h_index, 0) AS hIndex,
           coalesce(a.citation_count, 0) AS citationCount,
           coalesce(a.institution_tier, 0) AS institutionTier,
           (CASE WHEN a.github_username IS NOT NULL AND trim(a.github_username) <> '' THEN 20 ELSE 0 END) +
           (CASE WHEN a.huggingface_username IS NOT NULL AND trim(a.huggingface_username) <> '' THEN 20 ELSE 0 END) +
           (CASE WHEN a.google_scholar_id IS NOT NULL AND trim(a.google_scholar_id) <> '' THEN 30 ELSE 0 END) AS profileBonus
      SET a.paper_count = totalPapers,
          a.featured_paper_count = featuredPapers,
          a.first_seen = coalesce(a.first_seen, firstSeen),
          a.last_seen = lastSeen,
          a.notability_score =
            (totalPapers * 5) +
            (featuredPapers * 50) +
            floor(githubStars / 10) +
            (hIndex * 10) +
            floor(citationCount / 100) +
            institutionTier +
            profileBonus
      RETURN count(a) AS updatedAuthors
      `,
      { reportDate }
    );

    if (!records.records.length) {
      return 0;
    }

    return toNumber(records.records[0].get('updatedAuthors')) ?? 0;
  });

  return result;
}

export async function updatePaperAuthorNotability(arxivIds: string[]): Promise<void> {
  if (!arxivIds.length) {
    return;
  }

  await withSession('WRITE', async (session) => {
    await session.run(
      `
      UNWIND $arxivIds AS arxivId
      MATCH (p:Paper {arxiv_id: arxivId})
      OPTIONAL MATCH (p)<-[:AUTHORED]-(a:Author)
      WITH p, sum(coalesce(a.notability_score, 0)) AS totalScore
      SET p.author_notability_score = totalScore
      `,
      { arxivIds }
    );
  });
}


export async function upsertReport(
  input: GraphReportUpsertInput,
  featuredPapers: GraphFeaturedPaperInput[]
): Promise<void> {
  const featuredPayload = featuredPapers.map((paper) => ({
    arxiv_id: paper.arxivId,
    featured_rank: paper.featuredRank,
    curation_reason: paper.curationReason,
    star_rating:
      typeof paper.starRating === 'number' ? paper.starRating : null,
  }));

  await withSession('WRITE', async (session) => {
    await session.run(
      `
      MERGE (r:Report {report_date: date($reportDate)})
      SET r.summary = $summary,
          r.total_papers = $totalPapers,
          r.featured_count = $featuredCount,
          r.notable_authors_count = $notableAuthorsCount,
          r.duration_seconds = $durationSeconds,
          r.report_path = $reportPath,
          r.metadata_path = $metadataPath,
          r.storage_bucket = $storageBucket,
          r.report_url = $reportUrl,
          r.viewer_url = $viewerUrl,
          r.report_short_link = $reportShortLink,
          r.podcast_short_link = $podcastShortLink,
          r.podcast_episode_id = $podcastEpisodeId,
          r.podcast_audio_url = $podcastAudioUrl,
          r.podcast_topic_id = $podcastTopicId,
          r.notable_author_names = $notableAuthorNames,
          r.created_at = datetime($createdAtIso)
      WITH r
      OPTIONAL MATCH (r)-[rel:FEATURED_IN]->(:Paper)
      DELETE rel
      WITH r
      FOREACH (paper IN $featuredPapers |
        MERGE (p:Paper {arxiv_id: paper.arxiv_id})
        MERGE (r)-[rel:FEATURED_IN]->(p)
        SET rel.rank = paper.featured_rank,
            rel.curation_reason = paper.curation_reason,
            rel.star_rating = paper.star_rating
      )
      RETURN r.report_date AS reportDate
      `,
      {
        reportDate: input.reportDate,
        summary: input.summary,
        totalPapers: input.totalPapers,
        featuredCount: input.featuredCount,
        notableAuthorsCount: input.notableAuthorsCount,
        durationSeconds: input.durationSeconds,
        reportPath: input.reportPath,
        metadataPath: input.metadataPath,
        storageBucket: input.storageBucket,
        reportUrl: input.reportUrl,
        viewerUrl: input.viewerUrl,
        reportShortLink: input.reportShortLink,
        podcastShortLink: input.podcastShortLink,
        podcastEpisodeId: input.podcastEpisodeId,
        podcastAudioUrl: input.podcastAudioUrl,
        podcastTopicId: input.podcastTopicId,
        notableAuthorNames: input.notableAuthorNames,
        createdAtIso: input.createdAtIso,
        featuredPapers: featuredPayload,
      }
    );
  });
}

export async function getAuthorStatsByNames(
  names: string[]
): Promise<Record<string, GraphAuthorStats>> {
  if (!names.length) {
    return {};
  }

  const records = await withSession('READ', async (session) => {
    const result = await session.run(
      `
      MATCH (a:Author)
      WHERE a.name IN $names
      RETURN a.name AS name,
             coalesce(a.paper_count, 0) AS paperCount,
             coalesce(a.featured_paper_count, 0) AS featuredPaperCount,
             coalesce(a.notability_score, 0) AS notabilityScore,
             a.h_index AS hIndex,
             a.citation_count AS citationCount,
             a.github_stars AS githubStars,
             a.affiliation AS affiliation,
             a.openalex_matched_name AS openalexMatchedName,
             a.openalex_match_type AS openalexMatchType,
             a.openalex_match_confidence AS openalexMatchConfidence,
             a.openalex_relevance_score AS openalexRelevanceScore,
             a.first_seen AS firstSeen,
             a.last_seen AS lastSeen
      `,
      { names }
    );

    return result.records;
  });

  const stats: Record<string, GraphAuthorStats> = {};

  for (const record of records) {
    const name = record.get('name') as string;
    stats[name] = {
      name,
      paperCount: Number(record.get('paperCount')) || 0,
      featuredPaperCount: Number(record.get('featuredPaperCount')) || 0,
      notabilityScore: Number(record.get('notabilityScore')) || 0,
      hIndex: toNumber(record.get('hIndex')),
      citationCount: toNumber(record.get('citationCount')),
      githubStars: toNumber(record.get('githubStars')),
      affiliation: record.get('affiliation') as string | null,
      openalexMatchedName: record.get('openalexMatchedName') as string | null,
      openalexMatchType: record.get('openalexMatchType') as string | null,
      openalexMatchConfidence: record.get('openalexMatchConfidence') as string | null,
      openalexRelevanceScore: toNumber(record.get('openalexRelevanceScore')),
      firstSeen: record.get('firstSeen')
        ? toDateString(record.get('firstSeen'))
        : null,
      lastSeen: record.get('lastSeen')
        ? toDateString(record.get('lastSeen'))
        : null,
    };
  }

  return stats;
}

function toDateString(value: unknown): string {
  if (!value) {
    return '';
  }

  if (typeof value === 'string') {
    return value;
  }

  if (typeof value === 'object' && value !== null) {
    const candidate = value as { toString?: () => string };
    if (typeof candidate.toString === 'function') {
      return candidate.toString();
    }
  }

  return String(value);
}

export async function getLatestReport(): Promise<GraphReportMetadata | null> {
  const record = await withSession('READ', async (session) => {
    const result = await session.run(
      `
      MATCH (r:Report)
      WITH r
      ORDER BY r.report_date DESC
      LIMIT 1
      OPTIONAL MATCH (r)-[rel:FEATURED_IN]->(p:Paper)
      RETURN r,
             collect({
               arxivId: p.arxiv_id,
               featuredRank: rel.rank,
               curationReason: rel.curation_reason,
               starRating: rel.star_rating
             }) AS featuredPapers
      `
    );

    if (!result.records.length) {
      return null;
    }

    return result.records[0];
  });

  if (!record) {
    return null;
  }

  const node = record.get('r') as { properties?: Record<string, unknown> } | null;
  if (!node || !node.properties) {
    return null;
  }

  const props = node.properties;
  const featuredRaw = record.get('featuredPapers') as Array<{
    arxivId: string | null;
    featuredRank: number | null;
    curationReason: string | null;
    starRating: number | null;
  }>;

  return {
    reportDate: toDateString(props.report_date),
    summary: (props.summary as string) ?? '',
    totalPapers: (props.total_papers as number) ?? 0,
    featuredCount: (props.featured_count as number) ?? 0,
    notableAuthorsCount: (props.notable_authors_count as number) ?? 0,
    durationSeconds: props.duration_seconds
      ? Number(props.duration_seconds)
      : null,
    reportPath: (props.report_path as string) ?? '',
    metadataPath: (props.metadata_path as string) ?? '',
    storageBucket: (props.storage_bucket as string) ?? '',
    reportUrl: (props.report_url as string) ?? null,
    viewerUrl: (props.viewer_url as string) ?? null,
    reportShortLink: (props.report_short_link as string) ?? null,
    podcastShortLink: (props.podcast_short_link as string) ?? null,
    podcastEpisodeId: (props.podcast_episode_id as string) ?? null,
    podcastAudioUrl: (props.podcast_audio_url as string) ?? null,
    podcastTopicId: (props.podcast_topic_id as string) ?? null,
    notableAuthorNames: toStringList(props.notable_author_names),
    createdAtIso: props.created_at ? toDateString(props.created_at) : null,
    featuredPapers: (featuredRaw || [])
      .filter((entry) => entry?.arxivId)
      .map((entry) => ({
        arxivId: entry.arxivId as string,
        featuredRank: entry.featuredRank ?? null,
        curationReason: entry.curationReason ?? null,
        starRating: entry.starRating ?? null,
      })),
  };
}

export async function closeDriver(): Promise<void> {
  if (driver) {
    await driver.close();
    driver = null;
  }
}

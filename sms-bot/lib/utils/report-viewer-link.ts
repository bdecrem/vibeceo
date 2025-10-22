const VIEWER_BASE_FALLBACK = 'https://kochi.to';

export type ReportViewerParams = {
  path: string; // e.g., "crypto-research/reports/2025-10-06.md"
  title?: string;
  agentSlug?: string;
};

function getViewerBaseUrl(): string {
  const configured = process.env.SHORTLINK_BASE_URL;
  const base = configured && configured.trim().length ? configured : VIEWER_BASE_FALLBACK;
  return base.replace(/\/$/, '');
}

/**
 * Build a report viewer URL for markdown reports stored in Supabase Storage.
 *
 * @param params - Report parameters including storage path
 * @returns Full URL to the report viewer
 *
 * @example
 * buildReportViewerUrl({
 *   path: 'crypto-research/reports/2025-10-06.md',
 *   title: 'Crypto Market Daily',
 *   agentSlug: 'crypto-research'
 * })
 * // Returns: https://kochi.to/report-viewer?path=crypto-research%2Freports%2F2025-10-06.md
 */
export function buildReportViewerUrl(params: ReportViewerParams): string {
  const { path } = params;
  const urlParams = new URLSearchParams();
  urlParams.set('path', path);

  return `${getViewerBaseUrl()}/report-viewer?${urlParams.toString()}`;
}

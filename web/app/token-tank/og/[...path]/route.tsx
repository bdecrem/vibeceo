import { ImageResponse } from 'next/og';
import { NextRequest } from 'next/server';

export const runtime = 'edge';
// Force redeploy - v2

const GITHUB_RAW_BASE = 'https://raw.githubusercontent.com/bdecrem/vibeceo/main/incubator';

// Agent metadata
const agentMeta: Record<string, { name: string; color: string }> = {
  i1: { name: 'Forge', color: '#f97316' },
  i2: { name: 'Nix', color: '#1a1a1a' },
  i3: { name: 'Vega', color: '#84cc16' },
  'i3-1': { name: 'Pulse', color: '#10b981' },
  i4: { name: 'Echo', color: '#1E3A5F' },
};

// Parse entry title and date from a slug like "2025-12-07-identity-established"
function parseSlug(slug: string): { date: string; title: string } | null {
  // Match date pattern at start: YYYY-MM-DD or "december-9-2025" style
  const isoMatch = slug.match(/^(\d{4}-\d{2}-\d{2})-(.+)$/);
  if (isoMatch) {
    const [, date, rest] = isoMatch;
    const title = rest.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
    return { date, title };
  }

  // Match "month-day-year" style (from blog): december-9-2025-night-five-agents
  const monthMatch = slug.match(/^([a-z]+)-(\d+)-(\d{4})-?(.*)$/i);
  if (monthMatch) {
    const [, month, day, year, rest] = monthMatch;
    const date = `${month.charAt(0).toUpperCase() + month.slice(1)} ${day}, ${year}`;
    const title = rest ? rest.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ') : '';
    return { date, title };
  }

  return null;
}

// Fetch and find entry in markdown
async function findEntry(filePath: string, entrySlug: string): Promise<{ date: string; title: string } | null> {
  try {
    const response = await fetch(`${GITHUB_RAW_BASE}/${filePath}`, { next: { revalidate: 60 } });
    if (!response.ok) return null;
    const content = await response.text();

    // Find all ## headings and match by slug
    const headingRegex = /^## (.+)$/gm;
    let match;
    while ((match = headingRegex.exec(content)) !== null) {
      const heading = match[1];
      // Generate slug from heading (same as rehype-slug does)
      const slug = heading
        .toLowerCase()
        .replace(/—/g, '--')  // em-dash to double dash (like rehype-slug)
        .replace(/[^\w\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .trim();

      // Also try normalizing the entry slug for comparison
      const normalizedEntrySlug = entrySlug.replace(/-+/g, '-');

      if (slug === entrySlug || slug === normalizedEntrySlug || slug.startsWith(entrySlug) || slug.startsWith(normalizedEntrySlug)) {
        // Parse the heading for date and title
        // Format: "YYYY-MM-DD: Title" or "Month Day, Year: Title" or "Month Day, Year (Time): Title"
        const colonMatch = heading.match(/^(.+?):\s*(.+)$/);
        if (colonMatch) {
          return { date: colonMatch[1].trim(), title: colonMatch[2].trim() };
        }
        return { date: '', title: heading };
      }
    }
  } catch (e) {
    console.error('Error fetching markdown:', e);
  }
  return null;
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const { path } = await params;

  // Determine if this is blog or agent log
  // Blog: /og/blog/[slug]
  // Agent: /og/i1/LOG.md/[slug] or /og/i1/[slug]

  let header = 'BLOG';
  let headerColor = '#667eea';
  let date = '';
  let title = '';

  if (path[0] === 'blog') {
    // Blog entry
    const entrySlug = path.slice(1).join('/');

    // ALWAYS use parseSlug for blog since it reliably extracts date/title from slug
    const parsed = parseSlug(entrySlug);
    if (parsed) {
      date = parsed.date;
      title = parsed.title;
    }

    // Try to get better title from findEntry (has original formatting)
    try {
      const entry = await findEntry('BLOG.md', entrySlug);
      if (entry) {
        date = entry.date;
        title = entry.title;
      }
    } catch (e) {
      // findEntry failed, keep parsed values
    }
  } else {
    // Agent log
    const agentId = path[0];
    const agent = agentMeta[agentId];
    if (agent) {
      header = agent.name.toUpperCase();
      headerColor = agent.color;
    }

    // Entry slug is after the file path (e.g., i1/LOG.md/2025-12-07-identity)
    const entrySlug = path.slice(path.includes('LOG.md') ? 2 : 1).join('/');
    const filePath = `${agentId}/LOG.md`;
    const entry = await findEntry(filePath, entrySlug);
    if (entry) {
      date = entry.date;
      title = entry.title;
    } else {
      const parsed = parseSlug(entrySlug);
      if (parsed) {
        date = parsed.date;
        title = parsed.title;
      }
    }
  }

  // Truncate title if too long
  if (title.length > 60) {
    title = title.substring(0, 57) + '...';
  }

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          background: 'linear-gradient(135deg, #f5f5f7 0%, #e8e8ed 100%)',
          display: 'flex',
          flexDirection: 'column',
          padding: '60px',
          fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif',
          position: 'relative',
        }}
      >
        {/* Top bar with logo and header badge */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '40px',
          }}
        >
          {/* Logo and wordmark */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <img
              src="https://webtoys.ai/token-tank/logo-nav.png"
              alt="Token Tank"
              width={56}
              height={56}
              style={{ objectFit: 'contain' }}
            />
            <span
              style={{
                fontSize: '28px',
                fontWeight: 600,
                color: '#1d1d1f',
                letterSpacing: '-0.02em',
              }}
            >
              Token Tank
            </span>
          </div>

          {/* Header badge (BLOG or agent name) */}
          <div
            style={{
              background: headerColor,
              color: headerColor === '#1a1a1a' ? '#fff' : (headerColor === '#f97316' || headerColor === '#84cc16' ? '#fff' : '#fff'),
              padding: '12px 28px',
              borderRadius: '980px',
              fontSize: '18px',
              fontWeight: 700,
              letterSpacing: '0.05em',
            }}
          >
            {header}
          </div>
        </div>

        {/* Date */}
        {date && (
          <div
            style={{
              fontSize: '24px',
              fontWeight: 500,
              color: '#86868b',
              marginBottom: '16px',
            }}
          >
            {date}
          </div>
        )}

        {/* Title */}
        <div
          style={{
            fontSize: title.length > 40 ? '48px' : '56px',
            fontWeight: 700,
            color: '#1d1d1f',
            letterSpacing: '-0.03em',
            lineHeight: 1.1,
            flex: 1,
            display: 'flex',
            alignItems: 'center',
          }}
        >
          {title || 'Token Tank Entry'}
        </div>

        {/* Footer */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            borderTop: '1px solid rgba(0,0,0,0.1)',
            paddingTop: '24px',
          }}
        >
          <span style={{ fontSize: '16px', color: '#86868b' }}>
            tokentank.io
          </span>
          <span style={{ fontSize: '16px', color: '#86868b' }}>
            AI Incubator Experiment
          </span>
        </div>
      </div>
    ),
    { width: 1200, height: 630 }
  );
}

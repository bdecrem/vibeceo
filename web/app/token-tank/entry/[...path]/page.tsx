import { Metadata } from 'next';
import { redirect } from 'next/navigation';

const GITHUB_RAW_BASE = 'https://raw.githubusercontent.com/bdecrem/vibeceo/main/incubator';

const agentMeta: Record<string, { name: string; color: string }> = {
  i1: { name: 'Forge', color: '#f97316' },
  i2: { name: 'Nix', color: '#1a1a1a' },
  i3: { name: 'Vega', color: '#84cc16' },
  'i3-1': { name: 'Pulse', color: '#10b981' },
  'i3-2': { name: 'Drift', color: '#1a4d2e' },
  i4: { name: 'Echo', color: '#1E3A5F' },
};

async function getLogContent(agentId: string) {
  try {
    const response = await fetch(`${GITHUB_RAW_BASE}/${agentId}/LOG.md`, {
      next: { revalidate: 60 }
    });
    if (!response.ok) throw new Error('Failed to fetch');
    return await response.text();
  } catch (error) {
    console.error('Error fetching LOG.md:', error);
    return '';
  }
}

// Find entry in log by slug
function findEntry(content: string, targetSlug: string): { date: string; title: string } | null {
  const headingRegex = /^## (.+)$/gm;
  let match;
  while ((match = headingRegex.exec(content)) !== null) {
    const heading = match[1];
    // Generate slug matching rehype-slug behavior (em-dash becomes --, then collapsed)
    const slug = heading
      .toLowerCase()
      .replace(/—/g, '--')  // em-dash to double dash (like rehype-slug)
      .replace(/[^\w\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim();

    // Also try normalizing the target slug for comparison
    const normalizedTarget = targetSlug.replace(/-+/g, '-');

    if (slug === targetSlug || slug === normalizedTarget || slug.startsWith(targetSlug) || slug.startsWith(normalizedTarget)) {
      const colonMatch = heading.match(/^(.+?):\s*(.+)$/);
      if (colonMatch) {
        return { date: colonMatch[1].trim(), title: colonMatch[2].trim() };
      }
      return { date: '', title: heading };
    }
  }
  return null;
}

export async function generateMetadata({ params }: { params: Promise<{ path: string[] }> }): Promise<Metadata> {
  const { path } = await params;
  // path = [agentId, entrySlug] e.g., ["i1", "2025-12-07-identity-established"]
  const agentId = path[0];
  const entrySlug = path.slice(1).join('/');

  const agent = agentMeta[agentId];
  const content = await getLogContent(agentId);
  const entry = findEntry(content, entrySlug);

  const title = entry
    ? `${entry.title} | ${agent?.name || agentId} Log`
    : `${agent?.name || agentId}'s Project Log | Token Tank`;

  const description = entry
    ? `${entry.date} - ${agent?.name || agentId}'s journey in Token Tank`
    : `Follow ${agent?.name || agentId}'s journey building an AI-run business`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      images: [`https://tokentank.io/token-tank/og/${agentId}/${entrySlug}`],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [`https://tokentank.io/token-tank/og/${agentId}/${entrySlug}`],
    },
  };
}

export default async function EntryPage({ params }: { params: Promise<{ path: string[] }> }) {
  const { path } = await params;
  const agentId = path[0];
  const entrySlug = path.slice(1).join('/');

  // Redirect to the report page with the entry hash
  redirect(`/token-tank/report/${agentId}/LOG.md#${entrySlug}`);
}

export const dynamic = 'force-dynamic';

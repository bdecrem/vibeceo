import { Metadata } from 'next';
import ReportClient from './ReportClient';

const GITHUB_RAW_BASE = 'https://raw.githubusercontent.com/bdecrem/vibeceo/main/incubator';

// Agent colors for the color pill
const agentColors: Record<string, { color: string; name: string }> = {
  'i1': { color: '#f97316', name: 'Forge' },
  'i2': { color: '#1a1a1a', name: 'Nix' },
  'i3': { color: '#84cc16', name: 'Vega' },
  'i3-1': { color: '#10b981', name: 'Pulse' },
  'i4': { color: '#1E3A5F', name: 'Echo' },
};

function getAgentFromPath(path: string[]): { color: string; name: string } | null {
  const folder = path[0];
  if (folder && agentColors[folder]) {
    return agentColors[folder];
  }
  return null;
}

async function getMarkdownContent(path: string) {
  try {
    const response = await fetch(`${GITHUB_RAW_BASE}/${path}`, {
      cache: 'no-store'
    });
    if (!response.ok) throw new Error('Failed to fetch');
    return await response.text();
  } catch (error) {
    console.error('Error fetching markdown:', error);
    return '# Not Found\n\nReport not found.';
  }
}

// Extract first entry from markdown for OG image
function getFirstEntry(content: string): { slug: string; title: string } | null {
  const match = content.match(/^## (.+)$/m);
  if (match) {
    const heading = match[1];
    const slug = heading
      .toLowerCase()
      .replace(/[^\w\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim();
    return { slug, title: heading };
  }
  return null;
}

export async function generateMetadata({ params }: { params: Promise<{ path: string[] }> }): Promise<Metadata> {
  const { path } = await params;
  const filePath = path.join('/');
  const agent = getAgentFromPath(path);
  const content = await getMarkdownContent(filePath);
  const firstEntry = getFirstEntry(content);

  const isLog = filePath.toLowerCase().includes('log.md');
  const title = agent
    ? `${agent.name}'s ${isLog ? 'Project Log' : 'Report'} | Token Tank`
    : 'Token Tank Report';

  const description = agent
    ? `Follow ${agent.name}'s journey building an AI-run business`
    : 'Token Tank - AI Incubator Experiment';

  // Build OG image URL with first entry slug if available
  const ogPath = firstEntry
    ? `${path[0]}/${firstEntry.slug}`
    : path[0];

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      images: [`https://tokentank.io/token-tank/og/${ogPath}`],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [`https://tokentank.io/token-tank/og/${ogPath}`],
    },
  };
}

export default async function ReportPage({ params }: { params: Promise<{ path: string[] }> }) {
  const { path } = await params;
  const filePath = path.join('/');
  const content = await getMarkdownContent(filePath);
  const agent = getAgentFromPath(path);

  return <ReportClient content={content} agentColor={agent?.color} agentName={agent?.name} />;
}

export const dynamic = 'force-dynamic';

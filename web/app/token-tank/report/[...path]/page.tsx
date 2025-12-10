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

export default async function ReportPage({ params }: { params: Promise<{ path: string[] }> }) {
  const { path } = await params;
  const filePath = path.join('/');
  const content = await getMarkdownContent(filePath);
  const agent = getAgentFromPath(path);

  return <ReportClient content={content} agentColor={agent?.color} agentName={agent?.name} />;
}

export const dynamic = 'force-dynamic';

import ReportClient from './ReportClient';

const GITHUB_RAW_BASE = 'https://raw.githubusercontent.com/bdecrem/vibeceo/main/incubator';

async function getMarkdownContent(path: string) {
  try {
    const response = await fetch(`${GITHUB_RAW_BASE}/${path}`, {
      next: { revalidate: 60 }
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

  return <ReportClient content={content} />;
}

export const dynamic = 'force-dynamic';

import { Metadata } from 'next';
import { redirect } from 'next/navigation';

const GITHUB_RAW_BASE = 'https://raw.githubusercontent.com/bdecrem/vibeceo/main/incubator';

async function getBlogContent() {
  try {
    const response = await fetch(`${GITHUB_RAW_BASE}/BLOG.md`, {
      next: { revalidate: 60 }
    });
    if (!response.ok) throw new Error('Failed to fetch');
    return await response.text();
  } catch (error) {
    console.error('Error fetching BLOG.md:', error);
    return '';
  }
}

// Find entry in blog by slug
function findEntry(content: string, targetSlug: string): { date: string; title: string; heading: string } | null {
  const headingRegex = /^## (.+)$/gm;
  let match;
  while ((match = headingRegex.exec(content)) !== null) {
    const heading = match[1];
    const slug = heading
      .toLowerCase()
      .replace(/[^\w\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim();

    if (slug === targetSlug || slug.startsWith(targetSlug)) {
      // Parse date and title from heading
      // Format: "Month Day, Year: Title" or "Month Day, Year (Time): Title"
      const colonMatch = heading.match(/^(.+?):\s*(.+)$/);
      if (colonMatch) {
        return { date: colonMatch[1].trim(), title: colonMatch[2].trim(), heading };
      }
      return { date: '', title: heading, heading };
    }
  }
  return null;
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const content = await getBlogContent();
  const entry = findEntry(content, slug);

  const title = entry ? `${entry.title} | Token Tank Blog` : 'Token Tank Blog';
  const description = entry
    ? `${entry.date} - Token Tank AI Incubator`
    : 'The official log of our AI incubator experiment';

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      images: [`https://tokentank.io/token-tank/og/blog/${slug}`],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [`https://tokentank.io/token-tank/og/blog/${slug}`],
    },
  };
}

export default async function BlogEntryPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  // Redirect to main page with the entry hash
  redirect(`/token-tank#${slug}`);
}

export const dynamic = 'force-dynamic';

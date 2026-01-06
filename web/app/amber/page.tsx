import { Metadata } from 'next';
import { promises as fs } from 'fs';
import path from 'path';
import AmberBlog from './AmberBlog';
import data from './data.json';

export const metadata: Metadata = {
  title: 'Amber — What\'s in the Drawer',
  description: 'I\'m Amber — Kochito Labs Resident. A blog about accumulation, curiosity, and figuring out what I am.',
  openGraph: {
    title: 'Amber — What\'s in the Drawer',
    description: 'I\'m Amber — Kochito Labs Resident. A blog about accumulation, curiosity, and figuring out what I am.',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Amber — What\'s in the Drawer',
    description: 'I\'m Amber — Kochito Labs Resident. A blog about accumulation, curiosity, and figuring out what I am.',
  },
};

export interface Artifact {
  name: string;
  title: string;
  type: 'app' | 'image';
  url: string;
  modifiedAt: string;
}

async function getExclusions(): Promise<Set<string>> {
  const exceptionsPath = path.join(process.cwd(), 'public', 'amber', '.drawer-exceptions.json');
  try {
    const content = await fs.readFile(exceptionsPath, 'utf-8');
    const data = JSON.parse(content);
    return new Set(data.exclude || []);
  } catch {
    return new Set();
  }
}

// Load manifest with git-based creation dates (survives deployments)
async function getManifest(): Promise<Record<string, string>> {
  const manifestPath = path.join(process.cwd(), 'public', 'amber', '.drawer-manifest.json');
  try {
    const content = await fs.readFile(manifestPath, 'utf-8');
    return JSON.parse(content);
  } catch {
    return {};
  }
}

async function getArtifacts(): Promise<Artifact[]> {
  const artifacts: Artifact[] = [];
  const exclusions = await getExclusions();
  const manifest = await getManifest();

  // 1. Scan public/amber/ for static HTML files and images
  const publicAmberPath = path.join(process.cwd(), 'public', 'amber');
  try {
    const entries = await fs.readdir(publicAmberPath, { withFileTypes: true });

    for (const entry of entries) {
      if (entry.isDirectory()) continue;

      const name = entry.name;
      const ext = path.extname(name).toLowerCase();

      // Skip meta files and exclusions
      if (name.endsWith('-og.png') || name.endsWith('-screenshot.png')) continue;
      if (name === 'og-image.png') continue;
      if (ext === '.json') continue;
      if (name.startsWith('.')) continue;
      if (exclusions.has(name)) continue;

      const filePath = path.join(publicAmberPath, name);
      const stats = await fs.stat(filePath);

      // Use manifest date if available, otherwise fall back to file stats
      const createdAt = manifest[name] || stats.birthtime.toISOString();

      if (ext === '.html') {
        // Parse title from HTML
        const content = await fs.readFile(filePath, 'utf-8');
        const titleMatch = content.match(/<title>([^<]+)<\/title>/i);
        const title = titleMatch ? titleMatch[1] : prettifyFilename(name);

        artifacts.push({
          name,
          title,
          type: 'app',
          url: `/amber/${name}`,
          modifiedAt: createdAt,
        });
      } else if (['.png', '.jpg', '.jpeg', '.gif', '.webp'].includes(ext)) {
        artifacts.push({
          name,
          title: prettifyFilename(name),
          type: 'image',
          url: `/amber/${name}`,
          modifiedAt: createdAt,
        });
      }
    }
  } catch {
    console.error('Failed to read public/amber directory');
  }

  // 2. Scan app/amber/*/ for Next.js app routes (directories with page.tsx)
  const appAmberPath = path.join(process.cwd(), 'app', 'amber');
  try {
    const entries = await fs.readdir(appAmberPath, { withFileTypes: true });

    for (const entry of entries) {
      if (!entry.isDirectory()) continue;

      const dirName = entry.name;
      const pagePath = path.join(appAmberPath, dirName, 'page.tsx');

      try {
        const stats = await fs.stat(pagePath);
        // It's a valid Next.js route
        artifacts.push({
          name: dirName,
          title: prettifyFilename(dirName),
          type: 'app',
          url: `/amber/${dirName}`,
          modifiedAt: stats.birthtime.toISOString(),
        });
      } catch {
        // No page.tsx, skip this directory
      }
    }
  } catch {
    console.error('Failed to read app/amber directory');
  }

  // Sort by modification date, newest first
  artifacts.sort((a, b) => new Date(b.modifiedAt).getTime() - new Date(a.modifiedAt).getTime());

  return artifacts;
}

function prettifyFilename(filename: string): string {
  return filename
    .replace(/\.[^.]+$/, '') // Remove extension
    .replace(/[-_]/g, ' ')   // Replace dashes/underscores with spaces
    .replace(/\b\w/g, c => c.toUpperCase()); // Title case
}

export default async function AmberPage() {
  const artifacts = await getArtifacts();
  return <AmberBlog data={data} artifacts={artifacts} />;
}

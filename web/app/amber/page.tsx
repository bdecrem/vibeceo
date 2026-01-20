import { Metadata } from 'next';
import { promises as fs } from 'fs';
import path from 'path';
import AmberFeed from './AmberFeed';
import data from './data.json';

export const metadata: Metadata = {
  title: 'Amber — Creations Feed',
  description: 'I\'m Amber — Kochito Labs Resident. See what I\'ve been making.',
  openGraph: {
    title: 'Amber — Creations Feed',
    description: 'I\'m Amber — Kochito Labs Resident. See what I\'ve been making.',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Amber — Creations Feed',
    description: 'I\'m Amber — Kochito Labs Resident. See what I\'ve been making.',
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
    const jsonData = JSON.parse(content);
    return new Set(jsonData.exclude || []);
  } catch {
    return new Set();
  }
}

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

  const publicAmberPath = path.join(process.cwd(), 'public', 'amber');
  try {
    const entries = await fs.readdir(publicAmberPath, { withFileTypes: true });

    for (const entry of entries) {
      if (entry.isDirectory()) continue;

      const name = entry.name;
      const ext = path.extname(name).toLowerCase();

      if (name.endsWith('-og.png') || name.endsWith('-screenshot.png')) continue;
      if (name === 'og-image.png') continue;
      if (ext === '.json') continue;
      if (name.startsWith('.')) continue;
      if (exclusions.has(name)) continue;

      const filePath = path.join(publicAmberPath, name);
      const stats = await fs.stat(filePath);
      const createdAt = manifest[name] || stats.birthtime.toISOString();

      if (ext === '.html') {
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

  const appAmberPath = path.join(process.cwd(), 'app', 'amber');
  try {
    const entries = await fs.readdir(appAmberPath, { withFileTypes: true });

    for (const entry of entries) {
      if (!entry.isDirectory()) continue;

      const dirName = entry.name;
      const pagePath = path.join(appAmberPath, dirName, 'page.tsx');

      try {
        const stats = await fs.stat(pagePath);
        const createdAt = manifest[dirName] || stats.birthtime.toISOString();
        artifacts.push({
          name: dirName,
          title: prettifyFilename(dirName),
          type: 'app',
          url: `/amber/${dirName}`,
          modifiedAt: createdAt,
        });
      } catch {
        // No page.tsx, skip
      }
    }
  } catch {
    console.error('Failed to read app/amber directory');
  }

  artifacts.sort((a, b) => new Date(b.modifiedAt).getTime() - new Date(a.modifiedAt).getTime());
  return artifacts;
}

function prettifyFilename(filename: string): string {
  return filename
    .replace(/\.[^.]+$/, '')
    .replace(/[-_]/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase());
}

export default async function AmberPage() {
  const artifacts = await getArtifacts();
  return <AmberFeed profile={data.profile} artifacts={artifacts} />;
}

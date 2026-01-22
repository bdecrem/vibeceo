import { promises as fs } from 'fs';
import path from 'path';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

interface ImageArtifact {
  name: string;
  title: string;
  url: string;
}

function prettifyFilename(filename: string): string {
  return filename
    .replace(/\.[^.]+$/, '')
    .replace(/[-_]/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase());
}

export async function GET() {
  const images: ImageArtifact[] = [];
  const publicAmberPath = path.join(process.cwd(), 'public', 'amber');

  try {
    const entries = await fs.readdir(publicAmberPath, { withFileTypes: true });

    for (const entry of entries) {
      if (entry.isDirectory()) continue;

      const name = entry.name;
      const ext = path.extname(name).toLowerCase();

      // Skip non-images
      if (!['.png', '.jpg', '.jpeg', '.gif', '.webp'].includes(ext)) continue;
      // Skip OG images and screenshots
      if (name.endsWith('-og.png') || name.endsWith('-screenshot.png')) continue;
      // Skip specific utility images
      if (name === 'og-image.png') continue;
      if (name.startsWith('.')) continue;
      // Skip backup files
      if (name.includes('.bak.')) continue;
      // Skip avatar
      if (name.startsWith('amber-avatar')) continue;

      images.push({
        name,
        title: prettifyFilename(name),
        url: `/amber/${name}`,
      });
    }
  } catch (err) {
    console.error('Failed to read public/amber directory:', err);
  }

  // Sort alphabetically by title
  images.sort((a, b) => a.title.localeCompare(b.title));

  return NextResponse.json({ images });
}

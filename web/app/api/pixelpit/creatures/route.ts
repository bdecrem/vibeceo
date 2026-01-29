import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET() {
  try {
    const creatures: string[] = [];

    // Check for React pages in /app/pixelpit/creatures/*/page.tsx
    const appDir = path.join(process.cwd(), 'app', 'pixelpit', 'creatures');
    if (fs.existsSync(appDir)) {
      const dirs = fs.readdirSync(appDir, { withFileTypes: true });
      for (const dir of dirs) {
        if (dir.isDirectory()) {
          const pagePath = path.join(appDir, dir.name, 'page.tsx');
          if (fs.existsSync(pagePath)) {
            creatures.push(dir.name);
          }
        }
      }
    }

    // Also check for HTML files in /public/pixelpit/creatures/
    const publicDir = path.join(process.cwd(), 'public', 'pixelpit', 'creatures');
    if (fs.existsSync(publicDir)) {
      const files = fs.readdirSync(publicDir);
      for (const f of files) {
        if (f.endsWith('.html')) {
          creatures.push(f.replace('.html', ''));
        }
      }
    }

    // Remove duplicates and sort
    const unique = [...new Set(creatures)].sort();

    return NextResponse.json({ creatures: unique });
  } catch (error) {
    return NextResponse.json({ creatures: [], error: String(error) });
  }
}

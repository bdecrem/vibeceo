#!/usr/bin/env node
/**
 * Check that all web/app/ directories have middleware coverage.
 *
 * Scans web/app/ for top-level directories and verifies each is either:
 * - Listed in a bypass array in middleware.ts
 * - The target app of a domain config
 * - In the known-safe list (api, _archive, layout files, etc.)
 *
 * Exit code 0 = all covered, 1 = gaps found.
 */

const fs = require('fs');
const path = require('path');

const WEB_APP_DIR = path.join(__dirname, '..', 'web', 'app');
const MIDDLEWARE_PATH = path.join(__dirname, '..', 'web', 'middleware.ts');

// Directories that are safe to ignore (not routable pages or handled by Next.js)
const IGNORE_DIRS = new Set([
  'api',
  '_archive',
  'layout.tsx',
  'page.tsx',
  'globals.css',
  'not-found.tsx',
  'error.tsx',
  'loading.tsx',
  'template.tsx',
  'default.tsx',
  'favicon.ico',
  'opengraph-image.tsx',
  'opengraph-image.png',
  'sitemap.ts',
  'robots.ts',
]);

function main() {
  // Read all top-level entries in web/app/
  const entries = fs.readdirSync(WEB_APP_DIR).filter(entry => {
    // Only directories, skip files and ignored entries
    if (IGNORE_DIRS.has(entry)) return false;
    if (entry.startsWith('.')) return false;
    if (entry.startsWith('_')) return false; // _archive, etc.
    const stat = fs.statSync(path.join(WEB_APP_DIR, entry));
    return stat.isDirectory();
  });

  // Read middleware.ts
  const middleware = fs.readFileSync(MIDDLEWARE_PATH, 'utf8');

  const uncovered = [];

  for (const dir of entries) {
    const route = `/${dir}`;
    // Check if this route appears anywhere in middleware.ts
    // Look for the route as a string literal (quoted)
    const patterns = [
      `'${route}'`,      // in bypass arrays
      `'${dir}'`,        // in domain configs (app name)
      `'${route}/`,      // startsWith patterns
      `/${dir}`,         // in comments or other references
    ];

    const found = patterns.some(p => middleware.includes(p));

    if (!found) {
      uncovered.push(dir);
    }
  }

  if (uncovered.length === 0) {
    console.log('✓ All web/app/ directories have middleware coverage.');
    process.exit(0);
  } else {
    console.error('✗ The following web/app/ directories may not have middleware coverage:');
    for (const dir of uncovered) {
      console.error(`  - web/app/${dir}/`);
    }
    console.error('');
    console.error('If this is a new app, add it to:');
    console.error('  1. A domain config\'s bypasses array in web/middleware.ts, OR');
    console.error('  2. GLOBAL_BYPASS_PREFIXES or DEFAULT_BYPASSES in web/middleware.ts');
    process.exit(1);
  }
}

main();

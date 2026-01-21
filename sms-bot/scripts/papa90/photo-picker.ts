/**
 * Papa 90 - Photo Picker
 *
 * Searches the Photos library for family photos and helps select one for the daily email.
 *
 * Usage:
 *   npx tsx --env-file=.env.local scripts/papa90/photo-picker.ts search [person]
 *   npx tsx --env-file=.env.local scripts/papa90/photo-picker.ts spotlight <uuid>
 *   npx tsx --env-file=.env.local scripts/papa90/photo-picker.ts prepare <uuid>
 *
 * Examples:
 *   npx tsx --env-file=.env.local scripts/papa90/photo-picker.ts search "Willy"
 *   npx tsx --env-file=.env.local scripts/papa90/photo-picker.ts spotlight E9E3E009-6456-4511-B9DE-99BAD0A947C2
 *   npx tsx --env-file=.env.local scripts/papa90/photo-picker.ts prepare E9E3E009-6456-4511-B9DE-99BAD0A947C2
 */

import { execSync } from 'child_process';
import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PHOTOS_DB = '/Users/bart/Pictures/Photos Library.photoslibrary/database/Photos.sqlite';
const PHOTOS_ORIGINALS = '/Users/bart/Pictures/Photos Library.photoslibrary/originals';
const OUTPUT_DIR = path.join(__dirname, 'photos');

// Family members to search for
const FAMILY = [
  'Willy Decrem',
  'Agnes Van Caneghem',
  'Isis Decrem',
  'Jaz Decrem',
  'Susy Kim',
  'Hilde Decrem',
  'Tim',
];

interface PhotoResult {
  uuid: string;
  filename: string;
  date: string;
  people: string;
  peopleCount: number;
}

function searchPhotos(personFilter?: string): PhotoResult[] {
  const whereClause = personFilter
    ? `WHERE p.ZFULLNAME LIKE '%${personFilter}%'`
    : `WHERE p.ZFULLNAME IN (${FAMILY.map(f => `'${f}'`).join(', ')})`;

  const query = `
    SELECT
      a.ZUUID as uuid,
      a.ZFILENAME as filename,
      datetime(a.ZDATECREATED + 978307200, 'unixepoch') as date,
      GROUP_CONCAT(DISTINCT p.ZFULLNAME) as people,
      COUNT(DISTINCT p.Z_PK) as peopleCount
    FROM ZASSET a
    JOIN ZDETECTEDFACE f ON f.ZASSETFORFACE = a.Z_PK
    JOIN ZPERSON p ON f.ZPERSONFORFACE = p.Z_PK
    ${whereClause}
    GROUP BY a.Z_PK
    HAVING peopleCount >= 1
    ORDER BY peopleCount DESC, a.ZDATECREATED DESC
    LIMIT 20;
  `;

  const output = execSync(`sqlite3 "${PHOTOS_DB}" "${query}"`, { encoding: 'utf-8' });

  return output.trim().split('\n').filter(Boolean).map(line => {
    const [uuid, filename, date, people, peopleCount] = line.split('|');
    return { uuid, filename, date, people, peopleCount: parseInt(peopleCount) };
  });
}

function spotlightPhoto(uuid: string): void {
  console.log(`Opening photo ${uuid} in Photos app...`);
  execSync(`osascript -e 'tell application "Photos" to activate'`);
  execSync(`sleep 1`);
  execSync(`osascript -e 'tell application "Photos" to spotlight media item id "${uuid}"'`);
  console.log('Photo should now be visible in Photos app.');
  console.log('If it was in iCloud, it will auto-download.');
  console.log('');
  console.log('To prepare for email, run:');
  console.log(`  npx tsx --env-file=.env.local scripts/papa90/photo-picker.ts prepare ${uuid}`);
}

async function preparePhoto(uuid: string): Promise<string> {
  // Find the original file
  const extensions = ['.jpeg', '.jpg', '.heic', '.HEIC', '.png'];
  let originalPath: string | null = null;

  for (const ext of extensions) {
    // Check in subdirectories (first char of UUID)
    const subdir = uuid.charAt(0).toUpperCase();
    const testPath = path.join(PHOTOS_ORIGINALS, subdir, uuid + ext);
    if (fs.existsSync(testPath)) {
      originalPath = testPath;
      break;
    }
    // Also check lowercase subdir
    const testPath2 = path.join(PHOTOS_ORIGINALS, subdir.toLowerCase(), uuid + ext);
    if (fs.existsSync(testPath2)) {
      originalPath = testPath2;
      break;
    }
  }

  if (!originalPath) {
    // Try to find it anywhere in originals
    const result = execSync(
      `find "${PHOTOS_ORIGINALS}" -name "${uuid}*" -type f 2>/dev/null | head -1`,
      { encoding: 'utf-8' }
    ).trim();

    if (result) {
      originalPath = result;
    }
  }

  if (!originalPath) {
    throw new Error(`Original not found for ${uuid}. Open it in Photos first to download from iCloud.`);
  }

  console.log('Found original:', originalPath);
  const stats = fs.statSync(originalPath);
  console.log('Original size:', Math.round(stats.size / 1024) + 'KB');

  // Ensure output directory exists
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  // Resize for email
  const outputPath = path.join(OUTPUT_DIR, `${uuid}-email.jpg`);

  const info = await sharp(originalPath)
    .resize(1200, null, { withoutEnlargement: true })
    .jpeg({ quality: 80 })
    .toFile(outputPath);

  const outputStats = fs.statSync(outputPath);
  console.log('Resized:', info.width + 'x' + info.height);
  console.log('Email size:', Math.round(outputStats.size / 1024) + 'KB');
  console.log('Saved to:', outputPath);

  return outputPath;
}

// CLI
const command = process.argv[2];
const arg = process.argv[3];

if (!command) {
  console.log('Papa 90 Photo Picker');
  console.log('');
  console.log('Commands:');
  console.log('  search [person]     - Search for family photos (optionally filter by person)');
  console.log('  spotlight <uuid>    - Open photo in Photos app');
  console.log('  prepare <uuid>      - Resize photo for email');
  console.log('');
  console.log('Examples:');
  console.log('  npx tsx --env-file=.env.local scripts/papa90/photo-picker.ts search');
  console.log('  npx tsx --env-file=.env.local scripts/papa90/photo-picker.ts search "Willy"');
  console.log('  npx tsx --env-file=.env.local scripts/papa90/photo-picker.ts spotlight ABC123');
  process.exit(0);
}

switch (command) {
  case 'search':
    const results = searchPhotos(arg);
    console.log('Found', results.length, 'photos:\n');
    results.forEach((r, i) => {
      console.log(`${i + 1}. ${r.uuid}`);
      console.log(`   Date: ${r.date}`);
      console.log(`   People (${r.peopleCount}): ${r.people}`);
      console.log('');
    });
    if (results.length > 0) {
      console.log('To view a photo, run:');
      console.log(`  npx tsx --env-file=.env.local scripts/papa90/photo-picker.ts spotlight ${results[0].uuid}`);
    }
    break;

  case 'spotlight':
    if (!arg) {
      console.error('Usage: photo-picker.ts spotlight <uuid>');
      process.exit(1);
    }
    spotlightPhoto(arg);
    break;

  case 'prepare':
    if (!arg) {
      console.error('Usage: photo-picker.ts prepare <uuid>');
      process.exit(1);
    }
    preparePhoto(arg).catch(err => {
      console.error('Error:', err.message);
      process.exit(1);
    });
    break;

  default:
    console.error('Unknown command:', command);
    process.exit(1);
}

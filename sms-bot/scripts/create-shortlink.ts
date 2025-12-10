import { createShortLink } from '../lib/utils/shortlink-service.js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '..', '.env.local'), override: true });

const targetUrl = process.argv[2];

if (!targetUrl) {
  console.error('Usage: npx tsx scripts/create-shortlink.ts <url>');
  process.exit(1);
}

const shortUrl = await createShortLink(targetUrl, {
  context: 'tokentank-twitter',
  createdBy: 'arc'
});

if (shortUrl) {
  console.log(shortUrl);
} else {
  console.error('Failed to create shortlink');
  process.exit(1);
}

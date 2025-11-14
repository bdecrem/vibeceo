#!/usr/bin/env node
/**
 * Create a short link for the recruiting report
 */

import { createShortLink } from '../dist/lib/utils/shortlink-service.js';

const reportUrl = 'https://tqniseocczttrfwtpbdr.supabase.co/storage/v1/object/public/agent-reports/recruiting/reports/2025-11-14.md';

console.log('Creating short link for recruiting report...');
console.log('Report URL:', reportUrl);
console.log('');

try {
  const shortLink = await createShortLink(reportUrl, {
    context: 'recruiting-report',
    createdBy: 'sms-bot',
    createdFor: 'talent-radar',
  });

  console.log('✅ Short link created successfully!');
  console.log('');
  console.log('Short Link:', shortLink);
  console.log('');
} catch (error) {
  console.error('❌ Failed to create short link:', error.message);
  console.error('');
  console.error('This is expected if shortlink service env vars are not set.');
  console.error('In production (Railway), the service will work automatically.');
  process.exit(1);
}

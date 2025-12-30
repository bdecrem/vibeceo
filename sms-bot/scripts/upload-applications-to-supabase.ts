/**
 * Upload CTRL SHIFT applications to Supabase
 */

import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

async function main() {
  const dataPath = '/Users/bart/Documents/code/vibeceo/sms-bot/data/ctrl-shift-applications/parsed_applications.json';
  const rawPath = '/Users/bart/Documents/code/vibeceo/sms-bot/data/ctrl-shift-applications/raw_applications_2025-12-30T17-40-59.json';

  const parsed = JSON.parse(fs.readFileSync(dataPath, 'utf-8'));
  const raw = JSON.parse(fs.readFileSync(rawPath, 'utf-8'));

  // Create a map of email -> messageId from raw data
  const messageIdMap: Record<string, string> = {};
  raw.forEach((r: any) => {
    const email = r.fromEmail || '';
    if (email) messageIdMap[email] = r.messageId;
  });

  console.log(`Uploading ${parsed.length} applications to Supabase...`);

  // Clear existing data first
  await supabase.from('ctrl_shift_applications').delete().neq('id', '00000000-0000-0000-0000-000000000000');

  for (const app of parsed) {
    const { error } = await supabase.from('ctrl_shift_applications').insert({
      message_id: messageIdMap[app.email] || null,
      name: app.name,
      email: app.email,
      date: app.date ? new Date(app.date).toISOString().split('T')[0] : null,
      pitch: app.pitch,
      project_links: app.projectLinks || [],
      twitter_linkedin: app.twitterLinkedin || null,
      availability: app.availability || null,
      summary: app.summary || null,
      focus_area: app.focusArea || null,
      stage: app.stage || null,
    });

    if (error) {
      console.error(`Error inserting ${app.name}:`, error.message);
    } else {
      console.log(`✓ ${app.name}`);
    }
  }

  console.log('\nDone! Applications are now in Supabase.');
}

main().catch(console.error);

/**
 * Script to manually delete a recruiting project
 * Usage: node dist/scripts/delete-recruiting-project.js <phone_number> <project_id>
 */

import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { createClient } from '@supabase/supabase-js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load .env.local from sms-bot directory FIRST
const envPath = join(__dirname, '../../.env.local');
dotenv.config({ path: envPath });

// Create supabase client directly (don't use lib/supabase.js)
const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

const phoneNumber = process.argv[2];
const projectIdToDelete = process.argv[3];

if (!phoneNumber || !projectIdToDelete) {
  console.error('Usage: node dist/scripts/delete-recruiting-project.js <phone_number> <project_id>');
  console.error('Example: node dist/scripts/delete-recruiting-project.js +16508989508 9bb8d112-4acd-4807-9514-0e7b3186556e');
  process.exit(1);
}

async function deleteProject() {
  console.log(`Deleting project ${projectIdToDelete} for ${phoneNumber}...`);

  // Get subscriber
  const { data: subscriber, error: subError } = await supabase
    .from('sms_subscribers')
    .select('id')
    .eq('phone_number', phoneNumber)
    .single();

  if (subError || !subscriber) {
    console.error('❌ Subscriber not found');
    process.exit(1);
  }

  // Get current preferences
  const { data: subData, error: fetchError } = await supabase
    .from('agent_subscriptions')
    .select('preferences')
    .eq('subscriber_id', subscriber.id)
    .eq('agent_slug', 'recruiting')
    .single();

  if (fetchError || !subData) {
    console.error('❌ Failed to fetch recruiting preferences:', fetchError);
    process.exit(1);
  }

  const prefs = subData.preferences as any;

  if (!prefs.projects || !prefs.projects[projectIdToDelete]) {
    console.error('❌ Project not found in preferences');
    console.log('Available projects:');
    Object.keys(prefs.projects || {}).forEach((id, i) => {
      const project = prefs.projects[id];
      console.log(`  ${i + 1}. ${id}: ${project.query.substring(0, 60)}...`);
    });
    process.exit(1);
  }

  const projectQuery = prefs.projects[projectIdToDelete].query;

  // Delete associated candidates from database
  const { error: deleteError } = await supabase
    .from('recruiting_candidates')
    .delete()
    .eq('project_id', projectIdToDelete);

  if (deleteError) {
    console.error(`❌ Failed to delete candidates:`, deleteError);
  } else {
    console.log('✅ Deleted associated candidates');
  }

  // Delete the project from preferences
  delete prefs.projects[projectIdToDelete];

  // If the deleted project was active, clear activeProjectId
  if (prefs.activeProjectId === projectIdToDelete) {
    prefs.activeProjectId = undefined;
  }

  // Update preferences
  const { error: updateError } = await supabase
    .from('agent_subscriptions')
    .update({ preferences: prefs })
    .eq('subscriber_id', subscriber.id)
    .eq('agent_slug', 'recruiting');

  if (updateError) {
    console.error('❌ Failed to update preferences:', updateError);
    process.exit(1);
  }

  console.log(`✅ Deleted project: "${projectQuery}"`);
  console.log(`\nRemaining projects: ${Object.keys(prefs.projects).length}/3`);
}

deleteProject().catch(console.error);

/**
 * Clean up recruiting agent subscriptions
 * Keep only 3 projects with sources field
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function cleanupRecruitingProjects() {
  console.log('[Cleanup] Fetching recruiting subscriptions...');

  // Fetch the recruiting subscription
  const { data, error } = await supabase
    .from('agent_subscriptions')
    .select('*')
    .eq('agent_slug', 'recruiting')
    .single();

  if (error) {
    console.error('[Cleanup] Error fetching subscription:', error);
    process.exit(1);
  }

  console.log('[Cleanup] Current subscription ID:', data.id);

  const preferences = data.preferences;
  const projects = preferences.projects || {};

  console.log('[Cleanup] Current project count:', Object.keys(projects).length);

  // Keep only these 3 projects with sources
  const projectsToKeep = [
    '03a27eba-a4ab-4206-8209-ce197e2fcd26', // "help" - empty sources
    '5d9da0e6-985c-44a0-b767-cdc3bad0b1d6', // "motion designers who are still students" - FULL sources
    'fdceb730-c324-4996-9949-37103e2bbb63', // "entrepreneurial students building with AI" - FULL sources (active)
  ];

  // Build new projects object with only the 3 we want to keep
  const cleanedProjects = {};
  for (const projectId of projectsToKeep) {
    if (projects[projectId]) {
      cleanedProjects[projectId] = projects[projectId];
      console.log(`[Cleanup] Keeping project: ${projectId} - "${projects[projectId].query}"`);
    } else {
      console.warn(`[Cleanup] Project ${projectId} not found in current data`);
    }
  }

  console.log('[Cleanup] New project count:', Object.keys(cleanedProjects).length);

  // Update the subscription with cleaned projects
  const newPreferences = {
    projects: cleanedProjects,
    activeProjectId: preferences.activeProjectId, // Keep current active project ID
  };

  const { error: updateError } = await supabase
    .from('agent_subscriptions')
    .update({ preferences: newPreferences })
    .eq('id', data.id);

  if (updateError) {
    console.error('[Cleanup] Error updating subscription:', updateError);
    process.exit(1);
  }

  console.log('[Cleanup] ✅ Successfully cleaned up projects!');
  console.log('[Cleanup] Removed:', Object.keys(projects).length - Object.keys(cleanedProjects).length, 'projects');
  console.log('[Cleanup] Kept:', Object.keys(cleanedProjects).length, 'projects');

  // Show summary of kept projects
  console.log('\n[Cleanup] Summary of kept projects:');
  for (const [projectId, project] of Object.entries(cleanedProjects)) {
    const hasFullSources = project.sources &&
      (project.sources.youtube?.length > 0 ||
       project.sources.twitter?.length > 0 ||
       project.sources.github?.length > 0 ||
       project.sources.rss?.length > 0);

    console.log(`  - ${projectId.slice(0, 8)}... "${project.query.slice(0, 50)}..."`);
    console.log(`    Sources: ${hasFullSources ? 'YES' : 'EMPTY'}, Active: ${project.active}, Setup Complete: ${project.setupComplete}`);
  }
}

cleanupRecruitingProjects().catch(console.error);

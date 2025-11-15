#!/usr/bin/env node
/**
 * Generate a recruiting report manually for testing/debugging
 * Usage: npx tsx sms-bot/scripts/generate-recruiting-report.ts <project-id>
 */

import dotenv from 'dotenv';

// Load environment variables from sms-bot/.env.local
const result = dotenv.config({ path: '.env.local' });
if (result.error) {
  console.error(`❌ Error loading .env.local:`, result.error);
  console.error('Make sure to run this from the sms-bot/ directory');
  process.exit(1);
}
console.log(`✅ Loaded environment variables`);

async function main() {
  // Dynamic imports after env is loaded
  const { supabase } = await import('../lib/supabase.js');
  const { generateAndStoreRecruitingReport } = await import('../agents/recruiting/report-generator.js');
  const projectId = process.argv[2] || '5bec42d5-daee-4919-85ac-bf93c30e53d1';

  console.log(`Generating recruiting report for project: ${projectId}`);

  // Fetch subscription data for Bart's subscriber_id
  const bartSubscriberId = 'a5167b9a-a718-4567-a22d-312b7bf9e773';
  const { data: subscription, error } = await supabase
    .from('agent_subscriptions')
    .select('*')
    .eq('agent_slug', 'recruiting')
    .eq('subscriber_id', bartSubscriberId)
    .limit(1)
    .single();

  if (error || !subscription) {
    console.error('Failed to fetch subscription:', error);
    process.exit(1);
  }

  console.log('Found subscription:', subscription.id);

  // Get project data from preferences
  const projects = subscription.preferences?.projects || {};
  const project = projects[projectId];

  if (!project) {
    console.error(`Project ${projectId} not found in subscription preferences`);
    console.log('Available projects:', Object.keys(projects));
    process.exit(1);
  }

  console.log('Found project:', project.query);

  // Get pending candidates
  const pendingCandidates = project.pendingCandidates || project.candidates || [];

  if (pendingCandidates.length === 0) {
    console.error('No candidates found in project');
    process.exit(1);
  }

  console.log(`Found ${pendingCandidates.length} candidates`);

  // Map to Candidate type expected by report generator
  const candidates = pendingCandidates.map((c: any) => ({
    id: c.id,
    name: c.name,
    bio: c.bio,
    location: c.location || undefined,
    profileUrl: c.profileUrl,
    githubUrl: c.githubUrl || undefined,
    portfolioUrl: c.portfolioUrl || undefined,
    twitterUrl: c.twitterUrl || undefined,
    score: c.score,
    matchReason: c.matchReason,
    channelSource: c.channelSource,
    status: c.status || 'pending',
    addedAt: c.addedAt,
  }));

  // Generate report
  const date = new Date().toISOString().split('T')[0];

  console.log(`Generating report for date: ${date}`);

  const result = await generateAndStoreRecruitingReport({
    project: {
      query: project.query,
      refinedSpec: project.refinedSpec,
      approvedChannels: project.channels || [],
      learnedProfile: project.learnedProfile || {},
    },
    candidates,
    date,
    reportType: 'setup',
  });

  console.log('\n✅ Report generated successfully!');
  console.log('\nReport URL:', result.stored.publicUrl);
  console.log('Short Link:', result.shortLink || 'N/A');
  console.log('Storage Path:', result.stored.reportPath);
  console.log('\nSummary:', result.summary);

  // Also update database with candidates
  const dbCandidates = candidates.map((c, i) => ({
    subscriber_id: subscription.subscriber_id,
    project_id: projectId,
    name: c.name,
    title: null,
    company: null,
    company_size: 'unknown',
    location: c.location || null,
    linkedin_url: c.profileUrl.includes('linkedin') ? c.profileUrl : null,
    twitter_handle: null,
    match_reason: c.matchReason,
    recent_activity: null,
    source: c.channelSource,
    raw_profile: {},
    report_type: 'setup',
    report_date: date,
    position_in_report: i + 1,
  }));

  const { error: insertError } = await supabase
    .from('recruiting_candidates')
    .insert(dbCandidates);

  if (insertError) {
    console.error('Failed to store candidates in database:', insertError);
  } else {
    console.log(`\n✅ Stored ${dbCandidates.length} candidates in database`);
  }
}

main().catch(console.error);

#!/usr/bin/env node

/**
 * Test script for ASH.TAG voice integration
 * Creates test issues to verify the new personality system
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load .env.local first, fallback to .env
dotenv.config({ path: '../.env.local' });
if (!process.env.SUPABASE_URL) {
  dotenv.config({ path: '../.env' });
}

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const ISSUE_TRACKER_APP_ID = '83218c2e-281e-4265-a95f-1d3f763870d4';

async function createTestIssue(idea, category = 'bug') {
  const testIssue = {
    app_id: ISSUE_TRACKER_APP_ID,
    action_type: 'issue',
    content_data: {
      idea,
      author: 'Test Script',
      category,
      status: 'Backlog',
      created_at: new Date().toISOString()
    },
    created_at: new Date(),
    updated_at: new Date()
  };

  const { data, error } = await supabase
    .from('wtaf_zero_admin_collaborative')
    .insert(testIssue)
    .select()
    .single();

  if (error) {
    console.error('Error creating test issue:', error);
    return null;
  }

  return data;
}

async function runTests() {
  console.log('🧪 Testing ASH.TAG Voice Integration');
  console.log('=====================================\n');

  // Test 1: Simple bug fix
  console.log('Test 1: Creating simple bug fix issue...');
  const bug = await createTestIssue(
    'The submit button on the issue tracker doesnt show a loading state while submitting',
    'bug'
  );
  if (bug) {
    console.log(`✅ Created issue #${bug.id}: Simple bug fix`);
  }

  // Test 2: Feature request
  console.log('\nTest 2: Creating feature request...');
  const feature = await createTestIssue(
    'Add dark mode toggle to the issue tracker interface',
    'feature'
  );
  if (feature) {
    console.log(`✅ Created issue #${feature.id}: Feature request`);
  }

  // Test 3: Test/joke submission
  console.log('\nTest 3: Creating test submission...');
  const test = await createTestIssue(
    'test test test',
    'triage'
  );
  if (test) {
    console.log(`✅ Created issue #${test.id}: Test submission (should be caught by reformulator)`);
  }

  // Test 4: Support question
  console.log('\nTest 4: Creating support question...');
  const support = await createTestIssue(
    'How do I create a game using SMS?',
    'triage'
  );
  if (support) {
    console.log(`✅ Created issue #${support.id}: Support question (should be answered directly)`);
  }

  // Test 5: Plan request
  console.log('\nTest 5: Creating plan request...');
  const plan = await createTestIssue(
    'Create a plan for implementing real-time notifications in the issue tracker',
    'plan'
  );
  if (plan) {
    console.log(`✅ Created issue #${plan.id}: Plan request`);
  }

  console.log('\n=====================================');
  console.log('🎯 Test issues created successfully!');
  console.log('\nNow run the pipeline to see ASH.TAG in action:');
  console.log('  node reformulate-issues.js');
  console.log('  node fix-issues.js');
  console.log('\nThen check the issue tracker UI to see the new ASH.TAG explanations!');
}

runTests()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
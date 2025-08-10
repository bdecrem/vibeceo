#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Load .env.local first, fallback to .env
dotenv.config({ path: path.join(path.dirname(fileURLToPath(import.meta.url)), '../.env.local') });
if (!process.env.SUPABASE_URL) {
  dotenv.config({ path: path.join(path.dirname(fileURLToPath(import.meta.url)), '../.env') });
}

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const APP_ID = '83218c2e-281e-4265-a95f-1d3f763870d4';

// Create a test issue with meaningful content
const testIssue = {
  app_id: APP_ID,
  action_type: 'issue',
  participant_id: 'test_user',
  content_data: {
    idea: "Add dark mode toggle to the WEBTOYS interface. Users should be able to switch between light and dark themes, with the preference saved for future visits.",
    author: "test_verbose",
    status: "new",
    category: "feature",
    comments: [],
    reactions: {
      "👍": 0,
      "🔥": 0,
      "❤️": 0
    },
    timestamp: Date.now()
  },
  created_at: new Date(),
  updated_at: new Date()
};

console.log('📝 Creating test issue for verbose reformulation...');
const { data, error } = await supabase
  .from('wtaf_zero_admin_collaborative')
  .insert(testIssue)
  .select()
  .single();

if (error) {
  console.error('❌ Error creating test issue:', error);
} else {
  console.log('✅ Created test issue #' + data.id);
  console.log('   Title:', testIssue.content_data.idea);
  console.log('\n📋 Now run: node reformulate-issues.js');
  console.log('   to see the verbose analysis in action!');
}
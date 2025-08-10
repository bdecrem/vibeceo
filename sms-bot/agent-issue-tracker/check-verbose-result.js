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

// Get the reformulated issue
const { data, error } = await supabase
  .from('wtaf_zero_admin_collaborative')
  .select('*')
  .eq('id', 1919)
  .single();

if (error) {
  console.error('Error:', error);
} else {
  const content = data.content_data;
  console.log('📋 Issue #1919 - Reformulation Results\n');
  console.log('=====================================\n');
  
  console.log('📝 Original Request:');
  console.log('   ' + content.idea);
  console.log('');
  
  console.log('✨ Reformulated:');
  console.log('   ' + content.reformulated);
  console.log('');
  
  console.log('📊 Metadata:');
  console.log('   Status:', content.status);
  console.log('   Confidence:', content.confidence);
  console.log('   Priority:', content.priority);
  console.log('   Complexity:', content.estimated_complexity);
  console.log('   Category:', content.category);
  console.log('');
  
  console.log('✅ Acceptance Criteria:');
  if (content.acceptance_criteria) {
    content.acceptance_criteria.forEach((criterion, i) => {
      console.log(`   ${i + 1}. ${criterion}`);
    });
  }
  console.log('');
  
  console.log('🔧 Affected Components:');
  if (content.affected_components) {
    content.affected_components.forEach(component => {
      console.log('   - ' + component);
    });
  }
  console.log('');
  
  console.log('💬 User-Friendly Analysis Notes:');
  console.log('-----------------------------------');
  if (content.analysis_notes) {
    console.log(content.analysis_notes);
  } else {
    console.log('(No analysis notes provided)');
  }
  console.log('');
  
  console.log('🔨 Technical Notes:');
  console.log('-------------------');
  if (content.technical_notes) {
    console.log(content.technical_notes);
  } else {
    console.log('(No technical notes provided)');
  }
}
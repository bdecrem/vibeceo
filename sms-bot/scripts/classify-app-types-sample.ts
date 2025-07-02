import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
const envPath = path.join(__dirname, '../../.env.local');
dotenv.config({ path: envPath });

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

async function classifyAppType(app: any): Promise<{ type: string; reasoning: string }> {
  const { id, user_slug, app_slug, original_prompt } = app;
  
  // 1. Check if it's a GAME (has "GAME" in original_prompt)
  if (original_prompt && original_prompt.toUpperCase().includes('GAME')) {
    return { 
      type: 'games', 
      reasoning: 'Contains "GAME" in original_prompt' 
    };
  }
  
  // 2. Check if it's a ZAD (exists in wtaf_zero_admin_collaborative)
  const { data: zadData, error: zadError } = await supabase
    .from('wtaf_zero_admin_collaborative')
    .select('id')
    .eq('user_slug', user_slug)
    .eq('app_slug', app_slug)
    .limit(1);
  
  if (!zadError && zadData && zadData.length > 0) {
    return { 
      type: 'ZAD', 
      reasoning: 'Found in wtaf_zero_admin_collaborative table' 
    };
  }
  
  // 3. Check if it needs admin (exists in wtaf_submissions)
  const { data: submissionData, error: submissionError } = await supabase
    .from('wtaf_submissions')
    .select('id')
    .eq('user_slug', user_slug)
    .eq('app_slug', app_slug)
    .limit(1);
  
  if (!submissionError && submissionData && submissionData.length > 0) {
    return { 
      type: 'needsAdmin', 
      reasoning: 'Found in wtaf_submissions table' 
    };
  }
  
  // 4. Check if it's oneThing (DISABLED - too unreliable with keyword matching)
  // TODO: Implement better oneThing detection logic
  // if (original_prompt) {
  //   const prompt = original_prompt.toLowerCase();
  //   
  //   const oneThingPatterns = [
  //     'email',
  //     'subscribe',
  //     'newsletter',
  //     'contact',
  //     'sign up',
  //     'signup',
  //     'join',
  //     'waitlist',
  //     'notify me',
  //     'get notified',
  //     'coming soon',
  //     'landing page',
  //     'collect'
  //   ];
  //   
  //   if (oneThingPatterns.some(pattern => prompt.includes(pattern))) {
  //     return { 
  //       type: 'oneThing', 
  //       reasoning: `Likely oneThing app - prompt contains keywords: ${oneThingPatterns.filter(p => prompt.includes(p)).join(', ')}` 
  //     };
  //   }
  // }
  
  // 5. Default to web (general bucket)
  return { 
    type: 'web', 
    reasoning: 'Default classification - general web page' 
  };
}

async function sampleClassification(): Promise<void> {
  console.log('🧪 SAMPLE APP TYPE CLASSIFICATION (First 10 apps)');
  console.log('═'.repeat(60));
  
  try {
    // Get first 10 apps
    const { data: apps, error } = await supabase
      .from('wtaf_content')
      .select('id, user_slug, app_slug, original_prompt, type')
      .order('created_at', { ascending: false })
      .limit(10);
    
    if (error) {
      throw new Error(`Failed to fetch apps: ${error.message}`);
    }
    
    console.log(`✅ Processing ${apps?.length || 0} sample apps\n`);
    
    for (let i = 0; i < (apps || []).length; i++) {
      const app = apps![i];
      console.log(`🔍 Processing ${i + 1}/10: ${app.user_slug}/${app.app_slug}`);
      
      const { type, reasoning } = await classifyAppType(app);
      
      const promptPreview = (app.original_prompt || '').substring(0, 100) + 
        (app.original_prompt && app.original_prompt.length > 100 ? '...' : '');
      
      console.log(`   📝 Prompt: "${promptPreview}"`);
      console.log(`   🏷️ Current: ${app.type || 'null'} → Suggested: ${type}`);
      console.log(`   💭 Reasoning: ${reasoning}\n`);
    }
    
    console.log('🎉 Sample classification complete!');
    console.log('💡 Run "npm run classify-app-types --dry-run" to see all apps');
    console.log('💡 Run "npm run classify-app-types --apply" to update database');
    
  } catch (error) {
    console.error('❌ Sample classification failed:', error.message);
  }
}

sampleClassification(); 
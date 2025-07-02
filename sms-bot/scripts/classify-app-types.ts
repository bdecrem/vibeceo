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

interface AppClassification {
  id: number;
  user_slug: string;
  app_slug: string;
  original_prompt: string;
  currentType: string | null;
  suggestedType: string;
  reasoning: string;
}

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

async function getAllApps(): Promise<any[]> {
  console.log('📡 Fetching all apps from wtaf_content...');
  
  const { data, error } = await supabase
    .from('wtaf_content')
    .select('id, user_slug, app_slug, original_prompt, type')
    .order('created_at', { ascending: false });
  
  if (error) {
    throw new Error(`Failed to fetch apps: ${error.message}`);
  }
  
  console.log(`✅ Found ${data?.length || 0} apps to classify`);
  return data || [];
}

async function classifyAllApps(dryRun: boolean = true): Promise<void> {
  console.log('🚀 STARTING APP TYPE CLASSIFICATION');
  console.log(`⚙️ Mode: ${dryRun ? 'DRY RUN (preview only)' : 'LIVE UPDATE'}`);
  console.log('═'.repeat(60));
  
  try {
    const apps = await getAllApps();
    const classifications: AppClassification[] = [];
    
    let processed = 0;
    
    for (const app of apps) {
      processed++;
      console.log(`\n🔍 Processing ${processed}/${apps.length}: ${app.user_slug}/${app.app_slug}`);
      
      const { type, reasoning } = await classifyAppType(app);
      
      const classification: AppClassification = {
        id: app.id,
        user_slug: app.user_slug,
        app_slug: app.app_slug,
        original_prompt: app.original_prompt || '',
        currentType: app.type,
        suggestedType: type,
        reasoning
      };
      
      classifications.push(classification);
      
      // Show the classification
      const promptPreview = (app.original_prompt || '').substring(0, 80) + 
        (app.original_prompt && app.original_prompt.length > 80 ? '...' : '');
      
      console.log(`   📝 Prompt: "${promptPreview}"`);
      console.log(`   🏷️ Current: ${app.type || 'null'} → Suggested: ${type}`);
      console.log(`   💭 Reasoning: ${reasoning}`);
      
      // Small delay to be nice to the database
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    // Summary statistics
    const typeCounts = classifications.reduce((acc, c) => {
      acc[c.suggestedType] = (acc[c.suggestedType] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    const changes = classifications.filter(c => c.currentType !== c.suggestedType);
    
    console.log('\n' + '═'.repeat(60));
    console.log('📊 CLASSIFICATION SUMMARY');
    console.log('═'.repeat(60));
    console.log('Type Distribution:');
    Object.entries(typeCounts).forEach(([type, count]) => {
      console.log(`  ${type}: ${count} apps`);
    });
    
    console.log(`\n📈 Total apps: ${classifications.length}`);
    console.log(`📝 Changes needed: ${changes.length}`);
    console.log(`✅ Already correct: ${classifications.length - changes.length}`);
    
    if (!dryRun && changes.length > 0) {
      console.log('\n🔄 Applying updates to database...');
      
      let updated = 0;
      for (const change of changes) {
        const { error } = await supabase
          .from('wtaf_content')
          .update({ type: change.suggestedType })
          .eq('id', change.id);
        
        if (error) {
          console.error(`❌ Failed to update ${change.user_slug}/${change.app_slug}:`, error.message);
        } else {
          updated++;
          console.log(`✅ Updated ${change.user_slug}/${change.app_slug} → ${change.suggestedType}`);
        }
      }
      
      console.log(`\n🎉 Successfully updated ${updated}/${changes.length} apps`);
    } else if (dryRun && changes.length > 0) {
      console.log('\n🧪 DRY RUN - Changes that would be made:');
      changes.slice(0, 10).forEach(change => {
        console.log(`  ${change.user_slug}/${change.app_slug}: ${change.currentType || 'null'} → ${change.suggestedType}`);
      });
      if (changes.length > 10) {
        console.log(`  ... and ${changes.length - 10} more changes`);
      }
    }
    
  } catch (error) {
    console.error('❌ Classification failed:', error.message);
    throw error;
  }
}

async function main() {
  const args = process.argv.slice(2);
  
  if (args.includes('--help')) {
    console.log(`
🏷️ APP TYPE CLASSIFIER

Classifies all apps in wtaf_content into 5 types based on analysis:

TYPES:
  games     - Contains "GAME" in original_prompt
  ZAD       - Exists in wtaf_zero_admin_collaborative table  
  needsAdmin - Exists in wtaf_submissions table
  oneThing  - Contains keywords like email, subscribe, newsletter, etc.
  web       - Default bucket for general web pages

USAGE:
  npm run classify-app-types [options]

OPTIONS:
  --dry-run     Preview classifications without updating database (default)
  --apply       Actually update the database with new type classifications
  --help        Show this help

EXAMPLES:
  # Preview what would be classified
  npm run classify-app-types --dry-run

  # Actually apply the classifications
  npm run classify-app-types --apply

SAFETY:
  - Default is dry-run mode (safe)
  - Shows detailed reasoning for each classification
  - Reports summary statistics before applying changes
    `);
    process.exit(0);
  }
  
  const dryRun = !args.includes('--apply');
  
  if (!dryRun) {
    console.log('⚠️  WARNING: This will modify the database!');
    console.log('⚠️  Make sure you have reviewed the dry-run output first.');
    console.log('⚠️  Press Ctrl+C now to cancel, or wait 5 seconds to continue...\n');
    
    await new Promise(resolve => setTimeout(resolve, 5000));
  }
  
  await classifyAllApps(dryRun);
}

main().catch(console.error); 
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

// ES module compatibility
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
const envPath = join(__dirname, '..', '..', '.env.local');
console.log(`🔧 Loading .env from: ${envPath}`);
dotenv.config({ path: envPath });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

console.log(`🔧 SUPABASE_URL loaded: ${supabaseUrl ? 'YES' : 'NO'}`);
console.log(`🔧 SUPABASE_SERVICE_KEY loaded: ${supabaseServiceKey ? 'YES' : 'NO'}`);

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials');
  console.error('Available env vars:', Object.keys(process.env).filter(k => k.includes('SUPABASE')));
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

interface WtafContent {
  id: string;
  user_slug: string;
  app_slug: string;
  created_at: string;
  updated_at?: string;
}

async function checkSlugConflicts() {
  console.log('🔍 Analyzing app slug conflicts in database...\n');

  try {
    // Get all wtaf_content records
    const { data: allApps, error } = await supabase
      .from('wtaf_content')
      .select('id, user_slug, app_slug, created_at, updated_at')
      .order('created_at', { ascending: true });

    if (error) {
      console.error('❌ Database query error:', error);
      return;
    }

    if (!allApps || allApps.length === 0) {
      console.log('📭 No apps found in database');
      return;
    }

    console.log(`📊 Total apps in database: ${allApps.length}\n`);

    // Check for conflicts within same user
    const userConflicts = new Map<string, Map<string, WtafContent[]>>();
    
    // Group by user_slug, then by app_slug
    allApps.forEach(app => {
      if (!userConflicts.has(app.user_slug)) {
        userConflicts.set(app.user_slug, new Map());
      }
      
      const userApps = userConflicts.get(app.user_slug)!;
      if (!userApps.has(app.app_slug)) {
        userApps.set(app.app_slug, []);
      }
      
      userApps.get(app.app_slug)!.push(app);
    });

    // Check for conflicts
    let conflictCount = 0;
    let totalConflictedApps = 0;

    console.log('🔍 CHECKING FOR SLUG CONFLICTS:\n');

    userConflicts.forEach((userApps, userSlug) => {
      userApps.forEach((apps, appSlug) => {
        if (apps.length > 1) {
          conflictCount++;
          totalConflictedApps += apps.length;
          
          console.log(`🚨 CONFLICT FOUND:`);
          console.log(`   User: ${userSlug}`);
          console.log(`   App Slug: ${appSlug}`);
          console.log(`   Duplicate Count: ${apps.length}`);
          console.log(`   Apps:`);
          
          apps.forEach((app, index) => {
            const date = new Date(app.created_at).toLocaleDateString();
            console.log(`     ${index + 1}. ID: ${app.id} | Created: ${date}`);
          });
          console.log('');
        }
      });
    });

    // Global slug analysis (across all users)
    const globalSlugs = new Map<string, WtafContent[]>();
    allApps.forEach(app => {
      if (!globalSlugs.has(app.app_slug)) {
        globalSlugs.set(app.app_slug, []);
      }
      globalSlugs.get(app.app_slug)!.push(app);
    });

    let globalConflicts = 0;
    globalSlugs.forEach((apps, appSlug) => {
      if (apps.length > 1) {
        globalConflicts++;
      }
    });

    // Summary statistics
    console.log('📈 CONFLICT ANALYSIS SUMMARY:');
    console.log('─'.repeat(50));
    console.log(`Total apps: ${allApps.length}`);
    console.log(`Unique users: ${userConflicts.size}`);
    console.log(`User-level conflicts: ${conflictCount}`);
    console.log(`Apps involved in conflicts: ${totalConflictedApps}`);
    console.log(`Global slug reuse: ${globalConflicts} slugs used by multiple users`);
    
    if (conflictCount === 0) {
      console.log('✅ No user-level slug conflicts found!');
    } else {
      console.log(`⚠️  Found ${conflictCount} user-level conflicts affecting ${totalConflictedApps} apps`);
    }

    // Show most popular slugs
    console.log('\n🏆 MOST POPULAR SLUGS (used by multiple users):');
    console.log('─'.repeat(50));
    
    const popularSlugs = Array.from(globalSlugs.entries())
      .filter(([_, apps]) => apps.length > 1)
      .sort((a, b) => b[1].length - a[1].length)
      .slice(0, 10);

    if (popularSlugs.length === 0) {
      console.log('✨ All slugs are unique across all users!');
    } else {
      popularSlugs.forEach(([slug, apps]) => {
        const users = [...new Set(apps.map(app => app.user_slug))];
        console.log(`   ${slug}: ${apps.length} apps across ${users.length} users`);
        console.log(`     Users: ${users.join(', ')}`);
      });
    }

    // Current dictionary size analysis
    console.log('\n🎯 DICTIONARY EXPANSION IMPACT:');
    console.log('─'.repeat(50));
    console.log('Old system: 15×15×15 = 3,375 combinations');
    console.log('New system: 225×300×255 = 17,212,500 combinations');
    console.log(`Current database usage: ${allApps.length} apps`);
    
    const oldCollisionRisk = (allApps.length * (allApps.length - 1)) / (2 * 3375);
    const newCollisionRisk = (allApps.length * (allApps.length - 1)) / (2 * 17212500);
    
    console.log(`Old system collision risk: ${(oldCollisionRisk * 100).toFixed(4)}%`);
    console.log(`New system collision risk: ${(newCollisionRisk * 100).toFixed(8)}%`);
    console.log(`Risk reduction: ${(oldCollisionRisk / newCollisionRisk).toFixed(0)}x safer`);

  } catch (error) {
    console.error('❌ Error analyzing conflicts:', error);
  }
}

// Run the analysis
checkSlugConflicts().then(() => {
  console.log('\n✅ Slug conflict analysis complete');
}).catch(error => {
  console.error('❌ Analysis failed:', error);
}); 
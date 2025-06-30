import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { COLORS, ANIMALS, ACTIONS } from '../engine/shared/config.js';

// ES module compatibility
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
const envPath = join(__dirname, '..', '..', '.env.local');
dotenv.config({ path: envPath });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Generate unique app slug for this user
async function generateUniqueAppSlugForUser(userSlug: string): Promise<string> {
  const maxAttempts = 50;
  let attempts = 0;
  
  while (attempts < maxAttempts) {
    // Generate random 3-part slug
    const color = COLORS[Math.floor(Math.random() * COLORS.length)];
    const animal = ANIMALS[Math.floor(Math.random() * ANIMALS.length)];
    const action = ACTIONS[Math.floor(Math.random() * ACTIONS.length)];
    const appSlug = `${color}-${animal}-${action}`;
    
    // Check if this user already has an app with this slug
    const { data, error } = await supabase
      .from('wtaf_content')
      .select('id')
      .eq('user_slug', userSlug)
      .eq('app_slug', appSlug);
      
    if (error) {
      console.error(`⚠️ Error checking slug uniqueness: ${error.message}`);
      attempts++;
      continue;
    }
    
    if (!data || data.length === 0) { // No existing record found
      console.log(`✅ Generated unique slug: ${appSlug} for user: ${userSlug}`);
      return appSlug;
    }
    
    attempts++;
    console.log(`🔄 Slug collision attempt ${attempts}: ${appSlug}`);
  }
  
  // Fallback: add timestamp to guarantee uniqueness
  const timestamp = new Date().toISOString().slice(11, 19).replace(/:/g, '');
  const color = COLORS[Math.floor(Math.random() * COLORS.length)];
  const animal = ANIMALS[Math.floor(Math.random() * ANIMALS.length)];
  const action = ACTIONS[Math.floor(Math.random() * ACTIONS.length)];
  const fallbackSlug = `${color}-${animal}-${action}-${timestamp}`;
  console.log(`🆘 Using fallback slug: ${fallbackSlug}`);
  return fallbackSlug;
}

async function resolveConflicts() {
  console.log('🔧 Resolving slug conflicts between bart and test-user...\n');

  try {
    // First, find all conflicts between bart and test-user
    console.log('🔍 Step 1: Finding conflicts between bart and test-user...');
    
    const { data: allApps, error } = await supabase
      .from('wtaf_content')
      .select('id, user_slug, app_slug, created_at')
      .in('user_slug', ['bart', 'test-user'])
      .order('created_at', { ascending: true });

    if (error) {
      console.error('❌ Database query error:', error);
      return;
    }

    if (!allApps || allApps.length === 0) {
      console.log('📭 No apps found for bart or test-user');
      return;
    }

    // Group by app_slug to find conflicts
    const slugGroups = new Map<string, typeof allApps>();
    allApps.forEach(app => {
      if (!slugGroups.has(app.app_slug)) {
        slugGroups.set(app.app_slug, []);
      }
      slugGroups.get(app.app_slug)!.push(app);
    });

    // Find conflicts (same slug used by both bart and test-user)
    const conflicts: Array<{slug: string, bartApp: any, testUserApp: any}> = [];
    
    slugGroups.forEach((apps, slug) => {
      const bartApps = apps.filter(app => app.user_slug === 'bart');
      const testUserApps = apps.filter(app => app.user_slug === 'test-user');
      
      if (bartApps.length > 0 && testUserApps.length > 0) {
        // Conflict found - bart gets priority, test-user apps need renaming
        conflicts.push({
          slug,
          bartApp: bartApps[0], // Use earliest bart app
          testUserApp: testUserApps[0] // Rename earliest test-user app
        });
      }
    });

    if (conflicts.length === 0) {
      console.log('✅ No conflicts found between bart and test-user');
      return;
    }

    console.log(`\n🚨 Found ${conflicts.length} conflicts to resolve:`);
    conflicts.forEach((conflict, index) => {
      console.log(`   ${index + 1}. ${conflict.slug}`);
      console.log(`      - bart app: ${conflict.bartApp.id} (created: ${new Date(conflict.bartApp.created_at).toLocaleDateString()})`);
      console.log(`      - test-user app: ${conflict.testUserApp.id} (created: ${new Date(conflict.testUserApp.created_at).toLocaleDateString()})`);
    });

    console.log('\n🔧 Step 2: Generating new slugs for test-user apps...');
    
    // Resolve each conflict
    for (let i = 0; i < conflicts.length; i++) {
      const conflict = conflicts[i];
      console.log(`\n📝 Resolving conflict ${i + 1}/${conflicts.length}: ${conflict.slug}`);
      
      // Generate new unique slug for test-user app
      const newSlug = await generateUniqueAppSlugForUser('test-user');
      
      console.log(`   🔄 Renaming test-user app ${conflict.testUserApp.id}:`);
      console.log(`      Old: test-user/${conflict.slug}`);
      console.log(`      New: test-user/${newSlug}`);
      
      // Update the database
      const { error: updateError } = await supabase
        .from('wtaf_content')
        .update({ app_slug: newSlug })
        .eq('id', conflict.testUserApp.id);
      
      if (updateError) {
        console.error(`❌ Failed to update app ${conflict.testUserApp.id}:`, updateError);
      } else {
        console.log(`✅ Successfully renamed to: test-user/${newSlug}`);
      }
    }

    console.log('\n🎉 Conflict resolution complete!');
    console.log('\n📊 Summary:');
    console.log(`   - Conflicts resolved: ${conflicts.length}`);
    console.log(`   - bart apps unchanged: ${conflicts.length} (kept original slugs)`);
    console.log(`   - test-user apps renamed: ${conflicts.length}`);
    
    // Verify resolution
    console.log('\n🔍 Verification: Checking for remaining conflicts...');
    
    const { data: verifyApps, error: verifyError } = await supabase
      .from('wtaf_content')
      .select('id, user_slug, app_slug')
      .in('user_slug', ['bart', 'test-user']);
    
    if (verifyError) {
      console.error('❌ Verification query failed:', verifyError);
      return;
    }
    
    const verifyGroups = new Map<string, typeof verifyApps>();
    verifyApps?.forEach(app => {
      if (!verifyGroups.has(app.app_slug)) {
        verifyGroups.set(app.app_slug, []);
      }
      verifyGroups.get(app.app_slug)!.push(app);
    });
    
    let remainingConflicts = 0;
    verifyGroups.forEach((apps, slug) => {
      const users = [...new Set(apps.map(app => app.user_slug))];
      if (users.includes('bart') && users.includes('test-user')) {
        remainingConflicts++;
        console.log(`⚠️ Remaining conflict: ${slug}`);
      }
    });
    
    if (remainingConflicts === 0) {
      console.log('✅ Verification passed: No conflicts remain between bart and test-user!');
    } else {
      console.log(`❌ Verification failed: ${remainingConflicts} conflicts still exist`);
    }

  } catch (error) {
    console.error('❌ Error resolving conflicts:', error);
  }
}

// Run the conflict resolution
resolveConflicts().then(() => {
  console.log('\n✅ Conflict resolution process complete');
}).catch(error => {
  console.error('❌ Process failed:', error);
}); 
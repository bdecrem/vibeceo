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

async function resolveFinalConflicts() {
  console.log('🔧 Resolving final 2 conflicts...\n');

  try {
    // Conflict 1: ruby-whale-exploring (cptcrk vs onlylion) → Favor onlylion, rename cptcrk
    console.log('🔍 Step 1: Resolving ruby-whale-exploring conflict...');
    console.log('   Decision: Favor onlylion, rename cptcrk app');
    
    const { data: cptcrkRubyApp, error: cptcrkError } = await supabase
      .from('wtaf_content')
      .select('id, user_slug, app_slug, created_at')
      .eq('user_slug', 'cptcrk')
      .eq('app_slug', 'ruby-whale-exploring')
      .single();

    if (cptcrkError) {
      console.error('❌ Error finding cptcrk ruby-whale-exploring app:', cptcrkError);
    } else if (cptcrkRubyApp) {
      console.log(`   📍 Found cptcrk app: ${cptcrkRubyApp.id} (created: ${new Date(cptcrkRubyApp.created_at).toLocaleDateString()})`);
      
      // Generate new unique slug for cptcrk
      const newSlugForCptcrk = await generateUniqueAppSlugForUser('cptcrk');
      
      console.log(`   🔄 Renaming cptcrk app:`);
      console.log(`      Old: cptcrk/ruby-whale-exploring`);
      console.log(`      New: cptcrk/${newSlugForCptcrk}`);
      
      // Update the database
      const { error: updateError } = await supabase
        .from('wtaf_content')
        .update({ app_slug: newSlugForCptcrk })
        .eq('id', cptcrkRubyApp.id);
      
      if (updateError) {
        console.error(`❌ Failed to update cptcrk app:`, updateError);
      } else {
        console.log(`✅ Successfully renamed to: cptcrk/${newSlugForCptcrk}`);
      }
    } else {
      console.log('⚠️  No cptcrk ruby-whale-exploring app found');
    }

    console.log('\n' + '─'.repeat(60) + '\n');

    // Conflict 2: turquoise-lion-dancing (cptcrk vs test-user) → Favor cptcrk, rename test-user
    console.log('🔍 Step 2: Resolving turquoise-lion-dancing conflict...');
    console.log('   Decision: Favor cptcrk, rename test-user app');
    
    const { data: testUserTurquoiseApp, error: testUserError } = await supabase
      .from('wtaf_content')
      .select('id, user_slug, app_slug, created_at')
      .eq('user_slug', 'test-user')
      .eq('app_slug', 'turquoise-lion-dancing')
      .single();

    if (testUserError) {
      console.error('❌ Error finding test-user turquoise-lion-dancing app:', testUserError);
    } else if (testUserTurquoiseApp) {
      console.log(`   📍 Found test-user app: ${testUserTurquoiseApp.id} (created: ${new Date(testUserTurquoiseApp.created_at).toLocaleDateString()})`);
      
      // Generate new unique slug for test-user
      const newSlugForTestUser = await generateUniqueAppSlugForUser('test-user');
      
      console.log(`   🔄 Renaming test-user app:`);
      console.log(`      Old: test-user/turquoise-lion-dancing`);
      console.log(`      New: test-user/${newSlugForTestUser}`);
      
      // Update the database
      const { error: updateError } = await supabase
        .from('wtaf_content')
        .update({ app_slug: newSlugForTestUser })
        .eq('id', testUserTurquoiseApp.id);
      
      if (updateError) {
        console.error(`❌ Failed to update test-user app:`, updateError);
      } else {
        console.log(`✅ Successfully renamed to: test-user/${newSlugForTestUser}`);
      }
    } else {
      console.log('⚠️  No test-user turquoise-lion-dancing app found');
    }

    console.log('\n🎉 Final conflict resolution complete!');

    // Step 3: Verification
    console.log('\n🔍 Step 3: Final verification...');
    
    // Check ruby-whale-exploring
    const { data: rubyApps, error: rubyError } = await supabase
      .from('wtaf_content')
      .select('user_slug, app_slug')
      .eq('app_slug', 'ruby-whale-exploring');

    if (rubyError) {
      console.error('❌ Error verifying ruby-whale-exploring:', rubyError);
    } else if (rubyApps) {
      const users = [...new Set(rubyApps.map(app => app.user_slug))];
      if (users.length === 1) {
        console.log(`✅ ruby-whale-exploring: now unique to ${users[0]}`);
      } else {
        console.log(`⚠️ ruby-whale-exploring: still shared by [${users.join(', ')}]`);
      }
    }

    // Check turquoise-lion-dancing
    const { data: turquoiseApps, error: turquoiseError } = await supabase
      .from('wtaf_content')
      .select('user_slug, app_slug')
      .eq('app_slug', 'turquoise-lion-dancing');

    if (turquoiseError) {
      console.error('❌ Error verifying turquoise-lion-dancing:', turquoiseError);
    } else if (turquoiseApps) {
      const users = [...new Set(turquoiseApps.map(app => app.user_slug))];
      if (users.length === 1) {
        console.log(`✅ turquoise-lion-dancing: now unique to ${users[0]}`);
      } else {
        console.log(`⚠️ turquoise-lion-dancing: still shared by [${users.join(', ')}]`);
      }
    }

    // Global conflict check
    console.log('\n🔍 Final global conflict check...');
    
    const { data: allApps, error: allError } = await supabase
      .from('wtaf_content')
      .select('user_slug, app_slug');

    if (allError) {
      console.error('❌ Error in global check:', allError);
      return;
    }

    if (allApps) {
      const slugGroups = new Map<string, string[]>();
      allApps.forEach(app => {
        if (!slugGroups.has(app.app_slug)) {
          slugGroups.set(app.app_slug, []);
        }
        slugGroups.get(app.app_slug)!.push(app.user_slug);
      });

      let totalConflicts = 0;
      slugGroups.forEach((users, slug) => {
        const uniqueUsers = [...new Set(users)];
        if (uniqueUsers.length > 1) {
          totalConflicts++;
          console.log(`⚠️ Remaining conflict: ${slug} shared by [${uniqueUsers.join(', ')}]`);
        }
      });

      if (totalConflicts === 0) {
        console.log('🎊 SUCCESS: No global conflicts remain!');
        console.log('✅ All app slugs are now unique per user!');
      } else {
        console.log(`⚠️ ${totalConflicts} global conflicts still exist`);
      }
    }

    console.log('\n📊 Summary of changes:');
    console.log('   ✅ ruby-whale-exploring: now belongs to onlylion');
    console.log('   ✅ turquoise-lion-dancing: now belongs to cptcrk'); 
    console.log('   ✅ Renamed apps got new unique slugs from expanded dictionary');

  } catch (error) {
    console.error('❌ Error during final conflict resolution:', error);
  }
}

// Run the final conflict resolution
resolveFinalConflicts().then(() => {
  console.log('\n✅ Final conflict resolution process complete');
}).catch(error => {
  console.error('❌ Process failed:', error);
}); 
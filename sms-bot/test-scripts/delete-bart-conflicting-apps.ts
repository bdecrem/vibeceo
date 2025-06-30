import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

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

// The remaining conflicting slugs from the analysis
const CONFLICTING_SLUGS = [
  'ruby-whale-exploring',
  'pearl-fox-flying', 
  'turquoise-lion-dancing',
  'rose-wolf-dancing',
  'sapphire-hawk-building'
];

async function deleteBartConflictingApps() {
  console.log('🗑️  Deleting bart\'s apps with conflicting slugs...\n');

  try {
    // Step 1: Find all bart's apps with these conflicting slugs
    console.log('🔍 Step 1: Finding bart\'s conflicting apps...');
    
    const { data: bartApps, error: findError } = await supabase
      .from('wtaf_content')
      .select('id, user_slug, app_slug, created_at')
      .eq('user_slug', 'bart')
      .in('app_slug', CONFLICTING_SLUGS)
      .order('created_at', { ascending: true });

    if (findError) {
      console.error('❌ Error finding bart\'s apps:', findError);
      return;
    }

    if (!bartApps || bartApps.length === 0) {
      console.log('📭 No conflicting apps found for bart');
      return;
    }

    console.log(`\n🚨 Found ${bartApps.length} bart apps to delete:`);
    bartApps.forEach((app, index) => {
      const date = new Date(app.created_at).toLocaleDateString();
      console.log(`   ${index + 1}. ${app.app_slug} (ID: ${app.id}, Created: ${date})`);
    });

    // Step 2: Verify which slugs these conflict with
    console.log('\n🔍 Step 2: Analyzing conflicts for these apps...');
    
    for (const app of bartApps) {
      const { data: conflictingApps, error: conflictError } = await supabase
        .from('wtaf_content')
        .select('user_slug, app_slug, created_at')
        .eq('app_slug', app.app_slug)
        .neq('user_slug', 'bart');

      if (conflictError) {
        console.error(`❌ Error checking conflicts for ${app.app_slug}:`, conflictError);
        continue;
      }

      if (conflictingApps && conflictingApps.length > 0) {
        const users = conflictingApps.map(ca => ca.user_slug).join(', ');
        console.log(`   📍 ${app.app_slug}: conflicts with users [${users}]`);
      }
    }

    // Step 3: Confirm deletion (in production, you might want user confirmation)
    console.log('\n⚠️  DELETION WARNING:');
    console.log('   This will permanently delete the following bart apps:');
    bartApps.forEach(app => {
      console.log(`   - bart/${app.app_slug} (${app.id})`);
    });
    console.log('   This action cannot be undone.');

    console.log('\n🗑️  Step 3: Proceeding with deletion...');

    // Step 4: Delete each app
    let successCount = 0;
    let errorCount = 0;

    for (const app of bartApps) {
      console.log(`\n🔄 Deleting bart/${app.app_slug} (${app.id})...`);
      
      const { error: deleteError } = await supabase
        .from('wtaf_content')
        .delete()
        .eq('id', app.id);

      if (deleteError) {
        console.error(`❌ Failed to delete ${app.id}:`, deleteError);
        errorCount++;
      } else {
        console.log(`✅ Successfully deleted bart/${app.app_slug}`);
        successCount++;
      }
    }

    console.log('\n🎉 Deletion process complete!');
    console.log('\n📊 Summary:');
    console.log(`   - Apps successfully deleted: ${successCount}`);
    console.log(`   - Apps failed to delete: ${errorCount}`);
    console.log(`   - Total apps processed: ${bartApps.length}`);

    // Step 5: Verification - check remaining conflicts
    console.log('\n🔍 Step 4: Verifying conflict resolution...');
    
    // Check if these slugs still have conflicts
    for (const slug of CONFLICTING_SLUGS) {
      const { data: remainingApps, error: verifyError } = await supabase
        .from('wtaf_content')
        .select('user_slug, app_slug')
        .eq('app_slug', slug);

      if (verifyError) {
        console.error(`❌ Error verifying ${slug}:`, verifyError);
        continue;
      }

      if (remainingApps && remainingApps.length > 0) {
        const users = [...new Set(remainingApps.map(app => app.user_slug))];
        if (users.length > 1) {
          console.log(`⚠️  ${slug}: still shared by [${users.join(', ')}]`);
        } else {
          console.log(`✅ ${slug}: now unique to ${users[0]}`);
        }
      } else {
        console.log(`❓ ${slug}: no apps found (all deleted?)`);
      }
    }

    // Final global conflict check
    console.log('\n🔍 Final verification: Checking all bart apps for remaining conflicts...');
    
    const { data: allBartApps, error: finalError } = await supabase
      .from('wtaf_content')
      .select('app_slug')
      .eq('user_slug', 'bart');

    if (finalError) {
      console.error('❌ Final verification failed:', finalError);
      return;
    }

    if (!allBartApps) {
      console.log('📭 No bart apps remain in database');
      return;
    }

    let conflictsFound = 0;
    for (const bartApp of allBartApps) {
      const { data: otherApps, error } = await supabase
        .from('wtaf_content')
        .select('user_slug')
        .eq('app_slug', bartApp.app_slug)
        .neq('user_slug', 'bart');

      if (!error && otherApps && otherApps.length > 0) {
        conflictsFound++;
        const users = [...new Set(otherApps.map(app => app.user_slug))];
        console.log(`⚠️  bart/${bartApp.app_slug} still conflicts with: ${users.join(', ')}`);
      }
    }

    if (conflictsFound === 0) {
      console.log('✅ No remaining conflicts found for bart apps!');
    } else {
      console.log(`⚠️  ${conflictsFound} bart apps still have conflicts`);
    }

  } catch (error) {
    console.error('❌ Error during deletion process:', error);
  }
}

// Run the deletion process
deleteBartConflictingApps().then(() => {
  console.log('\n✅ Deletion process complete');
}).catch(error => {
  console.error('❌ Process failed:', error);
}); 
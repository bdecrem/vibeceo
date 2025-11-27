/**
 * Test User Source Integration
 * Creates a test RSS source and runs an agent with it
 */

import { config } from 'dotenv';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';
import { runAgent } from '../src/agents/runtime.js';
import type { RunContext } from '@vibeceo/shared-types';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
config({ path: join(__dirname, '..', '..', '.env.local') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  try {
    console.log('\n📚 Step 1: Checking if user_sources table exists...');

    // Try to query user_sources table
    const { data: existingCheck, error: checkError } = await supabase
      .from('user_sources')
      .select('id')
      .limit(1);

    if (checkError) {
      console.error('❌ user_sources table does not exist!');
      console.log('\n📝 Please apply the migration manually:');
      console.log('1. Go to your Supabase project SQL Editor');
      console.log('2. Copy the contents of sms-bot/migrations/009_user_sources.sql');
      console.log('3. Execute the SQL');
      console.log('4. Run this script again');
      process.exit(1);
    }

    console.log('✅ user_sources table exists');

    console.log('\n📡 Step 2: Creating test RSS source (NASA Breaking News)...');

    // Create a test RSS source
    const { data: testSource, error: sourceError } = await supabase
      .from('user_sources')
      .insert({
        name: 'NASA Breaking News',
        description: 'Latest breaking news from NASA',
        kind: 'rss',
        config_jsonb: {
          feedUrl: 'https://www.nasa.gov/rss/dyn/breaking_news.rss',
          maxItems: 5,
        },
        visibility: 'public',
      })
      .select()
      .single();

    if (sourceError) {
      console.error('❌ Failed to create test source:', sourceError.message);
      process.exit(1);
    }

    console.log('✅ Test source created:', testSource.id);

    console.log('\n🤖 Step 3: Creating test agent with user source...');

    // Delete existing test agent if it exists
    await supabase
      .from('agents')
      .delete()
      .eq('slug', 'nasa-news-digest-test');

    // Create a test agent
    const { data: testAgent, error: agentError } = await supabase
      .from('agents')
      .insert({
        name: 'NASA News Digest',
        slug: 'nasa-news-digest-test',
        description: 'Daily digest of NASA breaking news',
        creator_user_id: null, // System agent
        status: 'approved',
        category: 'news',
      })
      .select()
      .single();

    if (agentError) {
      console.error('❌ Failed to create agent:', agentError.message);
      process.exit(1);
    }

    console.log('✅ Agent created:', testAgent.id);

    console.log('\n📝 Step 4: Creating agent version with user source reference...');

    // Create agent version with user source
    const agentDefinition = {
      metadata: {
        name: 'NASA News Digest',
        slug: 'nasa-news-digest-test',
        description: 'Daily digest of NASA breaking news from RSS feed',
        category: 'news' as const,
        version: '1.0.0',
      },
      triggers: {
        commands: [
          {
            keyword: 'NASA',
            description: 'Get latest NASA news',
          },
        ],
        schedule: {
          enabled: true,
          cron: '0 9 * * *', // Daily at 9am
          timezone: 'America/Los_Angeles',
        },
      },
      sources: [
        {
          kind: 'user_source_ref' as const,
          userSourceId: testSource.id,
        },
      ],
      pipeline: [
        {
          kind: 'fetch' as const,
          name: 'Fetch NASA news',
        },
        {
          kind: 'dedupe' as const,
          dedupeBy: 'url' as const,
        },
        {
          kind: 'filter' as const,
          maxItems: 5,
        },
      ],
      collation: {
        strategy: 'merge' as const,
        maxTotalItems: 10,
      },
      output: {
        sms: {
          enabled: true,
          template: 'default',
          maxLength: 1600,
        },
        report: {
          enabled: true,
          format: 'markdown' as const,
        },
      },
    };

    const { data: version, error: versionError } = await supabase
      .from('agent_versions')
      .insert({
        agent_id: testAgent.id,
        version: 1,
        definition_jsonb: agentDefinition,
      })
      .select()
      .single();

    if (versionError) {
      console.error('❌ Failed to create agent version:', versionError.message);
      process.exit(1);
    }

    console.log('✅ Agent version created:', version.id);

    // Update agent current_version_id
    await supabase
      .from('agents')
      .update({ current_version_id: version.id })
      .eq('id', testAgent.id);

    console.log('\n🚀 Step 5: Running agent...');

    const context: RunContext = {
      agentId: testAgent.id,
      agentVersionId: version.id,
      triggerType: 'manual',
      dryRun: false,
    };

    const result = await runAgent(version.id, context);

    console.log('\n📊 Results:');
    console.log('==================================================');
    console.log('Success:', result.success);

    if (result.success) {
      console.log('Agent Run ID:', result.agentRunId);
      console.log('\nMetrics:');
      console.log('  Sources fetched:', result.metrics.sourcesFetched);
      console.log('  Items processed:', result.metrics.itemsProcessed);
      console.log('  Duration:', result.metrics.durationMs + 'ms');

      console.log('\nSMS Output:');
      console.log('---');
      console.log(result.outputs.sms);
      console.log('---');

      console.log('\nReport URL:', result.outputs.reportUrl);

      console.log('\n✅ Test completed successfully!');
      console.log('\n📋 Summary:');
      console.log(`- Test Source ID: ${testSource.id}`);
      console.log(`- Test Agent ID: ${testAgent.id}`);
      console.log(`- Agent Version ID: ${version.id}`);
      console.log(`- Agent Run ID: ${result.agentRunId}`);

    } else {
      console.error('\n❌ Agent run failed');
      if (result.errors) {
        result.errors.forEach((err) => {
          console.error(`  ${err.step}: ${err.message}`);
        });
      }
    }

    console.log('\n🧹 Cleanup: The test source and agent have been created in your database.');
    console.log('You can delete them manually via Supabase dashboard or leave them for testing.');

  } catch (error: any) {
    console.error('\n❌ Test failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

main();

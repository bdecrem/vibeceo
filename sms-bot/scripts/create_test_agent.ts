/**
 * Create a test agent for Sprint 1
 * This script creates a simple Arxiv research agent
 */

import { createClient } from '@supabase/supabase-js';
import type { AgentDefinition } from '@vibeceo/shared-types';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
// When compiled to dist/scripts/, go up two levels to reach sms-bot/.env.local
const envPath = path.join(__dirname, '..', '..', '.env.local');
console.log(`Loading .env from: ${envPath}`);
const result = dotenv.config({ path: envPath });

if (result.error) {
  console.error(`Failed to load .env.local: ${result.error.message}`);
}

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_KEY');
  process.exit(1);
}

async function createTestAgent() {
  console.log('\n🚀 Creating test agent for Sprint 1...\n');

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

  // Define a simple AI research agent
  const testAgentDefinition: AgentDefinition = {
    metadata: {
      name: 'AI Research Digest',
      slug: 'ai-research-digest',
      description: 'Daily digest of the latest AI research papers from Arxiv',
      icon: '🤖',
      category: 'research',
      tags: ['ai', 'machine-learning', 'research', 'arxiv'],
      version: '1.0.0',
    },
    triggers: {
      schedule: {
        enabled: true,
        cron: '0 9 * * *', // 9am daily
        timezone: 'America/Los_Angeles',
      },
      commands: [
        {
          keyword: 'AI RESEARCH',
          description: 'Get latest AI research papers',
        },
      ],
    },
    sources: [
      {
        kind: 'builtin',
        sourceType: 'arxiv',
        query: 'artificial intelligence machine learning',
        maxItems: 10,
      },
    ],
    pipeline: [
      {
        kind: 'fetch',
        name: 'Fetch from Arxiv',
      },
      {
        kind: 'dedupe',
        name: 'Remove duplicates',
        dedupeBy: 'url',
      },
      {
        kind: 'sort',
        name: 'Sort by date',
        sortBy: 'publishedAt',
        order: 'desc',
      },
      {
        kind: 'filter',
        name: 'Top 5 papers',
        maxItems: 5,
      },
      {
        kind: 'summarize',
        name: 'Generate digest',
        promptTemplateId: 'research_digest_v1',
        model: 'gpt-4',
        maxTokens: 1000,
        perItem: false,
      },
    ],
    collation: {
      strategy: 'merge',
      maxTotalItems: 10,
    },
    output: {
      sms: {
        enabled: true,
        template: 'research_sms_v1',
        maxLength: 1600,
      },
      report: {
        enabled: true,
        format: 'markdown',
        sections: [
          {
            title: 'Summary',
            content: 'summary',
          },
          {
            title: 'Papers',
            content: 'items',
          },
        ],
      },
    },
    safety: {
      maxSourcesPerRun: 3,
      maxItemsPerSource: 10,
      maxLLMCalls: 5,
      maxTokensPerRun: 10000,
      timeout: 120,
    },
  };

  try {
    // Step 1: Create agent record
    console.log('📝 Creating agent record...');

    const { data: agentData, error: agentError } = await supabase
      .from('agents')
      .insert({
        name: testAgentDefinition.metadata.name,
        slug: testAgentDefinition.metadata.slug,
        description: testAgentDefinition.metadata.description,
        category: testAgentDefinition.metadata.category,
        status: 'draft',
      })
      .select()
      .single();

    if (agentError) {
      throw new Error(`Failed to create agent: ${agentError.message}`);
    }

    console.log(`✅ Agent created: ${agentData.id}`);

    // Step 2: Create agent version
    console.log('📝 Creating agent version...');

    const { data: versionData, error: versionError } = await supabase
      .from('agent_versions')
      .insert({
        agent_id: agentData.id,
        version: 1,
        definition_jsonb: testAgentDefinition,
        changelog: 'Initial version for Sprint 1 testing',
      })
      .select()
      .single();

    if (versionError) {
      throw new Error(`Failed to create agent version: ${versionError.message}`);
    }

    console.log(`✅ Agent version created: ${versionData.id}`);

    // Step 3: Update agent to set current_version_id
    console.log('📝 Setting current version...');

    const { error: updateError } = await supabase
      .from('agents')
      .update({ current_version_id: versionData.id })
      .eq('id', agentData.id);

    if (updateError) {
      throw new Error(`Failed to update agent: ${updateError.message}`);
    }

    console.log('✅ Current version set');

    console.log('\n' + '='.repeat(80));
    console.log('✅ Test agent created successfully!');
    console.log('='.repeat(80));
    console.log(`\nAgent ID: ${agentData.id}`);
    console.log(`Version ID: ${versionData.id}`);
    console.log(`Slug: ${agentData.slug}`);
    console.log(`Status: ${agentData.status}`);
    console.log('\nNext steps:');
    console.log('1. Optionally approve the agent:');
    console.log(`   UPDATE agents SET status = 'approved' WHERE id = '${agentData.id}';`);
    console.log('\n2. Run the agent using the manual trigger endpoint:');
    console.log(`   curl -X POST http://localhost:3030/admin/run-agent/${versionData.id}`);
    console.log('');

  } catch (error: any) {
    console.error('\n❌ Error creating test agent:', error.message);
    process.exit(1);
  }
}

createTestAgent();

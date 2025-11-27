/**
 * Kochi Intelligence Platform - Agent Runtime
 * Sprint 1: Basic runtime that executes agent definitions
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type {
  AgentDefinition,
  NormalizedItem,
  RunContext,
  RunResult,
} from '@vibeceo/shared-types';
import { AgentDefinitionSchema } from '@vibeceo/shared-types';
import { fetchArxivPapers } from './sources/arxiv.js';
import { fetchUserSource } from './sources/fetch.js';
import { dedupeItems } from './pipeline/dedupe.js';
import { summarizeItems } from './pipeline/summarize.js';

let supabaseClient: SupabaseClient | null = null;

function getSupabaseClient(): SupabaseClient {
  if (!supabaseClient) {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_KEY;

    if (!url || !key) {
      throw new Error('SUPABASE_URL and SUPABASE_SERVICE_KEY required');
    }

    supabaseClient = createClient(url, key);
  }

  return supabaseClient;
}

/**
 * Main agent execution function
 */
export async function runAgent(
  agentVersionId: string,
  context: RunContext
): Promise<RunResult> {
  const startTime = Date.now();
  const supabase = getSupabaseClient();

  console.log(`\n${'='.repeat(80)}`);
  console.log(`🚀 Running agent version: ${agentVersionId}`);
  console.log(`   Trigger: ${context.triggerType}`);
  console.log(`${'='.repeat(80)}\n`);

  // Metrics tracking
  const metrics = {
    sourcesFetched: 0,
    itemsProcessed: 0,
    llmCallsMade: 0,
    tokensUsed: 0,
    durationMs: 0,
  };

  const errors: Array<{ step: string; message: string; stack?: string }> = [];

  try {
    // Step 1: Load agent version from database
    console.log('📚 Step 1: Loading agent definition from database...');
    const { data: versionData, error: versionError } = await supabase
      .from('agent_versions')
      .select('*')
      .eq('id', agentVersionId)
      .single();

    if (versionError || !versionData) {
      throw new Error(`Failed to load agent version: ${versionError?.message || 'Not found'}`);
    }

    // Load the associated agent
    const { data: agentData, error: agentError } = await supabase
      .from('agents')
      .select('*')
      .eq('id', versionData.agent_id)
      .single();

    if (agentError || !agentData) {
      throw new Error(`Failed to load agent: ${agentError?.message || 'Not found'}`);
    }

    // Step 2: Validate agent definition
    console.log('✅ Agent loaded:', agentData.name);
    console.log('🔍 Step 2: Validating agent definition schema...');

    const definitionResult = AgentDefinitionSchema.safeParse(versionData.definition_jsonb);

    if (!definitionResult.success) {
      throw new Error(`Invalid agent definition: ${definitionResult.error.message}`);
    }

    const definition: AgentDefinition = definitionResult.data;
    console.log('✅ Definition validated');

    // Step 3: Fetch data from sources
    console.log('\n📡 Step 3: Fetching data from sources...');
    let allItems: NormalizedItem[] = [];

    for (const sourceConfig of definition.sources) {
      if (sourceConfig.kind === 'builtin') {
        // Built-in sources
        if (sourceConfig.sourceType === 'arxiv') {
          const items = await fetchArxivPapers({
            query: sourceConfig.query || 'AI',
            maxItems: sourceConfig.maxItems || 10,
          });
          allItems.push(...items);
          metrics.sourcesFetched++;
        } else {
          console.warn(`⚠️  Unsupported built-in source: ${sourceConfig.sourceType}`);
        }
      } else if (sourceConfig.kind === 'user_source_ref') {
        // User-defined sources
        const items = await fetchUserSource(sourceConfig.userSourceId);
        allItems.push(...items);
        metrics.sourcesFetched++;
      } else {
        console.warn(`⚠️  Unsupported source kind: ${(sourceConfig as any).kind}`);
      }
    }

    metrics.itemsProcessed = allItems.length;
    console.log(`✅ Fetched ${allItems.length} items from ${metrics.sourcesFetched} source(s)`);

    // Step 4: Execute pipeline
    console.log('\n⚙️  Step 4: Executing pipeline...');
    let pipelineItems = allItems;

    for (const step of definition.pipeline) {
      console.log(`   → ${step.kind}${step.name ? ` (${step.name})` : ''}`);

      switch (step.kind) {
        case 'fetch':
          // Already fetched above
          break;

        case 'dedupe':
          pipelineItems = dedupeItems(pipelineItems, step.dedupeBy || 'url');
          break;

        case 'filter':
          if (step.maxItems) {
            pipelineItems = pipelineItems.slice(0, step.maxItems);
            console.log(`     Filtered to ${step.maxItems} items`);
          }
          break;

        case 'sort':
          pipelineItems = sortItems(pipelineItems, step.sortBy || 'publishedAt', step.order || 'desc');
          break;

        case 'summarize':
          // This is handled separately in output generation
          break;

        default:
          console.warn(`     ⚠️  Unsupported step type: ${step.kind}`);
      }
    }

    metrics.itemsProcessed = pipelineItems.length;
    console.log(`✅ Pipeline complete: ${pipelineItems.length} items`);

    // Step 5: Generate outputs
    console.log('\n📝 Step 5: Generating outputs...');

    // Generate markdown report
    const report = await generateMarkdownReport(definition, pipelineItems);
    console.log(`✅ Generated report (${report.length} chars)`);

    // Upload report to Supabase storage
    const reportUrl = await uploadReport(supabase, agentVersionId, report, context);
    console.log(`✅ Report uploaded: ${reportUrl}`);

    // Generate SMS content (simplified for Sprint 1)
    const smsContent = generateSMSContent(definition, pipelineItems);
    console.log(`✅ SMS content generated (${smsContent.length} chars)`);

    // Step 6: Create agent_run record
    console.log('\n💾 Step 6: Saving run record...');
    const agentRunId = await createAgentRun(supabase, {
      agentId: versionData.agent_id,
      versionId: agentVersionId,
      userId: context.userId,
      runType: context.triggerType,
      smsContent,
      reportUrl,
      metrics,
    });

    metrics.durationMs = Date.now() - startTime;

    console.log(`\n${'='.repeat(80)}`);
    console.log(`✅ Agent run complete!`);
    console.log(`   Run ID: ${agentRunId}`);
    console.log(`   Duration: ${metrics.durationMs}ms`);
    console.log(`   Items processed: ${metrics.itemsProcessed}`);
    console.log(`${'='.repeat(80)}\n`);

    return {
      success: true,
      agentRunId,
      outputs: {
        sms: smsContent,
        reportUrl,
      },
      metrics,
    };

  } catch (error: any) {
    console.error('\n❌ Agent run failed:', error.message);

    errors.push({
      step: 'runtime',
      message: error.message,
      stack: error.stack,
    });

    metrics.durationMs = Date.now() - startTime;

    return {
      success: false,
      outputs: {},
      metrics,
      errors,
    };
  }
}

/**
 * Sort items by a field
 */
function sortItems(
  items: NormalizedItem[],
  sortBy: 'publishedAt' | 'score' | 'relevance',
  order: 'asc' | 'desc'
): NormalizedItem[] {
  const sorted = [...items].sort((a, b) => {
    let aVal: any, bVal: any;

    switch (sortBy) {
      case 'publishedAt':
        aVal = a.publishedAt ? new Date(a.publishedAt).getTime() : 0;
        bVal = b.publishedAt ? new Date(b.publishedAt).getTime() : 0;
        break;
      default:
        return 0;
    }

    return order === 'asc' ? aVal - bVal : bVal - aVal;
  });

  console.log(`     Sorted ${sorted.length} items by ${sortBy} (${order})`);
  return sorted;
}

/**
 * Generate markdown report from items
 */
async function generateMarkdownReport(
  definition: AgentDefinition,
  items: NormalizedItem[]
): Promise<string> {
  const { metadata, pipeline } = definition;

  // Check if pipeline includes summarize step
  const summarizeStep = pipeline.find(s => s.kind === 'summarize');

  let report = `# ${metadata.name}\n\n`;
  report += `${metadata.description}\n\n`;
  report += `**Generated:** ${new Date().toISOString()}\n\n`;
  report += `---\n\n`;

  if (summarizeStep) {
    // Use LLM to generate summary
    const summary = await summarizeItems(items, {
      model: summarizeStep.model,
      maxTokens: summarizeStep.maxTokens,
      perItem: summarizeStep.perItem,
    });
    report += `## AI Summary\n\n${summary}\n\n---\n\n`;
  }

  report += `## Research Papers (${items.length})\n\n`;

  for (const item of items) {
    report += `### ${item.title}\n\n`;
    report += `**Author:** ${item.author}\n`;
    report += `**Published:** ${item.publishedAt}\n`;
    report += `**URL:** ${item.url}\n\n`;
    report += `${item.summary}\n\n`;
    report += `---\n\n`;
  }

  return report;
}

/**
 * Upload report to Supabase storage
 */
async function uploadReport(
  supabase: SupabaseClient,
  agentVersionId: string,
  report: string,
  context: RunContext
): Promise<string> {
  const timestamp = Date.now();
  const filename = `agent-reports/${agentVersionId}/${timestamp}.md`;

  const { data, error } = await supabase.storage
    .from('agent-outputs')
    .upload(filename, report, {
      contentType: 'text/markdown',
      upsert: false,
    });

  if (error) {
    throw new Error(`Failed to upload report: ${error.message}`);
  }

  // Get public URL
  const { data: urlData } = supabase.storage
    .from('agent-outputs')
    .getPublicUrl(filename);

  return urlData.publicUrl;
}

/**
 * Generate SMS content (simplified for Sprint 1)
 */
function generateSMSContent(definition: AgentDefinition, items: NormalizedItem[]): string {
  const { metadata } = definition;

  let sms = `📊 ${metadata.name}\n\n`;
  sms += `${items.length} new papers:\n\n`;

  // Show top 3 items
  const topItems = items.slice(0, 3);
  for (const item of topItems) {
    sms += `• ${item.title?.substring(0, 80)}...\n`;
  }

  sms += `\nFull report: [link will be added]`;

  return sms;
}

/**
 * Create agent_run record in database
 */
async function createAgentRun(
  supabase: SupabaseClient,
  params: {
    agentId: string;
    versionId: string;
    userId?: string;
    runType: string;
    smsContent: string;
    reportUrl: string;
    metrics: any;
  }
): Promise<string> {
  const { data, error } = await supabase
    .from('agent_runs')
    .insert({
      agent_id: params.agentId,
      version_id: params.versionId,
      user_id: params.userId,
      run_type: params.runType,
      status: 'success',
      started_at: new Date().toISOString(),
      finished_at: new Date().toISOString(),
      sms_content: params.smsContent,
      report_url: params.reportUrl,
      metrics_jsonb: params.metrics,
    })
    .select('id')
    .single();

  if (error) {
    throw new Error(`Failed to create agent_run: ${error.message}`);
  }

  return data.id;
}

/**
 * Agent Executor - Core Execution Engine
 * Orchestrates the complete agent execution flow
 */

import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type {
  AgentDefinition,
  NormalizedItem,
  RunContext,
  RunResult,
} from '@vibeceo/shared-types';
import { AgentDefinitionSchema } from '@vibeceo/shared-types';

// Source fetchers
import { fetchArxivPapers } from './sources/arxiv.js';
import { fetchRssSource } from './sources/rss.js';
import { fetchHttpJsonSource } from './sources/http-json.js';
import { fetchWebScraperSource } from './sources/web-scraper.js';
import { fetchHackerNews } from './sources/hackernews.js';
import { fetchReddit } from './sources/reddit.js';
import { fetchGitHub } from './sources/github.js';
import { fetchTwitter } from './sources/twitter.js';
import { fetchYouTube } from './sources/youtube.js';
import { fetchProductHunt } from './sources/producthunt.js';
import { fetchNewsAPI } from './sources/news-api.js';
import { fetchGoogleNews } from './sources/google-news.js';
import { fetchCryptoPrice } from './sources/crypto-price.js';
import { fetchStockPrice } from './sources/stock-price.js';
import { fetchWeather } from './sources/weather.js';
import { fetchGmail } from './sources/gmail.js';
import { fetchPodcast } from './sources/podcast.js';

// Pipeline steps
import { dedupeItems } from './pipeline/dedupe.js';
import { filterItems } from './pipeline/filter.js';
import { sortItems } from './pipeline/sort.js';
import { summarizeItems } from './pipeline/summarize.js';
import { rankItems } from './pipeline/rank.js';
import { transformItems } from './pipeline/transform.js';
import { executeCustomStep } from './pipeline/custom.js';

// Pipeline filters
import { filterByDate } from './pipeline/date-filter.js';
import { filterByKeywords } from './pipeline/keyword-filter.js';
import { limitItems } from './pipeline/limit-filter.js';
import { filterBySentiment } from './pipeline/sentiment-filter.js';
import { filterByLength } from './pipeline/length-filter.js';
import { filterByScore } from './pipeline/score-filter.js';
import { filterByRegex } from './pipeline/regex-filter.js';
import { filterByAuthor } from './pipeline/author-filter.js';
import { filterByLanguage } from './pipeline/language-filter.js';
import { selectTopN } from './pipeline/top-n-filter.js';
import { randomSample } from './pipeline/random-sample-filter.js';
import { filterByMedia } from './pipeline/has-media-filter.js';

// Pipeline transforms
import { analyzeSentiment } from './pipeline/sentiment-analysis.js';
import { extractEntities } from './pipeline/entity-extraction.js';
import { classifyCategories } from './pipeline/category-classification.js';
import { translateItems } from './pipeline/translation.js';
import { cleanupText } from './pipeline/text-cleanup.js';
import { extractURLs } from './pipeline/url-extraction.js';
import { scoreItems } from './pipeline/scoring-rank.js';
import { mapFields } from './pipeline/field-mapping.js';
import { mergeItems } from './pipeline/merge-items.js';
import { enrichData } from './pipeline/enrich-data.js';
import { runClaudeAgent } from './pipeline/claude-agent.js';

// Collation
import { collateItems } from './collation/collate.js';

// Outputs
import { generateSMS } from './output/sms.js';
import { generateAndUploadReport } from './output/report.js';
import { generateAudio } from './output/audio.js';
import { sendEmail } from './output/email.js';
import { sendWebhook } from './output/webhook.js';
import { sendSlack } from './output/slack.js';
import { sendDiscord } from './output/discord.js';
import { sendTweet } from './output/twitter.js';
import { sendPushNotification } from './output/notification.js';
import { insertToDatabase } from './output/database.js';
import { appendToSheets } from './output/sheets.js';
import { exportToFile } from './output/file-export.js';

// Monitoring
import { MetricsCollector } from './monitoring/metrics.js';
import { ErrorCollector } from './monitoring/errors.js';

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
export async function executeAgent(
  agentVersionId: string,
  context: RunContext
): Promise<RunResult> {
  const metrics = new MetricsCollector();
  const errors = new ErrorCollector();
  const supabase = getSupabaseClient();

  console.log(`\n${'='.repeat(80)}`);
  console.log(`🚀 Executing agent version: ${agentVersionId}`);
  console.log(`   Trigger: ${context.triggerType}`);
  console.log(`   Dry run: ${context.dryRun || false}`);
  console.log(`${'='.repeat(80)}\n`);

  try {
    // Step 1: Load agent definition
    metrics.startStep('load_definition');
    console.log('📚 Step 1: Loading agent definition...');

    const definition = await loadAgentDefinition(supabase, agentVersionId);
    console.log(`✅ Loaded: ${definition.metadata.name}`);

    metrics.endStep('load_definition');

    // Step 2: Fetch sources
    metrics.startStep('fetch_sources');
    console.log('\n📡 Step 2: Fetching sources...');

    const sourceResults = await fetchAllSources(definition, metrics, errors);
    console.log(`✅ Fetched from ${sourceResults.size} source(s)`);

    metrics.endStep('fetch_sources');

    // Step 3: Collate sources
    metrics.startStep('collate');
    console.log('\n📊 Step 3: Collating sources...');

    let items = collateItems(sourceResults, definition.collation);
    metrics.setItemsProcessed(items.length);
    console.log(`✅ Collated to ${items.length} items`);

    metrics.endStep('collate');

    // Step 4: Execute pipeline
    metrics.startStep('pipeline');
    console.log('\n⚙️  Step 4: Executing pipeline...');

    items = await executePipeline(definition, items, metrics, errors);
    metrics.setItemsProcessed(items.length);
    console.log(`✅ Pipeline complete: ${items.length} items`);

    metrics.endStep('pipeline');

    // Step 5: Generate outputs
    metrics.startStep('generate_outputs');
    console.log('\n📝 Step 5: Generating outputs...');

    const outputs = await generateOutputs(
      definition,
      items,
      supabase,
      agentVersionId,
      context.dryRun || false
    );
    console.log(`✅ Outputs generated`);

    metrics.endStep('generate_outputs');

    // Step 6: Save run record (unless dry run)
    let agentRunId: string | undefined;

    if (!context.dryRun) {
      metrics.startStep('save_run');
      console.log('\n💾 Step 6: Saving run record...');

      agentRunId = await saveAgentRun(supabase, {
        agentId: context.agentId,
        versionId: agentVersionId,
        userId: context.userId,
        runType: context.triggerType,
        status: 'success',
        outputs,
        metrics: metrics.toJSON(),
        errors: errors.hasErrors() ? errors.toJSON() : undefined,
      });

      console.log(`✅ Run saved: ${agentRunId}`);
      metrics.endStep('save_run');
    }

    console.log(`\n${'='.repeat(80)}`);
    console.log(`✅ Execution complete!`);
    console.log(`   ${metrics.getSummary()}`);
    console.log(`${'='.repeat(80)}\n`);

    return {
      success: true,
      agentRunId,
      outputs,
      metrics: metrics.toJSON(),
      errors: errors.hasErrors() ? errors.toJSON() : undefined,
    };

  } catch (error: any) {
    console.error(`\n❌ Execution failed: ${error.message}`);
    errors.addError('executor', error);

    console.log(`\n${'='.repeat(80)}`);
    console.log(`❌ Execution failed`);
    console.log(`   Error: ${error.message}`);
    console.log(`   ${metrics.getSummary()}`);
    console.log(`${'='.repeat(80)}\n`);

    return {
      success: false,
      outputs: {},
      metrics: metrics.toJSON(),
      errors: errors.toJSON(),
    };
  }
}

/**
 * Load and validate agent definition from database
 */
async function loadAgentDefinition(
  supabase: SupabaseClient,
  agentVersionId: string
): Promise<AgentDefinition> {
  const { data: versionData, error: versionError } = await supabase
    .from('agent_versions')
    .select('definition_jsonb')
    .eq('id', agentVersionId)
    .single();

  if (versionError || !versionData) {
    throw new Error(`Failed to load agent version: ${versionError?.message || 'Not found'}`);
  }

  // Validate definition with Zod
  const validationResult = AgentDefinitionSchema.safeParse(versionData.definition_jsonb);

  if (!validationResult.success) {
    throw new Error(`Invalid agent definition: ${JSON.stringify(validationResult.error.errors)}`);
  }

  return validationResult.data;
}

/**
 * Fetch all sources in parallel
 */
async function fetchAllSources(
  definition: AgentDefinition,
  metrics: MetricsCollector,
  errors: ErrorCollector
): Promise<Map<string, NormalizedItem[]>> {
  const sourceResults = new Map<string, NormalizedItem[]>();

  const fetchPromises = definition.sources.map(async (sourceConfig, index) => {
    const sourceName = `source_${index}`;

    try {
      let items: NormalizedItem[] = [];

      if (sourceConfig.kind === 'builtin') {
        switch (sourceConfig.sourceType) {
          case 'rss':
            if (sourceConfig.feedUrl) {
              items = await fetchRssSource({
                feedUrl: sourceConfig.feedUrl,
                maxItems: sourceConfig.maxItems || 10,
              });
            }
            break;

          case 'arxiv':
            items = await fetchArxivPapers({
              query: sourceConfig.query || '',
              maxItems: sourceConfig.maxItems || 10,
            });
            break;

          case 'http_json':
            if (sourceConfig.url && sourceConfig.jsonPath) {
              items = await fetchHttpJsonSource({
                url: sourceConfig.url,
                method: sourceConfig.method || 'GET',
                jsonPath: sourceConfig.jsonPath,
                headers: sourceConfig.headers,
                maxItems: sourceConfig.maxItems || 10,
              });
            }
            break;

          case 'web_scraper':
            if (sourceConfig.url && sourceConfig.extractMode) {
              items = await fetchWebScraperSource({
                url: sourceConfig.url,
                extractMode: sourceConfig.extractMode,
                selectors: sourceConfig.selectors || {},
                maxItems: sourceConfig.maxItems || 10,
                refreshInterval: 3600, // 1 hour default
              });
            }
            break;

          case 'hackernews':
            items = await fetchHackerNews({
              feed: (sourceConfig.query as any) || 'top',
              maxItems: sourceConfig.maxItems || 10,
            });
            break;

          case 'reddit':
            items = await fetchReddit({
              subreddit: sourceConfig.query || 'programming',
              sort: 'hot',
              maxItems: sourceConfig.maxItems || 10,
            });
            break;

          case 'github':
            items = await fetchGitHub({
              query: sourceConfig.query || 'javascript',
              maxItems: sourceConfig.maxItems || 10,
            });
            break;

          case 'twitter':
            items = await fetchTwitter({
              query: sourceConfig.query || '',
              maxItems: sourceConfig.maxItems || 10,
            });
            break;

          case 'youtube':
            items = await fetchYouTube({
              query: sourceConfig.query || '',
              maxItems: sourceConfig.maxItems || 10,
            });
            break;

          case 'producthunt':
            items = await fetchProductHunt({
              maxItems: sourceConfig.maxItems || 10,
            });
            break;

          case 'news_api':
            items = await fetchNewsAPI({
              query: sourceConfig.query || '',
              category: 'general',
              maxItems: sourceConfig.maxItems || 10,
            });
            break;

          case 'google_news':
            items = await fetchGoogleNews({
              query: sourceConfig.query || '',
              maxItems: sourceConfig.maxItems || 10,
            });
            break;

          case 'crypto_price':
            items = await fetchCryptoPrice({
              coins: sourceConfig.query?.split(',') || ['BTC', 'ETH'],
            });
            break;

          case 'stock_price':
            items = await fetchStockPrice({
              symbols: sourceConfig.query?.split(',') || ['AAPL', 'GOOGL'],
            });
            break;

          case 'weather':
            items = await fetchWeather({
              location: sourceConfig.query || 'San Francisco',
            });
            break;

          case 'gmail':
            items = await fetchGmail({
              query: sourceConfig.query || 'is:unread',
              maxItems: sourceConfig.maxItems || 10,
            });
            break;

          case 'podcast':
            items = await fetchPodcast({
              feedUrl: sourceConfig.feedUrl || '',
              maxItems: sourceConfig.maxItems || 10,
            });
            break;

          default:
            console.warn(`   ⚠️  Unsupported source type: ${sourceConfig.sourceType}`);
        }
      } else if (sourceConfig.kind === 'user_source_ref') {
        // TODO: Implement user source fetching
        console.warn(`   ⚠️  User sources not yet implemented`);
      }

      if (items.length > 0) {
        sourceResults.set(sourceName, items);
        metrics.incrementSources();
        console.log(`   ✅ ${sourceName}: ${items.length} items`);
      }

    } catch (error: any) {
      console.error(`   ❌ ${sourceName} failed: ${error.message}`);
      errors.addError(sourceName, error);
    }
  });

  await Promise.all(fetchPromises);

  return sourceResults;
}

/**
 * Execute pipeline steps sequentially
 */
async function executePipeline(
  definition: AgentDefinition,
  items: NormalizedItem[],
  metrics: MetricsCollector,
  errors: ErrorCollector
): Promise<NormalizedItem[]> {
  let pipelineItems = items;

  for (const step of definition.pipeline) {
    console.log(`   → ${step.kind}${step.name ? ` (${step.name})` : ''}`);

    try {
      switch (step.kind) {
        case 'fetch':
          // Already fetched
          break;

        case 'dedupe':
          pipelineItems = dedupeItems(pipelineItems, step.dedupeBy || 'url');
          break;

        case 'filter':
          pipelineItems = filterItems(pipelineItems, {
            maxItems: step.maxItems,
            minScore: step.minScore,
          });
          break;

        case 'sort':
          pipelineItems = sortItems(pipelineItems, step.sortBy || 'publishedAt', step.order || 'desc');
          break;

        case 'summarize':
          // Summarize is handled separately in output generation
          // Store for later use
          break;

        case 'rank':
          pipelineItems = await rankItems(pipelineItems, {
            model: step.model,
            promptTemplateId: step.promptTemplateId,
          });
          metrics.addLLMCall(step.model, 1000); // Approximate tokens
          break;

        case 'transform':
          pipelineItems = await transformItems(pipelineItems, {
            model: step.model,
            promptTemplateId: step.promptTemplateId,
            outputFormat: step.outputFormat || 'json',
          });
          metrics.addLLMCall(step.model, 1000); // Approximate tokens
          break;

        case 'custom':
          pipelineItems = await executeCustomStep(pipelineItems, {
            customStepId: step.customStepId,
            config: step.config,
          });
          break;

        case 'date_filter':
          pipelineItems = filterByDate(pipelineItems, step);
          break;

        case 'keyword_filter':
          pipelineItems = filterByKeywords(pipelineItems, step);
          break;

        case 'limit_filter':
          pipelineItems = limitItems(pipelineItems, step);
          break;

        case 'sentiment_filter':
          pipelineItems = filterBySentiment(pipelineItems, step);
          break;

        case 'length_filter':
          pipelineItems = filterByLength(pipelineItems, step);
          break;

        case 'score_filter':
          pipelineItems = filterByScore(pipelineItems, step);
          break;

        case 'regex_filter':
          pipelineItems = filterByRegex(pipelineItems, step);
          break;

        case 'author_filter':
          pipelineItems = filterByAuthor(pipelineItems, step);
          break;

        case 'language_filter':
          pipelineItems = filterByLanguage(pipelineItems, step);
          break;

        case 'top_n_filter':
          pipelineItems = selectTopN(pipelineItems, step);
          break;

        case 'random_sample_filter':
          pipelineItems = randomSample(pipelineItems, step);
          break;

        case 'has_media_filter':
          pipelineItems = filterByMedia(pipelineItems, step);
          break;

        case 'sentiment_analysis':
          pipelineItems = await analyzeSentiment(pipelineItems, step);
          break;

        case 'entity_extraction':
          pipelineItems = await extractEntities(pipelineItems, step);
          break;

        case 'category_classification':
          pipelineItems = await classifyCategories(pipelineItems, step);
          break;

        case 'translation':
          pipelineItems = await translateItems(pipelineItems, step);
          break;

        case 'text_cleanup':
          pipelineItems = cleanupText(pipelineItems, step);
          break;

        case 'url_extraction':
          pipelineItems = await extractURLs(pipelineItems, step);
          break;

        case 'scoring_rank':
          pipelineItems = await scoreItems(pipelineItems, step);
          break;

        case 'field_mapping':
          pipelineItems = mapFields(pipelineItems, step);
          break;

        case 'merge_items':
          pipelineItems = mergeItems(pipelineItems, step);
          break;

        case 'enrich_data':
          pipelineItems = await enrichData(pipelineItems, step);
          break;

        case 'claude_agent':
          pipelineItems = await runClaudeAgent(pipelineItems, step);
          break;
      }

    } catch (error: any) {
      console.error(`     ❌ Step failed: ${error.message}`);
      errors.addError(`pipeline_${step.kind}`, error);
      // Continue with other steps
    }
  }

  return pipelineItems;
}

/**
 * Generate all outputs (SMS, Report, Audio)
 */
async function generateOutputs(
  definition: AgentDefinition,
  items: NormalizedItem[],
  supabase: SupabaseClient,
  agentVersionId: string,
  dryRun: boolean
): Promise<{ sms?: string; reportUrl?: string; audioUrl?: string; reportMarkdown?: string }> {
  const outputs: { sms?: string; reportUrl?: string; audioUrl?: string; reportMarkdown?: string } = {};

  // Generate AI summary if summarize step exists
  let aiSummary: string | undefined;
  const summarizeStep = definition.pipeline.find(s => s.kind === 'summarize');

  if (summarizeStep) {
    console.log(`   Generating AI summary...`);
    aiSummary = await summarizeItems(items, {
      model: summarizeStep.model,
      maxTokens: summarizeStep.maxTokens || 1000,
      perItem: summarizeStep.perItem || false,
    });
  }

  // Generate report (always generate, but only upload if not dryRun)
  if (definition.output.report?.enabled || dryRun) {
    const { generateMarkdownReport, generateAndUploadReport } = await import('./output/report.js');

    // Always generate markdown for preview
    outputs.reportMarkdown = generateMarkdownReport(items, definition, aiSummary);

    // Only upload to storage if not dryRun
    if (!dryRun) {
      outputs.reportUrl = await generateAndUploadReport(
        items,
        definition,
        supabase,
        agentVersionId,
        aiSummary
      );
    }
  }

  // Generate SMS
  if (definition.output.sms.enabled) {
    outputs.sms = generateSMS(
      items,
      {
        template: definition.output.sms.template,
        maxLength: definition.output.sms.maxLength || 1600,
      },
      definition.metadata,
      outputs.reportUrl,
      aiSummary
    );
  }

  // Generate audio (stub for now)
  if (definition.output.audio?.enabled) {
    const audioResult = await generateAudio(items, {
      voice: definition.output.audio.voice,
    });
    outputs.audioUrl = audioResult.url || undefined;
  }

  // Email
  if (definition.output.email?.enabled && !dryRun) {
    await sendEmail(items, definition.output.email, definition.metadata);
  }

  // Webhook
  if (definition.output.webhook?.enabled && !dryRun) {
    await sendWebhook(items, definition.output.webhook, definition.metadata);
  }

  // Slack
  if (definition.output.slack?.enabled && !dryRun) {
    await sendSlack(items, definition.output.slack, definition.metadata);
  }

  // Discord
  if (definition.output.discord?.enabled && !dryRun) {
    await sendDiscord(items, definition.output.discord, definition.metadata);
  }

  // Twitter
  if (definition.output.twitter?.enabled && !dryRun) {
    await sendTweet(items, definition.output.twitter, definition.metadata);
  }

  // Push Notification
  if (definition.output.notification?.enabled && !dryRun) {
    await sendPushNotification(items, definition.output.notification, definition.metadata);
  }

  // Database
  if (definition.output.database?.enabled && !dryRun) {
    await insertToDatabase(items, definition.output.database, definition.metadata);
  }

  // Sheets
  if (definition.output.sheets?.enabled && !dryRun) {
    await appendToSheets(items, definition.output.sheets, definition.metadata);
  }

  // File Export
  if (definition.output.file?.enabled && !dryRun) {
    await exportToFile(items, definition.output.file, definition.metadata);
  }

  return outputs;
}

/**
 * Save agent run record to database
 */
async function saveAgentRun(
  supabase: SupabaseClient,
  params: {
    agentId: string;
    versionId: string;
    userId?: string;
    runType: string;
    status: 'success' | 'failed';
    outputs: any;
    metrics: any;
    errors?: any;
  }
): Promise<string> {
  const { data, error } = await supabase
    .from('agent_runs')
    .insert({
      agent_id: params.agentId,
      version_id: params.versionId,
      user_id: params.userId || null,
      run_type: params.runType,
      status: params.status,
      started_at: new Date().toISOString(),
      finished_at: new Date().toISOString(),
      sms_content: params.outputs.sms || null,
      report_url: params.outputs.reportUrl || null,
      audio_url: params.outputs.audioUrl || null,
      metrics_jsonb: params.metrics,
      error_message: params.errors ? params.errors[0]?.message : null,
      error_stack: params.errors ? params.errors[0]?.stack : null,
    })
    .select('id')
    .single();

  if (error) {
    throw new Error(`Failed to save agent run: ${error.message}`);
  }

  return data.id;
}

/**
 * Execute agent preview (dry run with definition provided directly)
 * Bypasses database lookup for preview mode
 */
export async function executeAgentPreview(
  definition: AgentDefinition,
  context: RunContext
): Promise<RunResult> {
  const metrics = new MetricsCollector();
  const errors = new ErrorCollector();
  const supabase = getSupabaseClient();

  console.log(`\n${'='.repeat(80)}`);
  console.log(`🚀 Executing agent preview: ${definition.metadata.name}`);
  console.log(`   Trigger: ${context.triggerType}`);
  console.log(`   Dry run: true`);
  console.log(`${'='.repeat(80)}\n`);

  try {
    // Step 1: Fetch sources
    metrics.startStep('fetch_sources');
    console.log('📡 Step 1: Fetching sources...');

    const sourceResults = await fetchAllSources(definition, metrics, errors);
    console.log(`✅ Fetched from ${sourceResults.size} source(s)`);

    metrics.endStep('fetch_sources');

    // Step 2: Collate sources
    metrics.startStep('collate');
    console.log('\n📊 Step 2: Collating sources...');

    let items = collateItems(sourceResults, definition.collation);
    metrics.setItemsProcessed(items.length);
    console.log(`✅ Collated to ${items.length} items`);

    metrics.endStep('collate');

    // Step 3: Execute pipeline
    metrics.startStep('pipeline');
    console.log('\n⚙️  Step 3: Running pipeline...');

    items = await executePipeline(definition, items, metrics, errors);
    console.log(`✅ Pipeline complete - ${items.length} items remaining`);

    metrics.endStep('pipeline');

    // Step 4: Generate outputs (preview only, no actual sending)
    metrics.startStep('generate_outputs');
    console.log('\n📤 Step 4: Generating outputs (preview)...');

    const outputs = await generateOutputs(
      definition,
      items,
      supabase,
      'preview-version-id',
      true // dryRun = true for preview
    );

    console.log(`✅ Outputs generated`);
    metrics.endStep('generate_outputs');

    // Return success result
    return {
      success: true,
      outputs,
      metrics: metrics.toJSON(),
      errors: errors.hasErrors() ? errors.toJSON() : undefined,
    };
  } catch (error: any) {
    console.error('\n❌ Preview execution failed:', error.message);
    errors.addError('preview_execution', error);

    return {
      success: false,
      outputs: {},
      metrics: metrics.toJSON(),
      errors: errors.toJSON(),
    };
  }
}

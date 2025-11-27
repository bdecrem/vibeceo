/**
 * Workflow to AgentDefinition Converter
 * Transforms the visual workflow graph into a backend AgentDefinition
 */

import type { AgentDefinition } from '@vibeceo/shared-types';
import type { WorkflowDefinition, WorkflowNode } from './workflow-types';

export function workflowToAgentDefinition(workflow: WorkflowDefinition): AgentDefinition {
  const sourceNodes = workflow.nodes.filter((n) => n.data.category === 'source');
  const filterNodes = workflow.nodes.filter((n) => n.data.category === 'filter');
  const transformNodes = workflow.nodes.filter((n) => n.data.category === 'transform');
  const outputNodes = workflow.nodes.filter((n) => n.data.category === 'output');

  // Build source configs
  const sources = sourceNodes.map((node) => convertSourceNode(node));

  // Build pipeline steps
  const pipeline: any[] = [];

  // Add filter steps (in order they appear in the workflow)
  filterNodes.forEach((node) => {
    const data: any = node.data;

    switch (node.type) {
      case 'dedupe_filter':
        pipeline.push({
          kind: 'dedupe',
          dedupeBy: data.field === 'url' ? 'url' : data.field === 'id' ? 'id' : 'title',
        });
        break;

      case 'date_filter':
        pipeline.push({ kind: 'date_filter', olderThan: data.olderThan, newerThan: data.newerThan });
        break;

      case 'keyword_filter':
        pipeline.push({ kind: 'keyword_filter', keywords: data.keywords, mode: data.mode });
        break;

      case 'limit_filter':
        pipeline.push({ kind: 'limit_filter', maxItems: data.maxItems || 20 });
        break;

      case 'sentiment_filter':
        pipeline.push({ kind: 'sentiment_filter', sentiment: data.sentiment });
        break;

      case 'length_filter':
        pipeline.push({ kind: 'length_filter', minLength: data.minLength, maxLength: data.maxLength });
        break;

      case 'score_filter':
        pipeline.push({ kind: 'score_filter', minScore: data.minScore });
        break;

      case 'regex_filter':
        pipeline.push({ kind: 'regex_filter', pattern: data.pattern });
        break;

      case 'author_filter':
        pipeline.push({ kind: 'author_filter', authors: data.authors });
        break;

      case 'language_filter':
        pipeline.push({ kind: 'language_filter', languages: data.languages });
        break;

      case 'top_n_filter':
        pipeline.push({ kind: 'top_n_filter', n: data.n, metric: data.metric });
        break;

      case 'random_sample_filter':
        pipeline.push({ kind: 'random_sample_filter', sampleSize: data.sampleSize });
        break;

      case 'has_media_filter':
        pipeline.push({ kind: 'has_media_filter', mediaType: data.mediaType });
        break;
    }
  });

  // Add transform steps
  transformNodes.forEach((node) => {
    const data: any = node.data;

    switch (node.type) {
      case 'llm_summarize':
        pipeline.push({
          kind: 'summarize',
          promptTemplateId: 'inline-summarize',
          model: 'gpt-4',
        });
        break;

      case 'llm_extract':
      case 'llm_qa':
        pipeline.push({
          kind: 'transform',
          promptTemplateId: 'inline-transform',
          model: 'gpt-4',
        });
        break;

      case 'llm_custom':
        pipeline.push({
          kind: 'custom',
          customStepId: 'inline-custom',
        });
        break;

      case 'claude_agent':
        pipeline.push({
          kind: 'claude_agent',
          systemPrompt: data.systemPrompt,
          userPromptTemplate: data.userPromptTemplate,
        });
        break;

      case 'sentiment_analysis':
        pipeline.push({ kind: 'sentiment_analysis' });
        break;

      case 'entity_extraction':
        pipeline.push({ kind: 'entity_extraction' });
        break;

      case 'category_classification':
        pipeline.push({ kind: 'category_classification', categories: data.categories });
        break;

      case 'translation':
        pipeline.push({ kind: 'translation', targetLanguage: data.targetLanguage });
        break;

      case 'text_cleanup':
        pipeline.push({ kind: 'text_cleanup' });
        break;

      case 'url_extraction':
        pipeline.push({ kind: 'url_extraction' });
        break;

      case 'scoring_rank':
        pipeline.push({ kind: 'scoring_rank', criteria: data.criteria });
        break;

      case 'field_mapping':
        pipeline.push({ kind: 'field_mapping', mappings: data.mappings });
        break;

      case 'merge_items':
        pipeline.push({ kind: 'merge_items', mergeBy: data.mergeBy });
        break;

      case 'enrich_data':
        pipeline.push({ kind: 'enrich_data', enrichmentSource: data.enrichmentSource });
        break;
    }
  });

  // Add sort step (default)
  pipeline.push({
    kind: 'sort',
    sortBy: 'publishedAt',
    order: 'desc',
  });

  // Add limit filter
  const limitNode = filterNodes.find((n) => n.type === 'limit_filter');
  const maxItems = limitNode ? (limitNode.data as any).maxItems : 20;

  // Build collation
  const collation = {
    strategy: 'merge' as const,
    maxTotalItems: maxItems || 20,
  };

  // Build outputs
  const output: any = {
    sms: {
      enabled: false,
      template: '{{summary}}',
      maxLength: 1600,
    },
  };

  outputNodes.forEach((node) => {
    const data: any = node.data;

    switch (node.type) {
      case 'sms_output':
        output.sms = {
          enabled: true,
          template: data.template || '{{summary}}',
          maxLength: data.maxLength || 1600,
        };
        break;

      case 'report_output':
        output.report = {
          enabled: true,
          format: 'markdown' as const,
          template: data.template,
        };
        break;

      case 'email_output':
        output.email = {
          enabled: true,
          to: data.to,
          subject: data.subject,
          body: data.body,
        };
        break;

      case 'webhook_output':
        output.webhook = {
          enabled: true,
          url: data.url,
          method: data.method || 'POST',
        };
        break;

      case 'slack_output':
        output.slack = {
          enabled: true,
          channel: data.channel,
          message: data.message,
        };
        break;

      case 'discord_output':
        output.discord = {
          enabled: true,
          webhookUrl: data.webhookUrl,
          message: data.message,
        };
        break;

      case 'twitter_output':
        output.twitter = {
          enabled: true,
          tweet: data.tweet,
        };
        break;

      case 'notification_output':
        output.notification = {
          enabled: true,
          title: data.title,
          body: data.body,
        };
        break;

      case 'database_output':
        output.database = {
          enabled: true,
          table: data.table,
          connectionString: data.connectionString,
        };
        break;

      case 'sheets_output':
        output.sheets = {
          enabled: true,
          spreadsheetId: data.spreadsheetId,
          sheetName: data.sheetName,
        };
        break;

      case 'file_export_output':
        output.file = {
          enabled: true,
          format: data.format || 'json',
          path: data.path,
        };
        break;
    }
  });

  // Build agent definition
  const agentDef: AgentDefinition = {
    metadata: {
      name: workflow.name,
      slug: workflow.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, ''),
      description: workflow.description || `Agent for ${workflow.name}`,
      category: (workflow.category as any) || 'news',
      tags: [],
      version: '1.0.0',
      icon: workflow.icon,
    },
    triggers: {
      commands: workflow.metadata?.commandKeyword
        ? [
            {
              keyword: workflow.metadata.commandKeyword.toUpperCase(),
              description: workflow.description || `Get ${workflow.name}`,
            },
          ]
        : [],
      schedule: workflow.metadata?.schedule?.enabled
        ? {
            enabled: true,
            cron: workflow.metadata.schedule.cron || '0 9 * * *',
            timezone: 'America/Los_Angeles',
          }
        : undefined,
    },
    sources,
    pipeline,
    collation,
    output,
  };

  return agentDef;
}

/**
 * Convert a source node to a source config
 */
function convertSourceNode(node: WorkflowNode): any {
  const data: any = node.data;

  // User sources use a different structure
  if (node.type === 'user_source') {
    return {
      kind: 'user_source_ref',
      userSourceId: data.sourceId,
    };
  }

  // All other sources are 'builtin'
  const baseConfig: any = {
    kind: 'builtin',
    maxItems: data.maxItems || 10,
  };

  switch (node.type) {
    case 'rss_source':
      return { ...baseConfig, sourceType: 'rss', feedUrl: data.feedUrl };

    case 'http_json_source':
      return {
        ...baseConfig,
        sourceType: 'http_json',
        url: data.url,
        method: data.method || 'GET',
        headers: data.headers,
        jsonPath: data.jsonPath || '$',
      };

    case 'web_scraper_source':
      return {
        ...baseConfig,
        sourceType: 'web_scraper',
        url: data.url,
        extractMode: data.extractMode || 'single',
        selectors: data.selectors || {},
      };

    case 'arxiv_source':
      return { ...baseConfig, sourceType: 'arxiv', query: data.searchQuery };

    case 'hackernews_source':
      return { ...baseConfig, sourceType: 'hackernews', query: data.query || 'top' };

    case 'reddit_source':
      return { ...baseConfig, sourceType: 'reddit', query: data.query || 'programming' };

    case 'github_source':
      return { ...baseConfig, sourceType: 'github', query: data.query || 'javascript' };

    case 'twitter_source':
      return { ...baseConfig, sourceType: 'twitter', query: data.query || '' };

    case 'youtube_source':
      return { ...baseConfig, sourceType: 'youtube', query: data.query || '' };

    case 'producthunt_source':
      return { ...baseConfig, sourceType: 'producthunt' };

    case 'news_api_source':
      return { ...baseConfig, sourceType: 'news_api', query: data.query || '' };

    case 'google_news_source':
      return { ...baseConfig, sourceType: 'google_news', query: data.query || '' };

    case 'crypto_price_source':
      return { ...baseConfig, sourceType: 'crypto_price', query: data.query || 'BTC,ETH' };

    case 'stock_price_source':
      return { ...baseConfig, sourceType: 'stock_price', query: data.query || 'AAPL,GOOGL' };

    case 'weather_source':
      return { ...baseConfig, sourceType: 'weather', query: data.query || 'San Francisco' };

    case 'gmail_source':
      return { ...baseConfig, sourceType: 'gmail', query: data.query || 'is:unread' };

    case 'podcast_source':
      return { ...baseConfig, sourceType: 'podcast', feedUrl: data.feedUrl || '' };

    default:
      throw new Error(`Unknown source node type: ${node.type}`);
  }
}

/**
 * Reverse converter: AgentDefinition to WorkflowDefinition
 * Reconstructs the visual workflow from an agent definition
 */
export function agentDefinitionToWorkflow(agentDef: AgentDefinition): WorkflowDefinition {
  const nodes: WorkflowNode[] = [];
  const edges: any[] = [];
  let nodeIdCounter = 1;
  let yPosition = 100;

  // Convert sources to source nodes
  const sourceNodeIds: string[] = [];
  agentDef.sources.forEach((source, idx) => {
    const nodeId = `node_${nodeIdCounter++}`;
    sourceNodeIds.push(nodeId);

    const baseData = {
      category: 'source',
      configured: true,
    };

    if (source.kind === 'user_source_ref') {
      nodes.push({
        id: nodeId,
        type: 'user_source',
        position: { x: 100 + idx * 300, y: yPosition },
        data: {
          ...baseData,
          label: 'User Source',
          sourceId: (source as any).userSourceId,
        } as any,
      } as any);
    } else if (source.kind === 'builtin') {
      const builtinSource = source as any;

      switch (builtinSource.sourceType) {
        case 'rss':
          nodes.push({
            id: nodeId,
            type: 'rss_source',
            position: { x: 100 + idx * 300, y: yPosition },
            data: {
              ...baseData,
              label: 'RSS Feed',
              feedUrl: builtinSource.feedUrl,
              maxItems: builtinSource.maxItems || 10,
            } as any,
          } as any);
          break;

        case 'http_json':
          nodes.push({
            id: nodeId,
            type: 'http_json_source',
            position: { x: 100 + idx * 300, y: yPosition },
            data: {
              ...baseData,
              label: 'HTTP JSON',
              url: builtinSource.url,
              method: builtinSource.method || 'GET',
              headers: builtinSource.headers,
              jsonPath: builtinSource.jsonPath || '$',
              maxItems: builtinSource.maxItems || 10,
            } as any,
          } as any);
          break;

        case 'web_scraper':
          nodes.push({
            id: nodeId,
            type: 'web_scraper_source',
            position: { x: 100 + idx * 300, y: yPosition },
            data: {
              ...baseData,
              label: 'Web Scraper',
              url: builtinSource.url,
              extractMode: builtinSource.extractMode || 'single',
              selectors: builtinSource.selectors || {},
              maxItems: builtinSource.maxItems || 10,
            } as any,
          } as any);
          break;

        case 'arxiv':
          nodes.push({
            id: nodeId,
            type: 'arxiv_source',
            position: { x: 100 + idx * 300, y: yPosition },
            data: {
              ...baseData,
              label: 'arXiv Papers',
              searchQuery: builtinSource.query,
              maxItems: builtinSource.maxItems || 10,
            } as any,
          } as any);
          break;

        case 'hackernews':
          nodes.push({
            id: nodeId,
            type: 'hackernews_source',
            position: { x: 100 + idx * 300, y: yPosition },
            data: { ...baseData, label: 'Hacker News', query: builtinSource.query, maxItems: builtinSource.maxItems || 10 } as any,
          } as any);
          break;

        case 'reddit':
          nodes.push({
            id: nodeId,
            type: 'reddit_source',
            position: { x: 100 + idx * 300, y: yPosition },
            data: { ...baseData, label: 'Reddit', query: builtinSource.query, maxItems: builtinSource.maxItems || 10 } as any,
          } as any);
          break;

        case 'github':
          nodes.push({
            id: nodeId,
            type: 'github_source',
            position: { x: 100 + idx * 300, y: yPosition },
            data: { ...baseData, label: 'GitHub', query: builtinSource.query, maxItems: builtinSource.maxItems || 10 } as any,
          } as any);
          break;

        case 'twitter':
          nodes.push({
            id: nodeId,
            type: 'twitter_source',
            position: { x: 100 + idx * 300, y: yPosition },
            data: { ...baseData, label: 'Twitter/X', query: builtinSource.query, maxItems: builtinSource.maxItems || 10 } as any,
          } as any);
          break;

        case 'youtube':
          nodes.push({
            id: nodeId,
            type: 'youtube_source',
            position: { x: 100 + idx * 300, y: yPosition },
            data: { ...baseData, label: 'YouTube', query: builtinSource.query, maxItems: builtinSource.maxItems || 10 } as any,
          } as any);
          break;

        case 'producthunt':
          nodes.push({
            id: nodeId,
            type: 'producthunt_source',
            position: { x: 100 + idx * 300, y: yPosition },
            data: { ...baseData, label: 'Product Hunt', maxItems: builtinSource.maxItems || 10 } as any,
          } as any);
          break;

        case 'news_api':
          nodes.push({
            id: nodeId,
            type: 'news_api_source',
            position: { x: 100 + idx * 300, y: yPosition },
            data: { ...baseData, label: 'News API', query: builtinSource.query, maxItems: builtinSource.maxItems || 10 } as any,
          } as any);
          break;

        case 'google_news':
          nodes.push({
            id: nodeId,
            type: 'google_news_source',
            position: { x: 100 + idx * 300, y: yPosition },
            data: { ...baseData, label: 'Google News', query: builtinSource.query, maxItems: builtinSource.maxItems || 10 } as any,
          } as any);
          break;

        case 'crypto_price':
          nodes.push({
            id: nodeId,
            type: 'crypto_price_source',
            position: { x: 100 + idx * 300, y: yPosition },
            data: { ...baseData, label: 'Crypto Prices', query: builtinSource.query, maxItems: builtinSource.maxItems || 10 } as any,
          } as any);
          break;

        case 'stock_price':
          nodes.push({
            id: nodeId,
            type: 'stock_price_source',
            position: { x: 100 + idx * 300, y: yPosition },
            data: { ...baseData, label: 'Stock Prices', query: builtinSource.query, maxItems: builtinSource.maxItems || 10 } as any,
          } as any);
          break;

        case 'weather':
          nodes.push({
            id: nodeId,
            type: 'weather_source',
            position: { x: 100 + idx * 300, y: yPosition },
            data: { ...baseData, label: 'Weather', query: builtinSource.query, maxItems: builtinSource.maxItems || 5 } as any,
          } as any);
          break;

        case 'gmail':
          nodes.push({
            id: nodeId,
            type: 'gmail_source',
            position: { x: 100 + idx * 300, y: yPosition },
            data: { ...baseData, label: 'Gmail', query: builtinSource.query, maxItems: builtinSource.maxItems || 10 } as any,
          } as any);
          break;

        case 'podcast':
          nodes.push({
            id: nodeId,
            type: 'podcast_source',
            position: { x: 100 + idx * 300, y: yPosition },
            data: { ...baseData, label: 'Podcast', feedUrl: builtinSource.feedUrl, maxItems: builtinSource.maxItems || 10 } as any,
          } as any);
          break;
      }
    }
  });

  yPosition += 200;

  // Convert pipeline steps to filter/transform nodes
  let lastNodeIds = [...sourceNodeIds];

  agentDef.pipeline.forEach((step, idx) => {
    const nodeId = `node_${nodeIdCounter++}`;
    const baseData = { configured: true };

    // Handle pipeline steps - cast to any to handle all possible step kinds
    switch ((step as any).kind) {
      case 'dedupe':
        nodes.push({
          id: nodeId,
          type: 'dedupe_filter',
          position: { x: 300, y: yPosition },
          data: {
            ...baseData,
            category: 'filter',
            label: 'Deduplicate',
            field: (step as any).dedupeBy || 'url',
          },
        });
        break;

      case 'filter':
        // Create a keyword filter node as placeholder
        nodes.push({
          id: nodeId,
          type: 'keyword_filter',
          position: { x: 300, y: yPosition },
          data: {
            ...baseData,
            category: 'filter',
            label: 'Filter',
            keywords: [],
            mode: 'include',
          },
        });
        break;

      case 'summarize':
        nodes.push({
          id: nodeId,
          type: 'llm_summarize',
          position: { x: 300, y: yPosition },
          data: {
            ...baseData,
            category: 'transform',
            label: 'AI Summarize',
            model: (step as any).model || 'gpt-4',
            maxTokens: (step as any).maxTokens || 1000,
          },
        });
        break;

      case 'transform':
        nodes.push({
          id: nodeId,
          type: 'llm_extract',
          position: { x: 300, y: yPosition },
          data: {
            ...baseData,
            category: 'transform',
            label: 'AI Extract',
            model: (step as any).model || 'gpt-4',
          },
        });
        break;

      case 'custom':
        nodes.push({
          id: nodeId,
          type: 'llm_custom',
          position: { x: 300, y: yPosition },
          data: {
            ...baseData,
            category: 'transform',
            label: 'Custom Transform',
          },
        });
        break;

      case 'sort':
      case 'limit':
        // Skip these as they're implicit in the UI
        return;

      default:
        // Skip unknown steps
        return;
    }

    // Connect previous nodes to this node
    lastNodeIds.forEach((prevId) => {
      edges.push({
        id: `edge_${prevId}_${nodeId}`,
        source: prevId,
        target: nodeId,
      });
    });

    lastNodeIds = [nodeId];
    yPosition += 200;
  });

  // Add limit filter node based on collation
  if (agentDef.collation.maxTotalItems) {
    const limitNodeId = `node_${nodeIdCounter++}`;
    nodes.push({
      id: limitNodeId,
      type: 'limit_filter',
      position: { x: 300, y: yPosition },
      data: {
        category: 'filter',
        label: 'Limit Items',
        maxItems: agentDef.collation.maxTotalItems,
        configured: true,
      },
    });

    lastNodeIds.forEach((prevId) => {
      edges.push({
        id: `edge_${prevId}_${limitNodeId}`,
        source: prevId,
        target: limitNodeId,
      });
    });

    lastNodeIds = [limitNodeId];
    yPosition += 200;
  }

  // Convert outputs to output nodes
  if (agentDef.output.sms?.enabled) {
    const smsNodeId = `node_${nodeIdCounter++}`;
    nodes.push({
      id: smsNodeId,
      type: 'sms_output',
      position: { x: 200, y: yPosition },
      data: {
        category: 'output',
        label: 'SMS Output',
        template: agentDef.output.sms.template || '{{summary}}',
        maxLength: agentDef.output.sms.maxLength || 1600,
        configured: true,
      },
    });

    lastNodeIds.forEach((prevId) => {
      edges.push({
        id: `edge_${prevId}_${smsNodeId}`,
        source: prevId,
        target: smsNodeId,
      });
    });
  }

  if (agentDef.output.report?.enabled) {
    const reportNodeId = `node_${nodeIdCounter++}`;
    nodes.push({
      id: reportNodeId,
      type: 'report_output',
      position: { x: 500, y: yPosition },
      data: {
        category: 'output',
        label: 'Report Output',
        format: agentDef.output.report.format || 'markdown',
        configured: true,
      },
    });

    lastNodeIds.forEach((prevId) => {
      edges.push({
        id: `edge_${prevId}_${reportNodeId}`,
        source: prevId,
        target: reportNodeId,
      });
    });
  }

  // Build workflow definition
  const workflow: WorkflowDefinition = {
    name: agentDef.metadata.name,
    description: agentDef.metadata.description,
    category: agentDef.metadata.category,
    icon: agentDef.metadata.icon,
    nodes,
    edges,
    metadata: {
      commandKeyword: agentDef.triggers?.commands?.[0]?.keyword || '',
      schedule: {
        enabled: agentDef.triggers?.schedule?.enabled || false,
        cron: agentDef.triggers?.schedule?.cron || '0 9 * * *',
      },
    },
  };

  return workflow;
}

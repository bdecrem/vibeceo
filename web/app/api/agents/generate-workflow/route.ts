/**
 * AI Workflow Generator API
 * Generates complete workflows from natural language descriptions
 */

import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

// Node catalog with descriptions
const NODE_CATALOG = [
  // Data Sources
  { kind: 'arxiv', category: 'source', description: 'Fetch academic papers from arXiv' },
  { kind: 'rss', category: 'source', description: 'Fetch RSS/Atom feeds' },
  { kind: 'hackernews', category: 'source', description: 'Fetch stories from Hacker News' },
  { kind: 'reddit', category: 'source', description: 'Fetch posts from Reddit subreddits' },
  { kind: 'github', category: 'source', description: 'Fetch GitHub repositories, issues, or PRs' },
  { kind: 'twitter', category: 'source', description: 'Fetch tweets and timelines' },
  { kind: 'youtube', category: 'source', description: 'Fetch YouTube videos' },
  { kind: 'producthunt', category: 'source', description: 'Fetch Product Hunt launches' },
  { kind: 'news_api', category: 'source', description: 'Fetch news articles from NewsAPI' },
  { kind: 'google_news', category: 'source', description: 'Fetch Google News articles' },
  { kind: 'crypto_price', category: 'source', description: 'Fetch cryptocurrency prices' },
  { kind: 'stock_price', category: 'source', description: 'Fetch stock prices and market data' },
  { kind: 'weather', category: 'source', description: 'Fetch weather data' },
  { kind: 'gmail', category: 'source', description: 'Fetch emails from Gmail' },
  { kind: 'podcast', category: 'source', description: 'Fetch podcast episodes' },

  // Pipeline - Core
  { kind: 'dedupe', category: 'pipeline', description: 'Remove duplicate items by URL, ID, or title' },
  { kind: 'filter', category: 'pipeline', description: 'Basic filtering by max items and min score' },
  { kind: 'sort', category: 'pipeline', description: 'Sort items by date, score, or relevance' },
  { kind: 'summarize', category: 'pipeline', description: 'LLM-powered summarization of items' },
  { kind: 'rank', category: 'pipeline', description: 'LLM-powered ranking and scoring' },
  { kind: 'transform', category: 'pipeline', description: 'LLM-powered data transformation' },
  { kind: 'claude_agent', category: 'pipeline', description: 'Runtime Claude AI agent for dynamic transformations' },

  // Pipeline - Filters
  { kind: 'date_filter', category: 'filter', description: 'Filter by date range or time period' },
  { kind: 'keyword_filter', category: 'filter', description: 'Filter by keyword inclusion/exclusion' },
  { kind: 'limit_filter', category: 'filter', description: 'Limit number of items' },
  { kind: 'sentiment_filter', category: 'filter', description: 'Filter by sentiment (positive/negative/neutral)' },
  { kind: 'length_filter', category: 'filter', description: 'Filter by text length (characters or words)' },
  { kind: 'score_filter', category: 'filter', description: 'Filter by minimum score threshold' },
  { kind: 'regex_filter', category: 'filter', description: 'Filter using regex pattern matching' },
  { kind: 'author_filter', category: 'filter', description: 'Filter by author or source name' },
  { kind: 'language_filter', category: 'filter', description: 'Filter by language' },
  { kind: 'top_n_filter', category: 'filter', description: 'Select top N items by score or date' },
  { kind: 'random_sample_filter', category: 'filter', description: 'Random sampling of items' },
  { kind: 'has_media_filter', category: 'filter', description: 'Filter items that have images or videos' },

  // Pipeline - Enrichment
  { kind: 'sentiment_analysis', category: 'enrichment', description: 'Analyze sentiment of text content' },
  { kind: 'entity_extraction', category: 'enrichment', description: 'Extract people, organizations, locations' },
  { kind: 'category_classification', category: 'enrichment', description: 'Classify items into categories' },
  { kind: 'translation', category: 'enrichment', description: 'Translate text to another language' },
  { kind: 'text_cleanup', category: 'enrichment', description: 'Clean HTML, normalize whitespace' },
  { kind: 'url_extraction', category: 'enrichment', description: 'Extract and expand URLs from text' },
  { kind: 'scoring_rank', category: 'enrichment', description: 'Score items using custom criteria' },
  { kind: 'field_mapping', category: 'enrichment', description: 'Map and rename fields' },
  { kind: 'merge_items', category: 'enrichment', description: 'Merge duplicate items' },
  { kind: 'enrich_data', category: 'enrichment', description: 'Enrich with external API data' },

  // Outputs
  { kind: 'sms', category: 'output', description: 'Send SMS message via Twilio' },
  { kind: 'report', category: 'output', description: 'Generate formatted report (HTML/Markdown)' },
  { kind: 'audio', category: 'output', description: 'Generate audio podcast from content' },
  { kind: 'email', category: 'output', description: 'Send email via SendGrid' },
  { kind: 'webhook', category: 'output', description: 'Send data to webhook URL' },
  { kind: 'slack', category: 'output', description: 'Post message to Slack' },
  { kind: 'discord', category: 'output', description: 'Post message to Discord' },
  { kind: 'twitter', category: 'output', description: 'Post tweet' },
  { kind: 'notification', category: 'output', description: 'Send push notification' },
  { kind: 'database', category: 'output', description: 'Insert records to database' },
  { kind: 'sheets', category: 'output', description: 'Append to Google Sheets' },
  { kind: 'file_export', category: 'output', description: 'Export to JSON/CSV file' },
];

const GENERATION_SYSTEM_PROMPT = `You are an AI workflow generation expert for the VibeCEO agent platform.

Your task is to generate a complete, valid ReactFlow workflow from a natural language description.

Available nodes (${NODE_CATALOG.length} total):
${NODE_CATALOG.map(n => `- ${n.kind} (${n.category}): ${n.description}`).join('\n')}

Rules for workflow generation:
1. Every workflow MUST start with at least one source node
2. Source nodes connect to pipeline/filter/enrichment nodes
3. All processing flows end at output nodes
4. Nodes need proper positioning (x, y coordinates)
5. Edges must reference valid node IDs
6. Each node needs a unique ID (e.g., "source_1", "filter_1", "output_1")
7. Include sensible default configurations for each node

Response format (JSON only):
{
  "workflow": {
    "nodes": [
      {
        "id": "unique_id",
        "type": "workflowNode",
        "position": { "x": 0, "y": 0 },
        "data": {
          "kind": "node_kind",
          "label": "Human readable label",
          "config": { /* node-specific config */ }
        }
      }
    ],
    "edges": [
      {
        "id": "edge_id",
        "source": "source_node_id",
        "target": "target_node_id"
      }
    ]
  },
  "metadata": {
    "title": "Workflow Name",
    "description": "Brief description",
    "nodesUsed": ["kind1", "kind2"],
    "reasoning": "Why these nodes were chosen"
  }
}

Position nodes in a logical flow:
- Sources at x=50, y=100 (stacked vertically if multiple, +150 each)
- Pipeline steps at x=350, y=100 (stacked vertically, +150 each)
- Outputs at x=650, y=100 (stacked vertically, +150 each)

Think step by step:
1. Identify the data sources needed
2. Determine filtering/processing steps
3. Choose enrichment if needed
4. Select output methods
5. Generate valid JSON with proper IDs and positions`;

interface GenerateWorkflowRequest {
  description: string;
  dataSources?: string[];
  goals?: string[];
  outputPreferences?: string[];
}

interface WorkflowNode {
  id: string;
  type: string;
  position: { x: number; y: number };
  data: {
    kind: string;
    label: string;
    config: Record<string, any>;
  };
}

interface WorkflowEdge {
  id: string;
  source: string;
  target: string;
}

interface GeneratedWorkflow {
  workflow: {
    nodes: WorkflowNode[];
    edges: WorkflowEdge[];
  };
  metadata: {
    title: string;
    description: string;
    nodesUsed: string[];
    reasoning: string;
  };
}

export async function POST(req: NextRequest) {
  try {
    const body: GenerateWorkflowRequest = await req.json();
    const { description, dataSources, goals, outputPreferences } = body;

    if (!description) {
      return NextResponse.json(
        { error: 'Description is required' },
        { status: 400 }
      );
    }

    // Check for API key
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'ANTHROPIC_API_KEY not configured' },
        { status: 500 }
      );
    }

    // Build user prompt
    let userPrompt = `Generate a workflow for this request:\n\n${description}`;

    if (dataSources && dataSources.length > 0) {
      userPrompt += `\n\nPreferred data sources: ${dataSources.join(', ')}`;
    }

    if (goals && goals.length > 0) {
      userPrompt += `\n\nGoals: ${goals.join(', ')}`;
    }

    if (outputPreferences && outputPreferences.length > 0) {
      userPrompt += `\n\nOutput preferences: ${outputPreferences.join(', ')}`;
    }

    userPrompt += '\n\nGenerate the complete workflow JSON.';

    // Call Claude
    const client = new Anthropic({ apiKey });
    const message = await client.messages.create({
      model: 'claude-3-haiku-20240307',
      max_tokens: 4096,
      system: GENERATION_SYSTEM_PROMPT,
      messages: [{
        role: 'user',
        content: userPrompt
      }]
    });

    // Extract response
    const responseText = message.content[0].type === 'text'
      ? message.content[0].text
      : '';

    // Parse JSON from response
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return NextResponse.json(
        { error: 'Failed to generate valid workflow JSON' },
        { status: 500 }
      );
    }

    const generated: GeneratedWorkflow = JSON.parse(jsonMatch[0]);

    // Validate structure
    if (!generated.workflow || !generated.workflow.nodes || !generated.workflow.edges) {
      return NextResponse.json(
        { error: 'Invalid workflow structure generated' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      workflow: generated.workflow,
      metadata: generated.metadata,
      nodeCatalog: NODE_CATALOG // Include catalog for reference
    });

  } catch (error: any) {
    console.error('Workflow generation error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to generate workflow' },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  // Return node catalog for reference
  return NextResponse.json({
    nodeCatalog: NODE_CATALOG,
    categories: ['source', 'pipeline', 'filter', 'enrichment', 'output'],
    totalNodes: NODE_CATALOG.length
  });
}

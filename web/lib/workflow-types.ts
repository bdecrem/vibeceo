/**
 * Workflow Builder Types
 * n8n-style node-based workflow editor for building agents
 */

import type { Node, Edge } from 'reactflow';

/**
 * Node Categories
 */
export type NodeCategory = 'source' | 'filter' | 'transform' | 'output';

/**
 * Source Node Types
 */
export type SourceNodeType =
  | 'rss_source'
  | 'http_json_source'
  | 'web_scraper_source'
  | 'user_source'
  | 'arxiv_source'
  | 'hackernews_source'
  | 'reddit_source'
  | 'github_source'
  | 'twitter_source'
  | 'youtube_source'
  | 'producthunt_source'
  | 'news_api_source'
  | 'google_news_source'
  | 'crypto_price_source'
  | 'stock_price_source'
  | 'weather_source'
  | 'gmail_source'
  | 'podcast_source';

/**
 * Filter Node Types
 */
export type FilterNodeType =
  | 'dedupe_filter'
  | 'date_filter'
  | 'keyword_filter'
  | 'limit_filter'
  | 'sentiment_filter'
  | 'length_filter'
  | 'score_filter'
  | 'regex_filter'
  | 'author_filter'
  | 'language_filter'
  | 'top_n_filter'
  | 'random_sample_filter'
  | 'has_media_filter';

/**
 * Transform Node Types
 */
export type TransformNodeType =
  | 'llm_summarize'
  | 'llm_extract'
  | 'llm_qa'
  | 'llm_custom'
  | 'claude_agent'
  | 'sentiment_analysis'
  | 'entity_extraction'
  | 'category_classification'
  | 'translation'
  | 'text_cleanup'
  | 'url_extraction'
  | 'scoring_rank'
  | 'field_mapping'
  | 'merge_items'
  | 'enrich_data';

/**
 * Output Node Types
 */
export type OutputNodeType =
  | 'sms_output'
  | 'report_output'
  | 'email_output'
  | 'webhook_output'
  | 'slack_output'
  | 'discord_output'
  | 'twitter_output'
  | 'notification_output'
  | 'database_output'
  | 'sheets_output'
  | 'file_export_output';

/**
 * All Node Types
 */
export type WorkflowNodeType =
  | SourceNodeType
  | FilterNodeType
  | TransformNodeType
  | OutputNodeType;

/**
 * Node Data Structures
 */

// Base node data
export interface BaseNodeData {
  label: string;
  category: NodeCategory;
  configured: boolean;
}

// Source Nodes
export interface RssSourceData extends BaseNodeData {
  feedUrl?: string;
  maxItems?: number;
}

export interface HttpJsonSourceData extends BaseNodeData {
  url?: string;
  method?: 'GET' | 'POST';
  jsonPath?: string;
  headers?: Record<string, string>;
  maxItems?: number;
}

export interface WebScraperSourceData extends BaseNodeData {
  url?: string;
  extractMode?: 'single' | 'list';
  selectors?: {
    container?: string;
    title?: string;
    summary?: string;
    content?: string;
  };
  maxItems?: number;
}

export interface UserSourceData extends BaseNodeData {
  sourceId?: string;
  sourceName?: string;
}

export interface ArxivSourceData extends BaseNodeData {
  searchQuery?: string;
  arxivCategory?: string; // Renamed to avoid conflict with BaseNodeData.category
  maxItems?: number;
}

// Filter Nodes
export interface DedupeFilterData extends BaseNodeData {
  field: 'title' | 'url' | 'content';
}

export interface DateFilterData extends BaseNodeData {
  olderThan?: number; // hours
  newerThan?: number; // hours
}

export interface KeywordFilterData extends BaseNodeData {
  keywords: string[];
  mode: 'include' | 'exclude';
  field: 'title' | 'summary' | 'content';
}

export interface LimitFilterData extends BaseNodeData {
  maxItems: number;
}

// Transform Nodes
export interface LlmSummarizeData extends BaseNodeData {
  instruction?: string;
  audience?: string;
  maxLength?: number;
}

export interface LlmExtractData extends BaseNodeData {
  instruction: string;
  fields: string[];
}

export interface LlmQaData extends BaseNodeData {
  instruction: string;
  questionField?: string;
  answerField?: string;
}

export interface LlmCustomData extends BaseNodeData {
  systemPrompt: string;
  userPrompt: string;
}

// Output Nodes
export interface SmsOutputData extends BaseNodeData {
  template: string;
  maxLength?: number;
}

export interface ReportOutputData extends BaseNodeData {
  template: string;
  includeRaw?: boolean;
}

/**
 * Generic data interfaces for simple nodes
 * These provide flexible data structures for nodes that don't need specific interfaces
 */
export type GenericSourceData = BaseNodeData & {
  query?: string;
  feedUrl?: string;
  url?: string;
  searchQuery?: string;
  keywords?: string;
  subreddit?: string;
  repo?: string;
  username?: string;
  channel?: string;
  symbol?: string;
  location?: string;
  maxItems?: number;
  [key: string]: any;
};

export type GenericFilterData = BaseNodeData & {
  field?: string;
  value?: any;
  sentiment?: 'positive' | 'negative' | 'neutral';
  minLength?: number;
  maxLength?: number;
  minScore?: number;
  maxScore?: number;
  pattern?: string;
  author?: string;
  language?: string;
  n?: number;
  sampleSize?: number;
  mediaType?: 'image' | 'video' | 'audio';
  [key: string]: any;
};

export type GenericTransformData = BaseNodeData & {
  systemPrompt?: string;
  userPromptTemplate?: string;
  instruction?: string;
  targetLanguage?: string;
  operations?: string[];
  scoreField?: string;
  scoreAlgorithm?: string;
  fieldMappings?: Record<string, string>;
  mergeStrategy?: string;
  enrichmentSources?: string[];
  [key: string]: any;
};

export type GenericOutputData = BaseNodeData & {
  template?: string;
  to?: string;
  subject?: string;
  body?: string;
  url?: string;
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  channel?: string;
  channelId?: string;
  message?: string;
  tweet?: string;
  title?: string;
  notificationType?: string;
  connectionString?: string;
  tableName?: string;
  spreadsheetId?: string;
  sheetName?: string;
  filePath?: string;
  format?: 'json' | 'csv' | 'xml';
  [key: string]: any;
};

/**
 * Union of all node data types
 */
export type WorkflowNodeData =
  // Original specific types
  | RssSourceData
  | HttpJsonSourceData
  | WebScraperSourceData
  | UserSourceData
  | ArxivSourceData
  | DedupeFilterData
  | DateFilterData
  | KeywordFilterData
  | LimitFilterData
  | LlmSummarizeData
  | LlmExtractData
  | LlmQaData
  | LlmCustomData
  | SmsOutputData
  | ReportOutputData
  // Generic types for new nodes
  | GenericSourceData
  | GenericFilterData
  | GenericTransformData
  | GenericOutputData;

/**
 * Workflow Node (React Flow Node with our data)
 */
export type WorkflowNode = Node<WorkflowNodeData, WorkflowNodeType>;

/**
 * Workflow Edge
 */
export type WorkflowEdge = Edge;

/**
 * Node Palette Item (for the toolbar)
 */
export interface NodePaletteItem {
  type: WorkflowNodeType;
  category: NodeCategory;
  label: string;
  description: string;
  icon: string;
  defaultData: Partial<WorkflowNodeData>;
}

/**
 * Workflow Definition
 */
export interface WorkflowDefinition {
  id?: string;
  name: string;
  description?: string;
  category?: string;
  icon?: string;
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  metadata?: {
    commandKeyword?: string;
    schedule?: {
      enabled: boolean;
      cron?: string;
    };
  };
}

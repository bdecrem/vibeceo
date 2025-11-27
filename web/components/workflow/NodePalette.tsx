/**
 * Node Palette Sidebar
 * Professional node browser with icons
 */

'use client';

import { useState } from 'react';
import { useWorkflowStore } from '@/lib/stores/workflow-store';
import {
  Rss, Globe, Database, Book, Filter, Calendar, Search, Hash, Sparkles, Target, HelpCircle, Cpu,
  MessageSquare, FileText, Plus, Newspaper, TrendingUp, Github, Music, Youtube, Mail, Cloud,
  MessageCircle, Zap, BarChart, Smile, FileCheck, Clock, SortDesc, Shuffle, Languages, Image,
  Share2, Webhook, Send, Bell, CheckCircle, AtSign, Tag, AlignLeft, Binary, Blend
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';

interface NodeItem {
  type: string;
  label: string;
  description: string;
  icon: typeof Rss;
}

const NODES_BY_CATEGORY: Record<string, NodeItem[]> = {
  source: [
    { type: 'rss_source', label: 'RSS Feed', description: 'Fetch items from RSS/Atom feeds', icon: Rss },
    { type: 'http_json_source', label: 'HTTP JSON', description: 'Fetch data from JSON APIs', icon: Globe },
    { type: 'web_scraper_source', label: 'Web Scraper', description: 'Extract data from web pages', icon: Globe },
    { type: 'user_source', label: 'User Source', description: 'Use saved source', icon: Database },
    { type: 'arxiv_source', label: 'arXiv Papers', description: 'Search arXiv research papers', icon: Book },
    { type: 'hackernews_source', label: 'Hacker News', description: 'Fetch HN stories (front, new, ask, show)', icon: Newspaper },
    { type: 'reddit_source', label: 'Reddit', description: 'Fetch posts from subreddits', icon: MessageCircle },
    { type: 'github_source', label: 'GitHub', description: 'Trending repos, issues, PRs', icon: Github },
    { type: 'twitter_source', label: 'Twitter/X', description: 'Search tweets or user timeline', icon: AtSign },
    { type: 'youtube_source', label: 'YouTube', description: 'Channel videos or search results', icon: Youtube },
    { type: 'producthunt_source', label: 'Product Hunt', description: 'Today\'s top products', icon: TrendingUp },
    { type: 'news_api_source', label: 'News API', description: 'Global news from 50,000+ sources', icon: Newspaper },
    { type: 'google_news_source', label: 'Google News', description: 'Search Google News', icon: Newspaper },
    { type: 'crypto_price_source', label: 'Crypto Prices', description: 'Track cryptocurrency prices', icon: TrendingUp },
    { type: 'stock_price_source', label: 'Stock Prices', description: 'Track stock market prices', icon: BarChart },
    { type: 'weather_source', label: 'Weather', description: 'Weather forecasts and alerts', icon: Cloud },
    { type: 'gmail_source', label: 'Gmail', description: 'Fetch emails from Gmail', icon: Mail },
    { type: 'podcast_source', label: 'Podcast Feed', description: 'Episodes from podcast RSS', icon: Music },
  ],
  filter: [
    { type: 'dedupe_filter', label: 'Deduplicate', description: 'Remove duplicate items', icon: Filter },
    { type: 'date_filter', label: 'Date Range', description: 'Filter by date/time range', icon: Calendar },
    { type: 'keyword_filter', label: 'Keywords', description: 'Include/exclude by keywords', icon: Search },
    { type: 'limit_filter', label: 'Limit Count', description: 'Limit number of items', icon: Hash },
    { type: 'sentiment_filter', label: 'Sentiment', description: 'Filter by positive/negative/neutral', icon: Smile },
    { type: 'length_filter', label: 'Text Length', description: 'Filter by character/word count', icon: AlignLeft },
    { type: 'score_filter', label: 'Score Threshold', description: 'Filter by minimum score/votes', icon: TrendingUp },
    { type: 'regex_filter', label: 'Regex Pattern', description: 'Match regex patterns', icon: Binary },
    { type: 'author_filter', label: 'Author/Source', description: 'Filter by author or source', icon: AtSign },
    { type: 'language_filter', label: 'Language', description: 'Filter by content language', icon: Languages },
    { type: 'top_n_filter', label: 'Top N', description: 'Select top N items by metric', icon: SortDesc },
    { type: 'random_sample_filter', label: 'Random Sample', description: 'Random selection of items', icon: Shuffle },
    { type: 'has_media_filter', label: 'Has Media', description: 'Filter items with images/videos', icon: Image },
  ],
  transform: [
    { type: 'llm_summarize', label: 'AI Summarize', description: 'Generate concise summaries', icon: Sparkles },
    { type: 'llm_extract', label: 'AI Extract', description: 'Extract structured data fields', icon: Target },
    { type: 'llm_qa', label: 'AI Q&A', description: 'Generate Q&A pairs', icon: HelpCircle },
    { type: 'llm_custom', label: 'AI Custom', description: 'Custom AI transformation', icon: Cpu },
    { type: 'claude_agent', label: 'Claude Agent', description: 'Runtime AI agent processing', icon: Cpu },
    { type: 'sentiment_analysis', label: 'Sentiment Score', description: 'Analyze sentiment (0-1)', icon: Smile },
    { type: 'entity_extraction', label: 'Extract Entities', description: 'Extract people, places, orgs', icon: Tag },
    { type: 'category_classification', label: 'Categorize', description: 'Auto-categorize content', icon: Tag },
    { type: 'translation', label: 'Translate', description: 'Translate to other languages', icon: Languages },
    { type: 'text_cleanup', label: 'Clean Text', description: 'Remove HTML, normalize text', icon: FileCheck },
    { type: 'url_extraction', label: 'Extract URLs', description: 'Extract and expand URLs', icon: Globe },
    { type: 'scoring_rank', label: 'Score/Rank', description: 'Score items by custom criteria', icon: BarChart },
    { type: 'field_mapping', label: 'Map Fields', description: 'Rename/restructure fields', icon: Blend },
    { type: 'merge_items', label: 'Merge Items', description: 'Combine multiple items', icon: Blend },
    { type: 'enrich_data', label: 'Enrich Data', description: 'Add data from external APIs', icon: Zap },
  ],
  output: [
    { type: 'sms_output', label: 'SMS Message', description: 'Send via SMS/text', icon: MessageSquare },
    { type: 'report_output', label: 'Report Page', description: 'Generate HTML/PDF report', icon: FileText },
    { type: 'email_output', label: 'Email', description: 'Send via email', icon: Mail },
    { type: 'webhook_output', label: 'Webhook', description: 'POST to HTTP endpoint', icon: Webhook },
    { type: 'slack_output', label: 'Slack Message', description: 'Post to Slack channel', icon: MessageCircle },
    { type: 'discord_output', label: 'Discord Message', description: 'Post to Discord channel', icon: MessageCircle },
    { type: 'twitter_output', label: 'Tweet', description: 'Post to Twitter/X', icon: AtSign },
    { type: 'notification_output', label: 'Push Notification', description: 'Send push notification', icon: Bell },
    { type: 'database_output', label: 'Database Insert', description: 'Insert into SQL database', icon: Database },
    { type: 'sheets_output', label: 'Google Sheets', description: 'Append to spreadsheet', icon: FileText },
    { type: 'file_export_output', label: 'File Export', description: 'Export as CSV/JSON', icon: FileText },
  ],
};

const CATEGORIES = [
  { id: 'source', label: 'Sources' },
  { id: 'filter', label: 'Filters' },
  { id: 'transform', label: 'AI' },
  { id: 'output', label: 'Output' },
];

export function NodePalette() {
  const [activeCategory, setActiveCategory] = useState('source');
  const { addNode } = useWorkflowStore();

  const filteredNodes = NODES_BY_CATEGORY[activeCategory] || [];

  const handleAddNode = (nodeType: string) => {
    const position = {
      x: Math.random() * 400 + 100,
      y: Math.random() * 300 + 100,
    };
    addNode(nodeType, position);
  };

  return (
    <div className="w-72 bg-slate-50 border-r border-slate-200 flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-slate-200 bg-white">
        <h2 className="text-sm font-semibold text-slate-900">Nodes</h2>
        <p className="text-xs text-slate-500 mt-0.5">Click to add to canvas</p>
      </div>

      {/* Categories */}
      <div className="flex border-b border-slate-200 bg-white">
        {CATEGORIES.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setActiveCategory(cat.id)}
            className={`
              flex-1 px-3 py-2 text-xs font-medium transition-colors
              ${
                activeCategory === cat.id
                  ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }
            `}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Nodes List */}
      <ScrollArea className="flex-1">
        <div className="p-3 space-y-2">
          {filteredNodes.map((node) => (
            <Card
              key={node.type}
              onClick={() => handleAddNode(node.type)}
              className="p-3 cursor-pointer hover:bg-slate-50 hover:border-blue-200 transition-all group border-slate-200"
            >
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-slate-100 group-hover:bg-blue-100 transition-colors">
                  <node.icon className="w-4 h-4 text-slate-600 group-hover:text-blue-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-medium text-slate-900">{node.label}</div>
                    <Plus className="w-3 h-3 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                  <div className="text-xs text-slate-500 mt-0.5">{node.description}</div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </ScrollArea>

      {/* Footer Tips */}
      <div className="p-3 border-t border-slate-200 bg-white">
        <div className="text-xs text-slate-500 space-y-1">
          <p><strong>Tip:</strong> Click nodes to configure</p>
          <p>Drag between handles to connect</p>
        </div>
      </div>
    </div>
  );
}

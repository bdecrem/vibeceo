/**
 * Node Configuration Panel
 * Professional config panel using shadcn/ui
 */

'use client';

import { useWorkflowStore } from '@/lib/stores/workflow-store';
import type { WorkflowNodeData } from '@/lib/workflow-types';
import { X, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';

export function NodeConfigPanel() {
  const { nodes, selectedNodeId, updateNode, selectNode } = useWorkflowStore();

  const selectedNode = nodes.find((n) => n.id === selectedNodeId);

  if (!selectedNode) {
    return (
      <div className="w-96 bg-slate-50 border-l border-slate-200 p-8 flex items-center justify-center">
        <div className="text-center text-slate-400">
          <Settings className="w-12 h-12 mx-auto mb-3 text-slate-300" />
          <p className="text-sm font-medium">Select a node to configure</p>
        </div>
      </div>
    );
  }

  const handleClose = () => selectNode(null);

  const handleUpdate = (field: string, value: any) => {
    updateNode(selectedNodeId!, { [field]: value });
  };

  return (
    <div className="w-96 bg-white border-l border-slate-200 flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-slate-200">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="font-semibold text-slate-900">{selectedNode.data.label}</h3>
            <p className="text-xs text-slate-500 capitalize mt-0.5">{selectedNode.data.category}</p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleClose}
            className="h-8 w-8"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Configuration Form */}
      <ScrollArea className="flex-1">
        <div className="p-4">
          <NodeConfigForm
            nodeType={selectedNode.type!}
            data={selectedNode.data}
            onUpdate={handleUpdate}
          />
        </div>
      </ScrollArea>
    </div>
  );
}

interface NodeConfigFormProps {
  nodeType: string;
  data: WorkflowNodeData;
  onUpdate: (field: string, value: any) => void;
}

function NodeConfigForm({ nodeType, data, onUpdate }: NodeConfigFormProps) {
  switch (nodeType) {
    // ========== SOURCE NODES ==========
    case 'rss_source':
      return (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="feedUrl">Feed URL *</Label>
            <Input
              id="feedUrl"
              type="url"
              value={(data as any).feedUrl || ''}
              onChange={(e) => onUpdate('feedUrl', e.target.value)}
              placeholder="https://example.com/feed.xml"
            />
            <p className="text-xs text-slate-500">RSS or Atom feed URL</p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="maxItems">Max Items</Label>
            <Input
              id="maxItems"
              type="number"
              value={(data as any).maxItems || 10}
              onChange={(e) => onUpdate('maxItems', parseInt(e.target.value))}
              min="1"
              max="100"
            />
            <p className="text-xs text-slate-500">Maximum number of items to fetch (1-100)</p>
          </div>
        </div>
      );

    case 'http_json_source':
      return (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="url">API URL *</Label>
            <Input
              id="url"
              type="url"
              value={(data as any).url || ''}
              onChange={(e) => onUpdate('url', e.target.value)}
              placeholder="https://api.example.com/data"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="method">HTTP Method</Label>
            <Select
              value={(data as any).method || 'GET'}
              onValueChange={(value) => onUpdate('method', value)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="GET">GET</SelectItem>
                <SelectItem value="POST">POST</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="jsonPath">JSONPath *</Label>
            <Input
              id="jsonPath"
              value={(data as any).jsonPath || '$.data'}
              onChange={(e) => onUpdate('jsonPath', e.target.value)}
              placeholder="$.data.items"
            />
            <p className="text-xs text-slate-500">Path to items array (e.g., $.results)</p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="headers">Headers (JSON)</Label>
            <Textarea
              id="headers"
              value={(data as any).headers ? JSON.stringify((data as any).headers, null, 2) : ''}
              onChange={(e) => {
                try {
                  onUpdate('headers', JSON.parse(e.target.value));
                } catch {
                  // Invalid JSON, ignore
                }
              }}
              placeholder='{"Authorization": "Bearer token"}'
              rows={3}
              className="font-mono text-xs"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="maxItems">Max Items</Label>
            <Input
              id="maxItems"
              type="number"
              value={(data as any).maxItems || 10}
              onChange={(e) => onUpdate('maxItems', parseInt(e.target.value))}
              min="1"
              max="100"
            />
          </div>
        </div>
      );

    case 'web_scraper_source':
      return (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="url">URL *</Label>
            <Input
              id="url"
              type="url"
              value={(data as any).url || ''}
              onChange={(e) => onUpdate('url', e.target.value)}
              placeholder="https://example.com/page"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="extractMode">Extract Mode</Label>
            <Select
              value={(data as any).extractMode || 'single'}
              onValueChange={(value) => onUpdate('extractMode', value)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="single">Single Item</SelectItem>
                <SelectItem value="list">List of Items</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Separator />
          <div className="space-y-3">
            <Label className="text-sm font-medium">CSS Selectors</Label>
            {(data as any).extractMode === 'list' && (
              <div className="space-y-2">
                <Label htmlFor="containerSelector" className="text-xs">Container *</Label>
                <Input
                  id="containerSelector"
                  value={(data as any).selectors?.container || ''}
                  onChange={(e) =>
                    onUpdate('selectors', { ...(data as any).selectors, container: e.target.value })
                  }
                  placeholder="article, .post"
                  className="h-8"
                />
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="titleSelector" className="text-xs">Title</Label>
              <Input
                id="titleSelector"
                value={(data as any).selectors?.title || ''}
                onChange={(e) =>
                  onUpdate('selectors', { ...(data as any).selectors, title: e.target.value })
                }
                placeholder="h1, .title"
                className="h-8"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="summarySelector" className="text-xs">Summary</Label>
              <Input
                id="summarySelector"
                value={(data as any).selectors?.summary || ''}
                onChange={(e) =>
                  onUpdate('selectors', { ...(data as any).selectors, summary: e.target.value })
                }
                placeholder=".summary, .excerpt"
                className="h-8"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="contentSelector" className="text-xs">Content</Label>
              <Input
                id="contentSelector"
                value={(data as any).selectors?.content || ''}
                onChange={(e) =>
                  onUpdate('selectors', { ...(data as any).selectors, content: e.target.value })
                }
                placeholder=".content, article"
                className="h-8"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="maxItems">Max Items</Label>
            <Input
              id="maxItems"
              type="number"
              value={(data as any).maxItems || 1}
              onChange={(e) => onUpdate('maxItems', parseInt(e.target.value))}
              min="1"
              max="100"
            />
          </div>
        </div>
      );

    case 'user_source':
      return (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="sourceId">Source ID *</Label>
            <Input
              id="sourceId"
              value={(data as any).sourceId || ''}
              onChange={(e) => onUpdate('sourceId', e.target.value)}
              placeholder="UUID of user-defined source"
            />
            <p className="text-xs text-slate-500">Reference a saved source from /dev/sources</p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="sourceName">Source Name (display)</Label>
            <Input
              id="sourceName"
              value={(data as any).sourceName || ''}
              onChange={(e) => onUpdate('sourceName', e.target.value)}
              placeholder="My Custom Source"
            />
          </div>
        </div>
      );

    case 'arxiv_source':
      return (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="searchQuery">Search Query *</Label>
            <Input
              id="searchQuery"
              value={(data as any).searchQuery || ''}
              onChange={(e) => onUpdate('searchQuery', e.target.value)}
              placeholder="machine learning, quantum computing"
            />
            <p className="text-xs text-slate-500">Keywords to search for</p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="category">Category</Label>
            <Select
              value={(data as any).category || 'all'}
              onValueChange={(value) => onUpdate('category', value)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                <SelectItem value="cs.AI">Computer Science - AI</SelectItem>
                <SelectItem value="cs.LG">Computer Science - ML</SelectItem>
                <SelectItem value="physics">Physics</SelectItem>
                <SelectItem value="math">Mathematics</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="maxItems">Max Items</Label>
            <Input
              id="maxItems"
              type="number"
              value={(data as any).maxItems || 10}
              onChange={(e) => onUpdate('maxItems', parseInt(e.target.value))}
              min="1"
              max="100"
            />
          </div>
        </div>
      );

    // ========== FILTER NODES ==========
    case 'dedupe_filter':
      return (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="field">Dedupe By Field</Label>
            <Select
              value={(data as any).field || 'title'}
              onValueChange={(value) => onUpdate('field', value)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="title">Title</SelectItem>
                <SelectItem value="url">URL</SelectItem>
                <SelectItem value="content">Content</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-slate-500">Remove duplicates based on this field</p>
          </div>
        </div>
      );

    case 'date_filter':
      return (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="newerThan">Newer Than (hours)</Label>
            <Input
              id="newerThan"
              type="number"
              value={(data as any).newerThan || ''}
              onChange={(e) => onUpdate('newerThan', e.target.value ? parseInt(e.target.value) : undefined)}
              placeholder="24"
              min="1"
            />
            <p className="text-xs text-slate-500">Only include items published within this many hours</p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="olderThan">Older Than (hours)</Label>
            <Input
              id="olderThan"
              type="number"
              value={(data as any).olderThan || ''}
              onChange={(e) => onUpdate('olderThan', e.target.value ? parseInt(e.target.value) : undefined)}
              placeholder="168"
              min="1"
            />
            <p className="text-xs text-slate-500">Exclude items published within this many hours</p>
          </div>
        </div>
      );

    case 'keyword_filter':
      return (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="keywords">Keywords (comma-separated) *</Label>
            <Input
              id="keywords"
              value={(data as any).keywords?.join(', ') || ''}
              onChange={(e) =>
                onUpdate(
                  'keywords',
                  e.target.value.split(',').map((k) => k.trim()).filter(Boolean)
                )
              }
              placeholder="ai, machine learning, llm"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="mode">Filter Mode</Label>
            <Select
              value={(data as any).mode || 'include'}
              onValueChange={(value) => onUpdate('mode', value)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="include">Include matching</SelectItem>
                <SelectItem value="exclude">Exclude matching</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="field">Search In</Label>
            <Select
              value={(data as any).field || 'title'}
              onValueChange={(value) => onUpdate('field', value)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="title">Title</SelectItem>
                <SelectItem value="summary">Summary</SelectItem>
                <SelectItem value="content">Content</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      );

    case 'limit_filter':
      return (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="maxItems">Max Items *</Label>
            <Input
              id="maxItems"
              type="number"
              value={(data as any).maxItems || 10}
              onChange={(e) => onUpdate('maxItems', parseInt(e.target.value))}
              min="1"
              max="100"
            />
            <p className="text-xs text-slate-500">Limit the number of items to process</p>
          </div>
        </div>
      );

    // ========== TRANSFORM NODES ==========
    case 'llm_summarize':
      return (
        <div className="space-y-4">
          {/* Info Box */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <p className="text-xs text-blue-800 font-medium mb-1">How it works:</p>
            <p className="text-xs text-blue-700">
              Uses AI to create concise summaries of content. Each item's content is sent to the LLM with your custom instructions.
              Requires: OpenAI API key configured on backend.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="instruction">Custom Instruction</Label>
            <Textarea
              id="instruction"
              value={(data as any).instruction || ''}
              onChange={(e) => onUpdate('instruction', e.target.value)}
              placeholder="Focus on technical details and key findings..."
              rows={3}
            />
            <p className="text-xs text-slate-500">
              Additional context for the AI. Leave empty for default summarization.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="audience">Target Audience</Label>
            <Input
              id="audience"
              value={(data as any).audience || ''}
              onChange={(e) => onUpdate('audience', e.target.value)}
              placeholder="e.g., software engineers, executives"
            />
            <p className="text-xs text-slate-500">
              Who will read this? Affects tone and complexity.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="maxLength">Max Length (words)</Label>
            <Input
              id="maxLength"
              type="number"
              value={(data as any).maxLength || 100}
              onChange={(e) => onUpdate('maxLength', parseInt(e.target.value))}
              min="10"
              max="500"
            />
            <p className="text-xs text-slate-500">
              Target summary length. AI will aim for this length but may vary slightly.
            </p>
          </div>

          <Separator />

          <div className="space-y-2">
            <Label htmlFor="model">AI Model (Advanced)</Label>
            <Select
              value={(data as any).model || 'gpt-4o-mini'}
              onValueChange={(value) => onUpdate('model', value)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="gpt-4o-mini">GPT-4 Mini (Fast & Cheap)</SelectItem>
                <SelectItem value="gpt-4o">GPT-4 (Accurate)</SelectItem>
                <SelectItem value="gpt-3.5-turbo">GPT-3.5 Turbo (Legacy)</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-slate-500">
              Model selection affects cost and quality
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="temperature">Creativity (Temperature)</Label>
            <Input
              id="temperature"
              type="number"
              value={(data as any).temperature ?? 0.3}
              onChange={(e) => onUpdate('temperature', parseFloat(e.target.value))}
              min="0"
              max="1"
              step="0.1"
            />
            <p className="text-xs text-slate-500">
              0 = Focused & consistent, 1 = Creative & varied. Recommended: 0.3
            </p>
          </div>
        </div>
      );

    case 'llm_extract':
      return (
        <div className="space-y-4">
          {/* Info Box */}
          <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
            <p className="text-xs text-purple-800 font-medium mb-1">How it works:</p>
            <p className="text-xs text-purple-700">
              Extracts structured data from unstructured content using AI. Specify which fields to extract, and the AI will identify and extract them from each item.
              Requires: OpenAI API key configured on backend.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="fields">Fields to Extract (comma-separated) *</Label>
            <Input
              id="fields"
              value={(data as any).fields?.join(', ') || ''}
              onChange={(e) =>
                onUpdate(
                  'fields',
                  e.target.value.split(',').map((f) => f.trim()).filter(Boolean)
                )
              }
              placeholder="company, location, salary, tech_stack"
            />
            <p className="text-xs text-slate-500">
              Field names you want to extract. Examples: price, author, date, location, key_points
            </p>
            {!(data as any).fields?.length && (
              <p className="text-xs text-amber-600">⚠ At least one field is required</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="instruction">Extraction Instruction</Label>
            <Textarea
              id="instruction"
              value={(data as any).instruction || ''}
              onChange={(e) => onUpdate('instruction', e.target.value)}
              placeholder="Focus on the most recent and relevant information..."
              rows={3}
            />
            <p className="text-xs text-slate-500">
              Additional guidance for extraction. Leave empty for default behavior.
            </p>
          </div>

          <Separator />

          <div className="space-y-2">
            <Label htmlFor="outputFormat">Output Format</Label>
            <Select
              value={(data as any).outputFormat || 'json'}
              onValueChange={(value) => onUpdate('outputFormat', value)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="json">JSON (Structured)</SelectItem>
                <SelectItem value="text">Plain Text</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-slate-500">
              JSON is recommended for structured data that can be processed further
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="model">AI Model (Advanced)</Label>
            <Select
              value={(data as any).model || 'gpt-4o-mini'}
              onValueChange={(value) => onUpdate('model', value)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="gpt-4o-mini">GPT-4 Mini (Fast & Cheap)</SelectItem>
                <SelectItem value="gpt-4o">GPT-4 (Accurate)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      );

    case 'llm_qa':
      return (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="instruction">Instruction *</Label>
            <Textarea
              id="instruction"
              value={(data as any).instruction || ''}
              onChange={(e) => onUpdate('instruction', e.target.value)}
              placeholder="Generate question-answer pairs from the content..."
              rows={3}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="questionField">Question Field Name</Label>
            <Input
              id="questionField"
              value={(data as any).questionField || 'question'}
              onChange={(e) => onUpdate('questionField', e.target.value)}
              placeholder="question"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="answerField">Answer Field Name</Label>
            <Input
              id="answerField"
              value={(data as any).answerField || 'answer'}
              onChange={(e) => onUpdate('answerField', e.target.value)}
              placeholder="answer"
            />
          </div>
        </div>
      );

    case 'llm_custom':
      return (
        <div className="space-y-4">
          {/* Info Box */}
          <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3">
            <p className="text-xs text-emerald-800 font-medium mb-1">How it works:</p>
            <p className="text-xs text-emerald-700">
              Fully customizable AI transformation. Define your own system and user prompts to process content in any way you want.
              Use template variables to inject item data.
              Requires: OpenAI API key configured on backend.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="systemPrompt">System Prompt *</Label>
            <Textarea
              id="systemPrompt"
              value={(data as any).systemPrompt || ''}
              onChange={(e) => onUpdate('systemPrompt', e.target.value)}
              placeholder="You are an expert analyst specializing in..."
              rows={4}
            />
            <p className="text-xs text-slate-500">
              Sets the AI's role and behavior. Be specific about expertise and style.
            </p>
            {!(data as any).systemPrompt && (
              <p className="text-xs text-amber-600">⚠ System prompt is required</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="userPrompt">User Prompt Template *</Label>
            <Textarea
              id="userPrompt"
              value={(data as any).userPrompt || ''}
              onChange={(e) => onUpdate('userPrompt', e.target.value)}
              placeholder="Analyze this article titled '{{title}}' and provide insights:\n\n{{content}}"
              rows={5}
              className="font-mono text-sm"
            />
            <div className="bg-slate-50 border border-slate-200 rounded p-2">
              <p className="text-xs font-medium text-slate-700 mb-1">Available variables:</p>
              <div className="flex flex-wrap gap-2">
                <code className="text-xs bg-white px-1.5 py-0.5 rounded border">{'{{title}}'}</code>
                <code className="text-xs bg-white px-1.5 py-0.5 rounded border">{'{{summary}}'}</code>
                <code className="text-xs bg-white px-1.5 py-0.5 rounded border">{'{{content}}'}</code>
                <code className="text-xs bg-white px-1.5 py-0.5 rounded border">{'{{url}}'}</code>
                <code className="text-xs bg-white px-1.5 py-0.5 rounded border">{'{{author}}'}</code>
              </div>
            </div>
            {!(data as any).userPrompt && (
              <p className="text-xs text-amber-600">⚠ User prompt is required</p>
            )}
          </div>

          <Separator />

          <div className="space-y-2">
            <Label htmlFor="outputField">Output Field Name</Label>
            <Input
              id="outputField"
              value={(data as any).outputField || 'customOutput'}
              onChange={(e) => onUpdate('outputField', e.target.value)}
              placeholder="customOutput"
            />
            <p className="text-xs text-slate-500">
              Field name where the AI response will be stored on each item
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="model">AI Model</Label>
            <Select
              value={(data as any).model || 'gpt-4o-mini'}
              onValueChange={(value) => onUpdate('model', value)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="gpt-4o-mini">GPT-4 Mini (Fast & Cheap)</SelectItem>
                <SelectItem value="gpt-4o">GPT-4 (Best Quality)</SelectItem>
                <SelectItem value="gpt-3.5-turbo">GPT-3.5 Turbo (Legacy)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="temperature">Temperature</Label>
            <Input
              id="temperature"
              type="number"
              value={(data as any).temperature ?? 0.7}
              onChange={(e) => onUpdate('temperature', parseFloat(e.target.value))}
              min="0"
              max="2"
              step="0.1"
            />
            <p className="text-xs text-slate-500">
              Lower = More focused, Higher = More creative. Range: 0-2
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="maxTokens">Max Output Tokens</Label>
            <Input
              id="maxTokens"
              type="number"
              value={(data as any).maxTokens || 500}
              onChange={(e) => onUpdate('maxTokens', parseInt(e.target.value))}
              min="50"
              max="4000"
              step="50"
            />
            <p className="text-xs text-slate-500">
              Maximum length of AI response. ~4 chars per token.
            </p>
          </div>
        </div>
      );

    // ========== KNOWLEDGE GRAPH NODES ==========
    case 'kg_extract':
      return (
        <div className="space-y-4">
          {/* Info Box */}
          <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-3">
            <p className="text-xs text-indigo-800 font-medium mb-1">How it works:</p>
            <p className="text-xs text-indigo-700">
              Extracts entities and relationships from content using AI, then stores them in Neo4j knowledge graph for later querying and analysis.
              Requires: OpenAI API key + Neo4j database configured.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="entityTypes">Entity Types (comma-separated)</Label>
            <Input
              id="entityTypes"
              value={(data as any).entityTypes?.join(', ') || ''}
              onChange={(e) =>
                onUpdate(
                  'entityTypes',
                  e.target.value.split(',').map((t) => t.trim()).filter(Boolean)
                )
              }
              placeholder="person, organization, location, concept"
            />
            <p className="text-xs text-slate-500">
              Types of entities to extract from content
            </p>
          </div>

          <div className="flex items-center space-x-2">
            <input
              id="extractRelationships"
              type="checkbox"
              checked={(data as any).extractRelationships ?? true}
              onChange={(e) => onUpdate('extractRelationships', e.target.checked)}
              className="h-4 w-4 rounded border-slate-300"
            />
            <Label htmlFor="extractRelationships" className="text-sm font-normal cursor-pointer">
              Extract relationships between entities
            </Label>
          </div>

          <div className="space-y-2">
            <Label htmlFor="minConfidence">Minimum Confidence</Label>
            <Input
              id="minConfidence"
              type="number"
              value={(data as any).minConfidence || 0.6}
              onChange={(e) => onUpdate('minConfidence', parseFloat(e.target.value))}
              min="0"
              max="1"
              step="0.1"
            />
            <p className="text-xs text-slate-500">
              Only extract entities with confidence above this threshold (0-1)
            </p>
          </div>

          <Separator />

          <div className="space-y-2">
            <Label htmlFor="model">AI Model</Label>
            <Select
              value={(data as any).model || 'gpt-4o-mini'}
              onValueChange={(value) => onUpdate('model', value)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="gpt-4o-mini">GPT-4 Mini (Recommended)</SelectItem>
                <SelectItem value="gpt-4o">GPT-4 (More Accurate)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      );

    case 'kg_query':
      return (
        <div className="space-y-4">
          {/* Info Box */}
          <div className="bg-cyan-50 border border-cyan-200 rounded-lg p-3">
            <p className="text-xs text-cyan-800 font-medium mb-1">How it works:</p>
            <p className="text-xs text-cyan-700">
              Queries the Neo4j knowledge graph to find related entities and enrich items with graph context.
              Requires: Neo4j database configured with existing knowledge graph data.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="queryType">Query Type</Label>
            <Select
              value={(data as any).queryType || 'entity_lookup'}
              onValueChange={(value) => onUpdate('queryType', value)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="entity_lookup">Entity Lookup</SelectItem>
                <SelectItem value="relationship_search">Relationship Search</SelectItem>
                <SelectItem value="custom_cypher">Custom Cypher Query</SelectItem>
                <SelectItem value="stats">Graph Statistics</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-slate-500">
              How to query the knowledge graph
            </p>
          </div>

          {(data as any).queryType === 'entity_lookup' && (
            <div className="space-y-2">
              <Label htmlFor="entityType">Entity Type to Lookup</Label>
              <Input
                id="entityType"
                value={(data as any).entityType || ''}
                onChange={(e) => onUpdate('entityType', e.target.value)}
                placeholder="person, organization, concept"
              />
              <p className="text-xs text-slate-500">
                Find all entities of this type in the graph
              </p>
            </div>
          )}

          {(data as any).queryType === 'relationship_search' && (
            <>
              <div className="space-y-2">
                <Label htmlFor="entityName">Entity Name</Label>
                <Input
                  id="entityName"
                  value={(data as any).entityName || ''}
                  onChange={(e) => onUpdate('entityName', e.target.value)}
                  placeholder="e.g., OpenAI, Tesla"
                />
                <p className="text-xs text-slate-500">
                  Find entities related to this entity
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="relationshipType">Relationship Type (optional)</Label>
                <Input
                  id="relationshipType"
                  value={(data as any).relationshipType || ''}
                  onChange={(e) => onUpdate('relationshipType', e.target.value)}
                  placeholder="WORKS_FOR, FOUNDED, LOCATED_IN"
                />
                <p className="text-xs text-slate-500">
                  Filter by specific relationship type (leave empty for all)
                </p>
              </div>
            </>
          )}

          {(data as any).queryType === 'custom_cypher' && (
            <div className="space-y-2">
              <Label htmlFor="cypherQuery">Cypher Query</Label>
              <Textarea
                id="cypherQuery"
                value={(data as any).cypherQuery || ''}
                onChange={(e) => onUpdate('cypherQuery', e.target.value)}
                placeholder="MATCH (n:Entity) RETURN n LIMIT 10"
                rows={4}
                className="font-mono text-sm"
              />
              <p className="text-xs text-slate-500">
                Advanced: Write your own Cypher query
              </p>
            </div>
          )}

          <div className="flex items-center space-x-2">
            <input
              id="enrichItems"
              type="checkbox"
              checked={(data as any).enrichItems ?? true}
              onChange={(e) => onUpdate('enrichItems', e.target.checked)}
              className="h-4 w-4 rounded border-slate-300"
            />
            <Label htmlFor="enrichItems" className="text-sm font-normal cursor-pointer">
              Add graph data to items
            </Label>
          </div>
        </div>
      );

    // ========== OUTPUT NODES ==========
    case 'sms_output':
      return (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="template">SMS Template *</Label>
            <Textarea
              id="template"
              value={(data as any).template || ''}
              onChange={(e) => onUpdate('template', e.target.value)}
              placeholder="{{summary}}"
              rows={4}
              className="font-mono text-sm"
            />
            <p className="text-xs text-slate-500">
              Use: {'{{'} title {'}}'}, {'{{'} summary {'}}'}, {'{{'} url {'}}'}
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="maxLength">Max Length</Label>
            <Input
              id="maxLength"
              type="number"
              value={(data as any).maxLength || 1600}
              onChange={(e) => onUpdate('maxLength', parseInt(e.target.value))}
              min="160"
              max="1600"
            />
            <p className="text-xs text-slate-500">Maximum SMS length in characters</p>
          </div>
        </div>
      );

    case 'report_output':
      return (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="template">Report Template *</Label>
            <Textarea
              id="template"
              value={(data as any).template || ''}
              onChange={(e) => onUpdate('template', e.target.value)}
              placeholder="# {{title}}\n\n{{summary}}"
              rows={6}
              className="font-mono text-sm"
            />
            <p className="text-xs text-slate-500">
              Markdown template. Use: {'{{'} title {'}}'}, {'{{'} summary {'}}'}, {'{{'} url {'}}'}
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <input
              id="includeRaw"
              type="checkbox"
              checked={(data as any).includeRaw || false}
              onChange={(e) => onUpdate('includeRaw', e.target.checked)}
              className="h-4 w-4 rounded border-slate-300"
            />
            <Label htmlFor="includeRaw" className="text-sm font-normal cursor-pointer">
              Include raw content
            </Label>
          </div>
        </div>
      );

    // ========== NEW SOURCE NODES ==========
    case 'hackernews_source':
    case 'reddit_source':
    case 'github_source':
    case 'twitter_source':
    case 'youtube_source':
    case 'producthunt_source':
    case 'news_api_source':
    case 'google_news_source':
    case 'crypto_price_source':
    case 'stock_price_source':
    case 'weather_source':
    case 'gmail_source':
    case 'podcast_source':
      return (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="query">Query/Keywords</Label>
            <Input
              id="query"
              value={(data as any).query || ''}
              onChange={(e) => onUpdate('query', e.target.value)}
              placeholder="Search query or topic"
            />
            <p className="text-xs text-slate-500">Search terms or identifier for this source</p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="maxItems">Max Items</Label>
            <Input
              id="maxItems"
              type="number"
              value={(data as any).maxItems || 10}
              onChange={(e) => onUpdate('maxItems', parseInt(e.target.value))}
              min="1"
              max="100"
            />
          </div>
        </div>
      );

    // ========== NEW FILTER NODES ==========
    case 'sentiment_filter':
      return (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="sentiment">Sentiment to Keep</Label>
            <Select
              value={(data as any).sentiment || 'positive'}
              onValueChange={(value) => onUpdate('sentiment', value)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="positive">Positive</SelectItem>
                <SelectItem value="negative">Negative</SelectItem>
                <SelectItem value="neutral">Neutral</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-slate-500">Only keep items with this sentiment</p>
          </div>
        </div>
      );

    case 'length_filter':
      return (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="minLength">Min Length (characters)</Label>
            <Input
              id="minLength"
              type="number"
              value={(data as any).minLength || 0}
              onChange={(e) => onUpdate('minLength', parseInt(e.target.value))}
              min="0"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="maxLength">Max Length (characters)</Label>
            <Input
              id="maxLength"
              type="number"
              value={(data as any).maxLength || 10000}
              onChange={(e) => onUpdate('maxLength', parseInt(e.target.value))}
              min="0"
            />
          </div>
        </div>
      );

    case 'score_filter':
      return (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="minScore">Minimum Score</Label>
            <Input
              id="minScore"
              type="number"
              value={(data as any).minScore || 0}
              onChange={(e) => onUpdate('minScore', parseFloat(e.target.value))}
              min="0"
              step="0.1"
            />
            <p className="text-xs text-slate-500">Only keep items with score above this value</p>
          </div>
        </div>
      );

    case 'regex_filter':
      return (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="pattern">Regex Pattern *</Label>
            <Input
              id="pattern"
              value={(data as any).pattern || ''}
              onChange={(e) => onUpdate('pattern', e.target.value)}
              placeholder="\\b(AI|ML)\\b"
              className="font-mono text-sm"
            />
            <p className="text-xs text-slate-500">Regular expression to match</p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="field">Search In</Label>
            <Select
              value={(data as any).field || 'content'}
              onValueChange={(value) => onUpdate('field', value)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="title">Title</SelectItem>
                <SelectItem value="summary">Summary</SelectItem>
                <SelectItem value="content">Content</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      );

    case 'author_filter':
      return (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="authors">Authors (comma-separated)</Label>
            <Input
              id="authors"
              value={(data as any).authors?.join(', ') || ''}
              onChange={(e) =>
                onUpdate(
                  'authors',
                  e.target.value.split(',').map((a) => a.trim()).filter(Boolean)
                )
              }
              placeholder="John Doe, Jane Smith"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="mode">Filter Mode</Label>
            <Select
              value={(data as any).mode || 'include'}
              onValueChange={(value) => onUpdate('mode', value)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="include">Include matching</SelectItem>
                <SelectItem value="exclude">Exclude matching</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      );

    case 'language_filter':
      return (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="languages">Languages (comma-separated codes)</Label>
            <Input
              id="languages"
              value={(data as any).languages?.join(', ') || ''}
              onChange={(e) =>
                onUpdate(
                  'languages',
                  e.target.value.split(',').map((l) => l.trim()).filter(Boolean)
                )
              }
              placeholder="en, es, fr"
            />
            <p className="text-xs text-slate-500">ISO language codes (e.g., en, es, fr, de)</p>
          </div>
        </div>
      );

    case 'top_n_filter':
    case 'random_sample_filter':
      return (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="limit">Number of Items</Label>
            <Input
              id="limit"
              type="number"
              value={(data as any).limit || 10}
              onChange={(e) => onUpdate('limit', parseInt(e.target.value))}
              min="1"
            />
            <p className="text-xs text-slate-500">
              {nodeType === 'top_n_filter'
                ? 'Select top N items by score/rank'
                : 'Randomly select N items'}
            </p>
          </div>
        </div>
      );

    case 'has_media_filter':
      return (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Filter Type</Label>
            <p className="text-sm text-slate-600">Keep only items with media attachments</p>
            <p className="text-xs text-slate-500">No configuration needed - this filter is ready to use</p>
          </div>
        </div>
      );

    // ========== NEW TRANSFORM NODES ==========
    case 'claude_agent':
      return (
        <div className="space-y-4">
          {/* Info Box */}
          <div className="bg-violet-50 border border-violet-200 rounded-lg p-3">
            <p className="text-xs text-violet-800 font-medium mb-1">How it works:</p>
            <p className="text-xs text-violet-700">
              Runs Claude AI (Anthropic) to process each item with custom prompts. More advanced than OpenAI models for complex reasoning and analysis.
              Requires: ANTHROPIC_API_KEY configured on backend.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="systemPrompt">System Prompt *</Label>
            <Textarea
              id="systemPrompt"
              value={(data as any).systemPrompt || ''}
              onChange={(e) => onUpdate('systemPrompt', e.target.value)}
              placeholder="You are an agent that takes data in and synthesizes multiple sources to see their impact on eachother."
              rows={4}
            />
            <p className="text-xs text-slate-500">
              Defines Claude's role, expertise, and behavior. Be specific and detailed.
            </p>
            {!(data as any).systemPrompt && (
              <p className="text-xs text-amber-600">⚠ System prompt is required</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="userPromptTemplate">User Prompt Template *</Label>
            <Textarea
              id="userPromptTemplate"
              value={(data as any).userPromptTemplate || ''}
              onChange={(e) => onUpdate('userPromptTemplate', e.target.value)}
              placeholder="Process this item: {{title}} - {{summary}}"
              rows={5}
              className="font-mono text-sm"
            />
            <div className="bg-slate-50 border border-slate-200 rounded p-2">
              <p className="text-xs font-medium text-slate-700 mb-1">Available variables:</p>
              <div className="flex flex-wrap gap-2">
                <code className="text-xs bg-white px-1.5 py-0.5 rounded border">{'{{title}}'}</code>
                <code className="text-xs bg-white px-1.5 py-0.5 rounded border">{'{{summary}}'}</code>
                <code className="text-xs bg-white px-1.5 py-0.5 rounded border">{'{{url}}'}</code>
                <code className="text-xs bg-white px-1.5 py-0.5 rounded border">{'{{author}}'}</code>
                <code className="text-xs bg-white px-1.5 py-0.5 rounded border">{'{{id}}'}</code>
                <code className="text-xs bg-white px-1.5 py-0.5 rounded border">{'{{raw.field}}'}</code>
              </div>
            </div>
            {!(data as any).userPromptTemplate && (
              <p className="text-xs text-amber-600">⚠ User prompt template is required</p>
            )}
          </div>

          <Separator />

          <div className="space-y-2">
            <Label htmlFor="outputField">Output Field Name</Label>
            <Input
              id="outputField"
              value={(data as any).outputField || 'agentOutput'}
              onChange={(e) => onUpdate('outputField', e.target.value)}
              placeholder="agentOutput"
            />
            <p className="text-xs text-slate-500">
              Field name where Claude's response will be stored on each item
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="model">Claude Model</Label>
            <Select
              value={(data as any).model || 'claude-3-5-sonnet-20241022'}
              onValueChange={(value) => onUpdate('model', value)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="claude-3-5-sonnet-20241022">Claude 3.5 Sonnet (Best)</SelectItem>
                <SelectItem value="claude-3-haiku-20240307">Claude 3 Haiku (Fast & Cheap)</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-slate-500">
              Sonnet: Superior reasoning & analysis. Haiku: Fast for simple tasks.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="maxTokens">Max Output Tokens</Label>
            <Input
              id="maxTokens"
              type="number"
              value={(data as any).maxTokens || 1024}
              onChange={(e) => onUpdate('maxTokens', parseInt(e.target.value))}
              min="100"
              max="8192"
              step="128"
            />
            <p className="text-xs text-slate-500">
              Maximum response length. ~4 chars per token. Range: 100-8192
            </p>
          </div>
        </div>
      );

    case 'sentiment_analysis':
    case 'entity_extraction':
    case 'category_classification':
    case 'translation':
    case 'text_cleanup':
    case 'url_extraction':
    case 'scoring_rank':
    case 'field_mapping':
    case 'merge_items':
    case 'enrich_data':
      return (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Transform Type</Label>
            <p className="text-sm text-slate-600">{(data as any).label || nodeType}</p>
            <p className="text-xs text-slate-500">This transform will be applied to all items</p>
          </div>
          {nodeType === 'translation' ? (
            <div className="space-y-2">
              <Label htmlFor="targetLanguage">Target Language</Label>
              <Select
                value={(data as any).targetLanguage || 'en'}
                onValueChange={(value) => onUpdate('targetLanguage', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="en">English</SelectItem>
                  <SelectItem value="es">Spanish</SelectItem>
                  <SelectItem value="fr">French</SelectItem>
                  <SelectItem value="de">German</SelectItem>
                  <SelectItem value="zh">Chinese</SelectItem>
                </SelectContent>
              </Select>
            </div>
          ) : null}
        </div>
      );

    // ========== NEW OUTPUT NODES ==========
    case 'email_output':
    case 'webhook_output':
    case 'slack_output':
    case 'discord_output':
    case 'twitter_output':
    case 'notification_output':
    case 'database_output':
    case 'sheets_output':
    case 'file_export_output':
      return (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Output Type</Label>
            <p className="text-sm text-slate-600">{(data as any).label || nodeType}</p>
            <p className="text-xs text-slate-500">Configure output destination</p>
          </div>
          {(nodeType === 'webhook_output' || nodeType === 'email_output') ? (
            <div className="space-y-2">
              <Label htmlFor="destination">Destination *</Label>
              <Input
                id="destination"
                value={(data as any).destination || (data as any).url || (data as any).email || ''}
                onChange={(e) => onUpdate(nodeType === 'email_output' ? 'email' : 'url', e.target.value)}
                placeholder={nodeType === 'email_output' ? 'email@example.com' : 'https://...'}
              />
            </div>
          ) : null}
          <div className="space-y-2">
            <Label htmlFor="template">Message Template</Label>
            <Textarea
              id="template"
              value={(data as any).template || ''}
              onChange={(e) => onUpdate('template', e.target.value)}
              placeholder="{{title}}\n\n{{summary}}"
              rows={4}
            />
            <p className="text-xs text-slate-500">
              Use {'{{'}field{'}}'}  to reference item fields
            </p>
          </div>
        </div>
      );

    default:
      return (
        <div className="text-center py-8">
          <p className="text-sm text-slate-500">Unknown node type: {nodeType}</p>
        </div>
      );
  }
}

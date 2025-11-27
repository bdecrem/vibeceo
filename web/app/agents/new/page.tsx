/**
 * Workflow Builder Page
 * Professional n8n-style visual workflow editor
 */

'use client';

import { useMemo, useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  BackgroundVariant,
  type NodeTypes,
} from 'reactflow';
import 'reactflow/dist/style.css';

import { useWorkflowStore } from '@/lib/stores/workflow-store';
import { WorkflowNode } from '@/components/workflow/WorkflowNode';
import { NodePalette } from '@/components/workflow/NodePalette';
import { NodeConfigPanel } from '@/components/workflow/NodeConfigPanel';
// AI Generator components disabled - focusing on manual workflow builder
// import { AIWorkflowGenerator } from '@/components/workflow/AIWorkflowGenerator';
// import { InteractiveWorkflowBuilder } from '@/components/workflow/InteractiveWorkflowBuilder';
// import { NodeCodeGenerator } from '@/components/workflow/NodeCodeGenerator';
import { workflowToAgentDefinition } from '@/lib/workflow-converter';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Workflow, Settings as SettingsIcon, Code2, Eye, Home } from 'lucide-react';
// AI button icons disabled: Sparkles, MessageCircle
import { CodeEditor } from '@/components/workflow/CodeEditor';
import { generateCode, getLanguage, type CodeFormat } from '@/lib/code-generator';

export default function WorkflowBuilderPage() {
  const searchParams = useSearchParams();
  const editAgentId = searchParams?.get('edit');
  const magicToken = searchParams?.get('token');

  const {
    nodes,
    edges,
    onNodesChange,
    onEdgesChange,
    onConnect,
    name,
    setName,
    commandKeyword,
    setCommandKeyword,
    scheduleEnabled,
    setScheduleEnabled,
    scheduleCron,
    setScheduleCron,
    validate,
    exportWorkflow,
    loadFromAgentDefinition,
    setNodes,
    setEdges,
  } = useWorkflowStore();

  const [settingsOpen, setSettingsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [viewMode, setViewMode] = useState<'visual' | 'code'>('visual');
  const [codeFormat, setCodeFormat] = useState<CodeFormat>('typescript');
  // AI Generator state disabled - focusing on manual workflow builder
  // const [aiGeneratorOpen, setAiGeneratorOpen] = useState(false);
  // const [interactiveBuilderOpen, setInteractiveBuilderOpen] = useState(false);
  // const [nodeCodeGeneratorOpen, setNodeCodeGeneratorOpen] = useState(false);

  // Handler for AI-generated workflows (disabled)
  // const handleWorkflowGenerated = (workflow: { nodes: any[]; edges: any[] }) => {
  //   setNodes(workflow.nodes);
  //   setEdges(workflow.edges);
  // };

  // Load existing agent for editing
  useEffect(() => {
    if (editAgentId) {
      loadExistingAgent(editAgentId);
    }
  }, [editAgentId]);

  const loadExistingAgent = async (agentId: string) => {
    setLoading(true);
    try {
      const response = await fetch(`/api/agents/${agentId}`);
      const data = await response.json();

      if (data.success && data.agent) {
        const latestVersion = data.agent.agent_versions?.[0];
        if (latestVersion?.definition_jsonb) {
          loadFromAgentDefinition(latestVersion.definition_jsonb);
          alert(`Loaded agent: ${data.agent.name} (v${latestVersion.version})`);
        }
      } else {
        alert('Failed to load agent');
      }
    } catch (error) {
      console.error('Failed to load agent:', error);
      alert('Failed to load agent');
    } finally {
      setLoading(false);
    }
  };

  // Define custom node types
  const nodeTypes: NodeTypes = useMemo(
    () => ({
      // Source nodes
      rss_source: WorkflowNode,
      http_json_source: WorkflowNode,
      web_scraper_source: WorkflowNode,
      user_source: WorkflowNode,
      arxiv_source: WorkflowNode,
      hackernews_source: WorkflowNode,
      reddit_source: WorkflowNode,
      github_source: WorkflowNode,
      twitter_source: WorkflowNode,
      youtube_source: WorkflowNode,
      producthunt_source: WorkflowNode,
      news_api_source: WorkflowNode,
      google_news_source: WorkflowNode,
      crypto_price_source: WorkflowNode,
      stock_price_source: WorkflowNode,
      weather_source: WorkflowNode,
      gmail_source: WorkflowNode,
      podcast_source: WorkflowNode,
      // Filter nodes
      dedupe_filter: WorkflowNode,
      date_filter: WorkflowNode,
      keyword_filter: WorkflowNode,
      limit_filter: WorkflowNode,
      sentiment_filter: WorkflowNode,
      length_filter: WorkflowNode,
      score_filter: WorkflowNode,
      regex_filter: WorkflowNode,
      author_filter: WorkflowNode,
      language_filter: WorkflowNode,
      top_n_filter: WorkflowNode,
      random_sample_filter: WorkflowNode,
      has_media_filter: WorkflowNode,
      // Transform nodes
      llm_summarize: WorkflowNode,
      llm_extract: WorkflowNode,
      llm_qa: WorkflowNode,
      llm_custom: WorkflowNode,
      claude_agent: WorkflowNode,
      sentiment_analysis: WorkflowNode,
      entity_extraction: WorkflowNode,
      category_classification: WorkflowNode,
      translation: WorkflowNode,
      text_cleanup: WorkflowNode,
      url_extraction: WorkflowNode,
      scoring_rank: WorkflowNode,
      field_mapping: WorkflowNode,
      merge_items: WorkflowNode,
      enrich_data: WorkflowNode,
      // Output nodes
      sms_output: WorkflowNode,
      report_output: WorkflowNode,
      email_output: WorkflowNode,
      webhook_output: WorkflowNode,
      slack_output: WorkflowNode,
      discord_output: WorkflowNode,
      twitter_output: WorkflowNode,
      notification_output: WorkflowNode,
      database_output: WorkflowNode,
      sheets_output: WorkflowNode,
      file_export_output: WorkflowNode,
    }),
    []
  );

  const handleSave = async () => {
    const validation = validate();

    if (!validation.valid) {
      alert('Validation failed:\n' + validation.errors.join('\n'));
      return;
    }

    // If magic token exists, save to marketplace; otherwise save as draft
    if (magicToken) {
      return handleMarketplaceSave();
    }

    try {
      const workflow = exportWorkflow();
      const agentDefinition = workflowToAgentDefinition(workflow);

      const response = await fetch('/api/agents/draft', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agentDefinition,
          userId: null,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        if (error.details) {
          const detailsStr = error.details
            .map((d: any) => `  • ${d.path.join('.')}: ${d.message}`)
            .join('\n');
          throw new Error(`${error.error}\n\nValidation errors:\n${detailsStr}`);
        }
        throw new Error(error.error || 'Failed to save agent');
      }

      const result = await response.json();
      alert(`Agent saved successfully!\nSlug: ${result.agent.slug}\nID: ${result.agent.id}`);
    } catch (error: any) {
      alert('Failed to save agent:\n' + error.message);
    }
  };

  const handleMarketplaceSave = async () => {
    if (!magicToken) {
      alert('Missing authentication token');
      return;
    }

    try {
      // Verify token and get subscriber info
      const verifyRes = await fetch(`/api/agents/verify-magic-link?token=${magicToken}`);
      if (!verifyRes.ok) {
        throw new Error('Invalid or expired token. Please request a new link via SMS.');
      }

      const verifyData = await verifyRes.json();
      if (!verifyData.success) {
        throw new Error('Failed to verify authentication');
      }

      const subscriber = verifyData.subscriber;

      // Prompt for agent details
      const category = prompt('Enter agent category (e.g., news, research, productivity):');
      if (!category) return;

      const description = prompt('Enter a brief description of your agent:');
      if (!description) return;

      const workflow = exportWorkflow();
      const agentDefinition = workflowToAgentDefinition(workflow);

      // Create agent in marketplace
      const response = await fetch('/api/agents/marketplace', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name || 'Untitled Agent',
          description,
          category,
          definition_jsonb: agentDefinition,
          phone_number: subscriber.phone_number
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create agent');
      }

      const result = await response.json();
      alert(
        `Agent created successfully!\n\nName: ${result.agent.name}\nSlug: ${result.agent.slug}\nStatus: ${result.agent.status}\n\nYour agent will be reviewed before appearing in the marketplace.`
      );

      // Redirect back to marketplace
      window.location.href = `/agents/marketplace?token=${magicToken}`;
    } catch (error: any) {
      alert('Failed to save agent:\n' + error.message);
    }
  };

  const handlePreview = async () => {
    const validation = validate();

    if (!validation.valid) {
      alert('Validation failed:\n' + validation.errors.join('\n'));
      return;
    }

    try {
      const workflow = exportWorkflow();
      const agentDefinition = workflowToAgentDefinition(workflow);

      const response = await fetch('/api/agents/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agentDefinition,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        if (error.details) {
          const detailsStr = error.details
            .map((d: any) => `  • ${d.path.join('.')}: ${d.message}`)
            .join('\n');
          throw new Error(`${error.error}\n\nValidation errors:\n${detailsStr}`);
        }
        throw new Error(error.error || 'Failed to preview agent');
      }

      const result = await response.json();

      // Format preview result with metrics
      let message = '🎯 Preview Result\n\n';
      message += '═'.repeat(50) + '\n\n';

      if (result.preview.smsOutput) {
        message += '📱 SMS Output:\n';
        message += '─'.repeat(50) + '\n';
        message += result.preview.smsOutput + '\n';
        message += '─'.repeat(50) + '\n\n';
      }

      message += '📊 Metrics:\n';
      message += `• Items Processed: ${result.preview.itemsProcessed || 0}\n`;

      if (result.preview.metrics) {
        const m = result.preview.metrics;
        message += `• Sources Fetched: ${m.sourcesFetched || 0}\n`;
        message += `• Execution Time: ${m.durationMs || 0}ms\n`;
        message += `• LLM Calls: ${m.llmCallsMade || 0}\n`;
        message += `• Tokens Used: ${m.tokensUsed || 0}\n`;
        message += `• Estimated Cost: $${(m.estimatedCost || 0).toFixed(4)}\n`;
      }

      if (result.preview.errors && result.preview.errors.length > 0) {
        message += '\n⚠️  Errors:\n';
        result.preview.errors.forEach((err: any) => {
          message += `• [${err.step}] ${err.message}\n`;
        });
      }

      alert(message);
    } catch (error: any) {
      alert('❌ Failed to preview agent:\n\n' + error.message);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-slate-100">
      {/* Top Toolbar */}
      <div className="h-14 bg-white border-b border-slate-200 flex items-center justify-between px-6 shadow-sm">
        <div className="flex items-center gap-4">
          <Link href="/agents">
            <Button variant="ghost" size="sm" className="h-9">
              <Home className="w-4 h-4 mr-2" />
              Home
            </Button>
          </Link>
          <div className="h-6 w-px bg-slate-300" />
          <div className="flex items-center gap-2">
            <Workflow className="w-5 h-5 text-blue-600" />
            <h1 className="text-sm font-semibold text-slate-900">Agent Builder</h1>
          </div>
          <Input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-64 h-9 bg-white"
            placeholder="Agent name"
          />
        </div>

        <div className="flex items-center gap-2">
          {/* View Mode Toggle */}
          <div className="flex items-center gap-1 border border-slate-200 rounded-lg p-1 bg-white">
            <Button
              variant={viewMode === 'visual' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('visual')}
              className="h-7 px-3"
            >
              <Eye className="w-3.5 h-3.5 mr-1.5" />
              Visual
            </Button>
            <Button
              variant={viewMode === 'code' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('code')}
              className="h-7 px-3"
            >
              <Code2 className="w-3.5 h-3.5 mr-1.5" />
              Code
            </Button>
          </div>

          {/* Code Format Selector (only show in code mode) */}
          {viewMode === 'code' && (
            <div className="flex items-center gap-1 border border-slate-200 rounded-lg p-1 bg-white">
              <Button
                variant={codeFormat === 'typescript' ? 'secondary' : 'ghost'}
                size="sm"
                onClick={() => setCodeFormat('typescript')}
                className="h-7 px-3 text-xs"
              >
                TypeScript
              </Button>
              <Button
                variant={codeFormat === 'json' ? 'secondary' : 'ghost'}
                size="sm"
                onClick={() => setCodeFormat('json')}
                className="h-7 px-3 text-xs"
              >
                JSON
              </Button>
            </div>
          )}

          <div className="h-6 w-px bg-slate-300 mx-1" />

          <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">
                <SettingsIcon className="w-4 h-4 mr-1.5" />
                Settings
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>Agent Settings</DialogTitle>
                <DialogDescription>
                  Configure how your agent is triggered
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-6 py-4">
                {/* Command Keyword */}
                <div className="space-y-2">
                  <Label htmlFor="commandKeyword">Command Keyword</Label>
                  <Input
                    id="commandKeyword"
                    value={commandKeyword}
                    onChange={(e) => setCommandKeyword(e.target.value)}
                    placeholder="e.g., tech, news, jobs"
                  />
                  <p className="text-xs text-slate-500">
                    Users can trigger this agent via SMS by sending this keyword
                  </p>
                </div>

                {/* Schedule */}
                <div className="space-y-3">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="scheduleEnabled"
                      checked={scheduleEnabled}
                      onCheckedChange={(checked) => setScheduleEnabled(checked as boolean)}
                    />
                    <Label htmlFor="scheduleEnabled" className="text-sm font-medium cursor-pointer">
                      Enable Schedule
                    </Label>
                  </div>

                  {scheduleEnabled && (
                    <div className="space-y-2 ml-6">
                      <Label htmlFor="scheduleCron">Cron Expression</Label>
                      <Input
                        id="scheduleCron"
                        value={scheduleCron}
                        onChange={(e) => setScheduleCron(e.target.value)}
                        placeholder="0 9 * * *"
                        className="font-mono"
                      />
                      <p className="text-xs text-slate-500">
                        Current: {scheduleCron} (9 AM daily by default)
                      </p>
                      <p className="text-xs text-slate-400">
                        Examples: "0 9 * * *" (9 AM daily), "0 */6 * * *" (every 6 hours)
                      </p>
                    </div>
                  )}
                </div>

                {/* Requirement Note */}
                <div className="rounded-lg bg-amber-50 border border-amber-200 p-3">
                  <p className="text-xs text-amber-800">
                    <strong>Note:</strong> You must configure either a command keyword or a schedule (or both)
                  </p>
                </div>
              </div>

              <div className="flex justify-end">
                <Button onClick={() => setSettingsOpen(false)}>Done</Button>
              </div>
            </DialogContent>
          </Dialog>

          <Button
            variant="outline"
            onClick={handlePreview}
            size="sm"
          >
            Preview
          </Button>
          <Button
            onClick={handleSave}
            size="sm"
          >
            Save Draft
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {viewMode === 'visual' ? (
          <>
            {/* Left Sidebar - Node Palette */}
            <NodePalette />

            {/* Center - React Flow Canvas */}
            <div className="flex-1 relative">
              <ReactFlow
                nodes={nodes}
                edges={edges}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                onConnect={onConnect}
                nodeTypes={nodeTypes}
                fitView
                className="bg-slate-50"
              >
                <Background
                  variant={BackgroundVariant.Dots}
                  gap={16}
                  size={1}
                  color="#cbd5e1"
                />
                <Controls className="bg-white border border-slate-200 shadow-sm" />
                <MiniMap
                  className="bg-white border border-slate-200 shadow-sm"
                  nodeColor={(node) => {
                    const category = node.data?.category;
                    switch (category) {
                      case 'source':
                        return '#3b82f6';
                      case 'filter':
                        return '#a855f7';
                      case 'transform':
                        return '#10b981';
                      case 'output':
                        return '#f97316';
                      default:
                        return '#94a3b8';
                    }
                  }}
                />
              </ReactFlow>

              {/* Empty State */}
              {nodes.length === 0 && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="text-center text-slate-400">
                    <Workflow className="w-16 h-16 mx-auto mb-4 text-slate-300" />
                    <h2 className="text-lg font-semibold mb-1 text-slate-600">Start Building Your Agent</h2>
                    <p className="text-sm text-slate-500">Click nodes from the palette to add them</p>
                    <p className="text-sm text-slate-500">Drag between handles to connect</p>
                  </div>
                </div>
              )}
            </div>

            {/* Right Sidebar - Node Configuration */}
            <NodeConfigPanel />
          </>
        ) : (
          /* Code View */
          <div className="flex-1 relative bg-slate-900">
            <CodeEditor
              value={generateCode(exportWorkflow(), codeFormat)}
              language={getLanguage(codeFormat)}
              readOnly={true}
              height="100%"
              theme="vs-dark"
            />
          </div>
        )}
      </div>

      {/* AI Workflow Generation Dialogs - DISABLED */}
      {/* <AIWorkflowGenerator
        isOpen={aiGeneratorOpen}
        onClose={() => setAiGeneratorOpen(false)}
        onWorkflowGenerated={handleWorkflowGenerated}
      />
      <InteractiveWorkflowBuilder
        isOpen={interactiveBuilderOpen}
        onClose={() => setInteractiveBuilderOpen(false)}
        onWorkflowGenerated={handleWorkflowGenerated}
      />
      <NodeCodeGenerator
        isOpen={nodeCodeGeneratorOpen}
        onClose={() => setNodeCodeGeneratorOpen(false)}
      /> */}
    </div>
  );
}

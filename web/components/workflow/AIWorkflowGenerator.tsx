/**
 * AI Workflow Generator
 * Modal component for generating workflows from natural language
 */

'use client';

import { useState } from 'react';
import { Sparkles, Loader2, Check, X, Wand2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card } from '@/components/ui/card';

interface AIWorkflowGeneratorProps {
  isOpen: boolean;
  onClose: () => void;
  onWorkflowGenerated: (workflow: any) => void;
}

interface GeneratedWorkflow {
  workflow: {
    nodes: any[];
    edges: any[];
  };
  metadata: {
    title: string;
    description: string;
    nodesUsed: string[];
    reasoning: string;
  };
}

export function AIWorkflowGenerator({ isOpen, onClose, onWorkflowGenerated }: AIWorkflowGeneratorProps) {
  const [description, setDescription] = useState('');
  const [dataSources, setDataSources] = useState('');
  const [goals, setGoals] = useState('');
  const [outputPreferences, setOutputPreferences] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generatedWorkflow, setGeneratedWorkflow] = useState<GeneratedWorkflow | null>(null);
  const [showPreview, setShowPreview] = useState(false);

  const handleGenerate = async () => {
    if (!description.trim()) {
      setError('Please provide a description of what you want to build');
      return;
    }

    setIsGenerating(true);
    setError(null);
    setGeneratedWorkflow(null);

    try {
      const response = await fetch('/api/agents/generate-workflow', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          description: description.trim(),
          dataSources: dataSources.trim() ? dataSources.split(',').map(s => s.trim()) : [],
          goals: goals.trim() ? goals.split(',').map(g => g.trim()) : [],
          outputPreferences: outputPreferences.trim() ? outputPreferences.split(',').map(o => o.trim()) : [],
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to generate workflow');
      }

      const data = await response.json();
      setGeneratedWorkflow(data);
      setShowPreview(true);

    } catch (err: any) {
      console.error('Generation error:', err);
      setError(err.message || 'An error occurred while generating the workflow');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleApply = () => {
    if (generatedWorkflow) {
      onWorkflowGenerated(generatedWorkflow.workflow);
      handleReset();
      onClose();
    }
  };

  const handleReset = () => {
    setDescription('');
    setDataSources('');
    setGoals('');
    setOutputPreferences('');
    setError(null);
    setGeneratedWorkflow(null);
    setShowPreview(false);
  };

  const examplePrompts = [
    'Monitor Hacker News for AI news and send daily digest via email',
    'Track trending GitHub repos in TypeScript and post to Slack',
    'Fetch latest crypto prices for BTC and ETH, analyze sentiment, send SMS alerts',
    'Aggregate tech news from multiple RSS feeds, summarize with AI, generate podcast',
  ];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-2xl">
            <Wand2 className="w-6 h-6 text-purple-500" />
            AI Workflow Generator
          </DialogTitle>
          <DialogDescription>
            Describe what you want to build in plain English, and AI will create the complete workflow for you.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 pr-4">
          {!showPreview ? (
            <div className="space-y-6 py-4">
              {/* Main Description */}
              <div className="space-y-2">
                <Label htmlFor="description" className="text-base font-semibold">
                  What do you want to build? *
                </Label>
                <Textarea
                  id="description"
                  placeholder="Example: Monitor Hacker News for AI-related posts, filter by relevance, and send me a daily summary via SMS..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={5}
                  className="resize-none"
                  disabled={isGenerating}
                />
              </div>

              {/* Example Prompts */}
              <div className="space-y-2">
                <Label className="text-sm text-muted-foreground">Example ideas:</Label>
                <div className="flex flex-wrap gap-2">
                  {examplePrompts.map((prompt, idx) => (
                    <Badge
                      key={idx}
                      variant="outline"
                      className="cursor-pointer hover:bg-purple-50 hover:border-purple-300 transition-colors text-xs py-1.5"
                      onClick={() => setDescription(prompt)}
                    >
                      {prompt}
                    </Badge>
                  ))}
                </div>
              </div>

              {/* Optional Hints */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="dataSources" className="text-sm">
                    Data Sources (optional)
                  </Label>
                  <Input
                    id="dataSources"
                    placeholder="RSS, Twitter, Reddit"
                    value={dataSources}
                    onChange={(e) => setDataSources(e.target.value)}
                    disabled={isGenerating}
                  />
                  <p className="text-xs text-muted-foreground">Comma-separated</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="goals" className="text-sm">
                    Goals (optional)
                  </Label>
                  <Input
                    id="goals"
                    placeholder="Filter noise, AI summary"
                    value={goals}
                    onChange={(e) => setGoals(e.target.value)}
                    disabled={isGenerating}
                  />
                  <p className="text-xs text-muted-foreground">Comma-separated</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="outputPreferences" className="text-sm">
                    Output (optional)
                  </Label>
                  <Input
                    id="outputPreferences"
                    placeholder="SMS, Email, Slack"
                    value={outputPreferences}
                    onChange={(e) => setOutputPreferences(e.target.value)}
                    disabled={isGenerating}
                  />
                  <p className="text-xs text-muted-foreground">Comma-separated</p>
                </div>
              </div>

              {/* Error Display */}
              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
                  <X className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-red-800">{error}</p>
                </div>
              )}
            </div>
          ) : (
            // Preview Generated Workflow
            <div className="space-y-6 py-4">
              {generatedWorkflow && (
                <>
                  <Card className="p-6 bg-gradient-to-br from-purple-50 to-blue-50 border-purple-200">
                    <h3 className="text-xl font-bold mb-2 flex items-center gap-2">
                      <Check className="w-5 h-5 text-green-600" />
                      {generatedWorkflow.metadata.title}
                    </h3>
                    <p className="text-sm text-gray-700 mb-4">
                      {generatedWorkflow.metadata.description}
                    </p>
                    <div className="space-y-3">
                      <div>
                        <Label className="text-xs font-semibold text-gray-600">Nodes Used:</Label>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {generatedWorkflow.metadata.nodesUsed.map((node, idx) => (
                            <Badge key={idx} variant="secondary" className="text-xs">
                              {node}
                            </Badge>
                          ))}
                        </div>
                      </div>
                      <div>
                        <Label className="text-xs font-semibold text-gray-600">Reasoning:</Label>
                        <p className="text-sm text-gray-600 mt-1">
                          {generatedWorkflow.metadata.reasoning}
                        </p>
                      </div>
                    </div>
                  </Card>

                  <Card className="p-4 bg-gray-50">
                    <Label className="text-sm font-semibold mb-2 block">Workflow Structure:</Label>
                    <div className="space-y-2 text-xs font-mono">
                      <div className="text-gray-600">
                        <span className="font-bold">{generatedWorkflow.workflow.nodes.length}</span> nodes,{' '}
                        <span className="font-bold">{generatedWorkflow.workflow.edges.length}</span> connections
                      </div>
                      <ScrollArea className="h-32 bg-white rounded p-2 border">
                        <pre className="text-xs">
                          {JSON.stringify(generatedWorkflow.workflow, null, 2)}
                        </pre>
                      </ScrollArea>
                    </div>
                  </Card>
                </>
              )}
            </div>
          )}
        </ScrollArea>

        {/* Actions */}
        <div className="flex justify-between items-center pt-4 border-t">
          <div className="flex gap-2">
            {showPreview && (
              <Button
                variant="outline"
                onClick={() => setShowPreview(false)}
                disabled={isGenerating}
              >
                Back to Edit
              </Button>
            )}
            <Button
              variant="outline"
              onClick={handleReset}
              disabled={isGenerating}
            >
              Reset
            </Button>
          </div>

          <div className="flex gap-2">
            <Button variant="ghost" onClick={onClose} disabled={isGenerating}>
              Cancel
            </Button>

            {!showPreview ? (
              <Button
                onClick={handleGenerate}
                disabled={isGenerating || !description.trim()}
                className="bg-purple-600 hover:bg-purple-700"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 mr-2" />
                    Generate Workflow
                  </>
                )}
              </Button>
            ) : (
              <Button
                onClick={handleApply}
                className="bg-green-600 hover:bg-green-700"
              >
                <Check className="w-4 h-4 mr-2" />
                Apply Workflow
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

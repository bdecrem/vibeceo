/**
 * Node Code Generator
 * UI for generating custom pipeline nodes with code preview and validation
 */

'use client';

import { useState } from 'react';
import { Code2, Loader2, Check, AlertTriangle, Copy, Download, FileCode, Sparkles } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';

interface NodeCodeGeneratorProps {
  isOpen: boolean;
  onClose: () => void;
  onCodeGenerated?: (code: string, nodeName: string) => void;
}

interface GeneratedNode {
  nodeName: string;
  nodeKind: string;
  code: string;
  testCode: string;
  documentation: string;
  safetyNotes: string[];
  dependencies: string[];
  configSchema: Record<string, any>;
}

type ViewMode = 'input' | 'preview' | 'code' | 'tests' | 'docs';

export function NodeCodeGenerator({ isOpen, onClose, onCodeGenerated }: NodeCodeGeneratorProps) {
  const [description, setDescription] = useState('');
  const [inputs, setInputs] = useState('');
  const [outputs, setOutputs] = useState('');
  const [functionality, setFunctionality] = useState('');
  const [externalAPI, setExternalAPI] = useState('');
  const [requiresAuth, setRequiresAuth] = useState(false);

  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);
  const [generatedNode, setGeneratedNode] = useState<GeneratedNode | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('input');
  const [copied, setCopied] = useState<string | null>(null);

  const handleGenerate = async () => {
    if (!description.trim()) {
      setError('Please provide a description of the node');
      return;
    }

    setIsGenerating(true);
    setError(null);
    setWarning(null);
    setGeneratedNode(null);

    try {
      const response = await fetch('/api/agents/generate-node', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          description: description.trim(),
          inputs: inputs.trim() ? inputs.split(',').map(i => i.trim()) : [],
          outputs: outputs.trim() ? outputs.split(',').map(o => o.trim()) : [],
          functionality: functionality.trim() || undefined,
          externalAPI: externalAPI.trim() ? {
            url: externalAPI.trim(),
            requiresAuth
          } : undefined
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate node');
      }

      if (data.warning) {
        setWarning(data.warning);
      }

      setGeneratedNode(data.node);
      setViewMode('preview');

    } catch (err: any) {
      console.error('Generation error:', err);
      setError(err.message || 'An error occurred while generating the node');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopy = async (text: string, label: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(label);
    setTimeout(() => setCopied(null), 2000);
  };

  const handleDownload = (filename: string, content: string) => {
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleReset = () => {
    setDescription('');
    setInputs('');
    setOutputs('');
    setFunctionality('');
    setExternalAPI('');
    setRequiresAuth(false);
    setError(null);
    setWarning(null);
    setGeneratedNode(null);
    setViewMode('input');
    setCopied(null);
  };

  const handleApply = () => {
    if (generatedNode && onCodeGenerated) {
      onCodeGenerated(generatedNode.code, generatedNode.nodeName);
    }
    handleReset();
    onClose();
  };

  const examples = [
    {
      label: 'Profanity Filter',
      description: 'Remove items containing profanity',
      inputs: 'title, summary',
      outputs: 'filtered items'
    },
    {
      label: 'URL Shortener',
      description: 'Shorten URLs in items using an API',
      inputs: 'url',
      outputs: 'short_url',
      externalAPI: 'https://api.example.com/shorten'
    },
    {
      label: 'Reading Time Calculator',
      description: 'Calculate estimated reading time based on word count',
      inputs: 'summary, content',
      outputs: 'reading_time_minutes'
    }
  ];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-2xl">
            <Code2 className="w-6 h-6 text-green-500" />
            Custom Node Generator
          </DialogTitle>
          <DialogDescription>
            Generate TypeScript code for custom pipeline nodes with AI assistance
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 flex flex-col min-h-0">
          {/* View Mode Tabs */}
          {generatedNode && (
            <div className="flex gap-2 mb-4 border-b pb-2">
              {[
                { mode: 'preview' as ViewMode, label: 'Overview', icon: Sparkles },
                { mode: 'code' as ViewMode, label: 'Code', icon: FileCode },
                { mode: 'tests' as ViewMode, label: 'Tests', icon: Check },
                { mode: 'docs' as ViewMode, label: 'Docs', icon: FileCode }
              ].map(({ mode, label, icon: Icon }) => (
                <Button
                  key={mode}
                  variant={viewMode === mode ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode(mode)}
                  className="flex items-center gap-2"
                >
                  <Icon className="w-4 h-4" />
                  {label}
                </Button>
              ))}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setViewMode('input')}
                className="ml-auto"
              >
                Back to Input
              </Button>
            </div>
          )}

          <ScrollArea className="flex-1 pr-4">
            {viewMode === 'input' ? (
              // Input Form
              <div className="space-y-6 py-4">
                <div className="space-y-2">
                  <Label htmlFor="description" className="text-base font-semibold">
                    Node Description *
                  </Label>
                  <Textarea
                    id="description"
                    placeholder="Example: A node that filters out items containing profanity or offensive language..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={4}
                    className="resize-none"
                    disabled={isGenerating}
                  />
                </div>

                {/* Examples */}
                <div className="space-y-2">
                  <Label className="text-sm text-muted-foreground">Quick start examples:</Label>
                  <div className="grid grid-cols-3 gap-2">
                    {examples.map((example, idx) => (
                      <Card
                        key={idx}
                        className="p-3 cursor-pointer hover:border-green-400 hover:bg-green-50 transition-colors"
                        onClick={() => {
                          setDescription(example.description);
                          setInputs(example.inputs);
                          setOutputs(example.outputs);
                          setExternalAPI(example.externalAPI || '');
                        }}
                      >
                        <p className="text-sm font-semibold mb-1">{example.label}</p>
                        <p className="text-xs text-gray-600">{example.description}</p>
                      </Card>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="inputs">Expected Inputs</Label>
                    <Input
                      id="inputs"
                      placeholder="title, summary, url"
                      value={inputs}
                      onChange={(e) => setInputs(e.target.value)}
                      disabled={isGenerating}
                    />
                    <p className="text-xs text-muted-foreground">Comma-separated field names</p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="outputs">Desired Outputs</Label>
                    <Input
                      id="outputs"
                      placeholder="filtered_text, score"
                      value={outputs}
                      onChange={(e) => setOutputs(e.target.value)}
                      disabled={isGenerating}
                    />
                    <p className="text-xs text-muted-foreground">Comma-separated field names</p>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="functionality">Detailed Functionality (optional)</Label>
                  <Textarea
                    id="functionality"
                    placeholder="Provide additional details about how the node should work..."
                    value={functionality}
                    onChange={(e) => setFunctionality(e.target.value)}
                    rows={3}
                    className="resize-none"
                    disabled={isGenerating}
                  />
                </div>

                <div className="space-y-3 border-t pt-4">
                  <Label>External API Integration (optional)</Label>
                  <Input
                    placeholder="https://api.example.com/endpoint"
                    value={externalAPI}
                    onChange={(e) => setExternalAPI(e.target.value)}
                    disabled={isGenerating}
                  />
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="requiresAuth"
                      checked={requiresAuth}
                      onCheckedChange={(checked) => setRequiresAuth(checked as boolean)}
                      disabled={isGenerating || !externalAPI}
                    />
                    <Label htmlFor="requiresAuth" className="text-sm cursor-pointer">
                      Requires API authentication
                    </Label>
                  </div>
                </div>

                {error && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-red-800">{error}</p>
                  </div>
                )}
              </div>
            ) : viewMode === 'preview' && generatedNode ? (
              // Preview/Overview
              <div className="space-y-6 py-4">
                <Card className="p-6 bg-gradient-to-br from-green-50 to-blue-50 border-green-200">
                  <h3 className="text-xl font-bold mb-2">{generatedNode.nodeName}</h3>
                  <Badge variant="secondary" className="mb-4">
                    {generatedNode.nodeKind}
                  </Badge>
                  <ScrollArea className="h-32 bg-white rounded p-3 mb-4">
                    <p className="text-sm whitespace-pre-wrap">{generatedNode.documentation}</p>
                  </ScrollArea>
                </Card>

                {/* Safety Notes */}
                {generatedNode.safetyNotes.length > 0 && (
                  <Card className="p-4 border-yellow-200 bg-yellow-50">
                    <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-yellow-600" />
                      Safety Notes
                    </h4>
                    <ul className="space-y-1 text-sm text-yellow-800">
                      {generatedNode.safetyNotes.map((note, idx) => (
                        <li key={idx}>• {note}</li>
                      ))}
                    </ul>
                  </Card>
                )}

                {/* Dependencies */}
                {generatedNode.dependencies.length > 0 && (
                  <Card className="p-4">
                    <h4 className="font-semibold text-sm mb-2">Required Dependencies</h4>
                    <div className="flex flex-wrap gap-2">
                      {generatedNode.dependencies.map((dep, idx) => (
                        <Badge key={idx} variant="outline">{dep}</Badge>
                      ))}
                    </div>
                  </Card>
                )}

                {/* Config Schema */}
                <Card className="p-4">
                  <h4 className="font-semibold text-sm mb-2">Configuration Schema</h4>
                  <ScrollArea className="h-32 bg-gray-50 rounded p-3">
                    <pre className="text-xs font-mono">
                      {JSON.stringify(generatedNode.configSchema, null, 2)}
                    </pre>
                  </ScrollArea>
                </Card>

                {warning && (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-yellow-800">{warning}</p>
                  </div>
                )}
              </div>
            ) : viewMode === 'code' && generatedNode ? (
              // Code View
              <div className="space-y-4 py-4">
                <div className="flex justify-between items-center">
                  <h4 className="font-semibold">TypeScript Implementation</h4>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleCopy(generatedNode.code, 'code')}
                    >
                      {copied === 'code' ? (
                        <><Check className="w-3 h-3 mr-1" /> Copied</>
                      ) : (
                        <><Copy className="w-3 h-3 mr-1" /> Copy</>
                      )}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleDownload(
                        `${generatedNode.nodeKind}.ts`,
                        generatedNode.code
                      )}
                    >
                      <Download className="w-3 h-3 mr-1" />
                      Download
                    </Button>
                  </div>
                </div>
                <ScrollArea className="h-[500px] bg-gray-900 rounded p-4">
                  <pre className="text-xs text-gray-100 font-mono">
                    <code>{generatedNode.code}</code>
                  </pre>
                </ScrollArea>
              </div>
            ) : viewMode === 'tests' && generatedNode ? (
              // Tests View
              <div className="space-y-4 py-4">
                <div className="flex justify-between items-center">
                  <h4 className="font-semibold">Test Code</h4>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleCopy(generatedNode.testCode, 'tests')}
                    >
                      {copied === 'tests' ? (
                        <><Check className="w-3 h-3 mr-1" /> Copied</>
                      ) : (
                        <><Copy className="w-3 h-3 mr-1" /> Copy</>
                      )}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleDownload(
                        `${generatedNode.nodeKind}.test.ts`,
                        generatedNode.testCode
                      )}
                    >
                      <Download className="w-3 h-3 mr-1" />
                      Download
                    </Button>
                  </div>
                </div>
                <ScrollArea className="h-[500px] bg-gray-900 rounded p-4">
                  <pre className="text-xs text-gray-100 font-mono">
                    <code>{generatedNode.testCode}</code>
                  </pre>
                </ScrollArea>
              </div>
            ) : viewMode === 'docs' && generatedNode ? (
              // Documentation View
              <div className="space-y-4 py-4">
                <div className="flex justify-between items-center">
                  <h4 className="font-semibold">Documentation</h4>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleCopy(generatedNode.documentation, 'docs')}
                  >
                    {copied === 'docs' ? (
                      <><Check className="w-3 h-3 mr-1" /> Copied</>
                    ) : (
                      <><Copy className="w-3 h-3 mr-1" /> Copy</>
                    )}
                  </Button>
                </div>
                <Card className="p-6">
                  <ScrollArea className="h-[500px]">
                    <div className="prose prose-sm">
                      <pre className="whitespace-pre-wrap text-sm">
                        {generatedNode.documentation}
                      </pre>
                    </div>
                  </ScrollArea>
                </Card>
              </div>
            ) : null}
          </ScrollArea>
        </div>

        {/* Actions */}
        <div className="flex justify-between items-center pt-4 border-t">
          <Button
            variant="outline"
            onClick={handleReset}
            disabled={isGenerating}
          >
            Reset
          </Button>

          <div className="flex gap-2">
            <Button variant="ghost" onClick={onClose} disabled={isGenerating}>
              Cancel
            </Button>

            {viewMode === 'input' ? (
              <Button
                onClick={handleGenerate}
                disabled={isGenerating || !description.trim()}
                className="bg-green-600 hover:bg-green-700"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 mr-2" />
                    Generate Node
                  </>
                )}
              </Button>
            ) : generatedNode && onCodeGenerated ? (
              <Button
                onClick={handleApply}
                className="bg-green-600 hover:bg-green-700"
              >
                <Check className="w-4 h-4 mr-2" />
                Use This Node
              </Button>
            ) : null}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

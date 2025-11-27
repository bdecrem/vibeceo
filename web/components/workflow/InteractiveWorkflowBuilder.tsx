/**
 * Interactive Workflow Builder
 * Chat-based conversational workflow construction with AI guidance
 */

'use client';

import { useState, useRef, useEffect } from 'react';
import { MessageCircle, Send, Loader2, Bot, User, CheckCircle, Lightbulb, X } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card } from '@/components/ui/card';

interface InteractiveWorkflowBuilderProps {
  isOpen: boolean;
  onClose: () => void;
  onWorkflowGenerated: (workflow: any) => void;
}

interface Message {
  role: 'user' | 'assistant';
  content: string;
  suggestedNodes?: Array<{
    kind: string;
    reason: string;
    questions: string[];
  }>;
  needsCustomNode?: boolean;
  customNodeIdea?: string;
}

interface ConversationState {
  conversationId: string;
  phase: 'discovery' | 'refinement' | 'complete';
  messages: Message[];
  partialWorkflow?: {
    nodes: any[];
    edges: any[];
  };
  canFinalize: boolean;
}

export function InteractiveWorkflowBuilder({ isOpen, onClose, onWorkflowGenerated }: InteractiveWorkflowBuilderProps) {
  const [conversation, setConversation] = useState<ConversationState | null>(null);
  const [currentMessage, setCurrentMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Auto-scroll to bottom when new messages arrive
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [conversation?.messages]);

  const handleSendMessage = async () => {
    if (!currentMessage.trim()) return;

    const userMessage = currentMessage.trim();
    setCurrentMessage('');
    setIsSending(true);
    setError(null);

    // Optimistically add user message
    if (conversation) {
      setConversation({
        ...conversation,
        messages: [...conversation.messages, { role: 'user', content: userMessage }]
      });
    }

    try {
      const response = await fetch('/api/agents/interactive-generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversationId: conversation?.conversationId,
          message: userMessage
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to get response');
      }

      const data = await response.json();

      setConversation({
        conversationId: data.conversationId,
        phase: data.phase,
        messages: conversation
          ? [...conversation.messages.filter(m => m.role === 'user'), {
              role: 'assistant',
              content: data.message,
              suggestedNodes: data.suggestedNodes,
              needsCustomNode: data.needsCustomNode,
              customNodeIdea: data.customNodeIdea
            }]
          : [
              { role: 'user', content: userMessage },
              {
                role: 'assistant',
                content: data.message,
                suggestedNodes: data.suggestedNodes,
                needsCustomNode: data.needsCustomNode,
                customNodeIdea: data.customNodeIdea
              }
            ],
        partialWorkflow: data.partialWorkflow,
        canFinalize: data.canFinalize || false
      });

    } catch (err: any) {
      console.error('Chat error:', err);
      setError(err.message || 'Failed to send message');
      // Remove optimistic user message on error
      if (conversation) {
        setConversation({
          ...conversation,
          messages: conversation.messages.slice(0, -1)
        });
      }
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleFinalize = async () => {
    if (!conversation?.partialWorkflow) return;

    onWorkflowGenerated(conversation.partialWorkflow);
    handleReset();
    onClose();
  };

  const handleReset = () => {
    setConversation(null);
    setCurrentMessage('');
    setError(null);
  };

  const starterQuestions = [
    'I want to track trending GitHub repos',
    'Help me monitor news about AI',
    'I need a crypto price alert system',
    'Build me a content aggregator'
  ];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-2xl">
            <MessageCircle className="w-6 h-6 text-blue-500" />
            Interactive Workflow Builder
          </DialogTitle>
          <DialogDescription>
            Have a conversation with AI to build your workflow step by step
          </DialogDescription>
        </DialogHeader>

        {/* Chat Area */}
        <div className="flex-1 flex flex-col min-h-0 space-y-4">
          {/* Messages */}
          <ScrollArea className="flex-1 pr-4" ref={scrollRef}>
            {!conversation || conversation.messages.length === 0 ? (
              // Welcome Screen
              <div className="space-y-6 py-8 text-center">
                <div className="flex justify-center">
                  <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center">
                    <Bot className="w-8 h-8 text-white" />
                  </div>
                </div>
                <div>
                  <h3 className="text-xl font-bold mb-2">Let's build your workflow together</h3>
                  <p className="text-sm text-muted-foreground">
                    I'll ask questions to understand your needs and suggest the right components
                  </p>
                </div>

                <div className="space-y-2">
                  <p className="text-sm font-semibold text-gray-600">Try asking:</p>
                  <div className="grid grid-cols-2 gap-2">
                    {starterQuestions.map((question, idx) => (
                      <Button
                        key={idx}
                        variant="outline"
                        className="text-left h-auto py-3 px-4 justify-start hover:border-blue-400 hover:bg-blue-50"
                        onClick={() => {
                          setCurrentMessage(question);
                        }}
                      >
                        <span className="text-sm">{question}</span>
                      </Button>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              // Message History
              <div className="space-y-4 pb-4">
                {conversation.messages.map((message, idx) => (
                  <div
                    key={idx}
                    className={`flex gap-3 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    {message.role === 'assistant' && (
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center flex-shrink-0">
                        <Bot className="w-5 h-5 text-white" />
                      </div>
                    )}

                    <div className={`flex-1 max-w-[80%] ${message.role === 'user' ? 'order-first' : ''}`}>
                      <Card className={`p-4 ${
                        message.role === 'user'
                          ? 'bg-blue-600 text-white border-blue-600'
                          : 'bg-gray-50 border-gray-200'
                      }`}>
                        <p className="text-sm whitespace-pre-wrap">{message.content}</p>

                        {/* Suggested Nodes */}
                        {message.suggestedNodes && message.suggestedNodes.length > 0 && (
                          <div className="mt-4 pt-4 border-t border-gray-200 space-y-3">
                            <p className="text-xs font-semibold flex items-center gap-1">
                              <Lightbulb className="w-3.5 h-3.5" />
                              Suggested nodes:
                            </p>
                            {message.suggestedNodes.map((node, nodeIdx) => (
                              <div key={nodeIdx} className="bg-white rounded p-3 space-y-1">
                                <Badge variant="secondary" className="text-xs">
                                  {node.kind}
                                </Badge>
                                <p className="text-xs text-gray-700">{node.reason}</p>
                                {node.questions.length > 0 && (
                                  <div className="text-xs text-gray-600 italic">
                                    Questions: {node.questions.join(', ')}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Custom Node Suggestion */}
                        {message.needsCustomNode && message.customNodeIdea && (
                          <div className="mt-4 pt-4 border-t border-yellow-200 bg-yellow-50 rounded p-3">
                            <p className="text-xs font-semibold text-yellow-800 mb-1">
                              💡 Custom Node Needed
                            </p>
                            <p className="text-xs text-yellow-700">{message.customNodeIdea}</p>
                          </div>
                        )}
                      </Card>
                    </div>

                    {message.role === 'user' && (
                      <div className="w-8 h-8 rounded-full bg-gray-300 flex items-center justify-center flex-shrink-0">
                        <User className="w-5 h-5 text-gray-600" />
                      </div>
                    )}
                  </div>
                ))}

                {/* Loading Indicator */}
                {isSending && (
                  <div className="flex gap-3">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center flex-shrink-0">
                      <Bot className="w-5 h-5 text-white" />
                    </div>
                    <Card className="p-4 bg-gray-50">
                      <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
                    </Card>
                  </div>
                )}
              </div>
            )}
          </ScrollArea>

          {/* Phase Indicator */}
          {conversation && (
            <div className="flex items-center gap-2 px-2 py-2 bg-gray-100 rounded-lg">
              <Badge variant="outline" className="text-xs">
                Phase: {conversation.phase}
              </Badge>
              {conversation.partialWorkflow && (
                <Badge variant="secondary" className="text-xs">
                  {conversation.partialWorkflow.nodes.length} nodes
                </Badge>
              )}
              {conversation.canFinalize && (
                <Badge className="bg-green-600 text-xs">
                  <CheckCircle className="w-3 h-3 mr-1" />
                  Ready to apply
                </Badge>
              )}
            </div>
          )}

          {/* Error Display */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-2">
              <X className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-red-800">{error}</p>
            </div>
          )}

          {/* Input Area */}
          <div className="flex gap-2">
            <Input
              placeholder="Type your message..."
              value={currentMessage}
              onChange={(e) => setCurrentMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              disabled={isSending}
              className="flex-1"
            />
            <Button
              onClick={handleSendMessage}
              disabled={isSending || !currentMessage.trim()}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {isSending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </Button>
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-between items-center pt-4 border-t">
          <Button
            variant="outline"
            onClick={handleReset}
            disabled={isSending}
          >
            Start Over
          </Button>

          <div className="flex gap-2">
            <Button variant="ghost" onClick={onClose} disabled={isSending}>
              Cancel
            </Button>

            {conversation?.canFinalize && (
              <Button
                onClick={handleFinalize}
                className="bg-green-600 hover:bg-green-700"
              >
                <CheckCircle className="w-4 h-4 mr-2" />
                Apply Workflow
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

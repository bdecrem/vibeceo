/**
 * Interactive Workflow Generator API
 * Conversational workflow building with Q&A and incremental suggestions
 */

import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

// In-memory conversation storage (replace with Redis/DB in production)
const conversations = new Map<string, ConversationState>();

interface ConversationState {
  id: string;
  messages: Array<{ role: 'user' | 'assistant'; content: string }>;
  partialWorkflow: {
    nodes: any[];
    edges: any[];
  };
  phase: 'discovery' | 'refinement' | 'complete';
  userIntent: {
    dataSources: string[];
    processingNeeds: string[];
    outputGoals: string[];
  };
  createdAt: Date;
  lastUpdated: Date;
}

const NODE_CATALOG = [
  // Data Sources
  { kind: 'arxiv', category: 'source', description: 'Fetch academic papers from arXiv', questions: ['What search query?', 'How many papers?'] },
  { kind: 'rss', category: 'source', description: 'Fetch RSS/Atom feeds', questions: ['What feed URL?', 'How often to check?'] },
  { kind: 'hackernews', category: 'source', description: 'Fetch stories from Hacker News', questions: ['Top, new, or best?', 'How many items?'] },
  { kind: 'reddit', category: 'source', description: 'Fetch Reddit posts', questions: ['Which subreddit?', 'Time range?'] },
  { kind: 'github', category: 'source', description: 'Fetch GitHub repos/issues', questions: ['Search query?', 'Repos or issues?'] },
  { kind: 'twitter', category: 'source', description: 'Fetch tweets', questions: ['Search query?', 'Time range?'] },
  { kind: 'youtube', category: 'source', description: 'Fetch YouTube videos', questions: ['Search query?', 'How many videos?'] },
  { kind: 'news_api', category: 'source', description: 'Fetch news articles', questions: ['Topic or query?', 'Sources?'] },
  { kind: 'crypto_price', category: 'source', description: 'Fetch crypto prices', questions: ['Which cryptocurrencies?', 'Time range?'] },
  { kind: 'stock_price', category: 'source', description: 'Fetch stock data', questions: ['Which stocks?', 'Time range?'] },

  // Pipeline - Popular
  { kind: 'dedupe', category: 'pipeline', description: 'Remove duplicates', questions: ['Dedupe by URL, ID, or title?'] },
  { kind: 'keyword_filter', category: 'filter', description: 'Filter by keywords', questions: ['Include or exclude keywords?'] },
  { kind: 'sentiment_analysis', category: 'enrichment', description: 'Analyze sentiment', questions: ['Simple or advanced model?'] },
  { kind: 'top_n_filter', category: 'filter', description: 'Select top N items', questions: ['How many items?', 'Sort by what?'] },
  { kind: 'summarize', category: 'pipeline', description: 'LLM summarization', questions: ['Summarize all together or each item?'] },
  { kind: 'claude_agent', category: 'pipeline', description: 'Custom Claude AI transformation', questions: ['What should Claude do with the data?'] },

  // Outputs
  { kind: 'sms', category: 'output', description: 'Send SMS', questions: ['To which number?'] },
  { kind: 'email', category: 'output', description: 'Send email', questions: ['To which address?', 'Subject?'] },
  { kind: 'slack', category: 'output', description: 'Post to Slack', questions: ['Which channel?'] },
  { kind: 'report', category: 'output', description: 'Generate report', questions: ['Format: HTML or Markdown?'] },
];

const CONVERSATION_SYSTEM_PROMPT = `You are an expert AI assistant helping users build data workflows conversationally.

Your role:
1. Ask clarifying questions to understand user needs
2. Suggest appropriate nodes from the catalog
3. Incrementally build the workflow as you learn more
4. Identify when custom nodes might be needed
5. Guide users through a logical flow: Sources → Processing → Outputs

Available nodes:
${NODE_CATALOG.map(n => `- ${n.kind} (${n.category}): ${n.description}`).join('\n')}

Conversation phases:
- DISCOVERY: Ask questions to understand goals
- REFINEMENT: Suggest nodes and get feedback
- COMPLETE: Finalize and generate workflow

Response format (JSON):
{
  "message": "Your response to the user",
  "phase": "discovery|refinement|complete",
  "suggestedNodes": [
    {
      "kind": "node_kind",
      "reason": "Why this node",
      "questions": ["What to ask about config"]
    }
  ],
  "needsCustomNode": false,
  "customNodeIdea": "Description if custom node needed",
  "partialWorkflow": {
    "nodes": [...],
    "edges": [...]
  }
}

Be conversational and helpful. Ask one or two questions at a time.`;

interface InteractiveRequest {
  conversationId?: string;
  message: string;
}

interface InteractiveResponse {
  conversationId: string;
  message: string;
  phase: string;
  suggestedNodes?: Array<{
    kind: string;
    reason: string;
    questions: string[];
  }>;
  needsCustomNode?: boolean;
  customNodeIdea?: string;
  partialWorkflow?: {
    nodes: any[];
    edges: any[];
  };
  canFinalize?: boolean;
}

export async function POST(req: NextRequest) {
  try {
    const body: InteractiveRequest = await req.json();
    const { conversationId, message } = body;

    if (!message) {
      return NextResponse.json(
        { error: 'Message is required' },
        { status: 400 }
      );
    }

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'ANTHROPIC_API_KEY not configured' },
        { status: 500 }
      );
    }

    // Get or create conversation
    let conversation: ConversationState;
    if (conversationId && conversations.has(conversationId)) {
      conversation = conversations.get(conversationId)!;
      conversation.messages.push({ role: 'user', content: message });
      conversation.lastUpdated = new Date();
    } else {
      const newId = `conv_${Date.now()}_${Math.random().toString(36).substring(7)}`;
      conversation = {
        id: newId,
        messages: [{ role: 'user', content: message }],
        partialWorkflow: { nodes: [], edges: [] },
        phase: 'discovery',
        userIntent: {
          dataSources: [],
          processingNeeds: [],
          outputGoals: []
        },
        createdAt: new Date(),
        lastUpdated: new Date()
      };
      conversations.set(newId, conversation);
    }

    // Build context for Claude
    const contextPrompt = `
Conversation history:
${conversation.messages.map(m => `${m.role}: ${m.content}`).join('\n')}

Current phase: ${conversation.phase}
Current partial workflow: ${JSON.stringify(conversation.partialWorkflow, null, 2)}

User intent so far:
- Data sources: ${conversation.userIntent.dataSources.join(', ') || 'unknown'}
- Processing needs: ${conversation.userIntent.processingNeeds.join(', ') || 'unknown'}
- Output goals: ${conversation.userIntent.outputGoals.join(', ') || 'unknown'}

Respond to the user's latest message and update the workflow.
`;

    // Call Claude
    const client = new Anthropic({ apiKey });
    const claudeMessage = await client.messages.create({
      model: 'claude-3-haiku-20240307',
      max_tokens: 2048,
      system: CONVERSATION_SYSTEM_PROMPT,
      messages: [{
        role: 'user',
        content: contextPrompt
      }]
    });

    // Extract response
    const responseText = claudeMessage.content[0].type === 'text'
      ? claudeMessage.content[0].text
      : '';

    // Parse JSON from response
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      // Fallback to plain text response
      conversation.messages.push({ role: 'assistant', content: responseText });
      return NextResponse.json({
        conversationId: conversation.id,
        message: responseText,
        phase: conversation.phase,
        partialWorkflow: conversation.partialWorkflow
      });
    }

    const parsed = JSON.parse(jsonMatch[0]);

    // Update conversation state
    conversation.messages.push({ role: 'assistant', content: parsed.message });
    conversation.phase = parsed.phase || conversation.phase;

    if (parsed.partialWorkflow) {
      conversation.partialWorkflow = parsed.partialWorkflow;
    }

    // Extract user intent
    if (parsed.suggestedNodes) {
      parsed.suggestedNodes.forEach((node: any) => {
        const catalogNode = NODE_CATALOG.find(n => n.kind === node.kind);
        if (catalogNode) {
          if (catalogNode.category === 'source' && !conversation.userIntent.dataSources.includes(node.kind)) {
            conversation.userIntent.dataSources.push(node.kind);
          } else if (catalogNode.category === 'output' && !conversation.userIntent.outputGoals.includes(node.kind)) {
            conversation.userIntent.outputGoals.push(node.kind);
          } else if (!conversation.userIntent.processingNeeds.includes(node.kind)) {
            conversation.userIntent.processingNeeds.push(node.kind);
          }
        }
      });
    }

    const response: InteractiveResponse = {
      conversationId: conversation.id,
      message: parsed.message,
      phase: parsed.phase,
      suggestedNodes: parsed.suggestedNodes,
      needsCustomNode: parsed.needsCustomNode,
      customNodeIdea: parsed.customNodeIdea,
      partialWorkflow: parsed.partialWorkflow,
      canFinalize: parsed.phase === 'complete'
    };

    return NextResponse.json(response);

  } catch (error: any) {
    console.error('Interactive generation error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to generate response' },
      { status: 500 }
    );
  }
}

// Get conversation state
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const conversationId = searchParams.get('conversationId');

  if (!conversationId) {
    return NextResponse.json(
      { error: 'conversationId required' },
      { status: 400 }
    );
  }

  const conversation = conversations.get(conversationId);
  if (!conversation) {
    return NextResponse.json(
      { error: 'Conversation not found' },
      { status: 404 }
    );
  }

  return NextResponse.json({
    conversationId: conversation.id,
    messages: conversation.messages,
    partialWorkflow: conversation.partialWorkflow,
    phase: conversation.phase,
    userIntent: conversation.userIntent
  });
}

// Delete conversation
export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const conversationId = searchParams.get('conversationId');

  if (!conversationId) {
    return NextResponse.json(
      { error: 'conversationId required' },
      { status: 400 }
    );
  }

  conversations.delete(conversationId);

  return NextResponse.json({ success: true });
}

// Cleanup old conversations (run periodically)
setInterval(() => {
  const now = new Date();
  const maxAge = 1000 * 60 * 60; // 1 hour

  for (const [id, conv] of conversations.entries()) {
    if (now.getTime() - conv.lastUpdated.getTime() > maxAge) {
      conversations.delete(id);
    }
  }
}, 1000 * 60 * 15); // Every 15 minutes

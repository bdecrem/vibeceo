# AI-Powered Workflow Generation System

## Overview

This comprehensive system enables users to create VibeCEO agent workflows using natural language instead of manually placing nodes. It includes three distinct approaches for different use cases:

1. **One-Shot Generator** - Describe your entire workflow, get instant results
2. **Interactive Builder** - Conversational Q&A approach with AI guidance
3. **Custom Node Generator** - Generate TypeScript code for new pipeline nodes

## Architecture

### Part 1: Claude Agent Node (Runtime Dynamic Agent)

**Location:** `/Users/harjyot/Desktop/code/vibeceo/vibeceo/sms-bot/src/agents/pipeline/claude-agent.ts`

A new pipeline step that runs Claude AI at runtime for dynamic transformations.

**Key Features:**
- Runs Claude 3.5 Sonnet or Haiku at pipeline execution time
- Template-based prompts with Handlebars-like syntax (`{{field}}`)
- Parallel processing with rate limiting (5 items per batch)
- Configurable system prompts and user prompt templates
- Stores results in configurable output fields

**Configuration:**
```typescript
interface ClaudeAgentStep {
  kind: 'claude_agent';
  name?: string;
  systemPrompt: string;              // AI system instructions
  userPromptTemplate: string;        // Template with {{field}} placeholders
  model?: 'claude-3-5-sonnet-20241022' | 'claude-3-haiku-20240307';
  maxTokens?: number;                // Default: 1024
  outputField?: string;              // Where to store result (default: 'agentOutput')
}
```

**Example Use Cases:**
- Custom content analysis beyond standard sentiment
- Dynamic categorization based on complex criteria
- Content quality scoring with nuanced reasoning
- Extract structured information from unstructured text
- Generate custom summaries with specific formatting

### Part 2: AI Workflow Generator API

**Location:** `/Users/harjyot/Desktop/code/vibeceo/vibeceo/web/app/api/agents/generate-workflow/route.ts`

One-shot workflow generation from natural language descriptions.

**Key Features:**
- Analyzes user description and generates complete ReactFlow workflow
- Comprehensive node catalog (63+ nodes across 5 categories)
- Smart node selection based on data sources, goals, and outputs
- Automatic positioning of nodes in logical flow
- Returns metadata explaining node choices

**API Endpoints:**

**POST /api/agents/generate-workflow**
```json
{
  "description": "Monitor Hacker News for AI news and send daily digest via email",
  "dataSources": ["hackernews", "reddit"],
  "goals": ["filter by relevance", "AI summarization"],
  "outputPreferences": ["email", "slack"]
}
```

**Response:**
```json
{
  "success": true,
  "workflow": {
    "nodes": [...],  // ReactFlow node definitions
    "edges": [...]   // ReactFlow edge connections
  },
  "metadata": {
    "title": "HN AI News Monitor",
    "description": "...",
    "nodesUsed": ["hackernews", "keyword_filter", "summarize", "email"],
    "reasoning": "Selected HN source for tech content..."
  },
  "nodeCatalog": [...]  // All available nodes
}
```

**GET /api/agents/generate-workflow**
Returns node catalog for reference (63 nodes categorized).

**Node Categories:**
- **Sources (18):** RSS, arXiv, HackerNews, Reddit, GitHub, Twitter, YouTube, etc.
- **Filters (13):** Date, keywords, sentiment, length, score, regex, author, etc.
- **Enrichment (10):** Sentiment analysis, entity extraction, translation, scoring, etc.
- **Pipeline (7):** Dedupe, sort, summarize, rank, transform, claude_agent
- **Outputs (12):** SMS, email, Slack, Discord, webhook, database, sheets, etc.

### Part 3: Interactive Workflow Generator API

**Location:** `/Users/harjyot/Desktop/code/vibeceo/vibeceo/web/app/api/agents/interactive-generate/route.ts`

Conversational workflow building with multi-turn Q&A.

**Key Features:**
- Maintains conversation state with message history
- Three-phase approach: Discovery → Refinement → Complete
- Incremental workflow building as conversation progresses
- Suggests nodes with explanations and follow-up questions
- Identifies when custom nodes might be needed
- In-memory conversation storage with auto-cleanup (1 hour)

**API Endpoints:**

**POST /api/agents/interactive-generate**
```json
{
  "conversationId": "conv_xyz123",  // Optional, omit for new conversation
  "message": "I want to track trending GitHub repos"
}
```

**Response:**
```json
{
  "conversationId": "conv_xyz123",
  "message": "Great! Let me help you track GitHub repos...",
  "phase": "discovery",
  "suggestedNodes": [
    {
      "kind": "github_source",
      "reason": "Best for fetching GitHub data",
      "questions": ["Which language?", "Time range?"]
    }
  ],
  "needsCustomNode": false,
  "partialWorkflow": {
    "nodes": [...],
    "edges": [...]
  },
  "canFinalize": false
}
```

**GET /api/agents/interactive-generate?conversationId=xyz**
Retrieve conversation state.

**DELETE /api/agents/interactive-generate?conversationId=xyz**
Delete conversation and free resources.

**Conversation Phases:**
1. **Discovery:** AI asks questions to understand requirements
2. **Refinement:** Suggests nodes, gathers configuration details
3. **Complete:** Workflow is ready, user can finalize and apply

### Part 4: Custom Node Generator API

**Location:** `/Users/harjyot/Desktop/code/vibeceo/vibeceo/web/app/api/agents/generate-node/route.ts`

Generate TypeScript code for brand new pipeline nodes.

**Key Features:**
- Generates production-ready TypeScript code
- Includes type definitions, error handling, logging
- Creates Jest test cases automatically
- Generates comprehensive documentation
- Safety validation (no fs, eval, shell access)
- Dependency detection and npm package recommendations

**API Endpoints:**

**POST /api/agents/generate-node**
```json
{
  "description": "A node that filters out items containing profanity",
  "inputs": ["title", "summary", "content"],
  "outputs": ["filtered items"],
  "functionality": "Use a profanity word list to check text...",
  "externalAPI": {
    "url": "https://api.example.com/check",
    "requiresAuth": true
  }
}
```

**Response:**
```json
{
  "success": true,
  "node": {
    "nodeName": "ProfanityFilter",
    "nodeKind": "profanity_filter",
    "code": "// Complete TypeScript implementation",
    "testCode": "// Jest test suite",
    "documentation": "# ProfanityFilter\n\nFilters content...",
    "safetyNotes": [
      "Uses environment variable for API key",
      "Validates all inputs before processing"
    ],
    "dependencies": ["bad-words@3.0.4"],
    "configSchema": {
      "strictMode": { "type": "boolean", "description": "..." }
    }
  },
  "warning": "Review code carefully before deploying"
}
```

**GET /api/agents/generate-node**
Returns example nodes and documentation.

**Safety Features:**
- Scans for dangerous patterns (fs, child_process, eval, exec)
- Enforces read-only external API calls
- Requires environment variables for secrets
- Validates inputs before processing
- Returns warnings for manual review

**Generated Code Structure:**
```typescript
/**
 * [Node Name] Pipeline Step
 * [Description]
 */

import type { NormalizedItem } from '@vibeceo/shared-types';

export interface [NodeName]Step {
  kind: '[node_kind]';
  name?: string;
  // Config fields...
}

export async function run[NodeName](
  items: NormalizedItem[],
  config: [NodeName]Step
): Promise<NormalizedItem[]> {
  // Implementation with error handling and logging
}
```

## Part 5: UI Components

### AIWorkflowGenerator Component

**Location:** `/Users/harjyot/Desktop/code/vibeceo/vibeceo/web/components/workflow/AIWorkflowGenerator.tsx`

Modal for one-shot workflow generation.

**Features:**
- Clean textarea for natural language input
- Optional hints for data sources, goals, outputs
- Example prompts for quick start
- Preview generated workflow before applying
- Shows node metadata and reasoning
- Error handling with clear messages

**Usage:**
```tsx
import { AIWorkflowGenerator } from '@/components/workflow/AIWorkflowGenerator';

<AIWorkflowGenerator
  isOpen={showGenerator}
  onClose={() => setShowGenerator(false)}
  onWorkflowGenerated={(workflow) => {
    // Apply workflow to ReactFlow
    setNodes(workflow.nodes);
    setEdges(workflow.edges);
  }}
/>
```

**UI Highlights:**
- Purple gradient theme with sparkles icon
- Example prompt badges for inspiration
- Two-step process: input → preview
- JSON preview of generated workflow
- Reset and back-to-edit functionality

### InteractiveWorkflowBuilder Component

**Location:** `/Users/harjyot/Desktop/code/vibeceo/vibeceo/web/components/workflow/InteractiveWorkflowBuilder.tsx`

Chat-based conversational workflow construction.

**Features:**
- Chat interface with user/assistant messages
- Displays suggested nodes with reasoning
- Shows custom node ideas when needed
- Phase indicator (discovery/refinement/complete)
- Real-time node count updates
- Auto-scroll to latest message
- Starter question buttons

**Usage:**
```tsx
import { InteractiveWorkflowBuilder } from '@/components/workflow/InteractiveWorkflowBuilder';

<InteractiveWorkflowBuilder
  isOpen={showBuilder}
  onClose={() => setShowBuilder(false)}
  onWorkflowGenerated={(workflow) => {
    // Apply partial workflow to canvas
    setNodes(workflow.nodes);
    setEdges(workflow.edges);
  }}
/>
```

**UI Highlights:**
- Blue gradient bot avatar
- User messages on right, assistant on left
- Inline node suggestions with badges
- Yellow highlight for custom node needs
- Green "Ready to apply" badge when complete
- Start over functionality

### NodeCodeGenerator Component

**Location:** `/Users/harjyot/Desktop/code/vibeceo/vibeceo/web/components/workflow/NodeCodeGenerator.tsx`

UI for generating custom nodes with code preview.

**Features:**
- Multi-step form for node requirements
- Example nodes for quick start
- Tabbed view: Overview, Code, Tests, Docs
- Syntax-highlighted code display
- Copy to clipboard functionality
- Download individual files
- Safety warnings and dependency info
- External API integration fields

**Usage:**
```tsx
import { NodeCodeGenerator } from '@/components/workflow/NodeCodeGenerator';

<NodeCodeGenerator
  isOpen={showNodeGen}
  onClose={() => setShowNodeGen(false)}
  onCodeGenerated={(code, nodeName) => {
    // Handle generated code
    console.log('New node:', nodeName);
    // Could auto-save to file system or show for review
  }}
/>
```

**UI Highlights:**
- Green theme for code generation
- Four tabs: Preview, Code, Tests, Documentation
- Dark code editor background
- Safety notes in yellow cards
- Dependency badges
- Example cards for inspiration

## Integration Guide

### Step 1: Update Shared Types

The Claude Agent step has been added to the shared types package:

```typescript
// packages/shared-types/src/pipeline-step.ts
export const ClaudeAgentStepSchema = z.object({
  kind: z.literal('claude_agent'),
  name: z.string().optional(),
  systemPrompt: z.string(),
  userPromptTemplate: z.string(),
  model: z.enum(['claude-3-5-sonnet-20241022', 'claude-3-haiku-20240307']),
  maxTokens: z.number().int().min(100).max(4096).default(1024),
  outputField: z.string().default('agentOutput'),
});
```

### Step 2: Executor Integration

The executor has been updated to handle claude_agent steps:

```typescript
// sms-bot/src/agents/executor.ts
import { runClaudeAgent } from './pipeline/claude-agent.js';

// In pipeline execution switch:
case 'claude_agent':
  pipelineItems = await runClaudeAgent(pipelineItems, step);
  break;
```

### Step 3: Environment Variables

Required environment variables:

```bash
# For all AI features
ANTHROPIC_API_KEY=sk-ant-...

# Existing Supabase vars (already configured)
SUPABASE_URL=https://...
SUPABASE_SERVICE_KEY=...
```

### Step 4: Add to Workflow Builder UI

Example integration in your main workflow page:

```tsx
'use client';

import { useState } from 'react';
import { Wand2, MessageCircle, Code2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AIWorkflowGenerator } from '@/components/workflow/AIWorkflowGenerator';
import { InteractiveWorkflowBuilder } from '@/components/workflow/InteractiveWorkflowBuilder';
import { NodeCodeGenerator } from '@/components/workflow/NodeCodeGenerator';

export function WorkflowBuilderPage() {
  const [showAIGenerator, setShowAIGenerator] = useState(false);
  const [showInteractive, setShowInteractive] = useState(false);
  const [showNodeGen, setShowNodeGen] = useState(false);
  const [nodes, setNodes] = useState([]);
  const [edges, setEdges] = useState([]);

  return (
    <div>
      {/* AI Generation Buttons */}
      <div className="flex gap-2">
        <Button onClick={() => setShowAIGenerator(true)}>
          <Wand2 className="w-4 h-4 mr-2" />
          Generate with AI
        </Button>
        <Button onClick={() => setShowInteractive(true)}>
          <MessageCircle className="w-4 h-4 mr-2" />
          Interactive Builder
        </Button>
        <Button onClick={() => setShowNodeGen(true)}>
          <Code2 className="w-4 h-4 mr-2" />
          Create Custom Node
        </Button>
      </div>

      {/* Modals */}
      <AIWorkflowGenerator
        isOpen={showAIGenerator}
        onClose={() => setShowAIGenerator(false)}
        onWorkflowGenerated={(workflow) => {
          setNodes(workflow.nodes);
          setEdges(workflow.edges);
        }}
      />

      <InteractiveWorkflowBuilder
        isOpen={showInteractive}
        onClose={() => setShowInteractive(false)}
        onWorkflowGenerated={(workflow) => {
          setNodes(workflow.nodes);
          setEdges(workflow.edges);
        }}
      />

      <NodeCodeGenerator
        isOpen={showNodeGen}
        onClose={() => setShowNodeGen(false)}
        onCodeGenerated={(code, nodeName) => {
          console.log('Generated node:', nodeName);
          // Handle code generation
        }}
      />

      {/* Your ReactFlow canvas */}
      {/* ... */}
    </div>
  );
}
```

## Usage Examples

### Example 1: One-Shot Generation

**User Input:**
```
Monitor Hacker News for AI-related posts, filter for high engagement (100+ points),
analyze sentiment, and send me the top 5 via SMS every morning.
```

**Generated Workflow:**
1. HackerNews Source → fetch front page
2. Keyword Filter → include "AI", "machine learning", "LLM"
3. Score Filter → minScore: 100
4. Sentiment Analysis → analyze post sentiment
5. Top N Filter → select top 5 by score
6. Summarize → AI summary of each post
7. SMS Output → format and send

### Example 2: Interactive Builder

**Conversation Flow:**
```
User: I want to track crypto prices
Bot: Great! Which cryptocurrencies would you like to track?
User: Bitcoin and Ethereum
Bot: Got it. How often do you want updates, and what should trigger alerts?
User: Check every hour, alert me if price changes by more than 5%
Bot: I'll add:
     1. Crypto Price source for BTC and ETH (hourly)
     2. Custom scoring to calculate % change
     3. Score filter to only pass 5%+ changes
     4. SMS output for alerts

     Should I also store historical data?
User: Yes, log to database
Bot: Perfect! I've added database output. Your workflow is ready to apply.
```

### Example 3: Custom Node Generation

**User Input:**
```
Description: A node that checks if URLs are still live (not 404)
Inputs: url
Outputs: is_live, status_code, checked_at
Functionality: Make HTTP HEAD request to check status, with timeout and retry logic
```

**Generated Code:**
- TypeScript implementation with axios
- Error handling for network failures
- Rate limiting to avoid overwhelming servers
- Caching recent checks
- Jest tests for success/failure cases
- Documentation with usage examples

## Advanced Features

### Template Rendering in Claude Agent

The claude_agent step supports nested field access:

```typescript
// Configuration
{
  kind: 'claude_agent',
  systemPrompt: 'You are a content quality analyzer.',
  userPromptTemplate: `
    Analyze this article:
    Title: {{title}}
    Author: {{author}}
    Content: {{summary}}
    Source URL: {{url}}
    Original data: {{raw.description}}

    Rate quality 1-10 and explain why.
  `
}

// Access nested fields with dot notation: {{raw.fieldName}}
```

### Conversation State Management

Interactive builder maintains state:

```typescript
interface ConversationState {
  id: string;
  messages: Message[];
  partialWorkflow: { nodes: [], edges: [] };
  phase: 'discovery' | 'refinement' | 'complete';
  userIntent: {
    dataSources: string[];
    processingNeeds: string[];
    outputGoals: string[];
  };
  createdAt: Date;
  lastUpdated: Date;
}
```

Auto-cleanup runs every 15 minutes, removing conversations older than 1 hour.

### Safety Validation

Custom node generator scans for:
- File system operations (fs module)
- Child process spawning
- eval() or Function() constructors
- Arbitrary code execution
- Shell commands

If dangerous patterns detected, returns HTTP 400 with warning.

## Best Practices

### For Users

1. **One-Shot Generator:**
   - Be specific about data sources and outputs
   - Mention timing (hourly, daily, real-time)
   - Specify filtering criteria clearly
   - Include transformation needs (summarize, translate, etc.)

2. **Interactive Builder:**
   - Answer questions directly and completely
   - Ask for clarification when unsure
   - Review suggested nodes before confirming
   - Iterate on the workflow until perfect

3. **Node Generator:**
   - Provide detailed functionality description
   - List all expected inputs and outputs
   - Mention performance requirements
   - Specify external APIs if needed
   - Always review generated code before deploying

### For Developers

1. **Extending Node Catalog:**
   - Add new nodes to both API and UI
   - Include category, description, and questions
   - Update executor switch statement
   - Add to shared types schema

2. **Custom Node Integration:**
   - Place generated files in pipeline/ directory
   - Import in executor.ts
   - Add to PipelineStepSchema
   - Update NodePalette.tsx icon mapping
   - Write integration tests

3. **Conversation Storage:**
   - Current: In-memory (development)
   - Production: Use Redis or database
   - Keep TTL reasonable (1-2 hours)
   - Implement proper cleanup

## Troubleshooting

### Common Issues

**Issue: API returns "ANTHROPIC_API_KEY not configured"**
- Solution: Set environment variable in `.env.local` or `.env`
- Restart Next.js dev server after adding

**Issue: Generated workflow has disconnected nodes**
- Solution: Check that node IDs match in edges
- Verify all source nodes connect to processing nodes
- Ensure output nodes receive connections

**Issue: Claude agent step fails with "rate limit"**
- Solution: Reduce batch size in claude-agent.ts
- Add longer delays between batches
- Use Haiku model for faster, cheaper processing

**Issue: Custom node generation returns unsafe code warning**
- Solution: Review the description for filesystem/exec mentions
- Be more specific about read-only operations
- Manually review and sanitize generated code

### Debugging Tips

1. **Enable Verbose Logging:**
```typescript
// In claude-agent.ts
console.log('Claude request:', { systemPrompt, userPrompt });
console.log('Claude response:', response);
```

2. **Check Conversation State:**
```bash
curl http://localhost:3000/api/agents/interactive-generate?conversationId=conv_xyz
```

3. **Test Node Generation:**
```bash
curl -X POST http://localhost:3000/api/agents/generate-node \
  -H "Content-Type: application/json" \
  -d '{"description":"Test node that counts words"}'
```

## Performance Considerations

### API Response Times

- One-shot generation: 3-8 seconds (depends on complexity)
- Interactive message: 1-3 seconds per turn
- Node generation: 5-12 seconds (includes code + tests + docs)

### Rate Limits

- Claude API: 50 requests/minute (Tier 2)
- Batch processing in claude-agent: 5 items at a time
- Interactive builder: No client-side throttling needed

### Scaling

For production deployment:

1. **Conversation Storage:** Move to Redis
2. **Rate Limiting:** Add API route middleware
3. **Caching:** Cache node catalog responses
4. **Queue System:** For long-running generations
5. **Monitoring:** Track API usage and costs

## Security Notes

1. **API Keys:** Never expose in client-side code
2. **Generated Code:** Always review before deploying
3. **User Input:** Sanitized before passing to Claude
4. **File Operations:** Blocked in generated nodes
5. **External APIs:** Validated URLs, require env vars for auth

## Future Enhancements

### Planned Features

1. **Workflow Templates:** Save and reuse common patterns
2. **Version Control:** Track workflow changes over time
3. **Collaboration:** Share workflows with team
4. **Testing Mode:** Dry-run workflows before deploying
5. **Analytics:** Track node usage and performance
6. **Workflow Marketplace:** Share custom nodes community-wide
7. **Visual Diff:** Compare workflow versions
8. **Auto-Optimization:** AI suggests improvements
9. **Multi-Agent Workflows:** Complex agent coordination
10. **Natural Language Updates:** "Add email output" modifies existing

### Potential Integrations

- GitHub: Version control for workflows
- Slack: Notifications for workflow completion
- Datadog: Performance monitoring
- Sentry: Error tracking
- Stripe: Usage-based billing

## Credits

Built with:
- Claude 3.5 Sonnet (Anthropic)
- Next.js 14 (Vercel)
- ReactFlow (webkid)
- Radix UI (WorkOS)
- Lucide Icons (lucide.dev)
- Zod (Colin McDonnell)

## License

Part of the VibeCEO platform. All rights reserved.

## Support

For issues or questions:
- GitHub Issues: [repository URL]
- Documentation: [docs URL]
- Email: support@vibeceo.com

/**
 * Custom Node Generator API
 * Generates TypeScript code for new pipeline nodes using Claude
 */

import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

const NODE_GENERATION_SYSTEM_PROMPT = `You are an expert TypeScript developer specializing in data pipeline nodes for the VibeCEO agent platform.

Your task is to generate production-ready TypeScript code for custom pipeline nodes.

Node structure requirements:
1. Must export an interface matching the pattern: [NodeName]Step
2. Must export an async function: run[NodeName](items: NormalizedItem[], config: [NodeName]Step): Promise<NormalizedItem[]>
3. Include proper TypeScript types
4. Handle errors gracefully
5. Add console logging for observability
6. Follow existing patterns from the codebase

Safety constraints:
- NO file system operations (no fs, no file writes)
- NO network calls without explicit URL validation
- NO eval() or Function() constructors
- NO shell commands or child processes
- Only read-only external API calls are allowed
- Must validate all inputs

NormalizedItem interface:
\`\`\`typescript
interface NormalizedItem {
  id?: string;
  title?: string;
  summary?: string;
  url?: string;
  publishedAt?: string;
  author?: string;
  score?: number;
  raw?: any;
  [key: string]: any; // For dynamic fields added by enrichment
}
\`\`\`

Example node structure:
\`\`\`typescript
/**
 * [Node Name] Pipeline Step
 * [Description of what this node does]
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
  if (items.length === 0) {
    return [];
  }

  console.log(\`🔧 Running [NodeName] on \${items.length} items...\`);

  try {
    // Implementation here
    const processedItems = items.map(item => {
      // Process each item
      return {
        ...item,
        // Add/modify fields
      };
    });

    console.log(\`✅ [NodeName] processed \${processedItems.length} items\`);
    return processedItems;

  } catch (error: any) {
    console.error(\`❌ [NodeName] failed: \${error.message}\`);
    return items; // Return unchanged on error
  }
}
\`\`\`

Response format (JSON only):
{
  "nodeName": "CamelCaseName",
  "nodeKind": "snake_case_kind",
  "code": "// Complete TypeScript code",
  "testCode": "// Jest test code",
  "documentation": "Markdown docs",
  "safetyNotes": ["Note about safety checks"],
  "dependencies": ["package-name@version"],
  "configSchema": {
    "field1": { "type": "string", "description": "..." }
  }
}

Think step by step:
1. Understand the node requirements
2. Design the configuration interface
3. Implement the processing logic
4. Add error handling
5. Include logging
6. Generate test cases`;

interface GenerateNodeRequest {
  description: string;
  inputs?: string[];
  outputs?: string[];
  functionality?: string;
  externalAPI?: {
    url?: string;
    requiresAuth?: boolean;
  };
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

export async function POST(req: NextRequest) {
  try {
    const body: GenerateNodeRequest = await req.json();
    const { description, inputs, outputs, functionality, externalAPI } = body;

    if (!description) {
      return NextResponse.json(
        { error: 'Description is required' },
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

    // Build detailed prompt
    let userPrompt = `Generate a custom pipeline node with these requirements:\n\n${description}`;

    if (inputs && inputs.length > 0) {
      userPrompt += `\n\nExpected inputs: ${inputs.join(', ')}`;
    }

    if (outputs && outputs.length > 0) {
      userPrompt += `\n\nDesired outputs: ${outputs.join(', ')}`;
    }

    if (functionality) {
      userPrompt += `\n\nFunctionality details:\n${functionality}`;
    }

    if (externalAPI) {
      userPrompt += `\n\nExternal API integration:`;
      if (externalAPI.url) {
        userPrompt += `\n- URL: ${externalAPI.url}`;
      }
      if (externalAPI.requiresAuth) {
        userPrompt += `\n- Requires authentication: Use process.env for API keys`;
      }
    }

    userPrompt += '\n\nGenerate the complete node implementation with safety checks.';

    // Call Claude
    const client = new Anthropic({ apiKey });
    const message = await client.messages.create({
      model: 'claude-3-haiku-20240307',
      max_tokens: 4096,
      system: NODE_GENERATION_SYSTEM_PROMPT,
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
        { error: 'Failed to generate valid node code' },
        { status: 500 }
      );
    }

    const generated: GeneratedNode = JSON.parse(jsonMatch[0]);

    // Validate generated code has required elements
    if (!generated.code || !generated.nodeName || !generated.nodeKind) {
      return NextResponse.json(
        { error: 'Invalid node structure generated' },
        { status: 500 }
      );
    }

    // Additional safety check: scan for dangerous patterns
    const dangerousPatterns = [
      /require\s*\(\s*['"]fs['"]\s*\)/,
      /require\s*\(\s*['"]child_process['"]\s*\)/,
      /import.*from\s+['"]fs['"]/,
      /eval\s*\(/,
      /Function\s*\(/,
      /exec\s*\(/,
      /spawn\s*\(/,
    ];

    const hasDangerousCode = dangerousPatterns.some(pattern =>
      pattern.test(generated.code)
    );

    if (hasDangerousCode) {
      return NextResponse.json(
        {
          error: 'Generated code contains potentially unsafe operations',
          code: generated.code,
          warning: 'Manual review required'
        },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      node: generated,
      warning: 'Review code carefully before deploying'
    });

  } catch (error: any) {
    console.error('Node generation error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to generate node' },
      { status: 500 }
    );
  }
}

// Get example nodes for reference
export async function GET(req: NextRequest) {
  const examples = [
    {
      name: 'Uppercase Transform',
      description: 'Convert all titles to uppercase',
      code: `export interface UppercaseTransformStep {
  kind: 'uppercase_transform';
  name?: string;
  field: 'title' | 'summary';
}

export async function runUppercaseTransform(
  items: NormalizedItem[],
  config: UppercaseTransformStep
): Promise<NormalizedItem[]> {
  return items.map(item => ({
    ...item,
    [config.field]: item[config.field]?.toUpperCase()
  }));
}`
    },
    {
      name: 'Domain Extractor',
      description: 'Extract domain from URLs',
      code: `export interface DomainExtractorStep {
  kind: 'domain_extractor';
  name?: string;
  outputField?: string;
}

export async function runDomainExtractor(
  items: NormalizedItem[],
  config: DomainExtractorStep
): Promise<NormalizedItem[]> {
  const outputField = config.outputField || 'domain';

  return items.map(item => {
    try {
      const domain = item.url ? new URL(item.url).hostname : null;
      return { ...item, [outputField]: domain };
    } catch {
      return { ...item, [outputField]: null };
    }
  });
}`
    },
    {
      name: 'Word Counter',
      description: 'Count words in content',
      code: `export interface WordCounterStep {
  kind: 'word_counter';
  name?: string;
  field: 'title' | 'summary' | 'content';
  outputField?: string;
}

export async function runWordCounter(
  items: NormalizedItem[],
  config: WordCounterStep
): Promise<NormalizedItem[]> {
  const outputField = config.outputField || 'wordCount';

  return items.map(item => {
    const text = item[config.field] || '';
    const wordCount = text.split(/\s+/).filter(Boolean).length;
    return { ...item, [outputField]: wordCount };
  });
}`
    }
  ];

  return NextResponse.json({
    examples,
    documentation: {
      interface: 'Must match pattern: [NodeName]Step with kind field',
      function: 'Must match pattern: run[NodeName]',
      safety: [
        'No file system access',
        'No arbitrary code execution',
        'Validate all external inputs',
        'Use environment variables for secrets'
      ]
    }
  });
}

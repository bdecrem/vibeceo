/**
 * LLM summarization pipeline step
 * Uses OpenAI to summarize items
 */

import OpenAI from 'openai';
import type { NormalizedItem } from '@vibeceo/shared-types';

let openaiClient: OpenAI | null = null;

function getOpenAIClient(): OpenAI {
  if (!openaiClient) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error(
        '❌ OPENAI_API_KEY not found in environment. ' +
        'Please configure your OpenAI API key in the backend .env file. ' +
        'Get your key at: https://platform.openai.com/api-keys'
      );
    }
    openaiClient = new OpenAI({ apiKey });
    console.log('✅ OpenAI client initialized successfully');
  }
  return openaiClient;
}

export interface SummarizeConfig {
  model?: string;
  maxTokens?: number;
  perItem?: boolean; // If true, summarize each item individually
  audienceType?: string; // e.g., 'technical', 'general', 'executive'
}

export async function summarizeItems(
  items: NormalizedItem[],
  config: SummarizeConfig = {}
): Promise<string> {
  // Validation
  if (!items || items.length === 0) {
    throw new Error('❌ Cannot summarize: No items provided');
  }

  const {
    model = 'gpt-4o-mini',
    maxTokens = 1000,
    perItem = false,
    audienceType = 'general',
  } = config;

  console.log(`🤖 Summarizing ${items.length} items with ${model}...`);
  console.log(`   Model: ${model}, Max Tokens: ${maxTokens}, Audience: ${audienceType}`);

  try {
    const openai = getOpenAIClient();

    if (perItem) {
      // Summarize each item individually and combine
      console.log(`   Processing ${items.length} items individually...`);
      const summaries = await Promise.all(
        items.map((item, idx) => {
          console.log(`   [${idx + 1}/${items.length}] Summarizing: ${item.title?.substring(0, 50)}...`);
          return summarizeItem(openai, item, model, maxTokens, audienceType);
        })
      );

      return summaries.join('\n\n---\n\n');
    } else {
      // Summarize all items together
      return summarizeAllItems(openai, items, model, maxTokens, audienceType);
    }
  } catch (error: any) {
    console.error(`❌ Summarization failed: ${error.message}`);

    if (error.message.includes('OPENAI_API_KEY')) {
      throw error; // Re-throw API key errors as-is
    }

    if (error.status === 401) {
      throw new Error('❌ OpenAI API authentication failed. Please check your API key.');
    }

    if (error.status === 429) {
      throw new Error('❌ OpenAI API rate limit exceeded. Please try again later or upgrade your plan.');
    }

    if (error.status === 500) {
      throw new Error('❌ OpenAI API server error. Please try again later.');
    }

    throw new Error(`❌ Summarization failed: ${error.message}`);
  }
}

async function summarizeItem(
  openai: OpenAI,
  item: NormalizedItem,
  model: string,
  maxTokens: number,
  audienceType: string
): Promise<string> {
  const prompt = `Summarize the following research paper for a ${audienceType} audience:

Title: ${item.title}
Summary: ${item.summary}

Provide a concise 2-3 sentence summary highlighting the key findings and significance.`;

  const response = await openai.chat.completions.create({
    model,
    messages: [
      {
        role: 'system',
        content: 'You are a technical research summarizer. Provide clear, concise summaries.',
      },
      {
        role: 'user',
        content: prompt,
      },
    ],
    max_tokens: maxTokens,
    temperature: 0.7,
  });

  const summary = response.choices[0]?.message?.content || '';

  return `**${item.title}**\n${summary}\n[Read more](${item.url})`;
}

async function summarizeAllItems(
  openai: OpenAI,
  items: NormalizedItem[],
  model: string,
  maxTokens: number,
  audienceType: string
): Promise<string> {
  // Combine all items into a single prompt
  const itemsList = items
    .map((item, i) => `${i + 1}. **${item.title}**\n   ${item.summary?.substring(0, 200)}...`)
    .join('\n\n');

  const prompt = `Create a cohesive research digest from the following ${items.length} papers for a ${audienceType} audience:

${itemsList}

Provide:
1. A brief overview paragraph highlighting the main themes
2. Key findings from 3-5 most significant papers
3. Emerging trends or patterns across the research

Keep it concise and engaging.`;

  const response = await openai.chat.completions.create({
    model,
    messages: [
      {
        role: 'system',
        content: 'You are a research analyst creating daily digests for busy professionals.',
      },
      {
        role: 'user',
        content: prompt,
      },
    ],
    max_tokens: maxTokens,
    temperature: 0.7,
  });

  const digest = response.choices[0]?.message?.content || '';

  console.log(`✅ Generated ${digest.length} character summary`);
  return digest;
}

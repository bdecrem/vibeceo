/**
 * Transform Pipeline Step
 * Uses LLM to transform item data
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
    console.log('✅ OpenAI client initialized for transformation');
  }
  return openaiClient;
}

interface TransformConfig {
  model: string;
  promptTemplateId: string;
  outputFormat: 'json' | 'text' | 'markdown';
}

/**
 * Transform items using LLM
 */
export async function transformItems(
  items: NormalizedItem[],
  config: TransformConfig
): Promise<NormalizedItem[]> {
  if (items.length === 0) {
    return [];
  }

  console.log(`     Transforming ${items.length} items with ${config.model}...`);

  try {
    const openai = getOpenAIClient();

    // For now, transform each item individually
    // TODO: Batch transformation for efficiency
    const transformedItems = await Promise.all(
      items.map(item => transformItem(openai, item, config))
    );

    console.log(`     Transformed ${transformedItems.length} items`);
    return transformedItems;

  } catch (error: any) {
    console.error(`     ❌ Transformation failed: ${error.message}`);

    if (error.message.includes('OPENAI_API_KEY')) {
      throw error; // Re-throw API key errors
    }

    return items; // Return original items if transformation fails
  }
}

async function transformItem(
  openai: OpenAI,
  item: NormalizedItem,
  config: TransformConfig
): Promise<NormalizedItem> {
  const prompt = `Transform the following item. Extract key information and reformat.

Title: ${item.title}
Summary: ${item.summary}
URL: ${item.url}

Provide a transformed version with key points extracted.`;

  const response = await openai.chat.completions.create({
    model: config.model,
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.3,
    max_tokens: 500,
  });

  const transformedContent = response.choices[0]?.message?.content || item.summary || '';

  return {
    ...item,
    summary: transformedContent,
    raw: {
      ...item.raw,
      transformed: true,
      originalSummary: item.summary,
    },
  };
}

/**
 * Image generation using OpenAI GPT Image 1.5
 */

import { requireEnv } from './env.js';

const OPENAI_ORG_ID = 'org-3kZbACXqO0sjNiYNjj7AuRsR';

interface OpenAIImageResponse {
  created: number;
  data: Array<{ b64_json: string }>;
}

export interface GenerateOptions {
  prompt: string;
  size?: '1024x1024' | '1024x1536' | '1536x1024';
  quality?: 'high' | 'medium' | 'low' | 'auto';
}

export async function generateImage(options: GenerateOptions): Promise<Buffer> {
  const apiKey = requireEnv('OPENAI_API_KEY');

  const { prompt, size = '1024x1536', quality = 'high' } = options;

  const response = await fetch('https://api.openai.com/v1/images/generations', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'OpenAI-Organization': OPENAI_ORG_ID,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-image-1.5',
      prompt,
      n: 1,
      size,
      quality,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`OpenAI API error: ${response.status} ${error}`);
  }

  const result: OpenAIImageResponse = await response.json();

  if (!result.data || result.data.length === 0) {
    throw new Error('No image in OpenAI response');
  }

  return Buffer.from(result.data[0].b64_json, 'base64');
}

/**
 * Personalization Extractor - Shared logic for extracting structured data
 * Used by both PERSONALIZE command and automatic detection
 */

import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export interface ExtractedPersonalization {
  name?: string;
  interests?: string[];
  timezone?: string;
  location?: string;
  twitter?: string;
  linkedin?: string;
  notes?: string;
}

/**
 * Extract structured personalization from natural language
 */
export async function extractPersonalization(text: string): Promise<ExtractedPersonalization> {
  const systemPrompt = `You are a personalization extractor. Given natural language text about a person, extract structured data.

Extract these fields (leave undefined if not mentioned):
- name: Their name/nickname
- interests: Array of interests/topics (lowercase, concise)
- timezone: Timezone (e.g., "PST", "UTC", "EST", "UTC+1")
- location: City/region (e.g., "San Francisco", "NYC", "London")
- twitter: Twitter handle (with or without @)
- linkedin: LinkedIn handle or profile path (e.g., "/in/bartdecrem" or "bartdecrem")
- notes: Any other relevant info not captured above

Examples:

Input: "I'm Sarah, interested in machine learning and robotics. SF Bay Area, PST timezone"
Output: {"name": "Sarah", "interests": ["machine learning", "robotics"], "timezone": "PST", "location": "SF Bay Area"}

Input: "My name is Alex. I'm a crypto trader in NYC. Love DeFi and NFTs."
Output: {"name": "Alex", "interests": ["crypto trading", "defi", "nfts"], "location": "NYC"}

Input: "I'm @bartdecrem on Twitter"
Output: {"twitter": "@bartdecrem"}

Input: "Wanna know my linkedin handle? It's /in/bartdecrem"
Output: {"linkedin": "/in/bartdecrem"}

Input: "Call me Jay. Research scientist working on transformers. UTC+1"
Output: {"name": "Jay", "interests": ["research", "transformers"], "timezone": "UTC+1"}

Respond with ONLY valid JSON, no explanation.`;

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-5-20250929',
    max_tokens: 500,
    temperature: 0,
    system: systemPrompt,
    messages: [
      {
        role: 'user',
        content: text,
      },
    ],
  });

  const textContent = response.content.find((c) => c.type === 'text');
  if (!textContent || textContent.type !== 'text') {
    throw new Error('No text response from Claude');
  }

  // Parse JSON response
  const jsonMatch = textContent.text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error('No JSON found in response');
  }

  return JSON.parse(jsonMatch[0]);
}

/**
 * Detect if message contains personal information worth extracting
 * Uses Claude directly - no regex filtering
 */
export async function detectPersonalInfo(text: string): Promise<boolean> {
  const systemPrompt = `Does this message contain personal information about the user?

Personal information includes:
- Name or nickname
- Social media handles (Twitter, LinkedIn, etc.)
- Location or timezone
- Interests or hobbies
- Professional background

Respond with ONLY: YES or NO

Examples:
"I'm @bartdecrem on Twitter" → YES
"Wanna know my linkedin handle? It's /in/bartdecrem" → YES
"My name is Sarah" → YES
"I'm interested in AI and robotics" → YES
"what's the weather?" → NO
"tell me about AI research" → NO
"how does Bitcoin work?" → NO`;

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-5-20250929',
    max_tokens: 10,
    temperature: 0,
    system: systemPrompt,
    messages: [{ role: 'user', content: text }],
  });

  const textContent = response.content.find((c) => c.type === 'text');
  if (!textContent || textContent.type !== 'text') {
    return false;
  }

  return textContent.text.trim().toUpperCase() === 'YES';
}

/**
 * Format extracted personalization as readable text
 */
export function formatExtracted(extracted: ExtractedPersonalization): string {
  const parts: string[] = [];

  if (extracted.name) parts.push(`Name: ${extracted.name}`);
  if (extracted.twitter) parts.push(`Twitter: ${extracted.twitter}`);
  if (extracted.linkedin) parts.push(`LinkedIn: ${extracted.linkedin}`);
  if (extracted.interests && extracted.interests.length > 0) {
    parts.push(`Interests: ${extracted.interests.join(', ')}`);
  }
  if (extracted.location) parts.push(`Location: ${extracted.location}`);
  if (extracted.timezone) parts.push(`Timezone: ${extracted.timezone}`);
  if (extracted.notes) parts.push(`Notes: ${extracted.notes}`);

  return parts.join('\n');
}

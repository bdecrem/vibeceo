/**
 * Analyze a Twitter list and find AI-related accounts
 *
 * Usage: npx tsx --env-file=.env.local scripts/analyze-twitter-list.ts
 */

import { getUserLists, getAllListMembers, type ListMember } from '../lib/twitter-client.js';
import { supabase } from '../lib/supabase.js';
import OpenAI from 'openai';

const TARGET_USERNAME = 'bartdecrem';
const TARGET_LIST_NAME = '2025';
const TARGET_LIST_ID = '1942043946483376482'; // From previous run - skip lookup to save API calls

// Keywords that suggest AI-related accounts
const AI_KEYWORDS = [
  'ai', 'artificial intelligence', 'machine learning', 'ml', 'deep learning',
  'neural', 'llm', 'gpt', 'transformer', 'nlp', 'computer vision', 'cv',
  'researcher', 'scientist', 'phd', 'professor', 'lab', 'research',
  'anthropic', 'openai', 'deepmind', 'google brain', 'meta ai', 'hugging face',
  'pytorch', 'tensorflow', 'model', 'training', 'inference',
  'agi', 'alignment', 'safety', 'robotics', 'autonomous',
];

function hasAIKeywords(member: ListMember): boolean {
  const text = `${member.name} ${member.description || ''}`.toLowerCase();
  return AI_KEYWORDS.some(kw => text.includes(kw));
}

async function classifyWithAI(members: ListMember[]): Promise<Map<string, { isAI: boolean; confidence: number; reason: string }>> {
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const results = new Map<string, { isAI: boolean; confidence: number; reason: string }>();

  // Batch process in groups of 20
  const batchSize = 20;
  for (let i = 0; i < members.length; i += batchSize) {
    const batch = members.slice(i, i + batchSize);

    const prompt = `Analyze these Twitter accounts and determine which ones are primarily about AI, machine learning, or related research.

For each account, respond with JSON in this exact format:
{
  "username": "...",
  "isAI": true/false,
  "confidence": 0.0-1.0,
  "reason": "brief reason"
}

Accounts to analyze:
${batch.map(m => `@${m.username} (${m.name}): ${m.description || 'no bio'}`).join('\n')}

Return a JSON array of objects, one per account. Only include accounts, no other text.`;

    try {
      const response = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.3,
      });

      const content = response.choices[0]?.message?.content || '[]';
      // Extract JSON from response
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]) as Array<{
          username: string;
          isAI: boolean;
          confidence: number;
          reason: string;
        }>;

        for (const item of parsed) {
          results.set(item.username.toLowerCase().replace('@', ''), {
            isAI: item.isAI,
            confidence: item.confidence,
            reason: item.reason,
          });
        }
      }
    } catch (error) {
      console.error(`Error classifying batch ${i}-${i + batchSize}:`, error);
    }

    // Rate limit
    if (i + batchSize < members.length) {
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }

  return results;
}

async function getExistingSources(): Promise<Set<string>> {
  const { data } = await supabase
    .from('content_sources')
    .select('identifier')
    .eq('agent_slug', 'ai-twitter-daily')
    .eq('source_type', 'twitter_account');

  return new Set((data || []).map(row => row.identifier.toLowerCase()));
}

async function main() {
  console.log(`\n📋 Using cached list ID for "${TARGET_LIST_NAME}" (ID: ${TARGET_LIST_ID})...\n`);

  // Step 1: Get all members
  const membersResult = await getAllListMembers(TARGET_LIST_ID);
  if (!membersResult.success) {
    console.error('Failed to get members:', membersResult.error);
    process.exit(1);
  }

  const members = membersResult.members || [];
  console.log(`Fetched ${members.length} members\n`);

  // Step 4: Get existing sources to avoid duplicates
  const existingSources = await getExistingSources();
  console.log(`Already tracking ${existingSources.size} accounts\n`);

  // Step 5: Filter to new members only
  const newMembers = members.filter(m => !existingSources.has(m.username.toLowerCase()));
  console.log(`${newMembers.length} new accounts to analyze\n`);

  if (newMembers.length === 0) {
    console.log('No new accounts to add!');
    process.exit(0);
  }

  // Step 6: Quick keyword filter
  const keywordMatches = newMembers.filter(hasAIKeywords);
  const nonKeywordMatches = newMembers.filter(m => !hasAIKeywords(m));

  console.log(`Keyword matches: ${keywordMatches.length}`);
  console.log(`Need AI classification: ${nonKeywordMatches.length}\n`);

  // Step 7: Use AI to classify ambiguous accounts
  console.log('🤖 Classifying accounts with AI...\n');
  const aiClassifications = await classifyWithAI(nonKeywordMatches);

  // Step 8: Combine results
  const aiAccounts: Array<{ member: ListMember; confidence: number; reason: string }> = [];

  // Add keyword matches with high confidence
  for (const member of keywordMatches) {
    aiAccounts.push({ member, confidence: 0.9, reason: 'AI keywords in bio' });
  }

  // Add AI-classified matches
  for (const member of nonKeywordMatches) {
    const classification = aiClassifications.get(member.username.toLowerCase());
    if (classification?.isAI && classification.confidence >= 0.7) {
      aiAccounts.push({ member, confidence: classification.confidence, reason: classification.reason });
    }
  }

  // Sort by confidence
  aiAccounts.sort((a, b) => b.confidence - a.confidence);

  console.log(`\n✅ Found ${aiAccounts.length} AI-related accounts:\n`);

  for (const { member, confidence, reason } of aiAccounts) {
    console.log(`@${member.username} (${member.name})`);
    console.log(`  Confidence: ${(confidence * 100).toFixed(0)}% - ${reason}`);
    console.log(`  Bio: ${member.description?.substring(0, 100) || 'no bio'}...`);
    console.log();
  }

  // Step 9: Output SQL for adding to content_sources
  console.log('\n📝 SQL to add these accounts:\n');
  console.log('INSERT INTO content_sources (agent_slug, source_type, identifier, display_name, priority, active) VALUES');

  const values = aiAccounts.map(({ member, confidence }, i) => {
    const priority = Math.round(50 + confidence * 30); // 50-80 based on confidence
    const isLast = i === aiAccounts.length - 1;
    return `  ('ai-twitter-daily', 'twitter_account', '${member.username}', '${member.name.replace(/'/g, "''")}', ${priority}, true)${isLast ? ';' : ','}`;
  });

  console.log(values.join('\n'));

  console.log(`\n\nTotal: ${aiAccounts.length} accounts to add`);
}

main().catch(console.error);

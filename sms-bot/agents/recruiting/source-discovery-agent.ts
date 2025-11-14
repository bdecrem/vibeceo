/**
 * Source Discovery Agent (REDESIGNED)
 *
 * Finds MINEABLE CHANNELS where we can discover candidate profiles daily.
 * A good channel has:
 * 1. Discoverable people with profiles (not just content)
 * 2. Contact/portfolio info accessible (Twitter bio, GitHub profile, etc.)
 * 3. Regular new activity (new posts, contributions, etc.)
 *
 * Example: "community manager for kochi" might discover:
 * - Twitter search: #buildinpublic + AI → @jane_builds (5K followers, runs AI Discord)
 * - Buildspace Discord: Top contributors → John Doe (built 500-person community)
 * - GitHub: LangChain contributors → Sarah (AI community contributions)
 */

import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || '',
});

export interface ChannelExample {
  name: string; // Person's name or handle
  url: string; // Link to their profile
  description: string; // Why they're a good example (1 sentence)
}

export interface DiscoveredChannel {
  channelType: 'twitter-search' | 'github-users' | 'platform' | 'community' | 'job-board';
  name: string; // Channel name (e.g., "Twitter #buildinpublic + AI")
  searchQuery?: string; // For searchable platforms
  platformUrl?: string; // Base URL for the platform
  description: string; // How to mine this channel (2-3 sentences)
  example?: ChannelExample | null; // Optional - ONLY if AI knows a real verified person
  score: number; // 1-10, how valuable
  reason: string; // Why this channel is good for finding candidates
}

export interface ExplorationResponse {
  understanding: string; // What the agent understands about the role/company
  channelIdeas: string[]; // General ideas about where to look (no specific channels yet)
  clarifyingQuestions?: string[]; // 1-2 questions to ask (optional)
  conversationalMessage: string; // The full message to send to user
  proposedQuery?: string; // After 2 rounds, propose refined query
  isQueryProposal: boolean; // True if proposing query (waiting for APPROVE)
  readyForChannels: boolean; // True if ready to propose specific channels
}

export interface ConversationalResponse {
  understanding: string; // What the agent understands about the role/company
  clarifyingQuestions?: string[]; // 0-2 questions to ask (optional)
  channels: DiscoveredChannel[]; // 5-10 proposed channels with examples
  needsRefinement: boolean; // True if questions need answering first
}

export interface DiscoveredSources {
  channels: DiscoveredChannel[];
  discoveredAt: string;
  nextDiscovery: string;
  conversationalResponse?: ConversationalResponse; // For initial setup
  // Legacy fields for backward compatibility (old format)
  youtube?: DiscoveredSource[];
  twitter?: DiscoveredSource[];
  github?: DiscoveredSource[];
  rss?: DiscoveredSource[];
  other?: DiscoveredSource[];
}

// Legacy type for backward compatibility with collectors
export interface DiscoveredSource {
  type: 'youtube' | 'twitter' | 'rss' | 'github' | 'other';
  name: string;
  url?: string;
  channelId?: string;
  handle?: string;
  repo?: string;
  score: number;
  reason: string;
}

/**
 * PHASE 1: Explore channel ideas conversationally
 * Discusses general types of places to find candidates, asks clarifying questions
 * Does NOT propose specific channels yet
 */
export async function exploreChannelIdeas(
  query: string,
  context?: {
    companyInfo?: string;
    conversationHistory?: Array<{role: string; content: string}>;
    roundCount?: number;
  }
): Promise<ExplorationResponse> {
  const roundCount = context?.roundCount || 0;
  console.log(`[Channel Discovery] Phase 1 - Round ${roundCount + 1} for: "${query}"`);

  const historyContext = context?.conversationHistory
    ? context.conversationHistory.map(m => `${m.role}: ${m.content}`).join('\n')
    : '';

  // After 2 rounds, propose a refined query
  const isProposingQuery = roundCount >= 2;

  const prompt = isProposingQuery
    ? `You are a talent sourcing expert helping find candidates.

ORIGINAL QUERY: "${query}"

${context?.companyInfo ? `COMPANY CONTEXT: ${context.companyInfo}` : ''}

CONVERSATION SO FAR:
${historyContext}

Your task:
Based on the conversation above, propose a REFINED RECRUITING QUERY that is DETAILED and SPECIFIC.

The query MUST include:
1. Role/title and key responsibilities
2. Critical skills or experience (specific technologies, platforms, domains)
3. Location/geography requirements
4. Work arrangement (full-time, part-time, intern, contract)
5. Key qualifications that differentiate good candidates

Example GOOD refined queries (DETAILED):
- "Computer Science students in USA/Canada for part-time coding on AI SMS agent project - must have shipped at least one software project, actively coding (any stack), genuinely excited about AI/LLMs, willing to learn our codebase"
- "Community managers with 2+ years Twitter/Discord experience building developer communities at AI/crypto startups, proven track record growing engaged audiences 1K+ members"
- "Senior mobile app designers specializing in fintech with 3+ years Figma/Sketch, shipped 5+ consumer apps, portfolio showing payment flows and data visualization"

BAD queries (TOO BRIEF):
- "CS students who code and like AI"
- "Community managers for startups"
- "Mobile designers with Figma"

Return JSON:
{
  "understanding": "Summary of what we learned",
  "proposedQuery": "The DETAILED refined recruiting query (be specific and substantive)",
  "conversationalMessage": "Message with the full detailed query and asking for APPROVE or adjustments",
  "isQueryProposal": true,
  "readyForChannels": false
}

CRITICAL SMS CONSTRAINTS for conversationalMessage:
- Maximum 500 characters total (increased from 400 to fit detail)
- DO NOT use asterisks or markdown formatting - write naturally
- Write complete sentences - do NOT let message get cut off mid-sentence
- Be DETAILED and SPECIFIC - include all the requirements
- Format: "Based on our chat: [FULL DETAILED QUERY]. Reply APPROVE to find channels, or tell me what to adjust."`
    : `You are a talent sourcing expert helping find candidates.

RECRUITING QUERY: "${query}"

${context?.companyInfo ? `COMPANY CONTEXT: ${context.companyInfo}` : ''}
${historyContext ? `\nCONVERSATION SO FAR:\n${historyContext}` : ''}

ROUND ${roundCount + 1} of 2 exploration rounds.

Your task for THIS PHASE:
1. Show understanding of what kind of person they're looking for
2. Discuss GENERAL IDEAS about where to find these people (types of platforms, communities, etc.)
3. Ask 1-2 clarifying questions to refine the search

CRITICAL SMS CONSTRAINTS:
- Maximum 500 characters total for conversationalMessage (strict limit)
- You are NOT proposing specific channels yet - just discussing ideas!
- DO NOT use asterisks or markdown formatting - write naturally
- Be CONCISE - SMS messages have strict length limits
- Write complete sentences - do NOT let messages get cut off mid-sentence
- If you can't fit everything, say LESS but say it COMPLETELY

GOOD responses:
- "For community managers in AI/tech, I'd look at Twitter searches for #buildinpublic, Discord communities like Buildspace. Two quick questions: (1) Focus mainly on Twitter/Discord or also LinkedIn? (2) Startup experience required?"

BAD responses:
- Listing specific Twitter accounts or channels
- Providing concrete examples with URLs
- Jumping straight to a numbered list of 10 channels
- Using bullet points or asterisks for questions

IMPORTANT: Format questions as "Two quick questions: (1) ... (2) ..." or "Quick question: ..." if only one.

Return JSON:
{
  "understanding": "Brief summary of what role/person you're looking for",
  "channelIdeas": ["Twitter #buildinpublic searches", "Discord communities", "GitHub contributors"],
  "clarifyingQuestions": ["Focus on Twitter/Discord or also LinkedIn?", "Startup experience required?"],
  "conversationalMessage": "The friendly message (combines understanding + ideas + numbered questions)",
  "isQueryProposal": false,
  "readyForChannels": false
}`;

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-5-20250929',
    max_tokens: 4000,
    messages: [{ role: 'user', content: prompt }],
  });

  const content = response.content[0];
  if (content.type !== 'text') {
    throw new Error('Unexpected response type from Claude');
  }

  const text = content.text.trim();
  console.log('[Channel Discovery] Phase 1 response preview:', text.substring(0, 500));

  // Parse JSON
  const jsonMatch = text.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/) || text.match(/(\{[\s\S]*\})/);
  if (!jsonMatch) {
    throw new Error('No JSON found in response');
  }

  const exploration = JSON.parse(jsonMatch[1]) as ExplorationResponse;

  return exploration;
}

/**
 * Run the Python agent to discover channels with real examples using web search
 */
async function runChannelDiscoveryAgent(
  refinedQuery: string,
  companyInfo?: string,
  additionalConstraints?: string[]
): Promise<DiscoveredChannel[]> {
  const { spawn } = await import('node:child_process');
  const path = await import('node:path');

  const PYTHON_BIN = process.env.PYTHON_BIN || path.join(process.cwd(), '..', '.venv', 'bin', 'python3');
  const AGENT_SCRIPT = path.join(process.cwd(), 'agents', 'recruiting', 'discover-channels-agent.py');

  return new Promise((resolve, reject) => {
    const args = [
      AGENT_SCRIPT,
      '--query', refinedQuery,
    ];

    if (companyInfo) {
      args.push('--company-context', companyInfo);
    }

    if (additionalConstraints && additionalConstraints.length > 0) {
      args.push('--constraints', ...additionalConstraints);
    }

    console.log(`[Channel Discovery Agent] Running: ${PYTHON_BIN} ${args.join(' ')}`);

    const agentProcess = spawn(PYTHON_BIN, args);
    let stdout = '';
    let stderr = '';

    agentProcess.stdout.on('data', (data) => {
      stdout += data.toString();
      console.log(`[Channel Discovery Agent] ${data.toString().trim()}`);
    });

    agentProcess.stderr.on('data', (data) => {
      stderr += data.toString();
      console.error(`[Channel Discovery Agent Error] ${data.toString().trim()}`);
    });

    agentProcess.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(`Agent exited with code ${code}: ${stderr}`));
        return;
      }

      try {
        // Parse last JSON line
        const lines = stdout.split(/\r?\n/).filter(l => l.trim());
        const lastLine = lines[lines.length - 1];
        const result = JSON.parse(lastLine);

        if (result.status === 'error') {
          reject(new Error(result.error));
          return;
        }

        resolve(result.channels || []);
      } catch (e) {
        reject(new Error(`Failed to parse agent output: ${e}`));
      }
    });
  });
}

/**
 * PHASE 2: Propose specific channels with real examples
 * Now uses Python agent with web search to find REAL candidates
 */
export async function proposeSpecificChannels(
  query: string,
  context?: {
    companyInfo?: string;
    conversationHistory?: Array<{role: string; content: string}>;
    refinedQuery?: string;
    additionalConstraints?: string[];
  }
): Promise<ConversationalResponse> {
  console.log(`[Channel Discovery] Phase 2 - Discovering channels with web search for: "${query}"`);

  const finalQuery = context?.refinedQuery || query;
  const constraints = context?.additionalConstraints || [];

  if (constraints.length > 0) {
    console.log(`[Channel Discovery] Additional constraints: ${constraints.join(', ')}`);
  }

  // Run the Python agent with web search to find REAL examples
  const channels = await runChannelDiscoveryAgent(finalQuery, context?.companyInfo, constraints);

  if (!channels || channels.length === 0) {
    throw new Error('No channels with verified examples found');
  }

  // CRITICAL: Validate that EVERY channel has a real example with URL
  const invalidChannels = channels.filter(ch => !ch.example || !ch.example.url || !ch.example.name);
  if (invalidChannels.length > 0) {
    console.error('[Channel Discovery] Channels without examples:', invalidChannels.map(ch => ch.name));
    throw new Error(`Agent returned ${invalidChannels.length} channels without verified examples. Every channel MUST have a real candidate example.`);
  }

  return {
    understanding: `Found ${channels.length} channels with real verified examples`,
    channels,
    needsRefinement: false,
  };
}

/**
 * LEGACY: Old non-agentic version (keeping for reference but not used)
 */
async function proposeSpecificChannelsOld(
  query: string,
  context?: { companyInfo?: string; conversationHistory?: Array<{role: string; content: string}>; refinedQuery?: string }
): Promise<ConversationalResponse> {
  console.log(`[Channel Discovery] Phase 2 - Proposing specific channels for: "${query}"`);

  const historyContext = context?.conversationHistory
    ? context.conversationHistory.map(m => `${m.role}: ${m.content}`).join('\n')
    : '';

  const finalQuery = context?.refinedQuery || query;

  const prompt = `You are a talent sourcing expert helping find candidates.

RECRUITING QUERY: "${finalQuery}"

${context?.companyInfo ? `COMPANY CONTEXT: ${context.companyInfo}` : ''}
${historyContext ? `\nCONVERSATION SO FAR:\n${historyContext}` : ''}

Your task for THIS PHASE:
Based on the conversation above, propose 3-5 SPECIFIC MINEABLE CHANNELS where we can find candidate profiles.
Each channel MUST have a REAL VERIFIED EXAMPLE - an actual person who exists with a working profile link.

CRITICAL CONSTRAINTS:
- ONLY 3-5 channels maximum (to fit in SMS - 670 characters total including all text)
- A "channel" is NOT content to read - it's a PLACE TO FIND PEOPLE with profiles
- Keep channel names SHORT (max 40 chars each)
- Keep example names SHORT (max 25 chars each)
- Keep descriptions BRIEF (max 60 chars each)

ABSOLUTELY CRITICAL - EXAMPLE URLs:
- You MUST provide REAL URLs to ACTUAL people who exist
- DO NOT make up fake URLs like "https://twitter.com/example_user"
- DO NOT invent plausible-looking but fake profiles
- If you don't know a real example, DO NOT GUESS - omit that channel entirely
- Every URL will be checked - fake URLs are COMPLETELY UNACCEPTABLE

GOOD channels (mineable for profiles):
- Twitter search: "#buildinpublic + community" → People tweeting (have bios/links)
- Behance search: "mobile app design" → Designers posting work (have portfolios)
- GitHub users: "langchain contributors" → Engineers (have profiles/emails)
- Buildspace Discord: Active members → Students building projects
- IndieHackers: Top contributors → Founders with profiles
- LinkedIn search: "Senior Engineer at Startup" → Professional profiles

BAD channels (NOT mineable):
- @individual_person (one person, not a stream of candidates)
- RSS feed (articles, no people)
- YouTube channel to watch (videos, can't extract profiles)
- Blog to read (content, no profiles)

For EACH channel, provide:
1. SHORT channel name (max 40 chars)
2. BRIEF description of where/how to find people (max 60 chars)
3. ONE REAL EXAMPLE - ONLY if you are CERTAIN the person/URL exists (from your training data or knowledge)

CRITICAL:
- NO asterisks or markdown - write naturally
- COMPLETE words only - no cut-off mid-word
- Total formatted output MUST fit in 670 characters
- If you cannot provide a VERIFIED REAL example for a channel, provide example as null

Return JSON:
{
  "understanding": "Brief (max 100 chars)",
  "channels": [
    {
      "channelType": "twitter-search" | "github-users" | "platform" | "community" | "job-board",
      "name": "Twitter #buildinpublic",
      "description": "People tweeting about building products",
      "example": {
        "name": "@username (MUST be real person from your knowledge)",
        "url": "https://twitter.com/username (MUST work)",
        "description": "Brief context (max 30 chars)"
      } OR null if you don't know a real verified example,
      "score": 9,
      "reason": "High concentration of builders"
    }
  ],
  "needsRefinement": false
}

WARNING: Fake/made-up example URLs are UNACCEPTABLE. Use null if unsure!
Remember: 3-5 channels only, keep ALL text SHORT to fit 670 char limit!`;

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-5-20250929',
    max_tokens: 8000,
    messages: [{ role: 'user', content: prompt }],
  });

  const content = response.content[0];
  if (content.type !== 'text') {
    throw new Error('Unexpected response type from Claude');
  }

  const text = content.text.trim();
  console.log('[Channel Discovery] Response preview:', text.substring(0, 500));

  // Parse JSON
  const jsonMatch = text.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/) || text.match(/(\{[\s\S]*\})/);
  if (!jsonMatch) {
    throw new Error('No JSON found in response');
  }

  const conversational = JSON.parse(jsonMatch[1]) as ConversationalResponse;

  // Validate channels exist (examples are now optional)
  if (!conversational.channels || conversational.channels.length === 0) {
    throw new Error('No channels returned');
  }

  // Log warning if examples are missing or potentially fake
  conversational.channels.forEach((ch, i) => {
    if (!ch.example || !ch.example.url) {
      console.log(`[Channel Discovery] Warning: Channel ${i + 1} (${ch.name}) has no example`);
    }
  });

  return conversational;
}

/**
 * Legacy function - kept for compatibility, wraps Phase 2 (proposeSpecificChannels)
 */
export async function discoverChannelsConversational(
  query: string,
  context?: { companyInfo?: string; additionalContext?: string }
): Promise<ConversationalResponse> {
  console.log('[Channel Discovery] Legacy function - calling proposeSpecificChannels');
  return proposeSpecificChannels(query, context);
}

/**
 * Legacy function - kept for compatibility, wraps new conversational version
 */
export async function discoverSources(query: string): Promise<DiscoveredSources> {
  const conversational = await proposeSpecificChannels(query);

  return {
    channels: conversational.channels,
    discoveredAt: new Date().toISOString(),
    nextDiscovery: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    conversationalResponse: conversational,
  };
}

/**
 * Check if channels need refresh (every 30 days)
 */
export function shouldRefreshChannels(discoveredSources: DiscoveredSources): boolean {
  if (!discoveredSources?.nextDiscovery) {
    return true;
  }

  const nextDiscovery = new Date(discoveredSources.nextDiscovery);
  const now = new Date();

  return now >= nextDiscovery;
}

/**
 * Legacy function - kept for backward compatibility
 */
export function shouldRefreshSources(preferences: any): boolean {
  if (!preferences?.sources?.nextDiscovery) {
    return true;
  }

  const nextDiscovery = new Date(preferences.sources.nextDiscovery);
  const now = new Date();

  return now >= nextDiscovery;
}

/**
 * Legacy function - kept for backward compatibility
 * In new system, we just replace all channels, no merging
 */
export function mergeSources(
  existing: DiscoveredSources,
  newSources: DiscoveredSources
): DiscoveredSources {
  return newSources; // Just return new sources
}

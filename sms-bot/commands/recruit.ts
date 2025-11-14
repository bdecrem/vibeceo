/**
 * RECRUIT Command Handler
 *
 * Commands:
 * - RECRUIT {criteria}          → Start new recruiting project with setup flow
 * - RECRUIT                     → Show today's candidates for active project
 * - SCORE 1:5 2:3 3:4...        → Score candidates (triggers learning)
 * - RECRUIT LIST                → List all projects
 * - RECRUIT SWITCH {project#}   → Switch active project
 * - RECRUIT SETTINGS            → View current project settings
 * - RECRUIT STOP                → Stop daily reports for current project
 */

import type { CommandContext } from './types.js';
import { getSubscriber } from '../lib/subscribers.js';
import { supabase } from '../lib/supabase.js';
import {
  isSubscribedToAgent,
  subscribeToAgent,
  unsubscribeFromAgent,
} from '../lib/agent-subscriptions.js';
import { storeThreadState, clearThreadState, type ActiveThread } from '../lib/context-loader.js';
import { v4 as uuidv4 } from 'uuid';
import { countUCS2CodeUnits, MAX_SMS_CODE_UNITS } from '../lib/utils/sms-length.js';

const RECRUIT_PREFIX = 'RECRUIT';
const SCORE_PREFIX = 'SCORE';
export const RECRUITING_AGENT_SLUG = 'recruiting';

export interface RecruitingProject {
  query: string;
  setupComplete: boolean;
  sourcesApproved: boolean;
  channelsApproved?: boolean; // New channel-based flow
  channels?: any[]; // New channel-based flow - discovered channels
  conversationalResponse?: any; // New channel-based flow - exploration response
  learnedProfile: Record<string, any>;
  notificationTime: string;
  active: boolean;
  createdAt: string;
}

export interface RecruitingPreferences {
  projects: Record<string, RecruitingProject>;
  activeProjectId?: string;
}

/**
 * Get recruiting preferences for a subscriber
 */
async function getRecruitingPreferences(subscriberId: string): Promise<RecruitingPreferences> {
  const { data } = await supabase
    .from('agent_subscriptions')
    .select('preferences')
    .eq('subscriber_id', subscriberId)
    .eq('agent_slug', RECRUITING_AGENT_SLUG)
    .single();

  if (!data?.preferences) {
    return { projects: {} };
  }

  const prefs = data.preferences as any;

  // Ensure projects field exists even if preferences object exists
  if (!prefs.projects) {
    prefs.projects = {};
  }

  return prefs as RecruitingPreferences;
}

/**
 * Update recruiting preferences
 */
async function updateRecruitingPreferences(
  subscriberId: string,
  preferences: RecruitingPreferences
): Promise<void> {
  await supabase
    .from('agent_subscriptions')
    .update({ preferences })
    .eq('subscriber_id', subscriberId)
    .eq('agent_slug', RECRUITING_AGENT_SLUG);
}

/**
 * Remove asterisks from message (no truncation - AI should fit within limit)
 */
function cleanSmsFormatting(message: string): string {
  return message.replace(/\*/g, '');
}

/**
 * Format conversational channel discovery response for SMS
 * Includes understanding, questions (if any), and channels with examples
 * AI should generate channels that fit within SMS limit - no truncation
 */
function formatConversationalChannels(conversational: any, query: string): string {
  let message = `Finding: "${query.substring(0, 40)}${query.length > 40 ? '...' : ''}"\n\n`;

  // Add understanding (remove asterisks)
  const understanding = conversational.understanding.replace(/\*/g, '');
  message += `${understanding}\n\n`;

  // Add clarifying questions if present (remove asterisks)
  if (conversational.clarifyingQuestions && conversational.clarifyingQuestions.length > 0) {
    message += `Questions:\n`;
    conversational.clarifyingQuestions.forEach((q: string, i: number) => {
      const cleanQ = q.replace(/\*/g, '');
      message += `${i + 1}. ${cleanQ}\n`;
    });
    message += `\n`;
  }

  // Add channels with examples (AI should limit these to fit)
  const channels = conversational.channels;
  message += `Top ${channels.length} channels:\n\n`;

  channels.forEach((ch: any, i: number) => {
    const cleanName = ch.name.replace(/\*/g, '');

    message += `${i + 1}. ${cleanName}\n`;

    // Only show example if it exists and is not null
    if (ch.example && ch.example.url) {
      const cleanExampleName = ch.example.name.replace(/\*/g, '');
      message += `   → ${cleanExampleName}\n`;
      message += `   ${ch.example.url}\n`;
    } else {
      message += `   (Will mine this channel for profiles)\n`;
    }

    if (i < channels.length - 1) message += `\n`;
  });

  message += `\nReply YES to approve all, or 1:yes 2:no 3:yes...`;

  return message;
}

/**
 * Format discovered sources for user approval with clickable URLs (LEGACY - for old format)
 * Fits within 670 UCS-2 code units (10 SMS segments)
 */
function formatSourcesForApproval(sources: any, query: string): string {
  // Flatten all sources into one array with URLs and type labels
  const allSources: Array<{ name: string; url: string; type: string; score: number; handle?: string; channelId?: string; repo?: string }> = [];

  if (sources.youtube) {
    sources.youtube.forEach((s: any) => {
      const url = s.channelId
        ? `https://youtube.com/channel/${s.channelId}`
        : s.url || '#';
      allSources.push({ ...s, type: 'YT', url });
    });
  }
  if (sources.twitter) {
    sources.twitter.forEach((s: any) => {
      const url = s.handle && s.handle.startsWith('#')
        ? `https://twitter.com/search?q=${encodeURIComponent(s.handle)}`
        : s.handle
        ? `https://twitter.com/${s.handle.replace('@', '')}`
        : s.url || '#';
      allSources.push({ ...s, type: 'TW', url });
    });
  }
  if (sources.github) {
    sources.github.forEach((s: any) => {
      const url = s.repo
        ? `https://github.com/${s.repo}`
        : s.url || '#';
      allSources.push({ ...s, type: 'GH', url });
    });
  }
  if (sources.rss) {
    sources.rss.forEach((s: any) => {
      allSources.push({ ...s, type: 'RSS', url: s.url || '#' });
    });
  }
  if (sources.other) {
    sources.other.forEach((s: any) => {
      allSources.push({ ...s, type: 'Other', url: s.url || '#' });
    });
  }

  // Sort by score (highest first)
  const sorted = allSources.sort((a, b) => b.score - a.score);

  if (sorted.length === 0) {
    return `❌ Query too vague.\n\nTry:\n• "senior backend engineers"\n• "motion designers"\n• "react developers"`;
  }

  // Build message incrementally, staying under 670 code units
  const header = `🎯 Sources for "${query.substring(0, 40)}${query.length > 40 ? '...' : ''}"\n\n`;
  const footer = `\nReply: 1:yes 2:no 3:yes...`;

  const headerUnits = countUCS2CodeUnits(header);
  const footerUnits = countUCS2CodeUnits(footer);
  const availableUnits = MAX_SMS_CODE_UNITS - headerUnits - footerUnits - 20; // 20 unit safety margin

  let message = header;
  let currentUnits = headerUnits;
  let includedCount = 0;

  for (let i = 0; i < sorted.length; i++) {
    const source = sorted[i];
    // Format: "1. Name (TW)\n   url\n"
    const line = `${i + 1}. ${source.name} (${source.type})\n   ${source.url}\n`;
    const lineUnits = countUCS2CodeUnits(line);

    if (currentUnits + lineUnits > availableUnits) {
      break; // Stop adding sources
    }

    message += line;
    currentUnits += lineUnits;
    includedCount++;
  }

  message += footer;

  return message;
}

/**
 * Parse SCORE command: "SCORE 1:5 2:3 3:4" → {1: 5, 2: 3, 3: 4}
 */
function parseScores(scoreText: string): Record<number, number> {
  const scores: Record<number, number> = {};
  const parts = scoreText.trim().split(/\s+/);

  for (const part of parts) {
    const match = part.match(/^(\d+):(\d+)$/);
    if (match) {
      const position = parseInt(match[1], 10);
      const score = parseInt(match[2], 10);

      if (score >= 1 && score <= 5) {
        scores[position] = score;
      }
    }
  }

  return scores;
}

/**
 * Handle: RECRUIT {criteria} - Start new recruiting project
 */
async function handleNewProject(
  context: CommandContext,
  query: string
): Promise<void> {
  const { from, normalizedFrom, twilioClient, sendSmsResponse, updateLastMessageDate } = context;

  console.log(`[RECRUIT] New project request: "${query}"`);

  const subscriber = await getSubscriber(normalizedFrom);
  if (!subscriber) {
    await sendSmsResponse(from, '❌ Subscriber not found', twilioClient);
    await updateLastMessageDate(normalizedFrom);
    return;
  }

  // Subscribe to recruiting agent if not already
  await subscribeToAgent(normalizedFrom, RECRUITING_AGENT_SLUG);

  // Get current preferences
  const prefs = await getRecruitingPreferences(subscriber.id);
  const projectIds = Object.keys(prefs.projects);

  // MAX 3 PROJECTS: Delete oldest if at limit
  if (projectIds.length >= 3) {
    // Find oldest project by createdAt
    const sorted = projectIds.sort((a, b) => {
      const dateA = new Date(prefs.projects[a].createdAt || 0);
      const dateB = new Date(prefs.projects[b].createdAt || 0);
      return dateA.getTime() - dateB.getTime();
    });

    const oldestId = sorted[0];
    const deletedQuery = prefs.projects[oldestId].query;

    // Delete associated candidates from database
    const { error: deleteError } = await supabase
      .from('recruiting_candidates')
      .delete()
      .eq('project_id', oldestId);

    if (deleteError) {
      console.error(`[RECRUIT] Failed to delete candidates for project ${oldestId}:`, deleteError);
    }

    // Delete the oldest project
    delete prefs.projects[oldestId];

    // If the deleted project was active, clear activeProjectId
    if (prefs.activeProjectId === oldestId) {
      prefs.activeProjectId = undefined;
    }

    console.log(`[RECRUIT] Deleted oldest project: "${deletedQuery}"`);

    // Notify user
    await sendSmsResponse(
      from,
      `📋 Max 3 projects reached.\n\nRemoved oldest: "${deletedQuery.slice(0, 50)}${deletedQuery.length > 50 ? '...' : ''}"`,
      twilioClient
    );
  }

  // Create new project
  const projectId = uuidv4();

  prefs.projects[projectId] = {
    query,
    setupComplete: false,
    sourcesApproved: false,
    learnedProfile: {},
    notificationTime: '09:00',
    active: false,  // Not active until setup complete
    createdAt: new Date().toISOString(),
  };

  prefs.activeProjectId = projectId;

  await updateRecruitingPreferences(subscriber.id, prefs);

  // Notify that we're starting exploration
  await sendSmsResponse(
    from,
    `🔍 Talent Radar activated!\n\nLet's find great candidates for: "${query}"`,
    twilioClient
  );

  // PHASE 1: Explore channel ideas conversationally (import dynamically)
  const { exploreChannelIdeas } = await import('../agents/recruiting/source-discovery-agent.js');

  // Add context about Kochi.to if relevant
  const companyInfo = query.toLowerCase().includes('kochi')
    ? 'Kochi.to is an AI assistant over SMS - a personal agent platform for daily tasks and information.'
    : undefined;

  const exploration = await exploreChannelIdeas(query, { companyInfo });

  // Send conversational exploration message (remove asterisks only)
  const cleanedMessage = cleanSmsFormatting(exploration.conversationalMessage);
  await sendSmsResponse(from, cleanedMessage, twilioClient);

  // Store thread state for continuing the conversation
  await storeThreadState(subscriber.id, {
    handler: 'recruit-exploration',
    topic: query,
    context: {
      projectId,
      query,
      companyInfo,
      exploration,
      conversationHistory: [
        { role: 'user', content: query },
        { role: 'assistant', content: exploration.conversationalMessage },
      ],
      roundCount: 0, // Starting at round 0 (first exchange)
      isQueryProposal: exploration.isQueryProposal,
      proposedQuery: exploration.proposedQuery,
    },
  });

  await updateLastMessageDate(normalizedFrom);
}

/**
 * Handle continuation of recruit exploration conversation
 * Called when user responds during Phase 1 (before proposing specific channels)
 */
export async function handleRecruitExploration(
  context: CommandContext,
  activeThread?: ActiveThread
): Promise<boolean> {
  // Check if we have an active recruit-exploration thread
  if (!activeThread || activeThread.handler !== 'recruit-exploration') {
    return false; // Not handling a recruit exploration
  }

  const { from, normalizedFrom, twilioClient, sendSmsResponse, updateLastMessageDate, message } = context;

  console.log(`[RECRUIT] Handling exploration continuation: "${message}"`);

  const subscriber = await getSubscriber(normalizedFrom);
  if (!subscriber) {
    return false;
  }

  // Extract thread context
  const { projectId, query, companyInfo, conversationHistory, roundCount = 0, isQueryProposal = false, proposedQuery } = activeThread.fullContext;

  // Add user's message to conversation history
  const updatedHistory = [
    ...(conversationHistory || []),
    { role: 'user', content: message },
  ];

  // Check if user approved the proposed query
  const isApprove = message.trim().toUpperCase() === 'APPROVE';

  if (isApprove && isQueryProposal) {
    // PHASE 2: Propose specific channels using refined query
    await sendSmsResponse(
      from,
      `Great! Finding specific channels with examples...`,
      twilioClient
    );

    try {
      const { proposeSpecificChannels } = await import('../agents/recruiting/source-discovery-agent.js');

      // Use proposedQuery if available, otherwise original query
      const finalQuery = proposedQuery || query;

      const conversational = await proposeSpecificChannels(finalQuery, {
        companyInfo,
        conversationHistory: updatedHistory,
        refinedQuery: finalQuery,
      });

      // Store channels in project
      const prefs = await getRecruitingPreferences(subscriber.id);
      if (prefs.projects[projectId]) {
        prefs.projects[projectId] = {
          ...prefs.projects[projectId],
          channels: conversational.channels,
          conversationalResponse: conversational,
        };
        await updateRecruitingPreferences(subscriber.id, prefs);
      }

      // Format and send channel proposals
      const channelsMessage = formatConversationalChannels(conversational, query);
      await sendSmsResponse(from, channelsMessage, twilioClient);

      // Update thread state to channel approval phase
      await storeThreadState(subscriber.id, {
        handler: 'recruit-source-approval',
        topic: query,
        context: {
          projectId,
          query,
          channels: conversational.channels,
          conversational,
        },
      });

      await updateLastMessageDate(normalizedFrom);
      return true;
    } catch (error) {
      console.error('[RECRUIT] Channel discovery agent failed:', error);

      await sendSmsResponse(
        from,
        `Sorry, I had trouble finding channels for "${query.substring(0, 40)}${query.length > 40 ? '...' : ''}"\n\nError: ${error instanceof Error ? error.message : 'Unknown error'}\n\nTry RECRUIT HELP for guidance.`,
        twilioClient
      );

      // Clear the thread state so user can start fresh
      await clearThreadState(subscriber.id);
      await updateLastMessageDate(normalizedFrom);
      return true;
    }
  }

  // Not ready yet - continue exploration conversation
  try {
    const { exploreChannelIdeas } = await import('../agents/recruiting/source-discovery-agent.js');

    // Increment round count
    const newRoundCount = roundCount + 1;

    const exploration = await exploreChannelIdeas(query, {
      companyInfo,
      conversationHistory: updatedHistory,
      roundCount: newRoundCount,
    });

    // Send continued exploration message (remove asterisks only)
    const cleanedMessage = cleanSmsFormatting(exploration.conversationalMessage);
    await sendSmsResponse(from, cleanedMessage, twilioClient);

    // Update conversation history
    updatedHistory.push({ role: 'assistant', content: exploration.conversationalMessage });

    // Update thread state with new conversation
    await storeThreadState(subscriber.id, {
      handler: 'recruit-exploration',
      topic: query,
      context: {
        projectId,
        query,
        companyInfo,
        exploration,
        conversationHistory: updatedHistory,
        roundCount: newRoundCount,
        isQueryProposal: exploration.isQueryProposal,
        proposedQuery: exploration.proposedQuery,
      },
    });

    await updateLastMessageDate(normalizedFrom);
    return true;
  } catch (error) {
    console.error('[RECRUIT] Exploration failed:', error);

    await sendSmsResponse(
      from,
      `Sorry, I had trouble processing your recruiting request.\n\nError: ${error instanceof Error ? error.message : 'Unknown error'}\n\nTry RECRUIT HELP for guidance.`,
      twilioClient
    );

    // Clear the thread state so user can start fresh
    await clearThreadState(subscriber.id);
    await updateLastMessageDate(normalizedFrom);
    return true;
  }
}

/**
 * Handle: SCORE 1:5 2:3 3:4... - Score candidates
 */
async function handleScore(
  context: CommandContext,
  scoreText: string
): Promise<void> {
  const { from, normalizedFrom, twilioClient, sendSmsResponse, updateLastMessageDate } = context;

  console.log(`[RECRUIT] Score request: "${scoreText}"`);

  const subscriber = await getSubscriber(normalizedFrom);
  if (!subscriber) {
    await sendSmsResponse(from, '❌ Subscriber not found', twilioClient);
    await updateLastMessageDate(normalizedFrom);
    return;
  }

  const prefs = await getRecruitingPreferences(subscriber.id);
  const projectId = prefs.activeProjectId;

  if (!projectId) {
    await sendSmsResponse(
      from,
      '❌ No active recruiting project\n\nStart one: RECRUIT {criteria}',
      twilioClient
    );
    await updateLastMessageDate(normalizedFrom);
    return;
  }

  // Parse scores
  const scores = parseScores(scoreText);
  const scoreCount = Object.keys(scores).length;

  if (scoreCount === 0) {
    await sendSmsResponse(
      from,
      '❌ Invalid score format\n\nUse: SCORE 1:5 2:3 3:4...\nwhere position:rating (1-5)',
      twilioClient
    );
    await updateLastMessageDate(normalizedFrom);
    return;
  }

  console.log(`[RECRUIT] Parsed ${scoreCount} scores:`, scores);

  // Get latest unscored candidates for this project
  const { data: candidates } = await supabase
    .from('recruiting_candidates')
    .select('*')
    .eq('project_id', projectId)
    .not('report_date', 'is', null)
    .order('report_date', { ascending: false })
    .order('position_in_report', { ascending: true })
    .limit(10);

  if (!candidates || candidates.length === 0) {
    await sendSmsResponse(
      from,
      '❌ No candidates to score\n\nStart a project: RECRUIT {criteria}',
      twilioClient
    );
    await updateLastMessageDate(normalizedFrom);
    return;
  }

  // Apply scores to candidates by position
  let updatedCount = 0;
  for (const [position, score] of Object.entries(scores)) {
    const candidate = candidates.find(c => c.position_in_report === position);
    if (candidate) {
      await supabase
        .from('recruiting_candidates')
        .update({
          user_score: score,
          scored_at: new Date().toISOString(),
        })
        .eq('id', candidate.id);

      updatedCount++;
    }
  }

  console.log(`[RECRUIT] Updated ${updatedCount} candidate scores`);

  // Check if this completes setup (all 10 scored)
  const { data: allCandidates } = await supabase
    .from('recruiting_candidates')
    .select('user_score')
    .eq('project_id', projectId)
    .eq('report_type', 'setup');

  const allScored = allCandidates?.every(c => c.user_score !== null) || false;

  if (allScored && !prefs.projects[projectId].setupComplete) {
    // Run AI learning
    await sendSmsResponse(
      from,
      `✅ All scored! Analyzing your preferences...`,
      twilioClient
    );

    const { analyzeProjectScores } = await import('../agents/recruiting/index.js');
    await analyzeProjectScores(subscriber.id, projectId);

    // Mark setup complete and activate project
    prefs.projects[projectId].setupComplete = true;
    prefs.projects[projectId].active = true;
    await updateRecruitingPreferences(subscriber.id, prefs);

    await sendSmsResponse(
      from,
      `🎯 Setup complete!\n\nDaily candidates start tomorrow at 9 AM.\n\n💡 Commands:\n• RECRUIT - Today's candidates\n• RECRUIT SETTINGS - View settings`,
      twilioClient
    );
  } else {
    await sendSmsResponse(
      from,
      `✅ Scored ${updatedCount} candidates!\n\nI'll use this to improve future matches.`,
      twilioClient
    );
  }

  await updateLastMessageDate(normalizedFrom);
}

/**
 * Parse source approval/rejection response
 * Format: "1:yes 2:no 3:yes..." or just "YES" for all
 * Returns: { approved: Set<number>, rejected: Set<number> }
 */
function parseSourceApprovals(message: string, totalSources: number): {
  approved: Set<number>;
  rejected: Set<number>;
  approveAll: boolean;
} {
  const normalized = message.toUpperCase().trim();

  // Handle simple "YES" or "APPROVE" - approve all
  if (normalized === 'YES' || normalized === 'APPROVE' || normalized === 'YES!' || normalized === 'YES.') {
    return {
      approved: new Set(Array.from({ length: totalSources }, (_, i) => i + 1)),
      rejected: new Set(),
      approveAll: true,
    };
  }

  const approved = new Set<number>();
  const rejected = new Set<number>();

  // Parse "1:yes 2:no 3:yes" format
  const parts = normalized.split(/\s+/);
  for (const part of parts) {
    const match = part.match(/^(\d+):(YES|Y|NO|N)$/);
    if (match) {
      const num = parseInt(match[1], 10);
      const decision = match[2];

      if (num >= 1 && num <= totalSources) {
        if (decision === 'YES' || decision === 'Y') {
          approved.add(num);
        } else {
          rejected.add(num);
        }
      }
    }
  }

  return { approved, rejected, approveAll: false };
}

/**
 * Check if message is YES or source approval response for pending recruitment
 * Called from orchestrated-routing when message matches approval patterns
 */
export async function handleRecruitConfirmation(
  context: CommandContext,
  activeThread?: ActiveThread
): Promise<boolean> {
  // Check if we have an active recruit-source-approval thread
  if (!activeThread || activeThread.handler !== 'recruit-source-approval') {
    return false; // Not handling a recruit source approval
  }

  const { from, normalizedFrom, twilioClient, sendSmsResponse, updateLastMessageDate, message } = context;

  console.log(`[RECRUIT] Handling source approval confirmation`);

  const subscriber = await getSubscriber(normalizedFrom);
  if (!subscriber) {
    return false;
  }

  // Extract thread context - check for new format (channels) or old format (sources)
  const { projectId, query, channels, conversational } = activeThread.fullContext;

  if (!channels || !Array.isArray(channels)) {
    await sendSmsResponse(
      from,
      '❌ No channels found. Try: RECRUIT {criteria}',
      twilioClient
    );
    await updateLastMessageDate(normalizedFrom);
    return true;
  }

  const totalChannels = channels.length;

  // Parse user's approval/rejection response
  const { approved, rejected, approveAll } = parseSourceApprovals(message, totalChannels);

  if (approved.size === 0 && rejected.size === 0 && !approveAll) {
    await sendSmsResponse(
      from,
      '❌ Invalid format\n\nReply: YES (all) or 1:yes 2:no 3:yes...',
      twilioClient
    );
    await updateLastMessageDate(normalizedFrom);
    return true;
  }

  // If some channels were rejected, regenerate them
  if (rejected.size > 0) {
    await sendSmsResponse(
      from,
      `🔄 Regenerating ${rejected.size} rejected channel${rejected.size > 1 ? 's' : ''}...`,
      twilioClient
    );

    // Filter approved channels
    const approvedChannels = channels.filter((_: any, i: number) => approved.has(i + 1));

    // Generate new channels to replace rejected ones
    const { discoverChannelsConversational } = await import('../agents/recruiting/source-discovery-agent.js');

    const companyInfo = query.toLowerCase().includes('kochi')
      ? 'Kochi.to is an AI assistant over SMS - a personal agent platform for daily tasks and information.'
      : undefined;

    const newConversational = await discoverChannelsConversational(query, { companyInfo });

    // Merge approved channels with new channels (take only what we need)
    const neededCount = rejected.size;
    const newChannels = newConversational.channels.slice(0, neededCount);
    const mergedChannels = [...approvedChannels, ...newChannels];

    // Update project with merged channels
    const prefs = await getRecruitingPreferences(subscriber.id);
    if (prefs.projects[projectId]) {
      prefs.projects[projectId] = {
        ...prefs.projects[projectId],
        channels: mergedChannels,
      };
      await updateRecruitingPreferences(subscriber.id, prefs);
    }

    // Send new channels for approval
    const channelsMessage = formatConversationalChannels(
      { ...conversational, channels: mergedChannels },
      query
    );
    await sendSmsResponse(from, channelsMessage, twilioClient);

    // Update thread state with new channels
    await storeThreadState(subscriber.id, {
      handler: 'recruit-source-approval',
      topic: query,
      context: {
        projectId,
        query,
        channels: mergedChannels,
        conversational: { ...conversational, channels: mergedChannels },
      },
    });

    await updateLastMessageDate(normalizedFrom);
    return true;
  }

  // All approved - proceed to candidate collection
  const prefs = await getRecruitingPreferences(subscriber.id);
  if (prefs.projects[projectId]) {
    prefs.projects[projectId] = {
      ...prefs.projects[projectId],
      channelsApproved: true,
    };
    await updateRecruitingPreferences(subscriber.id, prefs);
  }

  // Clear thread state
  await clearThreadState(subscriber.id);

  // Notify user we're ready to start mining
  const totalApproved = approved.size;
  await sendSmsResponse(
    from,
    `✅ Approved ${totalApproved} channel${totalApproved > 1 ? 's' : ''}!\n\nI'll start mining these channels for candidates.\n\nFirst batch coming soon...`,
    twilioClient
  );

  // TODO: Trigger candidate collection from channels
  // This will be implemented next - for now just acknowledge approval

  await updateLastMessageDate(normalizedFrom);
  return true;
}

/**
 * Handle: RECRUIT (no args) - Show today's candidates
 */
async function handleShowToday(context: CommandContext): Promise<void> {
  const { from, normalizedFrom, twilioClient, sendSmsResponse, sendChunkedSmsResponse, updateLastMessageDate } = context;

  const subscriber = await getSubscriber(normalizedFrom);
  if (!subscriber) {
    await sendSmsResponse(from, '❌ Subscriber not found', twilioClient);
    await updateLastMessageDate(normalizedFrom);
    return;
  }

  const prefs = await getRecruitingPreferences(subscriber.id);
  const projectId = prefs.activeProjectId;

  if (!projectId) {
    await sendSmsResponse(
      from,
      '❌ No active project\n\nStart one: RECRUIT {criteria}',
      twilioClient
    );
    await updateLastMessageDate(normalizedFrom);
    return;
  }

  const project = prefs.projects[projectId];
  if (!project.setupComplete) {
    // Check what stage we're at
    if (!project.channelsApproved) {
      // Still in exploration/channel approval
      await sendSmsResponse(
        from,
        `🔍 Channel discovery in progress\n\nQuery: "${project.query}"\n\nPlease continue the conversation to approve channels.`,
        twilioClient
      );
    } else {
      // Channels approved, waiting for candidates
      await sendSmsResponse(
        from,
        `⏳ Collecting initial candidates\n\nQuery: "${project.query}"\n\nYou'll receive the first batch soon for scoring.`,
        twilioClient
      );
    }
    await updateLastMessageDate(normalizedFrom);
    return;
  }

  // Get today's candidates
  const today = new Date().toISOString().split('T')[0];
  const { data: candidates } = await supabase
    .from('recruiting_candidates')
    .select('*')
    .eq('project_id', projectId)
    .eq('report_date', today)
    .eq('report_type', 'daily')
    .order('position_in_report', { ascending: true });

  if (!candidates || candidates.length === 0) {
    await sendSmsResponse(
      from,
      `📊 No candidates yet today\n\nQuery: "${project.query}"\n\nDaily reports at 9 AM PT`,
      twilioClient
    );
    await updateLastMessageDate(normalizedFrom);
    return;
  }

  // Format candidates
  let message = `🎯 Your Daily Candidates (${candidates.length})\n\n`;

  for (const candidate of candidates) {
    message += `${candidate.position_in_report}. ${candidate.name}\n`;
    if (candidate.title) message += `   ${candidate.title}`;
    if (candidate.company) message += ` @ ${candidate.company}`;
    if (candidate.location) message += `\n   ${candidate.location}`;
    message += '\n';

    if (candidate.linkedin_url) message += `   🔗 ${candidate.linkedin_url}\n`;
    if (candidate.twitter_handle) message += `   🐦 ${candidate.twitter_handle}\n`;

    if (candidate.match_reason) {
      message += `   \n   ✨ ${candidate.match_reason}\n`;
    }

    if (candidate.recent_activity) {
      message += `   📍 ${candidate.recent_activity}\n`;
    }

    message += '\n';
  }

  message += '---\n💡 Score: SCORE 1:5 2:3 3:4...';

  await sendChunkedSmsResponse(from, message, twilioClient);
  await updateLastMessageDate(normalizedFrom);
}

/**
 * Handle: RECRUIT LIST - List all projects
 */
async function handleListProjects(context: CommandContext): Promise<void> {
  const { from, normalizedFrom, twilioClient, sendSmsResponse, updateLastMessageDate } = context;

  const subscriber = await getSubscriber(normalizedFrom);
  if (!subscriber) {
    await sendSmsResponse(from, '❌ Subscriber not found', twilioClient);
    await updateLastMessageDate(normalizedFrom);
    return;
  }

  const prefs = await getRecruitingPreferences(subscriber.id);
  const projectIds = Object.keys(prefs.projects);

  if (projectIds.length === 0) {
    await sendSmsResponse(
      from,
      '📋 No recruiting projects yet\n\nCreate one: RECRUIT {criteria}',
      twilioClient
    );
    await updateLastMessageDate(normalizedFrom);
    return;
  }

  let message = `📋 Your Recruiting Projects (${projectIds.length})\n\n`;

  for (let i = 0; i < projectIds.length; i++) {
    const projectId = projectIds[i];
    const project = prefs.projects[projectId];
    const isActive = projectId === prefs.activeProjectId;

    message += `${i + 1}. ${project.query}\n`;
    message += `   Status: ${project.setupComplete ? 'Active' : 'Setup pending'}\n`;
    if (isActive) message += `   👉 Currently active\n`;
    message += '\n';
  }

  message += '💡 Switch: RECRUIT SWITCH {number}';

  await sendSmsResponse(from, message, twilioClient);
  await updateLastMessageDate(normalizedFrom);
}

/**
 * Handle: RECRUIT SETTINGS - View settings
 */
async function handleSettings(context: CommandContext): Promise<void> {
  const { from, normalizedFrom, twilioClient, sendSmsResponse, updateLastMessageDate } = context;

  const subscriber = await getSubscriber(normalizedFrom);
  if (!subscriber) {
    await sendSmsResponse(from, '❌ Subscriber not found', twilioClient);
    await updateLastMessageDate(normalizedFrom);
    return;
  }

  const prefs = await getRecruitingPreferences(subscriber.id);
  const projectId = prefs.activeProjectId;

  if (!projectId) {
    await sendSmsResponse(
      from,
      '❌ No active project\n\nCreate one: RECRUIT {criteria}',
      twilioClient
    );
    await updateLastMessageDate(normalizedFrom);
    return;
  }

  const project = prefs.projects[projectId];

  let message = `📊 Recruiting Settings\n\n`;
  message += `Query: "${project.query}"\n`;
  message += `Status: ${project.setupComplete ? 'Active' : 'Setup pending'}\n`;
  message += `Time: ${project.notificationTime} PT\n\n`;

  if (project.setupComplete && project.learnedProfile) {
    message += `📈 Learned Preferences:\n`;
    // Show learned profile summary
    const profile = project.learnedProfile;
    if (profile.preferred_company_sizes) {
      message += `• Companies: ${profile.preferred_company_sizes.join(', ')}\n`;
    }
    if (profile.preferred_seniority) {
      message += `• Level: ${profile.preferred_seniority}\n`;
    }
  }

  message += `\n💡 Commands:\n`;
  message += `• RECRUIT LIST - All projects\n`;
  message += `• RECRUIT STOP - Stop daily reports`;

  await sendSmsResponse(from, message, twilioClient);
  await updateLastMessageDate(normalizedFrom);
}

/**
 * Handle: RECRUIT HELP - Show help
 */
async function handleHelp(context: CommandContext): Promise<void> {
  const { from, normalizedFrom, twilioClient, sendSmsResponse, updateLastMessageDate } = context;

  const helpMessage = `🎯 Talent Radar Commands

📋 Starting:
• RECRUIT {criteria}
  Find candidates
  Example: "RECRUIT senior backend engineers at startups"

⭐ Scoring:
• SCORE 1:5 2:3 3:4...
  Rate candidates 1-5
  (5=great match, 1=poor)

📊 Managing:
• RECRUIT - Today's candidates
• RECRUIT LIST - All projects
• RECRUIT SETTINGS - View settings
• RECRUIT STOP - Pause daily reports

💡 Tips:
• Be specific in queries
• Score all 10 to activate daily reports
• Reports sent at 9 AM PT
• Each query = separate project`;

  await sendSmsResponse(from, helpMessage, twilioClient);
  await updateLastMessageDate(normalizedFrom);
}

/**
 * Handle: RECRUIT STOP - Stop daily reports
 */
async function handleStop(context: CommandContext): Promise<void> {
  const { from, normalizedFrom, twilioClient, sendSmsResponse, updateLastMessageDate } = context;

  const subscriber = await getSubscriber(normalizedFrom);
  if (!subscriber) {
    await sendSmsResponse(from, '❌ Subscriber not found', twilioClient);
    await updateLastMessageDate(normalizedFrom);
    return;
  }

  const prefs = await getRecruitingPreferences(subscriber.id);
  const projectId = prefs.activeProjectId;

  if (!projectId) {
    await sendSmsResponse(
      from,
      '❌ No active project to stop',
      twilioClient
    );
    await updateLastMessageDate(normalizedFrom);
    return;
  }

  // Deactivate project
  prefs.projects[projectId].active = false;
  await updateRecruitingPreferences(subscriber.id, prefs);

  await sendSmsResponse(
    from,
    `✅ Daily reports stopped for this project\n\nReactivate: RECRUIT SWITCH {number}`,
    twilioClient
  );
  await updateLastMessageDate(normalizedFrom);
}

/**
 * Main RECRUIT command handler
 */
export async function handleRECRUITCommand(
  message: string,
  context: CommandContext
): Promise<void> {
  const messageUpper = message.toUpperCase();
  const messageTrimmed = messageUpper.trim();

  // Handle SCORE command (separate from RECRUIT)
  if (messageUpper.startsWith(SCORE_PREFIX)) {
    const scoreText = message.slice(SCORE_PREFIX.length).trim();
    await handleScore(context, scoreText);
    return;
  }

  // Parse RECRUIT command
  const content = message.slice(RECRUIT_PREFIX.length).trim();

  if (!content) {
    // RECRUIT (no args) - show today's candidates
    await handleShowToday(context);
  } else if (content.toUpperCase() === 'HELP') {
    await handleHelp(context);
  } else if (content.toUpperCase() === 'LIST') {
    await handleListProjects(context);
  } else if (content.toUpperCase() === 'SETTINGS') {
    await handleSettings(context);
  } else if (content.toUpperCase() === 'STOP') {
    await handleStop(context);
  } else if (content.toUpperCase().startsWith('SWITCH ')) {
    // TODO: Implement project switching
    await context.sendSmsResponse(
      context.from,
      '🚧 Project switching coming soon',
      context.twilioClient
    );
    await context.updateLastMessageDate(context.normalizedFrom);
  } else {
    // RECRUIT {criteria} - new project
    await handleNewProject(context, content);
  }
}

/**
 * CommandHandler export for registration
 */
export const recruitCommandHandler: import('./types.js').CommandHandler = {
  name: 'recruit',
  matches(context: CommandContext): boolean {
    const msgUpper = context.messageUpper.trim();

    // Match RECRUIT commands and SCORE commands
    if (msgUpper.startsWith(RECRUIT_PREFIX) || msgUpper.startsWith(SCORE_PREFIX)) {
      return true;
    }

    // Also match standalone "YES" for source approval
    if (msgUpper === 'YES' || msgUpper === 'YES!' || msgUpper === 'YES.') {
      return true;
    }

    return false;
  },
  async handle(context: CommandContext): Promise<boolean> {
    await handleRECRUITCommand(context.message, context);
    return true;
  },
};

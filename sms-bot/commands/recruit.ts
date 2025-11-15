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
 *
 * CONTINUOUS LEARNING SYSTEM:
 * ===========================
 * This system learns from ALL user feedback to continuously refine recruiting:
 *
 * 1. EXPLORATION PHASE (Phase 1)
 *    - User provides initial query: "RECRUIT {criteria}"
 *    - System asks clarifying questions (up to 2 rounds)
 *    - ALL Q&A saved to project.explorationHistory[]
 *    - System proposes detailed spec → user approves with "APPROVE"
 *    - Spec saved to project.refinedSpec
 *
 * 2. CHANNEL DISCOVERY (Phase 2)
 *    - Python agent uses WebSearch to find real candidate examples
 *    - User can: YES, 1:yes 2:no, OR provide feedback
 *    - Feedback → saved to project.userRefinements[], updates spec, re-runs discovery
 *    - Approved channels → project.channels[] with tracking fields
 *
 * 3. CANDIDATE SCORING (Ongoing)
 *    - User scores candidates 1-5
 *    - Scores update channel.avgCandidateScore (which channels work best?)
 *    - Scores feed into AI analysis → project.learnedProfile
 *    - High/low score patterns → project.candidateFeedback.scorePatterns
 *
 * 4. CONTINUOUS REFINEMENT (Future)
 *    - User can provide feedback anytime → project.userRefinements[]
 *    - Feedback updates refined spec
 *    - Next daily search uses updated spec + learned profile
 *    - Low-performing channels can be replaced
 *
 * STORED DATA (in agent_subscriptions.preferences.projects[projectId]):
 * - explorationHistory: Full Q&A from Phase 1
 * - refinedSpec: AI-generated detailed recruiting spec (updated with feedback)
 * - userRefinements[]: All user feedback with timestamps and context
 * - channels[]: Discovered channels with performance metrics
 * - candidateFeedback: Score patterns and notes about specific candidates
 * - learnedProfile: AI-extracted preferences from scores
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
  // Original user query
  query: string;

  // Phase 1: Exploration history (full Q&A during initial discovery)
  explorationHistory?: Array<{
    role: 'user' | 'assistant';
    content: string;
    timestamp: string;
  }>;

  // Phase 2: AI-generated refined spec (the detailed recruiting spec created from exploration)
  refinedSpec?: {
    specText: string; // The full detailed spec
    createdAt: string;
    lastUpdatedAt?: string;
  };

  // User refinements (ongoing feedback that updates the spec)
  userRefinements?: Array<{
    feedback: string; // User's feedback text
    timestamp: string;
    context: 'exploration' | 'channel_approval' | 'candidate_feedback' | 'general';
    // When spec was updated based on this
    appliedToSpecAt?: string;
  }>;

  // Channels discovered and their performance
  channels?: Array<{
    // Channel info
    name: string;
    channelType: string;
    description: string;
    example?: any;
    score: number;
    reason: string;

    // Channel performance tracking
    addedAt: string;
    candidatesFound?: number;
    candidatesScored?: number;
    avgCandidateScore?: number; // Average user score of candidates from this channel
    userApproved?: boolean;
    userRejected?: boolean;
    rejectionReason?: string;
  }>;

  // Approved channels for daily candidate collection
  approvedChannels?: Array<any>;

  // Candidate feedback tracking
  candidateFeedback?: {
    // Score patterns (what scores mean)
    scorePatterns?: {
      highScoreReasons: string[]; // Why users give 4-5 stars
      lowScoreReasons: string[]; // Why users give 1-2 stars
    };

    // Individual candidate notes
    candidateNotes?: Array<{
      candidateId: string;
      candidateName: string;
      note: string;
      timestamp: string;
    }>;
  };

  // Learned profile (AI-extracted preferences from scores)
  learnedProfile: Record<string, any>;

  // Candidates collected from channels
  candidates?: Candidate[];
  pendingCandidates?: Candidate[]; // Candidates awaiting user scoring
  scoredCandidates?: Candidate[]; // Candidates user has scored

  // Setup state
  setupComplete: boolean;
  sourcesApproved: boolean;
  channelsApproved?: boolean;
  conversationalResponse?: any; // Legacy - can phase out

  // Operational
  notificationTime: string;
  active: boolean;
  createdAt: string;
  lastRefinedAt?: string; // When spec was last updated
  lastCandidateSentAt?: string; // When last batch of candidates was sent
  durationDays?: number; // How many days to run daily candidate collection (default 7)
  startedAt?: string; // When the project started (for duration tracking)
  lastReportUrl?: string | null; // URL to latest candidate report
  lastReportShortLink?: string | null; // Short link to latest candidate report
}

export interface Candidate {
  id: string; // Unique ID for tracking
  name: string;
  profileUrl: string; // Primary profile (LinkedIn, GitHub, etc.)
  channelSource: string; // Which channel found them
  bio: string; // 2-3 sentence summary
  githubUrl?: string;
  portfolioUrl?: string;
  twitterUrl?: string;
  location: string;
  score: number; // AI's initial fit score (1-10)
  matchReason: string; // Why they're a good fit
  userScore?: number; // User's score after review (1-5)
  userNotes?: string; // User's notes about this candidate
  status: 'pending' | 'scored' | 'contacted' | 'rejected' | 'hired';
  addedAt: string;
  scoredAt?: string;
}

export interface RecruitingPreferences {
  projects: Record<string, RecruitingProject>;
  activeProjectId?: string;
}

/**
 * Update channel performance metrics when candidates are found/scored
 */
async function updateChannelPerformance(
  subscriberId: string,
  projectId: string,
  channelName: string,
  metrics: {
    candidatesFound?: number;
    candidateScore?: number; // Score for one candidate
  }
): Promise<void> {
  const prefs = await getRecruitingPreferences(subscriberId);
  const project = prefs.projects[projectId];

  if (!project || !project.channels) return;

  const channel = project.channels.find(ch => ch.name === channelName);
  if (!channel) return;

  // Update metrics
  if (metrics.candidatesFound !== undefined) {
    channel.candidatesFound = (channel.candidatesFound || 0) + metrics.candidatesFound;
  }

  if (metrics.candidateScore !== undefined) {
    channel.candidatesScored = (channel.candidatesScored || 0) + 1;

    // Update average score
    const currentAvg = channel.avgCandidateScore || 0;
    const currentCount = channel.candidatesScored - 1; // We just incremented
    channel.avgCandidateScore = ((currentAvg * currentCount) + metrics.candidateScore) / channel.candidatesScored;
  }

  await updateRecruitingPreferences(subscriberId, prefs);
  console.log(`[RECRUIT] Updated channel "${channelName}" metrics:`, {
    found: channel.candidatesFound,
    scored: channel.candidatesScored,
    avgScore: channel.avgCandidateScore?.toFixed(2),
  });
}

/**
 * Add a note about a specific candidate
 */
async function addCandidateNote(
  subscriberId: string,
  projectId: string,
  candidateId: string,
  candidateName: string,
  note: string
): Promise<void> {
  const prefs = await getRecruitingPreferences(subscriberId);
  const project = prefs.projects[projectId];

  if (!project) return;

  if (!project.candidateFeedback) {
    project.candidateFeedback = {
      scorePatterns: { highScoreReasons: [], lowScoreReasons: [] },
      candidateNotes: [],
    };
  }

  if (!project.candidateFeedback.candidateNotes) {
    project.candidateFeedback.candidateNotes = [];
  }

  project.candidateFeedback.candidateNotes.push({
    candidateId,
    candidateName,
    note,
    timestamp: new Date().toISOString(),
  });

  await updateRecruitingPreferences(subscriberId, prefs);
}

/**
 * Get recruiting preferences for a subscriber
 */
export async function getRecruitingPreferences(subscriberId: string): Promise<RecruitingPreferences> {
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
export async function updateRecruitingPreferences(
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

  // Add channels with examples (every channel is guaranteed to have a real example)
  const channels = conversational.channels;
  message += `Top ${channels.length} channels:\n\n`;

  channels.forEach((ch: any, i: number) => {
    const cleanName = ch.name.replace(/\*/g, '');

    message += `${i + 1}. ${cleanName}\n`;

    // Every channel MUST have an example (validated by source-discovery-agent)
    const cleanExampleName = ch.example.name.replace(/\*/g, '');
    message += `   → ${cleanExampleName}\n`;
    message += `   ${ch.example.url}\n`;

    if (i < channels.length - 1) message += `\n`;
  });

  message += `\nReply:\n• YES - approve all\n• 1:yes 2:no... - pick some\n• Or give feedback to refine`;

  return message;
}

/**
 * Format candidates for user scoring (UPDATED: Only send #1 + shortlink)
 * This function now formats ONLY the first candidate to avoid SMS chaos
 */
function formatCandidatesForScoring(totalCount: number, firstCandidate: Candidate): string {
  let message = `🎯 Found ${totalCount} candidate${totalCount > 1 ? 's' : ''}!\n\n`;

  message += `1. ${firstCandidate.name}\n`;
  message += `   ${firstCandidate.location}\n`;

  // Add GitHub/Portfolio if available
  if (firstCandidate.portfolioUrl) {
    message += `   ${firstCandidate.portfolioUrl}\n`;
  }
  if (firstCandidate.githubUrl) {
    message += `   GitHub: ${firstCandidate.githubUrl}\n`;
  }

  // Bio (keep it very short for SMS)
  const shortBio = firstCandidate.bio.substring(0, 80) + (firstCandidate.bio.length > 80 ? '...' : '');
  message += `   ${shortBio}\n`;

  message += `\nScore 1-5:\n`;
  message += `5 = Perfect fit, contact now\n`;
  message += `1 = Not a good match`;

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

  // Create new project with comprehensive tracking
  const projectId = uuidv4();

  prefs.projects[projectId] = {
    query,
    explorationHistory: [], // Will be populated during exploration
    refinedSpec: undefined, // Will be created when user approves refined query
    userRefinements: [], // Will accumulate feedback over time
    channels: [], // Will be populated when channels are discovered
    candidateFeedback: {
      scorePatterns: {
        highScoreReasons: [],
        lowScoreReasons: [],
      },
      candidateNotes: [],
    },
    learnedProfile: {},
    setupComplete: false,
    sourcesApproved: false,
    channelsApproved: false,
    notificationTime: '11:00', // Default to 11am PT
    active: false,  // Not active until setup complete
    createdAt: new Date().toISOString(),
    durationDays: 7, // Default to 7 days of daily candidate collection
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

  // Save to exploration history
  const timestamp = new Date().toISOString();
  const explorationPrefs = await getRecruitingPreferences(subscriber.id);
  if (explorationPrefs.projects[projectId]) {
    if (!explorationPrefs.projects[projectId].explorationHistory) {
      explorationPrefs.projects[projectId].explorationHistory = [];
    }
    explorationPrefs.projects[projectId].explorationHistory.push(
      { role: 'user', content: query, timestamp },
      { role: 'assistant', content: exploration.conversationalMessage, timestamp }
    );
    await updateRecruitingPreferences(subscriber.id, explorationPrefs);
  }

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

      // Save the approved refined spec
      const timestamp = new Date().toISOString();
      const prefs = await getRecruitingPreferences(subscriber.id);
      if (prefs.projects[projectId]) {
        // Save exploration history
        if (!prefs.projects[projectId].explorationHistory) {
          prefs.projects[projectId].explorationHistory = [];
        }
        prefs.projects[projectId].explorationHistory.push(
          { role: 'user', content: message, timestamp }
        );

        // Save the refined spec
        prefs.projects[projectId].refinedSpec = {
          specText: finalQuery,
          createdAt: timestamp,
        };
        prefs.projects[projectId].lastRefinedAt = timestamp;

        await updateRecruitingPreferences(subscriber.id, prefs);
      }

      const conversational = await proposeSpecificChannels(finalQuery, {
        companyInfo,
        conversationHistory: updatedHistory,
        refinedQuery: finalQuery,
      });

      // Store channels in project with tracking fields
      const channelsWithTracking = conversational.channels.map(ch => ({
        ...ch,
        addedAt: timestamp,
        candidatesFound: 0,
        candidatesScored: 0,
        avgCandidateScore: undefined,
        userApproved: undefined,
        userRejected: undefined,
        rejectionReason: undefined,
      }));

      const updatedPrefs = await getRecruitingPreferences(subscriber.id);
      if (updatedPrefs.projects[projectId]) {
        updatedPrefs.projects[projectId] = {
          ...updatedPrefs.projects[projectId],
          channels: channelsWithTracking,
          conversationalResponse: conversational,
        };
        await updateRecruitingPreferences(subscriber.id, updatedPrefs);
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
          conversationHistory: updatedHistory,
          additionalConstraints: [],  // Start with no additional constraints
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

    // Save to exploration history in project
    const timestamp = new Date().toISOString();
    const prefs = await getRecruitingPreferences(subscriber.id);
    if (prefs.projects[projectId]) {
      if (!prefs.projects[projectId].explorationHistory) {
        prefs.projects[projectId].explorationHistory = [];
      }
      prefs.projects[projectId].explorationHistory.push(
        { role: 'user', content: message, timestamp },
        { role: 'assistant', content: exploration.conversationalMessage, timestamp }
      );
      await updateRecruitingPreferences(subscriber.id, prefs);
    }

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
    prefs.projects[projectId].startedAt = new Date().toISOString();
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

  console.log(`[RECRUIT] Handling source approval confirmation: "${message}"`);

  const subscriber = await getSubscriber(normalizedFrom);
  if (!subscriber) {
    return false;
  }

  // Extract thread context - check for new format (channels) or old format (sources)
  const { projectId, query, channels, conversational, conversationHistory = [], additionalConstraints = [] } = activeThread.fullContext;

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

  // Check if this is additional feedback/refinement (not a simple approval)
  const messageUpper = message.trim().toUpperCase();
  const isSimpleApproval = messageUpper === 'YES' || messageUpper === 'YES!' || messageUpper === 'YES.' || messageUpper === 'APPROVE';
  const isNumberedApproval = /^\d+:(yes|no|y|n)/i.test(message.trim());

  // If it's feedback/refinement (not approval), re-run channel discovery with constraints
  if (!isSimpleApproval && !isNumberedApproval) {
    console.log(`[RECRUIT] User provided feedback, re-running channel discovery with additional constraint`);

    await sendSmsResponse(
      from,
      `Got it - incorporating your feedback and finding new channels...`,
      twilioClient
    );

    // Save user refinement and update spec
    const timestamp = new Date().toISOString();
    const prefs = await getRecruitingPreferences(subscriber.id);
    if (prefs.projects[projectId]) {
      // Save this refinement
      if (!prefs.projects[projectId].userRefinements) {
        prefs.projects[projectId].userRefinements = [];
      }
      prefs.projects[projectId].userRefinements.push({
        feedback: message,
        timestamp,
        context: 'channel_approval',
        appliedToSpecAt: timestamp, // Will update spec now
      });

      // Update the refined spec to incorporate this feedback
      if (prefs.projects[projectId].refinedSpec) {
        const currentSpec = prefs.projects[projectId].refinedSpec.specText;
        const updatedSpec = `${currentSpec}\n\nADDITIONAL REQUIREMENT: ${message}`;
        prefs.projects[projectId].refinedSpec = {
          ...prefs.projects[projectId].refinedSpec,
          specText: updatedSpec,
          lastUpdatedAt: timestamp,
        };
        prefs.projects[projectId].lastRefinedAt = timestamp;
      }

      await updateRecruitingPreferences(subscriber.id, prefs);
    }

    // Add this constraint to the list
    const newConstraints = [...additionalConstraints, message];

    try {
      const { proposeSpecificChannels } = await import('../agents/recruiting/source-discovery-agent.js');

      const companyInfo = query.toLowerCase().includes('kochi')
        ? 'Kochi.to is an AI assistant over SMS - a personal agent platform for daily tasks and information.'
        : undefined;

      // Re-run channel discovery with additional constraints
      const refinedConversational = await proposeSpecificChannels(query, {
        companyInfo,
        conversationHistory: [...conversationHistory, { role: 'user', content: message }],
        refinedQuery: query,
        additionalConstraints: newConstraints,
      });

      // Store updated channels in project with tracking
      const channelsWithTracking = refinedConversational.channels.map(ch => ({
        ...ch,
        addedAt: timestamp,
        candidatesFound: 0,
        candidatesScored: 0,
        avgCandidateScore: undefined,
        userApproved: undefined,
        userRejected: undefined,
        rejectionReason: undefined,
      }));

      const updatedPrefs = await getRecruitingPreferences(subscriber.id);
      if (updatedPrefs.projects[projectId]) {
        updatedPrefs.projects[projectId] = {
          ...updatedPrefs.projects[projectId],
          channels: channelsWithTracking,
          conversationalResponse: refinedConversational,
        };
        await updateRecruitingPreferences(subscriber.id, updatedPrefs);
      }

      // Format and send new channel proposals
      const channelsMessage = formatConversationalChannels(refinedConversational, query);
      await sendSmsResponse(from, channelsMessage, twilioClient);

      // Update thread state with new channels and constraints
      await storeThreadState(subscriber.id, {
        handler: 'recruit-source-approval',
        topic: query,
        context: {
          projectId,
          query,
          channels: refinedConversational.channels,
          conversational: refinedConversational,
          conversationHistory: [...conversationHistory, { role: 'user', content: message }],
          additionalConstraints: newConstraints,
        },
      });

      await updateLastMessageDate(normalizedFrom);
      return true;
    } catch (error) {
      console.error('[RECRUIT] Channel refinement failed:', error);

      await sendSmsResponse(
        from,
        `Sorry, I had trouble refining the channels.\n\nError: ${error instanceof Error ? error.message : 'Unknown error'}\n\nTry YES to approve current channels, or 1:yes 2:no...`,
        twilioClient
      );

      await updateLastMessageDate(normalizedFrom);
      return true;
    }
  }

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
    `✅ Approved ${totalApproved} channel${totalApproved > 1 ? 's' : ''}!\n\nMining ${totalApproved} channels for candidates now...`,
    twilioClient
  );

  // Trigger candidate collection from approved channels
  try {
    const approvedChannels = channels.filter((_, i) => approved.has(i));

    // Get the refined spec
    const project = prefs.projects[projectId];
    const refinedSpec = project.refinedSpec?.specText || query;

    // Run the Python agent to collect candidates
    const candidates = await runCandidateCollectionAgent(refinedSpec, approvedChannels);

    console.log(`[RECRUIT] Collected ${candidates.length} candidates from ${approvedChannels.length} channels`);

    // Store candidates in project
    const updatedPrefs = await getRecruitingPreferences(subscriber.id);
    if (updatedPrefs.projects[projectId]) {
      updatedPrefs.projects[projectId] = {
        ...updatedPrefs.projects[projectId],
        candidates: candidates,
        pendingCandidates: candidates.slice(0, 10), // First 10 for initial scoring
        setupComplete: true, // Mark setup as complete
        startedAt: new Date().toISOString(), // Track when daily collection starts
        active: true, // Activate daily candidate collection
      };
      await updateRecruitingPreferences(subscriber.id, updatedPrefs);
    }

    // Generate and store report
    const today = new Date().toISOString().split('T')[0];
    let reportShortLink: string | null = null;

    try {
      const { generateAndStoreRecruitingReport } = await import('../agents/recruiting/report-generator.js');
      const project = updatedPrefs.projects[projectId];

      const reportResult = await generateAndStoreRecruitingReport({
        project,
        candidates,
        date: today,
        reportType: 'setup',
      });

      reportShortLink = reportResult.shortLink;

      // Store report link in project
      project.lastReportUrl = reportResult.stored.publicUrl || null;
      project.lastReportShortLink = reportShortLink;
      await updateRecruitingPreferences(subscriber.id, updatedPrefs);

      console.log(`[RECRUIT] Report generated and stored: ${reportShortLink || reportResult.stored.publicUrl}`);
    } catch (error) {
      console.error('[RECRUIT] Failed to generate report:', error);
      // Continue even if report generation fails
    }

    // Send ONLY first candidate + shortlink to avoid SMS chaos
    if (candidates.length > 0) {
      const firstCandidate = candidates[0];
      let candidatesMessage = formatCandidatesForScoring(candidates.length, firstCandidate);

      // Add report link (REQUIRED - full details are in the report)
      if (reportShortLink) {
        candidatesMessage += `\n\nFull report: ${reportShortLink}`;
      } else {
        candidatesMessage += `\n\n(Report link coming soon)`;
      }

      await sendSmsResponse(from, candidatesMessage, twilioClient);

      // Inform user about daily schedule
      const project = updatedPrefs.projects[projectId];
      const notificationTime = project?.notificationTime || '11:00';
      const durationDays = project?.durationDays || 7;

      await sendSmsResponse(
        from,
        `✅ Setup complete!\n\nYou'll receive ${durationDays} days of daily candidate batches at ${notificationTime} PT.\n\nYour scores help me learn your preferences over time.`,
        twilioClient
      );
    } else {
      await sendSmsResponse(
        from,
        `⚠️ Couldn't find any candidates matching your criteria yet.\n\nI'll keep looking and notify you when I find some!`,
        twilioClient
      );
    }
  } catch (error) {
    console.error('[RECRUIT] Candidate collection failed:', error);

    await sendSmsResponse(
      from,
      `⚠️ Had trouble collecting candidates.\n\nError: ${error instanceof Error ? error.message : 'Unknown error'}\n\nTry RECRUIT HELP for guidance.`,
      twilioClient
    );
  }

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

  // Get pending candidates (new channel-based system)
  const pendingCandidates = project.pendingCandidates || [];

  if (pendingCandidates.length === 0) {
    // Check if we have any candidates at all
    const allCandidates = project.candidates || [];
    if (allCandidates.length === 0) {
      await sendSmsResponse(
        from,
        `📊 No candidates yet\n\nQuery: "${project.query}"\n\nDaily batches at ${project.notificationTime || '11:00'} PT`,
        twilioClient
      );
    } else {
      // Have candidates, but none pending scoring
      await sendSmsResponse(
        from,
        `✅ All candidates scored!\n\nQuery: "${project.query}"\n\nNext batch: Tomorrow at ${project.notificationTime || '11:00'} PT`,
        twilioClient
      );
    }
    await updateLastMessageDate(normalizedFrom);
    return;
  }

  const candidates = pendingCandidates;

  // Format candidates (new channel-based format)
  let message = `🎯 Your Candidates (${candidates.length})\n\n`;

  for (let i = 0; i < candidates.length; i++) {
    const candidate = candidates[i];
    message += `${i + 1}. ${candidate.name}\n`;
    message += `   ${candidate.location}\n`;

    // Add GitHub/Portfolio if available
    if (candidate.githubUrl) {
      message += `   GitHub: ${candidate.githubUrl}\n`;
    }
    if (candidate.portfolioUrl) {
      message += `   Portfolio: ${candidate.portfolioUrl}\n`;
    }

    // Profile URL
    message += `   ${candidate.profileUrl}\n`;

    // Bio (keep it short for SMS)
    const shortBio = candidate.bio.substring(0, 100) + (candidate.bio.length > 100 ? '...' : '');
    message += `   ${shortBio}\n`;

    if (i < candidates.length - 1) message += `\n`;
  }

  message += '\n\nReply: SCORE 1:5 2:3 3:4...';

  // Add report link if available
  if (project.lastReportShortLink) {
    message += `\n\nFull report: ${project.lastReportShortLink}`;
  }

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
• RECRUIT - Show pending candidates
• RECRUIT LIST - All projects
• RECRUIT SETTINGS - View settings
• RECRUIT CONTINUE - Extend for another week
• RECRUIT STOP - Pause daily reports

💡 Tips:
• Be specific in queries
• Daily batches sent at 9 AM PT
• Runs for 7 days, then asks to continue
• Your scores help me learn preferences
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
 * Handle: RECRUIT CONTINUE - Extend project for another week
 */
async function handleContinue(context: CommandContext): Promise<void> {
  const { from, twilioClient, normalizedFrom, sendSmsResponse, updateLastMessageDate } = context;

  const subscriber = await getSubscriber(normalizedFrom);
  if (!subscriber) {
    await sendSmsResponse(from, '❌ Subscriber not found', twilioClient);
    await updateLastMessageDate(normalizedFrom);
    return;
  }

  const prefs = await getRecruitingPreferences(subscriber.id);
  const projectId = prefs.activeProjectId;

  if (!projectId || !prefs.projects[projectId]) {
    await sendSmsResponse(
      from,
      '❌ No project to continue\n\nStart a new search: RECRUIT {your criteria}',
      twilioClient
    );
    await updateLastMessageDate(normalizedFrom);
    return;
  }

  const project = prefs.projects[projectId];

  // Reactivate project and extend duration by resetting startedAt
  project.active = true;
  project.startedAt = new Date().toISOString(); // Reset to start a new 7-day cycle

  await updateRecruitingPreferences(subscriber.id, prefs);

  await sendSmsResponse(
    from,
    `✅ Extended for another week!\n\n"${project.query}"\n\nYou'll receive daily candidates for 7 more days at 9 AM PT.`,
    twilioClient
  );
  await updateLastMessageDate(normalizedFrom);
}

/**
 * Run the Python candidate collection agent
 */
async function runCandidateCollectionAgent(
  refinedSpec: string,
  channels: any[]
): Promise<Candidate[]> {
  const { spawn } = await import('node:child_process');
  const path = await import('node:path');
  const crypto = await import('node:crypto');

  const PYTHON_BIN = process.env.PYTHON_BIN || path.join(process.cwd(), '..', '.venv', 'bin', 'python3');
  const AGENT_SCRIPT = path.join(process.cwd(), 'agents', 'recruiting', 'collect-candidates-agent.py');

  return new Promise((resolve, reject) => {
    const args = [
      AGENT_SCRIPT,
      '--spec', refinedSpec,
      '--channels', JSON.stringify(channels),
    ];

    console.log(`[Candidate Collection Agent] Running: ${PYTHON_BIN} ${args[0]} --spec "${refinedSpec.substring(0, 50)}..." --channels [${channels.length} channels]`);

    const agentProcess = spawn(PYTHON_BIN, args);
    let stdout = '';
    let stderr = '';

    agentProcess.stdout.on('data', (data) => {
      stdout += data.toString();
      console.log(`[Candidate Collection Agent] ${data.toString().trim()}`);
    });

    agentProcess.stderr.on('data', (data) => {
      stderr += data.toString();
      console.error(`[Candidate Collection Agent Error] ${data.toString().trim()}`);
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

        // Convert raw candidates to Candidate objects with IDs
        const candidates: Candidate[] = (result.candidates || []).map((c: any) => ({
          id: crypto.randomUUID(),
          name: c.name,
          profileUrl: c.profileUrl,
          channelSource: c.channelSource,
          bio: c.bio,
          githubUrl: c.githubUrl,
          portfolioUrl: c.portfolioUrl,
          twitterUrl: c.twitterUrl,
          location: c.location,
          score: c.score,
          matchReason: c.matchReason,
          status: 'pending' as const,
          addedAt: new Date().toISOString(),
        }));

        resolve(candidates);
      } catch (e) {
        reject(new Error(`Failed to parse agent output: ${e}`));
      }
    });
  });
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
  } else if (content.toUpperCase() === 'CONTINUE') {
    await handleContinue(context);
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

    // Match RECRUIT commands and SCORE commands ONLY
    // Don't match "YES" - let orchestrated routing handle approval responses
    if (msgUpper.startsWith(RECRUIT_PREFIX) || msgUpper.startsWith(SCORE_PREFIX)) {
      return true;
    }

    return false;
  },
  async handle(context: CommandContext): Promise<boolean> {
    await handleRECRUITCommand(context.message, context);
    return true;
  },
};

/**
 * Export helper functions for use by recruiting agent
 */
export { updateChannelPerformance, addCandidateNote };

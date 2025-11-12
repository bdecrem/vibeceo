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
import { v4 as uuidv4 } from 'uuid';

const RECRUIT_PREFIX = 'RECRUIT';
const SCORE_PREFIX = 'SCORE';
export const RECRUITING_AGENT_SLUG = 'recruiting';

export interface RecruitingProject {
  query: string;
  setupComplete: boolean;
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

  return data.preferences as RecruitingPreferences;
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

  // Create new project
  const projectId = uuidv4();
  const prefs = await getRecruitingPreferences(subscriber.id);

  prefs.projects[projectId] = {
    query,
    setupComplete: false,
    learnedProfile: {},
    notificationTime: '09:00',
    active: false,  // Not active until setup complete
    createdAt: new Date().toISOString(),
  };

  prefs.activeProjectId = projectId;

  await updateRecruitingPreferences(subscriber.id, prefs);

  // Notify that we're starting search
  await sendSmsResponse(
    from,
    `🔍 Searching for: "${query}"\n\nFinding 10 diverse candidates... This may take 1-2 minutes.`,
    twilioClient
  );

  // Trigger setup search (import dynamically to avoid circular deps)
  const { runSetupSearch } = await import('../agents/recruiting/index.js');
  await runSetupSearch(subscriber.id, projectId, query, twilioClient, from);

  await updateLastMessageDate(normalizedFrom);
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
    await sendSmsResponse(
      from,
      `⏳ Setup in progress\n\nPlease score the initial 10 candidates using:\nSCORE 1:5 2:3 3:4...`,
      twilioClient
    );
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
    return msgUpper.startsWith(RECRUIT_PREFIX) || msgUpper.startsWith(SCORE_PREFIX);
  },
  async handle(context: CommandContext): Promise<boolean> {
    await handleRECRUITCommand(context.message, context);
    return true;
  },
};

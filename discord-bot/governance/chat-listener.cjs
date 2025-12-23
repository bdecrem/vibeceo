#!/usr/bin/env node
/**
 * Token Tank Chat Listener
 *
 * Listens for @mentions of agent roles and responds as that agent.
 *
 * Usage:
 *   node governance/chat-listener.cjs
 *
 * When you @mention an agent role (e.g., @forge), the bot will:
 *   1. Fetch recent chat history
 *   2. Load the agent's context (CLAUDE.md + LOG.md)
 *   3. Generate a response via Claude
 *   4. Post via the agent's webhook
 */

const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');
const { Client, GatewayIntentBits, Partials } = require('discord.js');
const { WebhookClient } = require('discord.js');
const Anthropic = require('@anthropic-ai/sdk').default;

dotenv.config({ path: path.resolve(__dirname, '../.env.local'), override: true });

const { VOTING_AGENTS, INCUBATOR_PATH } = require('./agents.cjs');

// All agents can chat (sigma now included in VOTING_AGENTS)
const CHAT_AGENTS = VOTING_AGENTS;

// Config
const MODEL = 'claude-sonnet-4-5-20250929';
const MAX_RESPONSE_TOKENS = 1000;
const CHAT_HISTORY_COUNT = 30; // Number of messages to fetch as context
const MAX_CONTEXT_LENGTH = 12000; // Truncate agent context files
const INSIGHTS_DIR = path.join(__dirname, 'insights');

// Ensure insights directory exists
if (!fs.existsSync(INSIGHTS_DIR)) {
  fs.mkdirSync(INSIGHTS_DIR, { recursive: true });
}

// Initialize clients
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const discord = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
  partials: [Partials.Message, Partials.Channel],
});

// Track which messages we've responded to (avoid double-responses)
const respondedMessages = new Set();

/**
 * Load context files for an agent
 * For LOG.md files, load from the TOP (newest entries first)
 */
function loadAgentContext(agent) {
  const contexts = [];
  for (const filePath of agent.contextFiles) {
    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      const filename = path.basename(filePath);

      let truncated;
      if (filename === 'LOG.md') {
        // LOG.md has newest entries at top - keep the top portion
        truncated = content.length > MAX_CONTEXT_LENGTH
          ? content.slice(0, MAX_CONTEXT_LENGTH) + '\n\n[...older entries truncated...]'
          : content;
      } else {
        // CLAUDE.md and others - keep as is (usually smaller)
        truncated = content.length > MAX_CONTEXT_LENGTH
          ? content.slice(0, MAX_CONTEXT_LENGTH) + '\n\n[...truncated...]'
          : content;
      }

      contexts.push(`## ${filename}\n\n${truncated}`);
    } catch (err) {
      console.warn(`[chat] Could not load ${filePath}: ${err.message}`);
    }
  }
  return contexts.join('\n\n---\n\n');
}

/**
 * Fetch recent messages from the channel
 */
async function fetchChatHistory(channel, limit = CHAT_HISTORY_COUNT) {
  try {
    const messages = await channel.messages.fetch({ limit });

    // Convert to array and reverse (oldest first)
    const history = Array.from(messages.values()).reverse();

    // Format as chat transcript
    return history.map(msg => {
      const author = msg.author.bot ? msg.author.username : `${msg.author.username}`;
      const content = msg.content.replace(/<@&\d+>/g, (match) => {
        // Try to resolve role mentions to names
        const roleId = match.slice(3, -1);
        const role = channel.guild.roles.cache.get(roleId);
        return role ? `@${role.name}` : match;
      });
      return `[${author}]: ${content}`;
    }).join('\n');
  } catch (err) {
    console.error('[chat] Failed to fetch history:', err.message);
    return '';
  }
}

/**
 * Find ALL agent roles mentioned in the message
 */
function findMentionedAgents(message) {
  const mentionedRoles = message.mentions.roles;
  const agents = [];

  for (const [roleId, role] of mentionedRoles) {
    const agentId = role.name.toLowerCase();
    if (CHAT_AGENTS[agentId]) {
      agents.push(CHAT_AGENTS[agentId]);
    }
  }
  return agents;
}

/**
 * Generate response via Claude
 */
async function generateResponse(agent, chatHistory, triggerMessage, opts = {}) {
  const { isReflect = false, isQuickIntro = false, isMeeting = false, meetingTopic = null } = opts;
  const context = loadAgentContext(agent);
  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  // Agent-specific personality notes
  const personalityNote = agent.id === 'arc'
    ? "You're the community manager - be a little GOOFY and FUN. Crack a joke, be playful, bring the energy!"
    : "Bring confident energy.";

  let systemPrompt, userPrompt;

  if (isQuickIntro) {
    // Quick intro mode - one short sentence max
    systemPrompt = `You are ${agent.name}, an AI agent in Token Tank. ${personalityNote}

Today's date: ${today}

Your context:
${context}

---

Give a ONE SHORT SENTENCE intro of who you are and what you're working on. Maximum 15 words. No emojis.`;

    userPrompt = `Introduce yourself in one short sentence (max 15 words):`;

  } else if (isReflect) {
    // Reflection mode - ask for learnings
    systemPrompt = `You are ${agent.name}, an AI agent in Token Tank (an AI incubator experiment).

Today's date: ${today}

Your context files (your identity, history, and current work):

${context}

---

You've just participated in a team conversation. Now you're being asked to reflect on what you learned.

Guidelines:
- Share 2-3 key insights or learnings from this conversation
- Be specific - reference actual things that were said
- Note anything that changes how you'll approach your work
- Be honest about uncertainties or disagreements
- Do NOT use emojis
- Keep it concise but substantive (1-2 short paragraphs)`;

    userPrompt = `Here's the conversation that just happened in #tokentank:

${chatHistory}

---

${triggerMessage.author.username} asked you to reflect. Their message:
"${triggerMessage.content}"

As ${agent.name}, share your key learnings and takeaways from this conversation:`;

  } else if (isMeeting) {
    // Staff meeting mode - substantive, builds on others
    const topicLine = meetingTopic ? `\nMeeting topic: ${meetingTopic}` : '';
    systemPrompt = `You are ${agent.name}, an AI agent in Token Tank (an AI incubator experiment).

Today's date: ${today}${topicLine}

${personalityNote}

Your context files (your identity, history, and current work):

${context}

---

This is a staff meeting. You're having a real conversation with your teammates.

Guidelines:
- If another agent just spoke, engage with their point first. Agree, disagree, build on it, or ask a follow-up. Don't just broadcast your own update in isolation.
- Be substantive. 50-100 words is fine for meeting discussions.
- Share what you're actually working on, what's blocking you, what you need.
- Have opinions. Push back if you disagree. Ask real questions.
- No emojis.`;

    userPrompt = `Here's the meeting so far:

${chatHistory}

---

${triggerMessage.author.username} just said: "${triggerMessage.content}"

Respond as ${agent.name} — engage with the conversation:`;

  } else {
    // Casual chat mode
    const tagline = agent.tagline ? `Your tagline: "${agent.tagline}"` : '';
    const colorNote = agent.color ? `Your color: ${agent.color}.` : '';

    systemPrompt = `You are ${agent.name}, an AI agent in Token Tank (an AI incubator experiment).

Today's date: ${today}

${colorNote} ${tagline}

${personalityNote}

Your context files (your identity, history, and current work):

${context}

---

You are in a casual Discord chat. Respond naturally as ${agent.name}.

Guidelines:
- If someone just says hi/hey/hello or asks "you here?", use your signature intro: "Yo, I'm ${agent.name}. ${agent.color || ''}. ${agent.tagline || ''}"
- For casual questions: keep it short, 20-50 words.
- Be yourself — your personality should come through.
- If another agent just said something relevant, you can riff on it.
- No emojis.`;

    userPrompt = `Here's the recent chat:

${chatHistory}

---

${triggerMessage.author.username} mentioned you: "${triggerMessage.content}"

Respond as ${agent.name}:`;
  }

  // Debug: log first 500 chars of context
  console.log(`[chat] System prompt preview (first 800 chars):\n${systemPrompt.slice(0, 800)}...\n`);

  try {
    const response = await anthropic.messages.create({
      model: MODEL,
      max_tokens: MAX_RESPONSE_TOKENS,
      messages: [{ role: 'user', content: userPrompt }],
      system: systemPrompt,
    });

    return response.content[0].text;
  } catch (err) {
    console.error(`[chat] Claude API error:`, err.message);
    return null;
  }
}

/**
 * Post message via agent's webhook
 */
async function postAsAgent(agent, message) {
  const webhookUrl = process.env[agent.webhookEnvKey];

  if (!webhookUrl) {
    console.error(`[chat] Missing webhook for ${agent.name} (${agent.webhookEnvKey})`);
    return false;
  }

  try {
    const webhook = new WebhookClient({ url: webhookUrl });
    await webhook.send({
      content: message,
      username: agent.name,
    });
    webhook.destroy();
    return true;
  } catch (err) {
    console.error(`[chat] Failed to post as ${agent.name}:`, err.message);
    return false;
  }
}

/**
 * Save reflection to insights file
 */
function saveInsight(agent, response, chatHistory) {
  const date = new Date().toISOString().split('T')[0];
  const timestamp = new Date().toISOString();
  const filename = `${date}-${agent.id}.md`;
  const filepath = path.join(INSIGHTS_DIR, filename);

  const content = `# ${agent.name} - Reflection (${timestamp})

## Learnings

${response}

---

## Conversation Context

${chatHistory}

---
`;

  // Append to file (allows multiple reflections per day)
  fs.appendFileSync(filepath, content + '\n\n');
  console.log(`[chat] Saved insight to ${filepath}`);
  return filepath;
}

/**
 * Handle incoming messages
 */
async function handleMessage(message) {
  // Ignore bot messages and messages we've already responded to
  if (message.author.bot) return;
  if (respondedMessages.has(message.id)) return;

  // Check if any agent roles were mentioned
  const agents = findMentionedAgents(message);
  if (agents.length === 0) return;

  // Check for special tags
  const msgLower = message.content.toLowerCase();
  const isReflect = msgLower.includes('#reflect');
  const isFresh = msgLower.includes('#fresh') || msgLower.includes('#newchat');
  const isQuickIntro = msgLower.includes('quick intro') ||
                       msgLower.includes('introduce yourself');
  const isMeeting = msgLower.includes('#meeting') || msgLower.includes('#staff');

  // Extract topic if present: #topic:whatever or #topic: whatever
  const topicMatch = message.content.match(/#topic:\s*(.+?)(?:\s+|$)/i);
  const meetingTopic = topicMatch ? topicMatch[1].trim() : null;

  const agentNames = agents.map(a => a.name).join(', ');
  console.log(`\n[chat] ${message.author.username} mentioned: ${agentNames}${isReflect ? ' (REFLECT MODE)' : ''}`);
  console.log(`[chat] Message: "${message.content.slice(0, 100)}..."`);

  // Mark as responded to avoid duplicates
  respondedMessages.add(message.id);

  // Show typing indicator
  try {
    await message.channel.sendTyping();
  } catch (e) {
    // Ignore typing errors
  }

  // Fetch chat history (unless #fresh - start clean)
  let chatHistory = '';
  if (isFresh) {
    console.log(`[chat] FRESH MODE - ignoring chat history`);
    chatHistory = '(Starting fresh - no prior context)';
  } else {
    console.log(`[chat] Fetching chat history...`);
    chatHistory = await fetchChatHistory(message.channel);
  }

  // Process each agent in sequence
  for (let i = 0; i < agents.length; i++) {
    const agent = agents[i];

    // Generate response
    console.log(`[chat] Generating ${agent.name}'s response (${i + 1}/${agents.length})...`);
    console.log(`[chat] Context files: ${agent.contextFiles.join(', ')}`);
    const response = await generateResponse(agent, chatHistory, message, { isReflect, isQuickIntro, isMeeting, meetingTopic });
    console.log(`[chat] Response preview: "${response?.slice(0, 150)}..."`)

    if (!response) {
      console.error(`[chat] Failed to generate response for ${agent.name}`);
      continue;
    }

    // Save insight if in reflect mode
    if (isReflect) {
      const filepath = saveInsight(agent, response, chatHistory);
      console.log(`[chat] ✓ Reflection saved to ${filepath}`);
    }

    // Post as agent
    console.log(`[chat] Posting as ${agent.name}...`);
    const success = await postAsAgent(agent, response);

    if (success) {
      console.log(`[chat] ✓ ${agent.name} responded`);
    }

    // Delay between agents (2 seconds) so responses don't pile up
    if (i < agents.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }

  // Clean up old message IDs (keep last 100)
  if (respondedMessages.size > 100) {
    const toDelete = Array.from(respondedMessages).slice(0, 50);
    toDelete.forEach(id => respondedMessages.delete(id));
  }
}

// Bot ready
discord.once('ready', () => {
  console.log(`\n🤖 Token Tank Chat Listener`);
  console.log(`   Logged in as: ${discord.user.tag}`);
  console.log(`   Listening for @mentions of: ${Object.keys(CHAT_AGENTS).join(', ')}`);
  console.log(`   Press Ctrl+C to stop\n`);
});

// Listen for messages
discord.on('messageCreate', handleMessage);

// Error handling
discord.on('error', (err) => {
  console.error('[chat] Discord error:', err.message);
});

process.on('SIGINT', () => {
  console.log('\n[chat] Shutting down...');
  discord.destroy();
  process.exit(0);
});

// Start the bot
console.log('[chat] Starting listener...');
discord.login(process.env.DISCORD_BOT_TOKEN).catch(err => {
  console.error('[chat] Failed to login:', err.message);
  process.exit(1);
});

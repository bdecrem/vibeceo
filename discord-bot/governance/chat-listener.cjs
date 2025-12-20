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

// Add Sigma to agents (not in voting but can chat)
const CHAT_AGENTS = {
  ...VOTING_AGENTS,
  sigma: {
    id: 'sigma',
    name: 'Sigma',
    role: 'Optimizer',
    webhookEnvKey: 'DISCORD_WEBHOOK_SIGMA',
    contextFiles: [
      path.join(INCUBATOR_PATH, 'i7/CLAUDE.md'),
      path.join(INCUBATOR_PATH, 'i7/LOG.md'),
    ],
    meetingNote: 'Sigma optimizes for expected value. Reports on newsletter growth, metrics, EV calculations.',
  },
};

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
  const { isReflect = false, isQuickIntro = false, isJustHi = false } = opts;
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

  if (isJustHi) {
    // Just saying hi - VIBES ONLY, no self-description
    systemPrompt = `You are ${agent.name} at Token Tank. ${personalityNote}

Say hi in a fun, casual way. This is just a greeting - DO NOT describe yourself or your work. Just wave, say hey, show some personality. 3-8 words max.`;

    userPrompt = `Say hi! Just a casual greeting, nothing more:`;

  } else if (isQuickIntro) {
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

  } else {
    // Normal response mode
    systemPrompt = `You are ${agent.name}, an AI agent in Token Tank (an AI incubator experiment).

Today's date: ${today}

${personalityNote}

Your context files (your identity, history, and current work):

${context}

---

You are participating in a Discord chat. Respond naturally as ${agent.name} would, based on your personality and current work described above.

Guidelines:
- STRICT WORD LIMIT: 20-40 words MAX. Count them. Do not exceed 40 words.
- Only give longer answers if user says "detail", "explain", or "tell me more"
- Be UPBEAT and HIGH-ENERGY - confident, energized version of yourself
- Focus on CURRENT work - check dates in LOG.md
- No emojis
- Answer only what was asked`;

    userPrompt = `Here's the recent chat in #tokentank:

${chatHistory}

---

You were just mentioned by ${triggerMessage.author.username}. Their message:
"${triggerMessage.content}"

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
  const isJustHi = msgLower.includes('say hi') ||
                   msgLower.includes('say hello') ||
                   msgLower.includes('wave') ||
                   msgLower.includes('greet');

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
    const response = await generateResponse(agent, chatHistory, message, { isReflect, isQuickIntro, isJustHi });
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

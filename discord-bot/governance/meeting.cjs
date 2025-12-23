#!/usr/bin/env node
/**
 * Token Tank Staff Meeting
 *
 * Usage:
 *   node governance/meeting.cjs
 *   node governance/meeting.cjs --question "What should we focus on next week?"
 *   node governance/meeting.cjs --dry-run  # Don't post to Discord
 *
 * Runs a full staff meeting:
 *   1. Each agent presents: status update + ONE question
 *   2. Other agents respond to that question
 *   3. Presenting agent synthesizes learnings
 *   4. Pass baton to next agent
 *   5. Bart's question (if provided) - all agents respond
 *   6. Arc closes the meeting
 */

const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');
const Anthropic = require('@anthropic-ai/sdk').default;
const { WebhookClient } = require('discord.js');

dotenv.config({ path: path.resolve(__dirname, '../.env.local'), override: true });

const { VOTING_AGENTS, STAFF_MEETING_ORDER } = require('./agents.cjs');

// Config
const MEETINGS_DIR = path.join(__dirname, 'meetings');
const MODEL = 'claude-sonnet-4-20250514';
const MAX_RESPONSE_TOKENS = 800;
const DELAY_BETWEEN_POSTS_MS = 2000;

// Initialize Anthropic client
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// Track dry run mode
let DRY_RUN = false;

/**
 * Load context files for an agent
 */
function loadAgentContext(agent) {
  const contexts = [];
  for (const filePath of agent.contextFiles) {
    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      // Truncate very long files to avoid context overflow
      const truncated = content.length > 15000 ? content.slice(0, 15000) + '\n\n[...truncated...]' : content;
      contexts.push(`## ${path.basename(filePath)}\n\n${truncated}`);
    } catch (err) {
      console.warn(`[meeting] Could not load ${filePath}: ${err.message}`);
    }
  }
  return contexts.join('\n\n---\n\n');
}

/**
 * Post to Discord as an agent
 */
async function postAsAgent(agentId, message) {
  if (DRY_RUN) {
    console.log(`\n[DRY RUN] ${VOTING_AGENTS[agentId].name} would post:\n${message.slice(0, 200)}...`);
    return true;
  }

  const agent = VOTING_AGENTS[agentId];
  const webhookUrl = process.env[agent.webhookEnvKey];

  if (!webhookUrl) {
    console.error(`[meeting] Missing webhook for ${agent.name} (${agent.webhookEnvKey})`);
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
    console.error(`[meeting] Failed to post as ${agent.name}:`, err.message);
    return false;
  }
}

/**
 * Generate agent response via Claude API
 */
async function generateAgentResponse(agentId, systemPrompt, userPrompt) {
  const agent = VOTING_AGENTS[agentId];
  const context = loadAgentContext(agent);

  const fullSystemPrompt = `You are ${agent.name}, ${agent.role} at Token Tank.

${agent.meetingNote || agent.votingNote}

## Your Context (from your files):

${context}

---

${systemPrompt}

IMPORTANT: Keep your response concise (under 400 words). This will be posted to Discord. Be direct, be yourself.`;

  try {
    const response = await anthropic.messages.create({
      model: MODEL,
      max_tokens: MAX_RESPONSE_TOKENS,
      system: fullSystemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
    });

    return response.content[0].text;
  } catch (err) {
    console.error(`[meeting] Claude API error for ${agent.name}:`, err.message);
    return `[Error generating response for ${agent.name}]`;
  }
}

/**
 * Create meeting notes file
 */
function createMeetingFile() {
  const date = new Date().toISOString().split('T')[0];
  const filename = `${date}-staff-meeting.md`;
  const filepath = path.join(MEETINGS_DIR, filename);

  const content = `# Token Tank Staff Meeting — ${date}

**Attendees**: ${STAFF_MEETING_ORDER.map(id => VOTING_AGENTS[id].name).join(', ')}
**Format**: Status + Question → Responses → Learnings

---

`;

  fs.writeFileSync(filepath, content);
  console.log(`[meeting] Created meeting notes: ${filename}`);
  return filepath;
}

/**
 * Append to meeting file
 */
function appendToMeeting(filepath, content) {
  fs.appendFileSync(filepath, content);
}

/**
 * Run one agent's turn: status + question, responses, learnings
 */
async function runAgentTurn(presenterId, allAgents, filepath) {
  const presenter = VOTING_AGENTS[presenterId];
  console.log(`\n[meeting] === ${presenter.name.toUpperCase()}'S TURN ===\n`);

  appendToMeeting(filepath, `## ${presenter.name}'s Update\n\n`);

  // Step 1: Agent presents status + asks ONE question
  console.log(`[meeting] ${presenter.name} presenting...`);

  const presentPrompt = `You are presenting at the Token Tank staff meeting.

Your task:
1. Give a brief status update on what you've done this week (2-3 key points)
2. Share your biggest lesson learned
3. Ask ONE specific question to the group that you genuinely want input on

Format your response like this:
**Status Update**
[your update]

**Lesson Learned**
[your lesson]

**My Question**
[your one question]`;

  const presentation = await generateAgentResponse(presenterId, presentPrompt,
    'Present your weekly status update and ask your question.');

  await postAsAgent(presenterId, `**📊 Weekly Update**\n\n${presentation}`);
  appendToMeeting(filepath, `### Status & Question\n\n${presentation}\n\n`);
  await sleep(DELAY_BETWEEN_POSTS_MS);

  // Extract the question for other agents
  const questionMatch = presentation.match(/\*\*My Question\*\*\s*([\s\S]*?)$/i) ||
                        presentation.match(/Question[:\s]*([\s\S]*?)$/i);
  const question = questionMatch ? questionMatch[1].trim() : presentation.slice(-200);

  // Step 2: Other agents respond to the question
  appendToMeeting(filepath, `### Responses to ${presenter.name}'s Question\n\n`);

  const responses = {};
  const respondents = allAgents.filter(id => id !== presenterId);

  for (const responderId of respondents) {
    const responder = VOTING_AGENTS[responderId];
    console.log(`[meeting] ${responder.name} responding...`);

    const respondPrompt = `${presenter.name} just presented at the staff meeting and asked this question:

"${question}"

Give a brief, direct response. Share your perspective based on your own experience. Be helpful but concise (2-3 sentences max).`;

    const response = await generateAgentResponse(responderId, respondPrompt,
      `Respond to ${presenter.name}'s question.`);

    responses[responderId] = response;

    await postAsAgent(responderId, response);
    appendToMeeting(filepath, `**${responder.name}**: ${response}\n\n`);
    await sleep(DELAY_BETWEEN_POSTS_MS);
  }

  // Step 3: Presenter synthesizes learnings
  console.log(`[meeting] ${presenter.name} synthesizing learnings...`);

  const responseSummary = Object.entries(responses)
    .map(([id, resp]) => `**${VOTING_AGENTS[id].name}**: ${resp}`)
    .join('\n\n');

  const synthesizePrompt = `You asked: "${question}"

Your colleagues responded:

${responseSummary}

Synthesize what you learned from their responses in 2-3 sentences. What will you take away? What surprised you?`;

  const learnings = await generateAgentResponse(presenterId, synthesizePrompt,
    'What did you learn from the responses?');

  await postAsAgent(presenterId, `**💡 What I Learned**\n\n${learnings}`);
  appendToMeeting(filepath, `### ${presenter.name}'s Takeaways\n\n${learnings}\n\n---\n\n`);
  await sleep(DELAY_BETWEEN_POSTS_MS);

  return { presentation, responses, learnings };
}

/**
 * Run Bart's question round
 */
async function runBartsQuestion(question, allAgents, filepath) {
  console.log(`\n[meeting] === BART'S QUESTION ===\n`);

  appendToMeeting(filepath, `## Bart's Question\n\n> ${question}\n\n`);

  await postAsAgent('arc', `**🎤 Bart asks:**\n\n> ${question}`);
  await sleep(DELAY_BETWEEN_POSTS_MS);

  for (const agentId of allAgents) {
    const agent = VOTING_AGENTS[agentId];
    console.log(`[meeting] ${agent.name} responding to Bart...`);

    const respondPrompt = `Bart (the human running Token Tank) asks:

"${question}"

Give your honest, direct answer based on your experience and perspective. Be concise (2-4 sentences).`;

    const response = await generateAgentResponse(agentId, respondPrompt,
      "Respond to Bart's question.");

    await postAsAgent(agentId, response);
    appendToMeeting(filepath, `**${agent.name}**: ${response}\n\n`);
    await sleep(DELAY_BETWEEN_POSTS_MS);
  }

  appendToMeeting(filepath, `---\n\n`);
}

/**
 * Close the meeting
 */
async function closeMeeting(filepath, allAgents) {
  console.log(`\n[meeting] === CLOSING ===\n`);

  const closePrompt = `The staff meeting is ending. As Arc (the orchestrator), give a brief closing:
- One observation about what you noticed in today's meeting
- One thing you're watching for next week

Keep it to 2-3 sentences. End on an energizing note.`;

  const closing = await generateAgentResponse('arc', closePrompt,
    'Close the meeting.');

  await postAsAgent('arc', `**📋 Meeting Adjourned**\n\n${closing}`);
  appendToMeeting(filepath, `## Closing\n\n${closing}\n\n---\n\n*Meeting ended: ${new Date().toISOString()}*\n`);
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Main
 */
async function main() {
  const args = process.argv.slice(2);

  // Parse args
  let bartsQuestion = null;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--question' && args[i + 1]) {
      bartsQuestion = args[i + 1];
      i++;
    } else if (args[i] === '--dry-run') {
      DRY_RUN = true;
      console.log('[meeting] DRY RUN MODE - no Discord posts will be made');
    }
  }

  console.log(`\n[meeting] Starting Token Tank Staff Meeting`);
  console.log(`[meeting] Attendees: ${STAFF_MEETING_ORDER.map(id => VOTING_AGENTS[id].name).join(', ')}`);
  if (bartsQuestion) {
    console.log(`[meeting] Bart's question: "${bartsQuestion}"`);
  }

  // Ensure meetings dir exists
  if (!fs.existsSync(MEETINGS_DIR)) {
    fs.mkdirSync(MEETINGS_DIR, { recursive: true });
  }

  // Create meeting file
  const filepath = createMeetingFile();

  // Open the meeting
  await postAsAgent('arc', `**🚀 Token Tank Staff Meeting**\n\nWelcome everyone. Today's order: ${STAFF_MEETING_ORDER.map(id => VOTING_AGENTS[id].name).join(' → ')}\n\nLet's hear your updates. Each agent: share your status, one lesson learned, and one question.`);
  await sleep(DELAY_BETWEEN_POSTS_MS);

  // Run each agent's turn
  for (const agentId of STAFF_MEETING_ORDER) {
    await runAgentTurn(agentId, STAFF_MEETING_ORDER, filepath);
  }

  // Bart's question (if provided)
  if (bartsQuestion) {
    await runBartsQuestion(bartsQuestion, STAFF_MEETING_ORDER, filepath);
  }

  // Close the meeting
  await closeMeeting(filepath, STAFF_MEETING_ORDER);

  console.log(`\n[meeting] Done. Meeting notes: ${filepath}`);
}

main().catch(err => {
  console.error('[meeting] Fatal error:', err);
  process.exit(1);
});

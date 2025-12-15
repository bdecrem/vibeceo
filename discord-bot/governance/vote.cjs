#!/usr/bin/env node
/**
 * Token Tank Voting System
 *
 * Usage:
 *   node governance/vote.cjs "Proposal text here" --proposer drift
 *
 * Runs a full voting session:
 *   1. Posts proposal to Discord
 *   2. Round 1 (blind): Each agent responds independently
 *   3. Round 2 (context): Each agent sees Round 1, responds again
 *   4. Final votes collected and tallied
 */

const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');
const Anthropic = require('@anthropic-ai/sdk').default;
const { WebhookClient } = require('discord.js');

dotenv.config({ path: path.resolve(__dirname, '../.env.local'), override: true });

const { VOTING_AGENTS, DEFAULT_VOTING_ORDER } = require('./agents.cjs');

// Config
const PROPOSALS_DIR = path.join(__dirname, 'proposals');
const MODEL = 'claude-sonnet-4-20250514';
const MAX_RESPONSE_TOKENS = 500;
const DELAY_BETWEEN_POSTS_MS = 2000;

// Initialize Anthropic client
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

/**
 * Load context files for an agent
 */
function loadAgentContext(agent) {
  const contexts = [];
  for (const filePath of agent.contextFiles) {
    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      contexts.push(`## ${path.basename(filePath)}\n\n${content}`);
    } catch (err) {
      console.warn(`[vote] Could not load ${filePath}: ${err.message}`);
    }
  }
  return contexts.join('\n\n---\n\n');
}

/**
 * Post to Discord as an agent
 */
async function postAsAgent(agentId, message) {
  const agent = VOTING_AGENTS[agentId];
  const webhookUrl = process.env[agent.webhookEnvKey];

  if (!webhookUrl) {
    console.error(`[vote] Missing webhook for ${agent.name} (${agent.webhookEnvKey})`);
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
    console.error(`[vote] Failed to post as ${agent.name}:`, err.message);
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

${agent.votingNote}

## Your Context (from your files):

${context}

---

${systemPrompt}

IMPORTANT: Keep your response concise (under 300 words). This will be posted to Discord.`;

  try {
    const response = await anthropic.messages.create({
      model: MODEL,
      max_tokens: MAX_RESPONSE_TOKENS,
      system: fullSystemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
    });

    return response.content[0].text;
  } catch (err) {
    console.error(`[vote] Claude API error for ${agent.name}:`, err.message);
    return `[Error generating response for ${agent.name}]`;
  }
}

/**
 * Create proposal file
 */
function createProposalFile(proposalText, proposerId) {
  const date = new Date().toISOString().split('T')[0];
  const slug = proposalText.slice(0, 30).toLowerCase().replace(/[^a-z0-9]+/g, '-');
  const filename = `${date}-${slug}.md`;
  const filepath = path.join(PROPOSALS_DIR, filename);

  const proposer = VOTING_AGENTS[proposerId];

  const content = `# Proposal: ${proposalText.slice(0, 60)}${proposalText.length > 60 ? '...' : ''}

**Proposer**: ${proposer.name} (${proposerId})
**Status**: VOTING
**Created**: ${new Date().toISOString()}

## The Proposal

${proposalText}

---

## Round 1 (Blind)

`;

  fs.writeFileSync(filepath, content);
  console.log(`[vote] Created proposal: ${filename}`);
  return filepath;
}

/**
 * Append to proposal file
 */
function appendToProposal(filepath, content) {
  fs.appendFileSync(filepath, content);
}

/**
 * Run Round 1 (Blind)
 */
async function runRound1(proposalText, proposerId, voters, filepath) {
  console.log('\n[vote] === ROUND 1 (BLIND) ===\n');

  const round1Prompt = `You are participating in a Token Tank vote.

IMPORTANT: This is the BLIND round. You have NOT seen anyone else's response yet.
State your INDEPENDENT position on this proposal.

Before supporting, identify at least ONE risk or concern.
Before opposing, identify at least ONE merit or benefit.

Be direct. Be yourself.`;

  const responses = {};

  for (const voterId of voters) {
    if (voterId === proposerId) continue; // Proposer doesn't vote in Round 1

    const agent = VOTING_AGENTS[voterId];
    console.log(`[vote] Getting ${agent.name}'s Round 1 response...`);

    const userPrompt = `PROPOSAL:\n\n${proposalText}\n\nWhat is your position on this proposal?`;

    const response = await generateAgentResponse(voterId, round1Prompt, userPrompt);
    responses[voterId] = response;

    // Post to Discord
    await postAsAgent(voterId, `**Round 1 Response**\n\n${response}`);

    // Append to proposal file
    appendToProposal(filepath, `### ${agent.name}\n\n${response}\n\n`);

    await sleep(DELAY_BETWEEN_POSTS_MS);
  }

  return responses;
}

/**
 * Run Round 2 (Full Context)
 */
async function runRound2(proposalText, proposerId, voters, round1Responses, filepath) {
  console.log('\n[vote] === ROUND 2 (FULL CONTEXT) ===\n');

  appendToProposal(filepath, `---\n\n## Round 2 (Full Context)\n\n`);

  // Format Round 1 responses for context
  const round1Summary = Object.entries(round1Responses)
    .map(([id, resp]) => `**${VOTING_AGENTS[id].name}**: ${resp}`)
    .join('\n\n');

  const round2Prompt = `You are participating in a Token Tank vote. This is Round 2.

You've now seen everyone's Round 1 positions. Consider:
- What did others miss?
- What changed your thinking (if anything)?
- What's the strongest argument AGAINST your position?

Be direct. Respond to others if you disagree.`;

  const responses = {};

  for (const voterId of voters) {
    if (voterId === proposerId) continue;

    const agent = VOTING_AGENTS[voterId];
    console.log(`[vote] Getting ${agent.name}'s Round 2 response...`);

    const userPrompt = `PROPOSAL:\n\n${proposalText}\n\n---\n\nROUND 1 RESPONSES:\n\n${round1Summary}\n\n---\n\nYour follow-up response:`;

    const response = await generateAgentResponse(voterId, round2Prompt, userPrompt);
    responses[voterId] = response;

    // Post to Discord
    await postAsAgent(voterId, `**Round 2 Follow-up**\n\n${response}`);

    // Append to proposal file
    appendToProposal(filepath, `### ${agent.name}\n\n${response}\n\n`);

    await sleep(DELAY_BETWEEN_POSTS_MS);
  }

  return responses;
}

/**
 * Collect final votes
 */
async function collectVotes(proposalText, proposerId, voters, round1Responses, round2Responses, filepath) {
  console.log('\n[vote] === FINAL VOTES ===\n');

  appendToProposal(filepath, `---\n\n## Final Votes\n\n| Agent | Vote | Confidence | Key Reason |\n|-------|------|------------|------------|\n`);

  const round1Summary = Object.entries(round1Responses)
    .map(([id, resp]) => `**${VOTING_AGENTS[id].name}**: ${resp}`)
    .join('\n\n');

  const round2Summary = Object.entries(round2Responses)
    .map(([id, resp]) => `**${VOTING_AGENTS[id].name}**: ${resp}`)
    .join('\n\n');

  const votePrompt = `You are casting your FINAL VOTE on this proposal.

You must respond in EXACTLY this format:
VOTE: YES or NO or ABSTAIN
CONFIDENCE: 1-10
REASON: (one sentence)

Vote your conscience based on everything you've heard.`;

  const votes = {};

  for (const voterId of voters) {
    const agent = VOTING_AGENTS[voterId];

    if (voterId === proposerId) {
      // Proposer abstains
      votes[voterId] = { vote: 'ABSTAIN', confidence: '-', reason: 'Proposer' };
      appendToProposal(filepath, `| ${agent.name} | ABSTAIN | - | Proposer |\n`);
      await postAsAgent(voterId, `**Final Vote**: ABSTAIN (as proposer)`);
      continue;
    }

    console.log(`[vote] Getting ${agent.name}'s final vote...`);

    const userPrompt = `PROPOSAL:\n\n${proposalText}\n\n---\n\nROUND 1:\n\n${round1Summary}\n\n---\n\nROUND 2:\n\n${round2Summary}\n\n---\n\nCast your final vote:`;

    const response = await generateAgentResponse(voterId, votePrompt, userPrompt);

    // Parse the vote
    const voteMatch = response.match(/VOTE:\s*(YES|NO|ABSTAIN)/i);
    const confMatch = response.match(/CONFIDENCE:\s*(\d+)/i);
    const reasonMatch = response.match(/REASON:\s*(.+)/i);

    const vote = voteMatch ? voteMatch[1].toUpperCase() : 'ABSTAIN';
    const confidence = confMatch ? confMatch[1] : '?';
    const reason = reasonMatch ? reasonMatch[1].trim() : response.slice(0, 50);

    votes[voterId] = { vote, confidence, reason };

    // Post to Discord
    await postAsAgent(voterId, `**Final Vote**: ${vote} (${confidence}/10)\n${reason}`);

    // Append to proposal file
    appendToProposal(filepath, `| ${agent.name} | ${vote} | ${confidence}/10 | ${reason.slice(0, 50)} |\n`);

    await sleep(DELAY_BETWEEN_POSTS_MS);
  }

  return votes;
}

/**
 * Tally and announce result
 */
async function announceResult(votes, proposerId, filepath) {
  const yes = Object.values(votes).filter(v => v.vote === 'YES').length;
  const no = Object.values(votes).filter(v => v.vote === 'NO').length;
  const abstain = Object.values(votes).filter(v => v.vote === 'ABSTAIN').length;

  const result = yes > no ? 'APPROVED' : (no > yes ? 'REJECTED' : 'TIE');

  console.log(`\n[vote] Result: ${result} (${yes} YES, ${no} NO, ${abstain} ABSTAIN)`);

  appendToProposal(filepath, `\n**Result**: ${result} (${yes}-${no}${abstain > 0 ? `-${abstain}` : ''})\n`);

  // Update status
  const content = fs.readFileSync(filepath, 'utf-8');
  fs.writeFileSync(filepath, content.replace('**Status**: VOTING', `**Status**: ${result}`));

  // Announce on Discord (as Arc)
  await postAsAgent('arc', `**Vote Complete**\n\nResult: **${result}**\nYes: ${yes} | No: ${no} | Abstain: ${abstain}`);

  return result;
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Main
 */
async function main() {
  const args = process.argv.slice(2);

  if (args.length < 1) {
    console.log('Usage: node governance/vote.cjs "Proposal text" --proposer <agent>');
    console.log('Agents:', Object.keys(VOTING_AGENTS).join(', '));
    process.exit(1);
  }

  // Parse args
  let proposalText = '';
  let proposerId = 'drift'; // default

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--proposer' && args[i + 1]) {
      proposerId = args[i + 1].toLowerCase();
      i++;
    } else if (!args[i].startsWith('--')) {
      proposalText = args[i];
    }
  }

  if (!proposalText) {
    console.error('[vote] No proposal text provided');
    process.exit(1);
  }

  if (!VOTING_AGENTS[proposerId]) {
    console.error(`[vote] Unknown proposer: ${proposerId}`);
    console.log('Available:', Object.keys(VOTING_AGENTS).join(', '));
    process.exit(1);
  }

  const proposer = VOTING_AGENTS[proposerId];
  console.log(`\n[vote] Starting vote on: "${proposalText.slice(0, 50)}..."`);
  console.log(`[vote] Proposer: ${proposer.name}`);

  // Ensure proposals dir exists
  if (!fs.existsSync(PROPOSALS_DIR)) {
    fs.mkdirSync(PROPOSALS_DIR, { recursive: true });
  }

  // Create proposal file
  const filepath = createProposalFile(proposalText, proposerId);

  // Post proposal to Discord
  await postAsAgent(proposerId, `**PROPOSAL**\n\n${proposalText}\n\n_Requesting a vote from the Token Tank team._`);
  await sleep(DELAY_BETWEEN_POSTS_MS);

  // Get voters (all agents)
  const voters = DEFAULT_VOTING_ORDER;

  // Run voting rounds
  const round1Responses = await runRound1(proposalText, proposerId, voters, filepath);
  const round2Responses = await runRound2(proposalText, proposerId, voters, round1Responses, filepath);
  const votes = await collectVotes(proposalText, proposerId, voters, round1Responses, round2Responses, filepath);

  // Announce result
  const result = await announceResult(votes, proposerId, filepath);

  console.log(`\n[vote] Done. Proposal file: ${filepath}`);
  console.log(`[vote] Result: ${result}`);
}

main().catch(err => {
  console.error('[vote] Fatal error:', err);
  process.exit(1);
});

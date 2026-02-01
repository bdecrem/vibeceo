#!/usr/bin/env node
/**
 * Post to Discord as an agent (Mave, Amber, etc.)
 *
 * Usage:
 *   node post-message.cjs mave "Hello from Mave!"
 *   node post-message.cjs amber "Something forming..."
 *   node post-message.cjs oracle "What does it mean to be?"
 *
 * Requires webhooks in .env.local:
 *   DISCORD_WEBHOOK_MAVE=https://discord.com/api/webhooks/...
 *   DISCORD_WEBHOOK_AMBER=https://discord.com/api/webhooks/...
 */

const dotenv = require('dotenv');
const path = require('path');
dotenv.config({ path: path.resolve(__dirname, '..', '.env.local') });

const { WebhookClient } = require('discord.js');

// Agent definitions
const AGENTS = {
  mave: {
    name: 'Mave',
    emoji: '🌊',
    avatar: 'https://kochi.to/mave/avatar.png',
    webhookEnvKey: 'DISCORD_WEBHOOK_MAVE',
  },
  amber: {
    name: 'Amber',
    emoji: '🔮',
    avatar: 'https://i.imgur.com/placeholder-amber.png', // TODO: real avatar
    webhookEnvKey: 'DISCORD_WEBHOOK_AMBER',
  },
  oracle: {
    name: 'Oracle',
    emoji: '🔭',
    avatar: 'https://i.imgur.com/placeholder-oracle.png', // TODO: real avatar
    webhookEnvKey: 'DISCORD_WEBHOOK_ORACLE',
  },
};

async function postAsAgent(agentId, message) {
  const agent = AGENTS[agentId.toLowerCase()];

  if (!agent) {
    console.error(`Unknown agent: ${agentId}`);
    console.log('Available agents:', Object.keys(AGENTS).join(', '));
    process.exit(1);
  }

  const webhookUrl = process.env[agent.webhookEnvKey];

  if (!webhookUrl) {
    console.error(`Missing webhook URL for ${agent.name}`);
    console.error(`Please add ${agent.webhookEnvKey} to .env.local`);
    process.exit(1);
  }

  try {
    const webhook = new WebhookClient({ url: webhookUrl });

    await webhook.send({
      content: message,
      username: `${agent.emoji} ${agent.name}`,
      avatarURL: agent.avatar,
    });

    console.log(JSON.stringify({
      success: true,
      agent: agent.name,
      message: message.substring(0, 100) + (message.length > 100 ? '...' : ''),
    }));
    
    webhook.destroy();
  } catch (error) {
    console.error(JSON.stringify({
      success: false,
      error: error.message,
    }));
    process.exit(1);
  }
}

// CLI usage
const args = process.argv.slice(2);
if (args.length < 2) {
  console.log('Usage: node post-message.cjs <agent> <message>');
  console.log('Agents:', Object.keys(AGENTS).join(', '));
  process.exit(1);
}

const [agentId, ...messageParts] = args;
const message = messageParts.join(' ');

postAsAgent(agentId, message);

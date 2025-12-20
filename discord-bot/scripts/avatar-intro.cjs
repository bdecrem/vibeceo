#!/usr/bin/env node
/**
 * Have each agent post a quick intro to show off their new avatars
 */

const dotenv = require('dotenv');
const path = require('path');
const { WebhookClient } = require('discord.js');

dotenv.config({ path: path.resolve(__dirname, '../.env.local'), override: true });

const AGENTS = [
  { name: 'Arc', webhook: process.env.DISCORD_WEBHOOK_ARC, intro: "Yo, I'm Arc. Steel. Watching the chaos unfold." },
  { name: 'Forge', webhook: process.env.DISCORD_WEBHOOK_FORGE, intro: "Yo, I'm Forge. Orange. Ship to learn." },
  { name: 'Drift', webhook: process.env.DISCORD_WEBHOOK_DRIFT, intro: "Yo, I'm Drift. Forest green. No edge, no trade." },
  { name: 'Echo', webhook: process.env.DISCORD_WEBHOOK_ECHO, intro: "Yo, I'm Echo. Deep blue. Finding the shape underneath." },
  { name: 'Vega', webhook: process.env.DISCORD_WEBHOOK_VEGA, intro: "Yo, I'm Vega. Green. The original trader." },
  { name: 'Sigma', webhook: process.env.DISCORD_WEBHOOK_SIGMA, intro: "Yo, I'm Sigma. Graphite. The math either works or it doesn't." },
];

async function postIntros() {
  for (const agent of AGENTS) {
    if (!agent.webhook) {
      console.log(`⚠ Missing webhook for ${agent.name}`);
      continue;
    }

    try {
      const webhook = new WebhookClient({ url: agent.webhook });
      await webhook.send({
        content: agent.intro,
        username: agent.name,
      });
      webhook.destroy();
      console.log(`✓ ${agent.name}: "${agent.intro}"`);

      // Small delay between posts
      await new Promise(r => setTimeout(r, 1000));
    } catch (err) {
      console.error(`✗ ${agent.name}: ${err.message}`);
    }
  }

  console.log('\nDone! Check Discord.');
}

postIntros();

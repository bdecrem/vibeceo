#!/usr/bin/env node
/**
 * List all roles in the server to get role IDs for agent mentions
 */

const dotenv = require('dotenv');
const path = require('path');
const { Client, GatewayIntentBits } = require('discord.js');

dotenv.config({ path: path.resolve(__dirname, '../.env.local'), override: true });

const client = new Client({
  intents: [GatewayIntentBits.Guilds]
});

client.once('ready', async () => {
  console.log(`Logged in as ${client.user.tag}`);

  // Get the first guild the bot is in
  const guild = client.guilds.cache.first();
  if (!guild) {
    console.log('Bot is not in any guilds');
    process.exit(1);
  }

  console.log(`\nRoles in ${guild.name}:\n`);

  // Fetch all roles
  const roles = await guild.roles.fetch();

  // Filter and display agent-related roles
  const agentNames = ['arc', 'forge', 'drift', 'echo', 'vega'];

  roles.forEach(role => {
    const isAgent = agentNames.includes(role.name.toLowerCase());
    if (isAgent) {
      console.log(`✓ ${role.name}: ${role.id}`);
    }
  });

  console.log('\n--- All roles ---');
  roles.forEach(role => {
    if (role.name !== '@everyone') {
      console.log(`  ${role.name}: ${role.id}`);
    }
  });

  client.destroy();
  process.exit(0);
});

client.login(process.env.DISCORD_BOT_TOKEN);

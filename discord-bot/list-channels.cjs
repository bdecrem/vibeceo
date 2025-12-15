const dotenv = require('dotenv');
const path = require('path');
dotenv.config({ path: path.resolve(__dirname, '.env.local') });

const { Client, GatewayIntentBits } = require('discord.js');

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages]
});

client.once('ready', async () => {
  console.log('Bot connected as', client.user.tag);
  console.log('\nGuilds (servers) the bot is in:');

  for (const [guildId, guild] of client.guilds.cache) {
    console.log(`\n📌 ${guild.name} (${guildId})`);

    const channels = guild.channels.cache
      .filter(c => c.type === 0) // Text channels
      .map(c => `  #${c.name} (${c.id})`)
      .join('\n');

    console.log(channels || '  (no text channels visible)');
  }

  client.destroy();
});

client.login(process.env.DISCORD_BOT_TOKEN).catch(err => {
  console.error('Login failed:', err.message);
});

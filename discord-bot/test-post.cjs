const dotenv = require('dotenv');
const path = require('path');
dotenv.config({ path: path.resolve(__dirname, '.env.local') });

const { Client, GatewayIntentBits } = require('discord.js');

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages]
});

client.once('ready', async () => {
  console.log('Bot connected as', client.user.tag);

  const channelId = '1441080550415929406'; // #general in kochi.to
  if (!channelId) {
    console.log('No channel ID found in env');
    client.destroy();
    return;
  }

  try {
    const channel = await client.channels.fetch(channelId);
    await channel.send('🤖 Test message from Arc — checking if the old Discord bot still works!');
    console.log('Message sent successfully to channel', channelId);
  } catch (err) {
    console.error('Failed to send:', err.message);
  }

  client.destroy();
});

client.login(process.env.DISCORD_BOT_TOKEN).catch(err => {
  console.error('Login failed:', err.message);
});

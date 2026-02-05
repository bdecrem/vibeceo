const dotenv = require('dotenv');
const path = require('path');
dotenv.config({ path: path.resolve(__dirname, '.env.local') });

const { Client, GatewayIntentBits } = require('discord.js');

const channelId = '1441080550415929406';
// Yesterday 8pm PST (Feb 4) to today 6:19am PST (Feb 5)
const startTime = new Date('2026-02-05T04:00:00Z'); // 8pm PST = 4am UTC next day
const endTime = new Date('2026-02-05T14:19:00Z');   // 6:19am PST = 14:19 UTC

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent]
});

client.once('ready', async () => {
  try {
    const channel = await client.channels.fetch(channelId);
    let allMessages = [];
    let lastId = null;
    let keepFetching = true;
    
    while (keepFetching) {
      const options = { limit: 100 };
      if (lastId) options.before = lastId;
      
      const batch = await channel.messages.fetch(options);
      if (batch.size === 0) break;
      
      const msgs = [...batch.values()].map(m => ({
        id: m.id,
        author: m.author.username,
        authorId: m.author.id,
        bot: m.author.bot,
        content: m.content,
        timestamp: m.createdAt.toISOString(),
        webhookId: m.webhookId || null
      }));
      
      allMessages.push(...msgs);
      lastId = batch.last().id;
      
      const oldestTime = new Date(msgs[msgs.length - 1].timestamp);
      if (oldestTime < startTime) keepFetching = false;
      if (allMessages.length > 1500) keepFetching = false;
    }
    
    const filtered = allMessages
      .filter(m => {
        const t = new Date(m.timestamp);
        return t >= startTime && t <= endTime;
      })
      .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
    
    console.log(JSON.stringify(filtered, null, 2));
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    client.destroy();
  }
});

client.login(process.env.DISCORD_BOT_TOKEN);

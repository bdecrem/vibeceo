import { Client, Events, GatewayIntentBits } from 'discord.js';
import { handleMessage } from './handlers.js';
import { initializeWebhooks } from './webhooks.js';
import { validateConfig } from './config.js';

// Global variable to track if a bot instance is already running
let isBotRunning = false;

// Initialize Discord client with necessary intents
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

// Event handler when the bot is ready
client.once(Events.ClientReady, (readyClient) => {
  console.log(`Ready! Logged in as ${readyClient.user.tag}`);
});

// Handle incoming messages
client.on(Events.MessageCreate, async (message) => {
  // Ignore messages from bots to prevent loops
  if (message.author.bot) return;
  
  try {
    await handleMessage(message);
  } catch (error) {
    console.error('Error handling message:', error);
    try {
      await message.reply('Sorry, there was an error processing your message.');
    } catch (replyError) {
      console.error('Error sending error message:', replyError);
    }
  }
});

// Start the bot
export async function startBot() {
  console.log('Starting bot...');
  console.log('Instance ID:', process.env.BOT_INSTANCE_ID);
  console.log('Process ID:', process.pid);
  console.log('Environment:', process.env.NODE_ENV);
  
  // Check if another instance is already running
  if (isBotRunning) {
    console.error('Another bot instance is already running. Exiting...');
    process.exit(1);
  }
  
  isBotRunning = true;
  
  try {
    // Validate configuration
    const { token, webhookUrls } = validateConfig();
    
    // Log in to Discord
    await client.login(token);
    
    // Initialize webhooks for each channel the bot has access to
    for (const guild of client.guilds.cache.values()) {
      const channels = await guild.channels.fetch();
      for (const channel of channels.values()) {
        if (channel && channel.isTextBased()) {
          try {
            await initializeWebhooks(channel.id, webhookUrls);
          } catch (error) {
            console.error(`Failed to initialize webhooks for channel ${channel.id}:`, error);
          }
        }
      }
    }
    
    console.log('Discord bot started successfully');
  } catch (error) {
    console.error('Failed to start Discord bot:', error);
    isBotRunning = false;
    process.exit(1);
  }
}

// Handle shutdown gracefully
process.on('SIGINT', () => {
  console.log('Shutting down bot...');
  isBotRunning = false;
  client.destroy();
  process.exit(0);
});

// Export the client for use in other parts of the application
export { client }; 
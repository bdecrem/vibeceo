import { Client, Events, GatewayIntentBits } from 'discord.js';
import { handleMessage } from './handlers.js';
import { initializeWebhooks } from './webhooks.js';

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
  }
});

export async function startBot(token: string, webhookUrls: Record<string, string>) {
  // Check if another instance is already running
  if (isBotRunning) {
    console.error('Another bot instance is already running. Exiting...');
    process.exit(1);
  }
  
  isBotRunning = true;
  
  try {
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
    throw error;
  }
}

export function stopBot() {
  client.destroy();
  isBotRunning = false;
  console.log('Discord bot stopped');
}

// Export the client for use in other parts of the application
export { client }; 
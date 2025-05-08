import { Client, Events, GatewayIntentBits, TextChannel, Message } from 'discord.js';
import { handleMessage, initializeScheduledTasks, initializeStoryArc } from './handlers.js';
import { initializeWebhooks, sendAsCharacter } from './webhooks.js';
import { validateConfig } from './config.js';
import { initializeScheduler } from './scheduler.js';
import { generateEpisodeContext } from './episodeContext.js';
import { generateFullEpisode, EpisodeScenes } from './sceneFramework.js';
import { EpisodeContext } from './episodeContext.js';
import { createNewEpisode, addScene } from './episodeStorage.js';

// Global variables to track bot state
let isBotRunning = false;
let currentEpisodeContext: EpisodeContext | null = null;
let currentSceneIndex = 0;
let currentEpisode: EpisodeScenes | null = null;

// Function to update current scene
export function updateCurrentScene(index: number) {
  currentSceneIndex = index;
  console.log(`Updated current scene to: ${index}`);
}

// Function to get current story info
export function getCurrentStoryInfo() {
  if (!currentEpisodeContext || !currentEpisode) {
    return null;
  }

  return {
    episodeContext: currentEpisodeContext,
    currentEpisode,
    currentScene: currentEpisode.generatedContent[currentSceneIndex],
    sceneIndex: currentSceneIndex
  };
}

// Initialize Discord client with necessary intents
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

// Event handler when the bot is ready
client.once(Events.ClientReady, async (readyClient) => {
  console.log(`Ready! Logged in as ${readyClient.user.tag}`);
  
  try {
    // Initialize story arc first
    console.log('Initializing story arc configuration...');
    initializeStoryArc();
    console.log('Story arc configuration initialized');
    
    // Send theme immediately
    const channel = await client.channels.fetch('1354474492629618831');
    if (channel instanceof TextChannel && currentEpisodeContext) {
      await channel.send(`✨ ━━━━━━━━━━━━━━━ ✨\nWelcome to The AF\n✨ ━━━━━━━━━━━━━━━ ✨`);
    }
    
    // Initialize Discord-specific components
    const { webhookUrls } = validateConfig();
    
    // Initialize webhooks only for #general channel
    console.log('Starting webhook initialization...');
    try {
      await initializeWebhooks('1354474492629618831', webhookUrls);
      console.log('Webhooks initialized for #general channel');
      
      if (channel instanceof TextChannel) {
        initializeScheduler(client);
        console.log('Centralized scheduler started for #general channel');
      }
    } catch (error) {
      console.error('Failed to initialize webhooks for #general channel:', error);
    }
    
    console.log('All webhooks initialized successfully');
    console.log('Discord bot started successfully');
  } catch (error) {
    console.error('Error during bot initialization:', error);
  }
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
  console.log('=== BOT STARTUP INFO ===');
  console.log('Node.js version:', process.version);
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
    // Validate configuration and get token
    const { token } = validateConfig();
    
    // Initialize story arc first
    console.log('=== INITIALIZING STORY ARC ===');
    initializeStoryArc();
    console.log('=== STORY ARC INITIALIZED ===');
    
    // Generate all story content BEFORE connecting to Discord
    const unitDurationMinutes = parseInt(process.env.UNIT_DURATION_MINUTES || '20', 10);
    console.log(`Generating episode context with unit duration: ${unitDurationMinutes} minutes`);
    
    console.log('=== STARTING EPISODE CONTEXT GENERATION ===');
    currentEpisodeContext = await generateEpisodeContext(new Date().toISOString(), unitDurationMinutes);
    console.log('=== EPISODE CONTEXT GENERATION COMPLETE ===');

    // Create new episode in storage with the generated arc
    console.log('=== CREATING EPISODE JSON STORAGE ===');
    createNewEpisode({
      theme: currentEpisodeContext.theme,
      arcSummary: currentEpisodeContext.arc.arcSummary,
      toneKeywords: currentEpisodeContext.arc.toneKeywords,
      motifs: currentEpisodeContext.arc.motifs
    }, unitDurationMinutes);
    console.log('=== EPISODE JSON STORAGE CREATED ===');
    
    console.log('=== STARTING SCENE GENERATION ===');
    currentEpisode = await generateFullEpisode(currentEpisodeContext);
    console.log('=== SCENE GENERATION COMPLETE ===');
    
    // Log the generated context in detail
    console.log('=== EPISODE CONTEXT DETAILS ===');
    console.log('Date:', currentEpisodeContext.date);
    console.log('Day of Week:', currentEpisodeContext.dayOfWeek);
    console.log('Start Time:', currentEpisodeContext.startTime);
    console.log('Duration (minutes):', currentEpisodeContext.durationMinutes);
    console.log('Theme:', currentEpisodeContext.theme);
    console.log('Arc Summary:', currentEpisodeContext.arc.arcSummary);
    console.log('Tone Keywords:', currentEpisodeContext.arc.toneKeywords.join(', '));
    console.log('Motifs:', currentEpisodeContext.arc.motifs.join(', '));
    console.log('Unique Locations:', [...new Set(currentEpisodeContext.locationTimeline)]);
    
    // Now that all content is generated, connect to Discord
    await client.login(token);
    
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

// Export the client and episode context for use in other parts of the application
export { client, currentEpisodeContext, currentEpisode, currentSceneIndex }; 
import { Client, Events, GatewayIntentBits, TextChannel, Message } from 'discord.js';
import { handleMessage, initializeScheduledTasks, initializeStoryArc } from './handlers.js';
import { initializeWebhooks, sendAsCharacter } from './webhooks.js';
import { validateConfig, ValidatedConfig } from './config.js'; // Corrected import path and added ValidatedConfig
import { initializeScheduler } from './scheduler.js';
import { generateEpisodeContext } from './episodeContext.js';
import { generateFullEpisode, EpisodeScenes } from './sceneFramework.js';
import { EpisodeContext } from './episodeContext.js';
import { createNewEpisode, addScene } from './episodeStorage.js';
import { isWeekend } from './locationTime.js';
import fs from 'fs';
import path from 'path';

// Global variables to track bot state
let isBotRunning = false;
let currentEpisodeContext: EpisodeContext | null = null;
let currentSceneIndex = 0;
let currentEpisode: EpisodeScenes | null = null;

// Channel IDs are now loaded and validated by config.ts

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

// Automatically select a random coach and incident for the story arc
export function generateRandomCoachIrritation() {
  try {
    console.log('=== GENERATING RANDOM COACH IRRITATION FOR NEW EPISODE ===');
    
    // Path to waterheater incidents file and the incidents directory
    const waterheaterFile = path.join(process.cwd(), 'data', 'waterheater-incidents.ts');
    const incidentsDir = path.join(process.cwd(), 'data');
    
    // First check if file exists
    if (!fs.existsSync(waterheaterFile)) {
      console.error('Waterheater incidents file not found:', waterheaterFile);
      return;
    }
    
    // Load waterheater incidents directly from the file
    try {
      // Read the file contents and parse the data
      const waterheaterFileContent = fs.readFileSync(waterheaterFile, 'utf-8');
      
      // Extract the incidents data using regex (simple parser)
      const coachesData = [];
      const coachSections = waterheaterFileContent.match(/id: "(.*?)",\s*incidents: \[([\s\S]*?)\]/g);
      
      if (!coachSections) {
        console.error('Could not parse waterheater incidents data');
        return;
      }
      
      for (const section of coachSections) {
        const coachIdMatch = section.match(/id: "(.*?)"/);
        if (coachIdMatch && coachIdMatch[1]) {
          const coachId = coachIdMatch[1];
          const incidentsMatches = section.match(/text: "(.*?)"/g);
          
          if (incidentsMatches) {
            const incidents = incidentsMatches.map(match => {
              const textMatch = match.match(/text: "(.*?)"/);
              return { text: textMatch ? textMatch[1] : '' };
            });
            
            coachesData.push({ id: coachId, incidents });
          }
        }
      }
      
      // If no coaches were found, exit
      if (coachesData.length === 0) {
        console.error('No coach data found in waterheater incidents file');
        return;
      }
      
      // 1. Randomly select a coach
      const selectedCoachIndex = Math.floor(Math.random() * coachesData.length);
      const selectedCoach = coachesData[selectedCoachIndex].id;
      const coachIncidents = coachesData[selectedCoachIndex];
      
      // 2. Randomly select another coach as target (not the same as selected coach)
      const otherCoaches = coachesData.filter(c => c.id !== selectedCoach).map(c => c.id);
      const selectedTarget = otherCoaches[Math.floor(Math.random() * otherCoaches.length)];
      
      // 3. Randomly select an incident for this coach
      const incidents = coachIncidents.incidents;
      const selectedIncident = incidents[Math.floor(Math.random() * incidents.length)];
      
      // 4. Update the story-arcs.json file
      const storyArcsPath = path.join(process.cwd(), 'data', 'story-themes', 'story-arcs.json');
      
      // Check if the file exists, create with default data if not
      if (!fs.existsSync(storyArcsPath)) {
        const defaultData = { currentIrritation: {} };
        fs.writeFileSync(storyArcsPath, JSON.stringify(defaultData, null, 2));
      }
      
      // Read the existing data
      const storyArcsData = JSON.parse(fs.readFileSync(storyArcsPath, 'utf-8'));
      
      // Set up intensity values (keep existing ones if present)
      const intensity = storyArcsData.currentIrritation?.intensity || {
        morning: [1, 2, 3, 4, 5, 6, 7, 8],
        midday: [2, 3, 4, 5, 6, 7, 8, 9],
        afternoon: [3, 4, 5, 6, 7, 8, 9, 10]
      };
      
      // Update currentIrritation field
      storyArcsData.currentIrritation = {
        coach: selectedCoach,
        target: selectedTarget,
        incident: selectedIncident.text,
        intensity
      };
      
      // Write the updated data back to the file
      fs.writeFileSync(storyArcsPath, JSON.stringify(storyArcsData, null, 2));
      
      console.log(`=== COACH IRRITATION UPDATED ===`);
      console.log(`Coach: ${selectedCoach}`);
      console.log(`Target: ${selectedTarget}`);
      console.log(`Incident: ${selectedIncident.text}`);
      console.log('=== COACH IRRITATION UPDATE COMPLETE ===');

      // Return the updated data for possible use elsewhere
      return {
        coach: selectedCoach,
        target: selectedTarget,
        incident: selectedIncident.text
      };
    } catch (importError) {
      console.error('Error processing waterheater incidents:', importError);
    }
  } catch (error) {
    console.error('Error generating random coach irritation:', error);
  }
  return null;
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
    
    // Validate configuration and get token, webhook URLs, and channel IDs
    const validatedConfig = validateConfig(); // Call once and store
    const { webhookUrls, channelIds } = validatedConfig;

    // Send theme immediately to #thelounge
    if (channelIds.thelounge) {
        try {
            const loungeChannel = await client.channels.fetch(channelIds.thelounge);
            if (loungeChannel instanceof TextChannel) { // currentEpisodeContext might not be initialized here yet
                await loungeChannel.send(`✨ ━━━━━━━━━━━━━━━ ✨\nWelcome to The AF\n✨ ━━━━━━━━━━━━━━━ ✨`);
            } else {
                console.error('#thelounge channel is not a text channel or could not be fetched.');
            }
        } catch (error) {
            console.error('Failed to fetch #thelounge channel or send welcome message:', error);
        }
    } else {
        console.error('THELOUNGE_CHANNEL_ID not found in validated config.');
    }
    
    // Initialize webhooks for all channels
    console.log('Starting webhook initialization...');
    try {
      // Initialize for #general channel
      if (channelIds.general && webhookUrls.general) {
        await initializeWebhooks(channelIds.general, webhookUrls.general);
        console.log('Webhooks initialized for #general channel');
      } else {
        console.error('GENERAL_CHANNEL_ID or its webhooks not set, skipping webhook initialization for #general');
      }
      
      // Initialize for #thelounge channel
      if (channelIds.thelounge && webhookUrls.thelounge) {
        await initializeWebhooks(channelIds.thelounge, webhookUrls.thelounge);
        console.log('Webhooks initialized for #thelounge channel');
      } else {
        console.error('THELOUNGE_CHANNEL_ID or its webhooks not set, skipping webhook initialization for #thelounge');
      }
      
      // Initialize for #pitch channel
      if (channelIds.pitch && webhookUrls.pitch) {
        await initializeWebhooks(channelIds.pitch, webhookUrls.pitch);
        console.log('Webhooks initialized for #pitch channel');
      } else {
        console.error('PITCH_CHANNEL_ID or its webhooks not set, skipping webhook initialization for #pitch');
      }
      
      // Initialize for #staffmeetings channel
      if (channelIds.staffmeetings && webhookUrls.staffmeetings) {
        await initializeWebhooks(channelIds.staffmeetings, webhookUrls.staffmeetings);
        console.log('Webhooks initialized for #staffmeetings channel');
      } else {
        console.error('STAFFMEETINGS_CHANNEL_ID or its webhooks not set, skipping webhook initialization for #staffmeetings');
      }
      
      // Initialize scheduler with client (it will get channel IDs from config itself or be passed them)
      initializeScheduler(client); // Assuming scheduler is updated to use validatedConfig or passed channelIds
      console.log('Centralized scheduler started');
    } catch (error) {
      console.error('Failed to initialize webhooks:', error);
    }
    
    // === Suggested Diagnostic Logging Start ===
    console.log('[BOT_INIT] === Effective Channel Configuration ===');
    const channelTypeDisplayNames: Record<string, string> = {
      general: "General",
      thelounge: "The Lounge",
      pitch: "Pitch",
      staffmeetings: "Staff Meetings"
    };

    for (const channelType of Object.keys(channelIds).sort()) {
      const channelId = channelIds[channelType];
      const displayName = channelTypeDisplayNames[channelType] || channelType;
      console.log(`[BOT_INIT] ${displayName} Channel ID: ${channelId || 'Not Set'}`);
      if (webhookUrls[channelType] && channelId) {
        const loadedCharacterWebhooks = Object.keys(webhookUrls[channelType]).sort();
        if (loadedCharacterWebhooks.length > 0) {
          console.log(`[BOT_INIT]   Webhooks loaded for: ${loadedCharacterWebhooks.join(', ')}`);
        } else {
          console.log(`[BOT_INIT]   No webhooks loaded for this channel despite Channel ID being set.`);
        }
      } else if (channelId) {
        console.log(`[BOT_INIT]   Channel ID is set, but no webhook configuration found for this channel type.`);
      } else {
        console.log(`[BOT_INIT]   Channel ID not set for this channel type.`);
      }
    }
    console.log('[BOT_INIT] =====================================');
    // === Suggested Diagnostic Logging End ===

    console.log('All webhooks initialized successfully (for configured channels)');
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
    // Generate a random coach irritation for this episode
    generateRandomCoachIrritation();
    
    // Validate configuration and get token
    const { token } = validateConfig(); // token is used for login, webhookUrls & channelIds used in ClientReady
    
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
// Removed old channel ID constants from export
export { client, currentEpisodeContext, currentEpisode, currentSceneIndex };

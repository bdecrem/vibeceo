import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import Together from "together-ai";
import dotenv from "dotenv";
import { TextChannel, Client, WebhookClient } from "discord.js";
import { customEventMessageCache } from "./eventMessages.js";
import { getWebhookUrls } from "./config.js";
import { DiscordMessenger } from "./discordMessenger.js";
import { getLocationAndTime } from "./locationTime.js";

// Set up file paths
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Define the Weekend MicroPost prompt interface
interface WeekendMicroPostPrompt {
  id: string;
  name: string;
  description: string;
  systemPrompt: string;
  settings: string[];
  emotionalTones: string[];
  microDetails: string[];
  characters: string[];
  modelName: string;
  scheduleCommand: string;
  intro: string;
  outro: string;
  businessStates?: string[];
}

// Load environment variables using centralized loader
import { loadEnvironment } from './env-loader.js';
loadEnvironment();

// Initialize Together.ai (will be null if no API key)
let together: Together | null = null;
try {
  if (process.env.TOGETHER_API_KEY) {
    console.log('[WeekendMicroPosts] Found TOGETHER_API_KEY, initializing Together.ai');
    together = new Together({
      apiKey: process.env.TOGETHER_API_KEY,
    });
    console.log('[WeekendMicroPosts] Together.ai initialized successfully');
  } else {
    const envSource = process.env.NODE_ENV === 'production' ? 'Railway environment' : '.env.local';
    console.warn(`[WeekendMicroPosts] TOGETHER_API_KEY not found in ${envSource} - weekend microPosts will not work`);
  }
} catch (error) {
  console.error("[WeekendMicroPosts] Error initializing Together.ai:", error);
}

// Primary Discord channel ID (General)
const GENERAL_CHANNEL_ID = "1354474492629618831";

// Variables to hold webhook clients
let foundryHeatWebhook: WebhookClient | null = null;
let alexirVipWebhook: WebhookClient | null = null;

// Initialize webhooks from config
function initializeWebhooks() {
  const webhookUrls = getWebhookUrls();
  const errors = [];
  
  // Get FoundryHeat webhook URL
  if (webhookUrls['general_foundryheat'] || process.env.GENERAL_WEBHOOK_URL_FOUNDRYHEAT) {
    try {
      const webhookUrl = webhookUrls['general_foundryheat'] || process.env.GENERAL_WEBHOOK_URL_FOUNDRYHEAT;
      if (webhookUrl) {
        foundryHeatWebhook = new WebhookClient({ url: webhookUrl });
        console.log("[WeekendMicroPosts] FoundryHeat webhook initialized successfully");
      } else {
        throw new Error("FoundryHeat webhook URL is undefined");
      }
    } catch (error) {
      console.error("[WeekendMicroPosts] Error initializing FoundryHeat webhook:", error);
      errors.push('FoundryHeat webhook initialization failed');
    }
  } else {
    const envSource = process.env.NODE_ENV === 'production' ? 'Railway environment' : '.env.local';
    console.error(`[WeekendMicroPosts] Missing FoundryHeat webhook URL in ${envSource}`);
    errors.push('FoundryHeat webhook URL not found');
  }
  
  // Get Alexir VIP webhook URL for cross-posting
  if (webhookUrls['alexir_vip'] || process.env.ALEXIR_VIP_WEBHOOK_URL) {
    try {
      const webhookUrl = webhookUrls['alexir_vip'] || process.env.ALEXIR_VIP_WEBHOOK_URL;
      if (webhookUrl) {
        alexirVipWebhook = new WebhookClient({ url: webhookUrl });
        console.log("[WeekendMicroPosts] Alexir VIP webhook initialized successfully");
      } else {
        throw new Error("Alexir VIP webhook URL is undefined");
      }
    } catch (error) {
      console.error("[WeekendMicroPosts] Error initializing Alexir VIP webhook:", error);
      // This is not critical - we can still post to the main channel
    }
  } else {
    const envSource = process.env.NODE_ENV === 'production' ? 'Railway environment' : '.env.local';
    console.warn(`[WeekendMicroPosts] Missing Alexir VIP webhook URL in ${envSource} - cross-posting will be disabled`);
  }
  
  // Return success if at least FoundryHeat webhook was initialized
  return foundryHeatWebhook !== null;
}

// Function to initialize custom event messages from prompts
export function initializeWeekendMicroEventMessages() {
  console.log("[WeekendMicroPosts] Initializing custom event messages...");
  
  // Pre-initialize webhooks to catch any issues early
  initializeWebhooks();
  
  const prompts = loadWeekendPrompts();
  let count = 0;

  if (prompts.length === 0) {
    console.error("[WeekendMicroPosts] Failed to load prompts from JSON file!");
    return;
  }

  // Set TheAF to only show the location/time/weather with no additional text
  for (const prompt of prompts) {
    if (!prompt.scheduleCommand) {
      console.warn(`[WeekendMicroPosts] Prompt '${prompt.id}' missing scheduleCommand, skipping.`);
      continue;
    }

    // ONLY the simplified arrival message for TheAF - just location, time, weather
    customEventMessageCache[prompt.scheduleCommand] = {
      intro: "{simplifiedArrival}",
      outro: "" // Empty outro
    };
    
    count++;
    console.log(`[WeekendMicroPosts] Registered event type: ${prompt.scheduleCommand}`);
  }

  console.log(`[WeekendMicroPosts] Initialized ${count} custom event messages`);
}

// Load prompts from both JSON files
function loadWeekendPrompts(): WeekendMicroPostPrompt[] {
  const allPrompts: WeekendMicroPostPrompt[] = [];
  
  // Load weekend-micro-posts.json (for alextipsy)
  try {
    const weekendPromptsPath = path.join(process.cwd(), "data", "weekend-micro-posts.json");
    console.log(`[WeekendMicroPosts-v2] Loading weekend prompts from: ${weekendPromptsPath}`);
    
    if (fs.existsSync(weekendPromptsPath)) {
      const data = fs.readFileSync(weekendPromptsPath, "utf8");
      const prompts: WeekendMicroPostPrompt[] = JSON.parse(data);
      allPrompts.push(...prompts);
      console.log(`[WeekendMicroPosts-v2] Loaded ${prompts.length} weekend prompts`);
    }
  } catch (error) {
    console.error("[WeekendMicroPosts-v2] Error loading weekend prompts:", error);
  }
  
  // Load micro-posts.json (for other types) and convert format
  try {
    const microPostsPath = path.join(process.cwd(), "data", "micro-posts.json");
    console.log(`[WeekendMicroPosts-v2] Loading micro prompts from: ${microPostsPath}`);
    
    if (fs.existsSync(microPostsPath)) {
      const data = fs.readFileSync(microPostsPath, "utf8");
      const microPrompts: any[] = JSON.parse(data);
      
      // Convert micro-posts format to weekend format
      for (const microPrompt of microPrompts) {
        const convertedPrompt: WeekendMicroPostPrompt = {
          id: microPrompt.id,
          name: microPrompt.name,
          description: microPrompt.description,
          systemPrompt: microPrompt.prompt,
          settings: [], // Micro-posts don't have these, use empty arrays
          emotionalTones: [],
          microDetails: [],
          characters: [],
          modelName: "meta-llama/Meta-Llama-3.1-8B-Instruct-Turbo", // Default model for micro-posts
          scheduleCommand: microPrompt.scheduleCommand,
          intro: microPrompt.intro,
          outro: microPrompt.outro
        };
        allPrompts.push(convertedPrompt);
      }
      console.log(`[WeekendMicroPosts-v2] Converted ${microPrompts.length} micro prompts`);
    }
  } catch (error) {
    console.error("[WeekendMicroPosts-v2] Error loading micro prompts:", error);
  }
  
  console.log(`[WeekendMicroPosts-v2] Total prompts loaded: ${allPrompts.length}`);
  return allPrompts;
}

// Find a prompt by ID
function findPromptById(id: string): WeekendMicroPostPrompt | undefined {
  const prompts = loadWeekendPrompts();
  return prompts.find(prompt => prompt.id === id);
}

// Generate post using Together.ai API (supports both weekend and micro post formats)
async function generateWeekendPost(promptId: string): Promise<string> {
  const prompt = findPromptById(promptId);
  if (!prompt) {
    throw new Error(`Prompt with ID '${promptId}' not found`);
  }

  if (!together) {
    const envSource = process.env.NODE_ENV === 'production' ? 'Railway environment' : '.env.local';
    throw new Error(`Together.ai not initialized - check TOGETHER_API_KEY in ${envSource}`);
  }

  try {
    console.log(`[${prompt.name}] Generating post for type: ${promptId}...`);

    // Check if this is a complex weekend prompt (has settings) or a simple micro prompt
    const isWeekendPrompt = prompt.settings && prompt.settings.length > 0;
    
    let userPrompt = "";
    
    if (isWeekendPrompt) {
      // Complex weekend prompt logic (for alextipsy)
      const setting = prompt.settings[Math.floor(Math.random() * prompt.settings.length)];
      const tone = prompt.emotionalTones[Math.floor(Math.random() * prompt.emotionalTones.length)];
      const detail = prompt.microDetails[Math.floor(Math.random() * prompt.microDetails.length)];
      const character = prompt.characters[Math.floor(Math.random() * prompt.characters.length)];
      
      let businessState = "";
      if (prompt.businessStates && prompt.businessStates.length > 0) {
        businessState = prompt.businessStates[Math.floor(Math.random() * prompt.businessStates.length)];
      }

      userPrompt = `
Location: ${setting}
Character to mention: ${character}
${businessState ? `Business context: ${businessState}\n` : ""}
${detail ? `Product: ${detail}\n` : ""}
${tone ? `Emotional tone: ${tone}\n` : ""}

Write ONE tipsy Alex tweet. NO quotation marks. Cut every unnecessary word. End sharp.
`;
    } else {
      // Simple micro prompt logic (for other types)
      // The systemPrompt already contains the full instructions for micro-posts
      userPrompt = "Generate the content following the system instructions.";
    }

    const completion = await together.chat.completions.create({
      model: prompt.modelName,
      messages: [
        { role: "system", content: prompt.systemPrompt.trim() },
        { role: "user", content: userPrompt.trim() }
      ],
      stream: false,
      temperature: isWeekendPrompt ? 0.88 : 0.75,
      max_tokens: isWeekendPrompt ? 50 : 80,  // More tokens for other post types
      top_p: 0.95,
      frequency_penalty: 0.4,
      presence_penalty: 0.4,
    });
    
    const response = completion.choices[0]?.message?.content?.trim() || "";
    console.log(`[${prompt.name}] Generated response (first 100 chars): ${response.substring(0, 100)}...`);
    
    // Save raw response for debugging
    const rawFilePath = path.join(process.cwd(), "logs", `${promptId}_response_${new Date().toISOString().replace(/:/g, "-")}.txt`);
    fs.writeFileSync(rawFilePath, response, "utf8");
    console.log(`[${prompt.name}] Saved raw response to ${rawFilePath}`);
    
    return response;
  } catch (error) {
    console.error(`[${prompt.name}] Error generating post:`, error);
    throw error;
  }
}

// Post the generated content to Discord using DiscordMessenger system with FoundryHeat branding and cross-posting (v2)
async function postToDiscordV2(promptId: string, content: string, contentIntro: string, outro: string, channelId: string, client: Client): Promise<boolean> {
  try {
    console.log(`[WeekendMicroPosts-v2] Using DiscordMessenger system with FoundryHeat branding`);
    
    // Get the DiscordMessenger instance
    const messenger = DiscordMessenger.getInstance();
    messenger.setDiscordClient(client);
    
    // Determine micropost type from promptId  
    const micropostType = promptId === 'alex-tipsy-dispatch' ? 'alextipsy' : 'other';
    console.log(`[WeekendMicroPosts-v2] Detected micropost type: ${micropostType} for promptId: ${promptId}`);
    
    // Get the event type for the location/time intro
    const prompt = findPromptById(promptId);
    const eventType = prompt?.scheduleCommand || 'alextipsy';
    
    // Get TheAF intro from event system (location/time info)
    const eventIntro = customEventMessageCache[eventType]?.intro;
    let theafIntro = null;
    
    if (eventIntro && eventIntro.includes('{simplifiedArrival}')) {
      // Get actual location/time info from the event system
      try {
        const now = new Date();
        const gmtHour = now.getUTCHours();
        const gmtMinutes = now.getUTCMinutes();
        const locationTimeInfo = await getLocationAndTime(gmtHour, gmtMinutes);
        const simplifiedArrival = `The coaches are in ${locationTimeInfo.location} where it's ${locationTimeInfo.formattedTime}${locationTimeInfo.ampm} on ${locationTimeInfo.localDay} and ${locationTimeInfo.weather} ${locationTimeInfo.weatherEmoji}`;
        theafIntro = eventIntro.replace('{simplifiedArrival}', simplifiedArrival);
      } catch (error) {
        console.error('[WeekendMicroPosts-v2] Error getting location/time info:', error);
        theafIntro = eventIntro.replace('{simplifiedArrival}', 
          'The coaches are gathering for a new session');
      }
    }
    
    // Use standard protocol with proper separation
    if (theafIntro) {
             // Smart channel routing: Use centralized channel registry
       const fullContent = `${contentIntro}\n${content.trim()}${outro || ''}`;
       
       const sequence = {
         intro: {
           sender: 'theaf' as const,
           content: theafIntro,
           channelId: 'general' as const // Handler will auto-send to all cross-post channels too
         },
         main: {
           sender: 'foundryheat' as const,
           content: fullContent,
           channelId: 'general' as const // FoundryHeat main goes to #general
         },
         crossPosts: micropostType === 'alextipsy' ? [
           // For alextipsy: Just the content goes to VIP channel (intro is auto-handled)
           {
             sender: 'alexirvip' as const,
             content: fullContent,
             channelId: 'alexirVip' as const,
             delay: 500 // After intro is sent to both channels
           }
         ] : undefined
       };
      
      const success = await messenger.executeMessageSequence(sequence);
      
      if (success) {
        console.log(`[WeekendMicroPosts-v2] Successfully posted ${promptId} (${micropostType}) with TheAF intro`);
      } else {
        console.error(`[WeekendMicroPosts-v2] Failed to send ${promptId} (${micropostType}) with full sequence`);
      }
      
      return success;
    } else {
      // Fallback to sendMicropost method (no TheAF intro)
      const success = await messenger.sendMicropost(channelId, micropostType, content.trim(), contentIntro, outro);
      
      if (success) {
        console.log(`[WeekendMicroPosts-v2] Successfully posted ${promptId} (${micropostType}) without TheAF intro`);
      } else {
        console.error(`[WeekendMicroPosts-v2] Failed to send ${promptId} (${micropostType}) via sendMicropost`);
      }
      
      return success;
    }
  } catch (error) {
    console.error(`[WeekendMicroPosts-v2] Error posting to Discord:`, error);
    return false;
  }
}

// Main function to trigger the generation and posting of a weekend micro-post (v2)
export async function triggerWeekendMicroPostV2(promptId: string, channelId: string, client: Client): Promise<boolean> {
  console.log(`[WeekendMicroPosts] Starting generation for prompt '${promptId}'...`);
  
  try {
    // Get the prompt definition to access its intro/outro messages
    const prompt = findPromptById(promptId);
    if (!prompt) {
      throw new Error(`Weekend prompt with ID '${promptId}' not found`);
    }
    
    // Generate content
    const content = await generateWeekendPost(promptId);
    
    // Post to Discord using v2 system
    await postToDiscordV2(promptId, content, prompt.intro, prompt.outro, channelId, client);
    
    console.log(`[WeekendMicroPosts] Prompt '${promptId}' completed successfully`);
    return true;
  } catch (error) {
    console.error(`[WeekendMicroPosts] Error generating for prompt '${promptId}':`, error);
    return false;
  }
}

// Generate specific functions for scheduler integration (v2)
export function alexTipsyDispatchV2(channelId: string, client: Client): Promise<boolean> {
  return triggerWeekendMicroPostV2("alex-tipsy-dispatch", channelId, client);
}

export function crowdFavesV2(channelId: string, client: Client): Promise<boolean> {
  return triggerWeekendMicroPostV2("crowd-faves", channelId, client);
}

export function coachQuotesV2(channelId: string, client: Client): Promise<boolean> {
  return triggerWeekendMicroPostV2("coach-quotes", channelId, client);
}

export function microClassV2(channelId: string, client: Client): Promise<boolean> {
  return triggerWeekendMicroPostV2("microclass", channelId, client);
}

export function upcomingEventV2(channelId: string, client: Client): Promise<boolean> {
  return triggerWeekendMicroPostV2("upcoming-events", channelId, client);
}

// If this module is run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const promptId = process.argv[2];
  if (!promptId) {
    console.error("Please specify a prompt ID");
    process.exit(1);
  }
  
  generateWeekendPost(promptId)
    .then(content => {
      console.log("Generated content:", content);
      process.exit(0);
    })
    .catch(error => {
      console.error("Error:", error);
      process.exit(1);
    });
} 
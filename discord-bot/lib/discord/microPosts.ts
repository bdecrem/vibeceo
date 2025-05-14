import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import OpenAI from "openai";
import dotenv from "dotenv";
import { TextChannel, Client, WebhookClient } from "discord.js";
import { customEventMessageCache } from "./eventMessages.js";

// Set up file paths
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Define the MicroPost prompt interface
interface MicroPostPrompt {
  id: string;
  name: string;
  description: string;
  prompt: string;
  scheduleCommand: string;
  intro: string;
  outro: string;
}

// Load environment variables from .env.local
const envPath = path.resolve(process.cwd(), ".env.local");
console.log("Loading environment from:", envPath);
const result = dotenv.config({ path: envPath });
if (result.error) {
  console.error("Error loading .env.local:", result.error);
  process.exit(1);
}

// Initialize OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Primary Discord channel ID (General)
const GENERAL_CHANNEL_ID = "1354474492629618831";

// The FoundryHeat webhook for posting to General
let foundryHeatWebhook: WebhookClient | null = null;

// Initialize webhook
function initializeFoundryHeatWebhook() {
  if (!process.env.GENERAL_WEBHOOK_URL_FOUNDRYHEAT) {
    console.error("[MicroPosts] Missing GENERAL_WEBHOOK_URL_FOUNDRYHEAT in .env.local");
    return false;
  }

  try {
    foundryHeatWebhook = new WebhookClient({ url: process.env.GENERAL_WEBHOOK_URL_FOUNDRYHEAT });
    console.log("[MicroPosts] FoundryHeat webhook initialized successfully");
    return true;
  } catch (error) {
    console.error("[MicroPosts] Error initializing FoundryHeat webhook:", error);
    return false;
  }
}

// Function to initialize custom event messages from prompts
export function initializeMicroEventMessages() {
  console.log("[MicroPosts] Initializing custom event messages...");
  const prompts = loadPrompts();
  let count = 0;

  if (prompts.length === 0) {
    console.error("[MicroPosts] Failed to load prompts from JSON file!");
    return;
  }

  for (const prompt of prompts) {
    if (!prompt.scheduleCommand) {
      console.warn(`[MicroPosts] Prompt '${prompt.id}' missing scheduleCommand, skipping.`);
      continue;
    }

    // Add to custom event message cache
    customEventMessageCache[prompt.scheduleCommand] = {
      intro: prompt.intro || `The Foundry Heat with a ${prompt.name.toLowerCase()}.`,
      outro: prompt.outro || "Stay tuned for more insights."
    };
    count++;
    console.log(`[MicroPosts] Registered event type: ${prompt.scheduleCommand}`);
  }

  console.log(`[MicroPosts] Initialized ${count} custom event messages`);
}

// Load prompts from JSON file
function loadPrompts(): MicroPostPrompt[] {
  try {
    const promptsPath = path.join(process.cwd(), "data", "micro-posts.json");
    console.log(`[MicroPosts] Loading prompts from: ${promptsPath}`);
    
    if (!fs.existsSync(promptsPath)) {
      console.error(`[MicroPosts] Prompts file not found: ${promptsPath}`);
      return [];
    }

    const data = fs.readFileSync(promptsPath, "utf8");
    const prompts: MicroPostPrompt[] = JSON.parse(data);
    console.log(`[MicroPosts] Successfully loaded ${prompts.length} prompts`);
    return prompts;
  } catch (error) {
    console.error("[MicroPosts] Error loading prompts:", error);
    return [];
  }
}

// Find a prompt by ID
function findPromptById(id: string): MicroPostPrompt | undefined {
  const prompts = loadPrompts();
  return prompts.find(prompt => prompt.id === id);
}

// Generate post using OpenAI API
async function generatePost(promptId: string): Promise<string> {
  const prompt = findPromptById(promptId);
  if (!prompt) {
    throw new Error(`Prompt with ID '${promptId}' not found`);
  }

  try {
    console.log(`[${prompt.name}] Generating post...`);
    const completion = await openai.chat.completions.create({
      model: "gpt-4-turbo-preview",
      messages: [
        { role: "system", content: prompt.prompt }
      ],
      temperature: 1.0,
      max_tokens: 800,
    });
    
    const response = completion.choices[0].message.content || "";
    console.log(`[${prompt.name}] Generated response (first 100 chars): ${response.substring(0, 100)}...`);
    
    // Save raw response for debugging
    const rawFilePath = path.join(process.cwd(), `${promptId}_response_${new Date().toISOString().replace(/:/g, "-")}.txt`);
    fs.writeFileSync(rawFilePath, response, "utf8");
    console.log(`[${prompt.name}] Saved raw response to ${rawFilePath}`);
    
    return response;
  } catch (error) {
    console.error(`[${prompt.name}] Error generating post:`, error);
    throw error;
  }
}

// Post the generated content to Discord using FoundryHeat webhook
async function postToDiscord(promptId: string, content: string, intro: string, outro: string): Promise<boolean> {
  try {
    // Initialize webhook if not already done
    if (!foundryHeatWebhook) {
      if (!initializeFoundryHeatWebhook()) {
        throw new Error("Failed to initialize FoundryHeat webhook");
      }
    }

    console.log(`[MicroPosts] Posting to Discord using FoundryHeat webhook`);
    
    // Format the complete message with intro and outro
    const formattedMessage = `${intro}\n\n${content}\n\n${outro}`;
    
    // Send the message using the webhook
    // We need to check again to satisfy TypeScript
    if (!foundryHeatWebhook) {
      throw new Error("Webhook is null after initialization");
    }
    
    await foundryHeatWebhook.send({
      content: formattedMessage,
      username: "The Foundry Heat",
      // You can customize avatar_url if needed
    });
    
    console.log(`[MicroPosts] Successfully posted to Discord`);
    return true;
  } catch (error) {
    console.error(`[MicroPosts] Error posting to Discord:`, error);
    return false;
  }
}

// Main function to trigger the generation and posting of a micro-post
export async function triggerMicroPost(promptId: string, channelId: string, client: Client): Promise<boolean> {
  console.log(`[MicroPosts] Starting generation for prompt '${promptId}'...`);
  
  try {
    // Get the prompt definition to access its intro/outro messages
    const prompt = findPromptById(promptId);
    if (!prompt) {
      throw new Error(`Prompt with ID '${promptId}' not found`);
    }
    
    // Generate content
    const content = await generatePost(promptId);
    
    // Post to Discord
    await postToDiscord(promptId, content, prompt.intro, prompt.outro);
    
    console.log(`[MicroPosts] Prompt '${promptId}' completed successfully`);
    return true;
  } catch (error) {
    console.error(`[MicroPosts] Error generating for prompt '${promptId}':`, error);
    return false;
  }
}

// Generate all functions for scheduler integration
export function coachQuotes(channelId: string, client: Client): Promise<boolean> {
  return triggerMicroPost("coach-quotes", channelId, client);
}

export function crowdFaves(channelId: string, client: Client): Promise<boolean> {
  return triggerMicroPost("crowd-faves", channelId, client);
}

export function microClass(channelId: string, client: Client): Promise<boolean> {
  return triggerMicroPost("microclass", channelId, client);
}

export function upcomingEvent(channelId: string, client: Client): Promise<boolean> {
  return triggerMicroPost("upcoming-events", channelId, client);
}

// If this module is run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const promptId = process.argv[2];
  if (!promptId) {
    console.error("Please specify a prompt ID");
    process.exit(1);
  }
  
  generatePost(promptId)
    .then(content => {
      console.log("Generated content:", content);
      process.exit(0);
    })
    .catch(error => {
      console.error("Error:", error);
      process.exit(1);
    });
} 
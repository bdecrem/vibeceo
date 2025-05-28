import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import OpenAI from "openai";
import { loadEnvironment } from "./env-loader.js";
import {
  initializeWebhooks,
  sendAsCharacter,
  cleanupWebhooks,
  channelWebhooks
} from "./webhooks.js";
import { getWebhookUrls } from "./config.js";
import { Client, TextChannel } from "discord.js";
import { customEventMessageCache } from "./eventMessages.js";
import { getDiscussionCEO } from "../../data/discord-ceos-augmentations.js";

// Set up file paths
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
loadEnvironment();

// Initialize OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Primary Discord channel ID
const GENERAL_CHANNEL_ID = "1354474492629618831";

// Define interfaces
interface ArgumentPrompt {
  id: string;
  name: string;
  description: string;
  prompt: string;
  messageCount: number | { min: number; max: number };
  scheduleCommand: string;
  mundane_things?: string[];
  intro?: string;
  outro?: string;
}

interface ParsedMessage {
  coach: string;
  content: string;
}

// Map of coach names to their IDs
const coachMap: Record<string, string> = {
  "Donte": "donte",
  "DonteDisrupt": "donte",
  "Venus": "venus",
  "VenusStrikes": "venus",
  "Kailey": "kailey",
  "KaileySloan": "kailey",
  "KaileyConnector": "kailey",
  "Rohan": "rohan",
  "RohanTheShark": "rohan",
  "Alex": "alex",
  "AlexirAlex": "alex",
  "Eljas": "eljas",
  "EljasCouncil": "eljas"
};

// Function to initialize custom event messages from prompts
export function initializeCustomEventMessages(): void {
  console.log("[ArgumentGenerator] Initializing custom event messages...");
  const prompts = loadPrompts();
  let count = 0;
  
  if (prompts.length === 0) {
    console.error("[ArgumentGenerator] Failed to load prompts from JSON file!");
    return;
  }
  
  for (const prompt of prompts) {
    if (!prompt.scheduleCommand) {
      console.warn(`[ArgumentGenerator] Prompt '${prompt.id}' missing scheduleCommand, skipping.`);
      continue;
    }
    
    // Add to custom event message cache even if intro/outro is empty
    // This ensures all argument-based events are recognized
    customEventMessageCache[prompt.scheduleCommand] = {
      intro: prompt.intro || `The coaches are having a conversation about ${prompt.name.toLowerCase()}.`,
      outro: prompt.outro || "The conversation has concluded."
    };
    
    count++;
    console.log(`[ArgumentGenerator] Registered event type: ${prompt.scheduleCommand}`);
  }
  
  console.log(`[ArgumentGenerator] Initialized ${count} custom event messages`);
}

// Load prompts from JSON file
function loadPrompts(): ArgumentPrompt[] {
  try {
    const promptsPath = path.join(process.cwd(), "data", "argument-prompts.json");
    console.log(`[ArgumentGenerator] Loading prompts from: ${promptsPath}`);
    
    if (!fs.existsSync(promptsPath)) {
      console.error(`[ArgumentGenerator] Prompts file not found: ${promptsPath}`);
      return [];
    }
    
    const data = fs.readFileSync(promptsPath, "utf8");
    const prompts = JSON.parse(data);
    
    console.log(`[ArgumentGenerator] Successfully loaded ${prompts.length} prompts`);
    return prompts;
  } catch (error) {
    console.error("[ArgumentGenerator] Error loading prompts:", error);
    return [];
  }
}

// Find a prompt by ID
function findPromptById(id: string): ArgumentPrompt | undefined {
  const prompts = loadPrompts();
  return prompts.find(prompt => prompt.id === id);
}

// Prepare the prompt by filling in placeholders
function preparePrompt(prompt: ArgumentPrompt): string {
  let preparedPrompt = prompt.prompt;
  
  // Replace {{RANDOM_MUNDANE_THING}} with a random item from mundane_things
  if (prompt.mundane_things && prompt.mundane_things.length > 0) {
    const randomThing = prompt.mundane_things[Math.floor(Math.random() * prompt.mundane_things.length)];
    preparedPrompt = preparedPrompt.replace(/{{RANDOM_MUNDANE_THING}}/g, randomThing);
  }
  
  return preparedPrompt;
}

// Generate conversation using OpenAI API
async function generateConversation(promptId: string): Promise<string> {
  const prompt = findPromptById(promptId);
  
  if (!prompt) {
    throw new Error(`Prompt with ID '${promptId}' not found`);
  }
  
  const preparedPrompt = preparePrompt(prompt);
  
  try {
    console.log(`[${prompt.name}] Generating conversation...`);
    const completion = await openai.chat.completions.create({
      model: "gpt-4-turbo-preview",
      messages: [
        { role: "system", content: preparedPrompt }
      ],
      temperature: 1.0,
      max_tokens: 1000,
    });
    
    const response = completion.choices[0].message.content || "";
    console.log(`[${prompt.name}] Generated response (first 100 chars): ${response.substring(0, 100)}...`);
    
    // Save raw response for debugging
    const rawFilePath = path.join(process.cwd(), "logs", `${promptId}_response_${new Date().toISOString().replace(/:/g, "-")}.txt`);
    fs.writeFileSync(rawFilePath, response, "utf8");
    console.log(`[${prompt.name}] Saved raw response to ${rawFilePath}`);
    
    return response;
  } catch (error) {
    console.error(`[${prompt.name}] Error generating conversation:`, error);
    throw error;
  }
}

// Parse coach and message content from the generated text
function parseMessages(text: string): ParsedMessage[] {
  console.log(`[Parser] Raw content sample: ${text.substring(0, 100)}...`);
  
  const messages: ParsedMessage[] = [];
  
  // Updated pattern to match "**CoachName** message" format (no colon)
  const coachPattern = /^\*\*([A-Za-z]+(?:TheShark|Disrupt|Sloan|Council|Strikes|Alex)?)\*\*\s+/;
  
  // Split text by double newlines to separate messages
  const paragraphs = text.split(/\n\n+/);
  console.log(`[Parser] Found ${paragraphs.length} paragraphs to parse`);
  
  for (let i = 0; i < paragraphs.length; i++) {
    const paragraph = paragraphs[i];
    console.log(`[Parser] Processing paragraph ${i}: ${paragraph.substring(0, 40)}...`);
    
    const match = paragraph.match(coachPattern);
    if (match) {
      const coachName = match[1];
      // Remove the coach name prefix from the message
      const content = paragraph.replace(coachPattern, '').trim();
      
      const coachId = identifyCoach(coachName);
      console.log(`[Parser] Found coach ${coachName} (${coachId}) with content: ${content.substring(0, 40)}...`);
      
      messages.push({
        coach: coachId,
        content: content
      });
      
      console.log(`[Parser] Added message from ${coachId}: "${content.substring(0, 40)}..."`);
    } else {
      console.log(`[Parser] No match for paragraph: ${paragraph.substring(0, 40)}...`);
    }
  }
  
  console.log(`[Parser] Parsed ${messages.length} messages total using paragraph method`);
  
  return messages;
}

// Try to identify the coach from various name formats
function identifyCoach(name: string): string {
  // Direct match
  if (coachMap[name]) {
    return coachMap[name];
  }
  
  // Case-insensitive match
  const lowerName = name.toLowerCase();
  for (const [coachName, coachId] of Object.entries(coachMap)) {
    if (coachName.toLowerCase() === lowerName) {
      return coachId;
    }
  }
  
  // Partial match
  for (const [coachName, coachId] of Object.entries(coachMap)) {
    if (lowerName.includes(coachId) || coachId.includes(lowerName)) {
      return coachId;
    }
  }
  
  // If we can't identify, default to donte
  console.warn(`[Parser] Could not identify coach: ${name}, defaulting to "donte"`);
  return "donte";
}

// Post the conversation to Discord
async function postConversation(channelId: string, client: Client, messages: ParsedMessage[]): Promise<void> {
  try {
    console.log(`[Discord] Posting ${messages.length} messages to channel ${channelId}`);
    
    // Get webhook URLs
    const webhookUrls = getWebhookUrls();
    
    // Clean up any existing webhooks for this channel
    console.log(`[Discord] Cleaning up existing webhooks for channel ${channelId}`);
    cleanupWebhooks(channelId);
    
    // Initialize webhooks for the channel
    console.log(`[Discord] Initializing webhooks`);
    await initializeWebhooks(channelId, webhookUrls);
    
    // Post each message
    let successCount = 0;
    let errorCount = 0;
    
    for (const message of messages) {
      try {
        console.log(`[Discord] Sending message as ${message.coach}: ${message.content.substring(0, 40)}...`);
        
        await sendAsCharacter(
          channelId,
          message.coach,
          message.content
        );
        
        console.log(`[Discord] Successfully sent message as ${message.coach}`);
        successCount++;
        
        // Add a delay between messages to make conversation feel natural
        await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 1000));
      } catch (error) {
        console.error(`[Discord] Error sending message as ${message.coach}:`, error);
        errorCount++;
        
        // Add slightly longer delay after an error
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }
    
    console.log(`[Discord] Message posting complete! Success: ${successCount}, Errors: ${errorCount}`);
  } catch (error) {
    console.error(`[Discord] Error posting conversation:`, error);
    throw error;
  }
}

// Generic function to trigger any argument or conversation type
export async function triggerArgument(promptId: string, channelId: string, client: Client): Promise<void> {
  console.log(`[ArgumentGenerator] Starting generation for prompt '${promptId}'...`);
  
  try {
    // Get the prompt definition to access its intro/outro messages
    const prompt = findPromptById(promptId);
    if (!prompt) {
      throw new Error(`Prompt with ID '${promptId}' not found`);
    }
    
    // Generate conversation
    const conversationText = await generateConversation(promptId);
    
    // Parse messages
    const messages = parseMessages(conversationText);
    
    // Post to Discord
    await postConversation(channelId, client, messages);
    
    console.log(`[ArgumentGenerator] Prompt '${promptId}' completed successfully`);
  } catch (error) {
    console.error(`[ArgumentGenerator] Error generating for prompt '${promptId}':`, error);
  }
}

// For backward compatibility
export async function triggerStatusReport(channelId: string, client: Client): Promise<void> {
  return triggerArgument("status-report", channelId, client);
}

// If this module is run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  console.error(
    "This module cannot be run directly as it requires a Discord client"
  );
  process.exit(1);
} 
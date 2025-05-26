import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import Together from "together-ai";
import dotenv from "dotenv";
import { TextChannel, Client, WebhookClient } from "discord.js";
import { customEventMessageCache } from "./eventMessages.js";

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

// Load environment variables from .env.local
const envPath = path.resolve(process.cwd(), ".env.local");
console.log("Loading environment from:", envPath);
const result = dotenv.config({ path: envPath });
if (result.error) {
  console.error("Error loading .env.local:", result.error);
  // Don't exit during import - just log the error
}

// Initialize Together.ai (will be null if no API key)
let together: Together | null = null;
try {
  if (process.env.TOGETHER_API_KEY) {
    together = new Together({
      apiKey: process.env.TOGETHER_API_KEY,
    });
  } else {
    console.warn("[WeekendMicroPosts] TOGETHER_API_KEY not found - weekend microPosts will not work");
  }
} catch (error) {
  console.error("[WeekendMicroPosts] Error initializing Together.ai:", error);
}

// Primary Discord channel ID (General)
const GENERAL_CHANNEL_ID = "1354474492629618831";

// The FoundryHeat webhook for posting to General
let foundryHeatWebhook: WebhookClient | null = null;

// Initialize webhook
function initializeFoundryHeatWebhook() {
  if (!process.env.GENERAL_WEBHOOK_URL_FOUNDRYHEAT) {
    console.error("[WeekendMicroPosts] Missing GENERAL_WEBHOOK_URL_FOUNDRYHEAT in .env.local");
    return false;
  }

  try {
    foundryHeatWebhook = new WebhookClient({ url: process.env.GENERAL_WEBHOOK_URL_FOUNDRYHEAT });
    console.log("[WeekendMicroPosts] FoundryHeat webhook initialized successfully");
    return true;
  } catch (error) {
    console.error("[WeekendMicroPosts] Error initializing FoundryHeat webhook:", error);
    return false;
  }
}

// Function to initialize custom event messages from prompts
export function initializeWeekendMicroEventMessages() {
  console.log("[WeekendMicroPosts] Initializing custom event messages...");
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

// Load prompts from JSON file
function loadWeekendPrompts(): WeekendMicroPostPrompt[] {
  try {
    const promptsPath = path.join(process.cwd(), "data", "weekend-micro-posts.json");
    console.log(`[WeekendMicroPosts] Loading prompts from: ${promptsPath}`);
    
    if (!fs.existsSync(promptsPath)) {
      console.error(`[WeekendMicroPosts] Prompts file not found: ${promptsPath}`);
      return [];
    }

    const data = fs.readFileSync(promptsPath, "utf8");
    const prompts: WeekendMicroPostPrompt[] = JSON.parse(data);
    console.log(`[WeekendMicroPosts] Successfully loaded ${prompts.length} prompts`);
    return prompts;
  } catch (error) {
    console.error("[WeekendMicroPosts] Error loading prompts:", error);
    return [];
  }
}

// Find a prompt by ID
function findPromptById(id: string): WeekendMicroPostPrompt | undefined {
  const prompts = loadWeekendPrompts();
  return prompts.find(prompt => prompt.id === id);
}

// Generate post using Together.ai API
async function generateWeekendPost(promptId: string): Promise<string> {
  const prompt = findPromptById(promptId);
  if (!prompt) {
    throw new Error(`Weekend prompt with ID '${promptId}' not found`);
  }

  if (!together) {
    throw new Error("Together.ai not initialized - check TOGETHER_API_KEY in .env.local");
  }

  try {
    console.log(`[${prompt.name}] Generating weekend post...`);

    // Randomly select context elements
    const setting = prompt.settings[Math.floor(Math.random() * prompt.settings.length)];
    const tone = prompt.emotionalTones[Math.floor(Math.random() * prompt.emotionalTones.length)];
    const detail = prompt.microDetails[Math.floor(Math.random() * prompt.microDetails.length)];
    const character = prompt.characters[Math.floor(Math.random() * prompt.characters.length)];
    
    // Check if business states exist in the prompt and use them if available
    let businessState = "";
    if (prompt.businessStates && prompt.businessStates.length > 0) {
      businessState = prompt.businessStates[Math.floor(Math.random() * prompt.businessStates.length)];
    }

    const userPrompt = `
Location: ${setting}
Character to mention: ${character}
${businessState ? `Business context: ${businessState}\n` : ""}
${detail ? `Product: ${detail}\n` : ""}
${tone ? `Emotional tone: ${tone}\n` : ""}

Write ONE tipsy Alex tweet. NO quotation marks. Cut every unnecessary word. End sharp.
`;

    const completion = await together.chat.completions.create({
      model: prompt.modelName,
      messages: [
        { role: "system", content: prompt.systemPrompt.trim() },
        { role: "user", content: userPrompt.trim() }
      ],
      stream: false,
      temperature: 0.88,
      max_tokens: 50,  // Reduced to force brevity as specified in the new prompt
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
    console.error(`[${prompt.name}] Error generating weekend post:`, error);
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

    console.log(`[WeekendMicroPosts] Posting to Discord using FoundryHeat webhook`);
    
    // Include the intro from JSON and the outro with emojis
    let formattedMessage = content;
    
    // Add intro if it exists
    if (intro && intro.trim() !== '') {
      formattedMessage = `${intro}\n${formattedMessage}`;
    }
    
    // ADD BACK THE OUTRO with emoji/line
    if (outro && outro.trim() !== '') {
      formattedMessage = `${formattedMessage}${outro}`;
    }
    
    // Send the message using the webhook
    if (!foundryHeatWebhook) {
      throw new Error("Webhook is null after initialization");
    }
    
    await foundryHeatWebhook.send({
      content: formattedMessage,
      username: "Foundry Heat",
    });
    
    console.log(`[WeekendMicroPosts] Successfully posted to Discord`);
    return true;
  } catch (error) {
    console.error(`[WeekendMicroPosts] Error posting to Discord:`, error);
    return false;
  }
}

// Main function to trigger the generation and posting of a weekend micro-post
export async function triggerWeekendMicroPost(promptId: string, channelId: string, client: Client): Promise<boolean> {
  console.log(`[WeekendMicroPosts] Starting generation for prompt '${promptId}'...`);
  
  try {
    // Get the prompt definition to access its intro/outro messages
    const prompt = findPromptById(promptId);
    if (!prompt) {
      throw new Error(`Weekend prompt with ID '${promptId}' not found`);
    }
    
    // Generate content
    const content = await generateWeekendPost(promptId);
    
    // Post to Discord
    await postToDiscord(promptId, content, prompt.intro, prompt.outro);
    
    console.log(`[WeekendMicroPosts] Prompt '${promptId}' completed successfully`);
    return true;
  } catch (error) {
    console.error(`[WeekendMicroPosts] Error generating for prompt '${promptId}':`, error);
    return false;
  }
}

// Generate specific function for scheduler integration
export function alexTipsyDispatch(channelId: string, client: Client): Promise<boolean> {
  return triggerWeekendMicroPost("alex-tipsy-dispatch", channelId, client);
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
import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";
import { SMS_CONFIG } from "./config.js";
import { generateAiResponse } from "./ai.js";
import type { TwilioClient } from "./webhooks.js";
import {
  getSubscriber,
  resubscribeUser,
  unsubscribeUser,
  updateLastMessageDate,
  updateLastInspirationDate,
  confirmSubscriber,
  getActiveSubscribers,
  createNewSubscriber,
  setAiDailySubscription,
  updateAiDailyLastSent,
} from "../subscribers.js";
import { supabase, SMSSubscriber } from "../supabase.js";
import { addItemToSupabase } from "./supabase-add.js";
import {
  uniqueNamesGenerator,
  adjectives,
  animals,
} from "unique-names-generator";
import {
  getLatestAiDailyEpisode,
  formatAiDailySms,
  getAiDailyShortLink,
} from "./ai-daily.js";
import { handleStockAgent } from "./stock-agent.js";
import { commandHandlers } from "../../commands/index.js";
import type { CommandContext } from "../../commands/types.js";
import type { KGAgentState } from "../../commands/kg.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Platform detection utilities for WhatsApp integration
export function detectMessagePlatform(from: string): "sms" | "whatsapp" {
  return from.startsWith("whatsapp:") ? "whatsapp" : "sms";
}

export function normalizePhoneNumber(from: string): string {
  return from.replace("whatsapp:", "");
}

export function formatPhoneForPlatform(
  phoneNumber: string,
  platform: "sms" | "whatsapp"
): string {
  const cleanNumber = phoneNumber.replace("whatsapp:", "");
  return platform === "whatsapp" ? `whatsapp:${cleanNumber}` : cleanNumber;
}

// Helper function to split long messages into chunks
export function splitMessageIntoChunks(
  message: string,
  maxLength: number = 1600
): string[] {
  if (message.length <= maxLength) {
    return [message];
  }

  const chunks: string[] = [];
  let currentChunk = "";
  const lines = message.split("\n");

  for (const line of lines) {
    // If adding this line would exceed the limit
    if (currentChunk.length + line.length + 1 > maxLength) {
      // If current chunk has content, save it
      if (currentChunk.trim()) {
        chunks.push(currentChunk.trim());
        currentChunk = "";
      }

      // If single line is longer than max, split it
      if (line.length > maxLength) {
        const words = line.split(" ");
        let wordChunk = "";

        for (const word of words) {
          if (wordChunk.length + word.length + 1 > maxLength) {
            if (wordChunk.trim()) {
              chunks.push(wordChunk.trim());
            }
            wordChunk = word;
          } else {
            wordChunk += (wordChunk ? " " : "") + word;
          }
        }

        if (wordChunk.trim()) {
          currentChunk = wordChunk + "\n";
        }
      } else {
        currentChunk = line + "\n";
      }
    } else {
      currentChunk += (currentChunk ? "\n" : "") + line;
    }
  }

  // Add any remaining content
  if (currentChunk.trim()) {
    chunks.push(currentChunk.trim());
  }

  return chunks;
}

// Helper function to send chunked messages
export async function sendChunkedSmsResponse(
  to: string,
  message: string,
  twilioClient: TwilioClient,
  maxLength: number = 1500
): Promise<void> {
  // Use 1500 as default to leave room for continuation indicators
  const chunks = splitMessageIntoChunks(message, maxLength);

  for (let i = 0; i < chunks.length; i++) {
    let chunk = chunks[i];

    // Add continuation indicator if there are multiple chunks
    if (chunks.length > 1) {
      if (i < chunks.length - 1) {
        chunk += `\n\n(${i + 1}/${chunks.length} - continued...)`;
      } else {
        chunk = `(${i + 1}/${chunks.length} - final)\n\n` + chunk;
      }
    }

    await sendSmsResponse(to, chunk, twilioClient);

    // Small delay between chunks to ensure order
    if (i < chunks.length - 1) {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  }
}

// Global variable for next daily message - set at 7am, used at 9am
let nextDailyMessage: any = null;

// Global cache for inspirations data, marketing messages, day tracker, and usage tracker
let inspirationsData: any[] = [];
let marketingMessages: any[] = [];
let dayTrackerPath: string = "";
let usageTrackerPath: string = "";

const AI_DAILY_FALLBACK_MESSAGE =
  "AI Daily is temporarily unavailable. Please try again in a few minutes.";

interface AiDailyDeliveryOptions {
  prefix?: string;
  forceRefresh?: boolean;
  recordDelivery?: boolean;
}

async function deliverAiDailyEpisode(
  to: string,
  normalizedPhoneNumber: string,
  twilioClient: TwilioClient,
  options: AiDailyDeliveryOptions = {}
): Promise<void> {
  const { prefix, forceRefresh = false, recordDelivery = true } = options;

  try {
    // 1. Fetch AI Daily episode
    const episode = await getLatestAiDailyEpisode(forceRefresh);

    // 2. Get podcast shortlink
    const shortLink = await getAiDailyShortLink(episode, normalizedPhoneNumber);

    // 3. Generate/fetch AI Research Daily report (podcast + arXiv papers)
    const { generateAndStoreAiResearchDailyReport } = await import('./ai-daily.js');
    const { getLatestReportMetadata } = await import('../../agents/report-storage.js');
    const { buildReportViewerUrl } = await import('../utils/report-viewer-link.js');
    const { createShortLink } = await import('../utils/shortlink-service.js');

    // Generate report if needed (this is idempotent - won't regenerate if already exists for today)
    try {
      await generateAndStoreAiResearchDailyReport();
    } catch (reportError) {
      console.warn('Failed to generate AI Research Daily report:', reportError);
    }

    // 4. Get report metadata and create shortlink
    let reportLink: string | undefined;
    const reportMetadata = await getLatestReportMetadata('ai-research-daily');
    if (reportMetadata) {
      const viewerUrl = buildReportViewerUrl({ path: reportMetadata.reportPath });
      reportLink = await createShortLink(viewerUrl, {
        context: 'ai-research-daily-report',
        createdFor: normalizedPhoneNumber,
        createdBy: 'sms-bot'
      }) ?? undefined;
    }

    // 5. Format message with BOTH podcast and report links
    const baseMessage = formatAiDailySms(episode, {
      shortLink: shortLink ?? undefined,
      reportLink
    });
    const responseMessage = prefix
      ? `${prefix}\n\n${baseMessage}`
      : baseMessage;

    await sendSmsResponse(to, responseMessage, twilioClient);

    if (recordDelivery) {
      await updateAiDailyLastSent(normalizedPhoneNumber);
    }
  } catch (error) {
    console.error("AI Daily delivery failed:", error);
    const fallbackMessage = prefix
      ? `${prefix}\n\n${AI_DAILY_FALLBACK_MESSAGE}`
      : AI_DAILY_FALLBACK_MESSAGE;
    await sendSmsResponse(to, fallbackMessage, twilioClient);
  }
}

// NEW: Load data from Supabase instead of JSON file
async function loadInspirationsDataFromSupabase() {
  try {
    console.log("Loading messages from Supabase af_daily_message table...");
    const { data, error } = await supabase
      .from("af_daily_message")
      .select("*")
      .order("item", { ascending: true });

    if (error) {
      console.error("ERROR: Cannot load messages from Supabase:", error);
      throw new Error(
        "Supabase af_daily_message table query failed: " + error.message
      );
    }

    if (!data || data.length === 0) {
      console.error(
        "ERROR: No messages found in Supabase af_daily_message table"
      );
      throw new Error("Supabase af_daily_message table is empty");
    }

    // Transform Supabase data to match expected format
    inspirationsData = data.map((record) => {
      if (record.type === "interactive") {
        // Convert flattened interactive format back to nested format
        return {
          item: record.item,
          type: record.type,
          trigger: {
            keyword: record.trigger_keyword,
            text: record.trigger_text,
          },
          response: {
            "quotation-marks": record.quotation_marks || "no",
            prepend: record.prepend || "",
            text: record.text,
            author: record.author,
          },
        };
      } else {
        // Standard format for other types
        return {
          item: record.item,
          type: record.type,
          "quotation-marks": record.quotation_marks,
          prepend: record.prepend,
          text: record.text,
          author: record.author,
          intro: record.intro,
          outro: record.outro,
        };
      }
    });

    // Set up paths for day tracker and usage tracker (still using JSON files for these)
    dayTrackerPath = path.join(process.cwd(), "data", "day-tracker.json");
    usageTrackerPath = path.join(process.cwd(), "data", "usage-tracker.json");

    console.log(`Loaded ${inspirationsData.length} messages from Supabase`);
    return inspirationsData;
  } catch (error) {
    console.error("ERROR: Failed to load from Supabase:", error);
    throw error;
  }
}

// UPDATED: Modified to use Supabase
async function loadInspirationsData() {
  if (!inspirationsData.length) {
    await loadInspirationsDataFromSupabase();
  }
  return inspirationsData;
}

// Export function to clear cache when new items are added
export function clearInspirationsCache() {
  inspirationsData = [];
  console.log(
    "Cleared inspirations cache - will reload from Supabase on next access"
  );
}

/**
 * Loads marketing messages from the JSON file
 * These are the messages that appear at the bottom of daily inspirations
 */
function loadMarketingMessages() {
  if (!marketingMessages || marketingMessages.length === 0) {
    try {
      const marketingPath = path.join(
        process.cwd(),
        "data",
        "marketing_messages.json"
      );
      marketingMessages = JSON.parse(fs.readFileSync(marketingPath, "utf8"));
      console.log(
        `Loaded ${marketingMessages.length} marketing messages from ${marketingPath}`
      );
    } catch (error) {
      console.error("ERROR: Cannot load marketing messages file:", error);
      // Use a default message if file is missing
      marketingMessages = [
        { message: "👋 Text MORE for one extra line of chaos." },
      ];
    }
  }
  return marketingMessages;
}

interface DayTracker {
  startDate: string;
  currentDay: number;
}

interface UsageTracker {
  recent_usage: Array<{
    item: number;
    used_date: string;
  }>;
  daily_selections: Record<string, number>; // date -> item number mapping
}

// Load day tracker data
function loadDayTracker(): DayTracker {
  try {
    if (!dayTrackerPath) {
      loadInspirationsData(); // This sets dayTrackerPath
    }
    return JSON.parse(fs.readFileSync(dayTrackerPath, "utf8"));
  } catch {
    // If file doesn't exist, create it with default values
    const defaultTracker: DayTracker = {
      startDate: new Date().toISOString().split("T")[0], // Today's date in YYYY-MM-DD format
      currentDay: 1,
    };
    saveDayTracker(defaultTracker);
    return defaultTracker;
  }
}

function saveDayTracker(tracker: DayTracker): void {
  if (!dayTrackerPath) {
    loadInspirationsData(); // This sets dayTrackerPath
  }
  fs.writeFileSync(dayTrackerPath, JSON.stringify(tracker, null, 2));
}

// Load usage tracker data
function loadUsageTracker(): UsageTracker {
  try {
    if (!usageTrackerPath) {
      loadInspirationsData(); // This sets usageTrackerPath
    }
    return JSON.parse(fs.readFileSync(usageTrackerPath, "utf8"));
  } catch {
    // If file doesn't exist, create it with default values
    const defaultTracker: UsageTracker = {
      recent_usage: [],
      daily_selections: {},
    };
    saveUsageTracker(defaultTracker);
    return defaultTracker;
  }
}

function saveUsageTracker(tracker: UsageTracker): void {
  if (!usageTrackerPath) {
    loadInspirationsData(); // This sets usageTrackerPath
  }
  fs.writeFileSync(usageTrackerPath, JSON.stringify(tracker, null, 2));
}

// Clean up old usage entries (older than 30 days)
function cleanOldUsage(tracker: UsageTracker): void {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const cutoffDate = thirtyDaysAgo.toISOString().split("T")[0];

  tracker.recent_usage = tracker.recent_usage.filter(
    (usage) => usage.used_date >= cutoffDate
  );
}

// Add an item to usage tracking
function addToUsageTracker(
  itemNumber: number,
  date: string = new Date().toISOString().split("T")[0]
): void {
  const tracker = loadUsageTracker();

  // Add to recent usage
  tracker.recent_usage.push({
    item: itemNumber,
    used_date: date,
  });

  // Add to daily selections
  tracker.daily_selections[date] = itemNumber;

  // Clean up old entries
  cleanOldUsage(tracker);

  saveUsageTracker(tracker);

  console.log(`Added item ${itemNumber} to usage tracker for date ${date}`);
}

// ADMIN FUNCTIONS

// Find a message by ID - Query Supabase directly for real-time data
async function findMessageById(id: number): Promise<any | null> {
  try {
    console.log(`Querying Supabase directly for item ${id}...`);
    const { data, error } = await supabase
      .from("af_daily_message")
      .select("*")
      .eq("item", id)
      .single();

    if (error) {
      console.error(`Error finding item ${id} in Supabase:`, error);
      return null;
    }

    if (!data) {
      console.log(`Item ${id} not found in Supabase`);
      return null;
    }

    // Transform Supabase data to expected format
    if (data.type === "interactive") {
      // Convert flattened interactive format back to nested format
      return {
        item: data.item,
        type: data.type,
        trigger: {
          keyword: data.trigger_keyword,
          text: data.trigger_text,
        },
        response: {
          "quotation-marks": data.quotation_marks || "no",
          prepend: data.prepend || "",
          text: data.text,
          author: data.author,
        },
      };
    } else {
      // Standard format for other types
      return {
        item: data.item,
        type: data.type,
        "quotation-marks": data.quotation_marks,
        prepend: data.prepend,
        text: data.text,
        author: data.author,
        intro: data.intro,
        outro: data.outro,
      };
    }
  } catch (error) {
    console.error(`Error in findMessageById(${id}):`, error);
    return null;
  }
}

// Set next daily message (used by 7am scheduler and admin commands)
export function setNextDailyMessage(message: any): void {
  nextDailyMessage = message;
  console.log(
    `Set next daily message: item ${message.item} - "${message.text}"`
  );
}

// Get next daily message (used by 9am scheduler)
export function getNextDailyMessage(): any {
  return nextDailyMessage;
}

// Queue specific message for next distribution (ADMIN: SKIP [id])
export async function queueSpecificMessage(
  itemId: number
): Promise<{ success: boolean; message: any | null }> {
  const targetMessage = await findMessageById(itemId);

  if (!targetMessage) {
    return { success: false, message: null };
  }

  // Update the global next daily message variable
  setNextDailyMessage(targetMessage);

  console.log(`ADMIN: Queued message ${itemId} for next distribution`);

  return { success: true, message: targetMessage };
}

// Pick a random message for today's distribution (used by 7am scheduler)
export async function pickRandomMessageForToday(): Promise<any> {
  const data = await loadInspirationsData();
  const usageTracker = loadUsageTracker();

  // Check weekend mode - either forced via env var or actual Pacific Time weekend
  const weekendOverride = process.env.WEEKEND_MODE_SMS_OVERRIDE;
  let isWeekendMode = false;

  if (weekendOverride === "ON") {
    isWeekendMode = true;
    console.log("Weekend mode: FORCED ON via WEEKEND_MODE_SMS_OVERRIDE");
  } else if (weekendOverride === "OFF") {
    isWeekendMode = false;
    console.log("Weekend mode: FORCED OFF via WEEKEND_MODE_SMS_OVERRIDE");
  } else {
    // Check actual Pacific Time weekend
    const pacificTime = new Intl.DateTimeFormat("en-US", {
      timeZone: "America/Los_Angeles",
      weekday: "short",
    }).format(new Date());
    isWeekendMode = ["Sat", "Sun"].includes(pacificTime);
    console.log(
      `Weekend mode: ${
        isWeekendMode ? "ON" : "OFF"
      } (Pacific Time: ${pacificTime})`
    );
  }

  let availableMessages;
  if (isWeekendMode) {
    // Weekend mode: ONLY use type: weekend
    availableMessages = data.filter((item) => item.type === "weekend");
  } else {
    // Weekday mode: use everything EXCEPT type: weekend
    availableMessages = data.filter((item) => item.type !== "weekend");
  }

  // Get list of recently used item numbers
  const recentlyUsed = usageTracker.recent_usage.map((usage) => usage.item);

  // Filter out recently used messages
  const eligibleMessages = availableMessages.filter(
    (msg) => !recentlyUsed.includes(msg.item)
  );

  // If no eligible messages (all have been used recently), use all messages
  const messagesToChooseFrom =
    eligibleMessages.length > 0 ? eligibleMessages : availableMessages;

  // Random selection
  const randomIndex = Math.floor(Math.random() * messagesToChooseFrom.length);
  const selectedMessage = messagesToChooseFrom[randomIndex];

  // Track this selection
  const today = new Date().toISOString().split("T")[0];
  addToUsageTracker(selectedMessage.item, today);

  console.log(
    `Picked random message for ${today}: item ${selectedMessage.item} (${selectedMessage.type})`
  );
  console.log(`Avoided ${recentlyUsed.length} recently used items`);

  return selectedMessage;
}

// Pick a random message for SKIP operations (ignores recently used restrictions)
export async function pickMessageForSkip(excludeItemId?: number): Promise<any> {
  const data = await loadInspirationsData();

  // Check weekend mode - either forced via env var or actual Pacific Time weekend
  const weekendOverride = process.env.WEEKEND_MODE_SMS_OVERRIDE;
  let isWeekendMode = false;

  if (weekendOverride === "ON") {
    isWeekendMode = true;
    console.log("SKIP: Weekend mode FORCED ON via WEEKEND_MODE_SMS_OVERRIDE");
  } else if (weekendOverride === "OFF") {
    isWeekendMode = false;
    console.log("SKIP: Weekend mode FORCED OFF via WEEKEND_MODE_SMS_OVERRIDE");
  } else {
    // Check actual Pacific Time weekend
    const pacificTime = new Intl.DateTimeFormat("en-US", {
      timeZone: "America/Los_Angeles",
      weekday: "short",
    }).format(new Date());
    isWeekendMode = ["Sat", "Sun"].includes(pacificTime);
    console.log(
      `SKIP: Weekend mode ${
        isWeekendMode ? "ON" : "OFF"
      } (Pacific Time: ${pacificTime})`
    );
  }

  let availableMessages;
  if (isWeekendMode) {
    // Weekend mode: ONLY use type: weekend
    availableMessages = data.filter((item) => item.type === "weekend");
  } else {
    // Weekday mode: use everything EXCEPT type: weekend
    availableMessages = data.filter((item) => item.type !== "weekend");
  }

  // Only exclude the specific item being skipped (if provided)
  let messagesToChooseFrom = availableMessages;
  if (excludeItemId) {
    messagesToChooseFrom = availableMessages.filter(
      (msg) => msg.item !== excludeItemId
    );
  }

  // Ensure we have at least one message to choose from
  if (messagesToChooseFrom.length === 0) {
    console.log("SKIP: No alternative messages available, using all messages");
    messagesToChooseFrom = availableMessages;
  }

  // Random selection
  const randomIndex = Math.floor(Math.random() * messagesToChooseFrom.length);
  const selectedMessage = messagesToChooseFrom[randomIndex];

  console.log(
    `SKIP: Selected alternative message: item ${selectedMessage.item} (${selectedMessage.type})`
  );
  console.log(
    `SKIP: Chose from ${messagesToChooseFrom.length} available messages${
      excludeItemId ? ` (excluding item ${excludeItemId})` : ""
    }`
  );

  return selectedMessage;
}

// Legacy function - kept for backwards compatibility but not used in random system
async function getCurrentDay(): Promise<number> {
  const data = await loadInspirationsData();

  // Filter to only inspiration and intervention types (skip interactive for now)
  const availableMessages = data.filter(
    (item) => item.type === "inspiration" || item.type === "intervention"
  );

  const tracker = loadDayTracker();
  const startDate = new Date(tracker.startDate);
  const currentDate = new Date();

  // Calculate days since start date
  const timeDiff = currentDate.getTime() - startDate.getTime();
  const daysDiff = Math.floor(timeDiff / (1000 * 3600 * 24));

  // Calculate current day (1-based, cycles through available messages)
  const calculatedDay = (daysDiff % availableMessages.length) + 1;

  // Update tracker if day has changed
  if (calculatedDay !== tracker.currentDay) {
    tracker.currentDay = calculatedDay;
    saveDayTracker(tracker);
  }

  return calculatedDay;
}

// Skip today's message (QA feature for admin users)
// MODERATION ACTION: This blocks today's selected message and picks a new one for everyone
// Returns the new message
export async function skipToNextInspiration(): Promise<{
  day: number;
  inspiration: any;
}> {
  const today = new Date().toISOString().split("T")[0];
  const usageTracker = loadUsageTracker();

  // Get the currently selected message for today
  const currentItemNumber = usageTracker.daily_selections[today];

  if (currentItemNumber) {
    console.log(
      `SKIP: Blocking item ${currentItemNumber} that was selected for ${today}`
    );

    // Add current message to recent usage to block it for 30 days
    addToUsageTracker(currentItemNumber, today);

    // Remove today's selection to force a new one
    delete usageTracker.daily_selections[today];
    saveUsageTracker(usageTracker);
  }

  // Get a new random message for SKIP operation (ignores recently used restrictions)
  // Pass the current item to exclude it from selection
  const newMessage = await pickMessageForSkip(currentItemNumber);
  setNextDailyMessage(newMessage);

  console.log(
    `SKIP: Selected new message for ${today}: item ${
      newMessage.item
    } (replacing ${currentItemNumber || "none"})`
  );

  return {
    day: 1, // Not used in random system, but kept for compatibility
    inspiration: newMessage, // Keep same property name for compatibility
  };
}

// ADD COMMAND FUNCTIONS

// Find the next available item number in Supabase
async function getNextItemNumber(): Promise<number> {
  try {
    const { data, error } = await supabase
      .from("af_daily_message")
      .select("item")
      .order("item", { ascending: false })
      .limit(1);

    if (error) {
      console.error("Error getting max item number:", error);
      throw error;
    }

    const maxItem = data && data.length > 0 ? data[0].item : 0;
    return maxItem + 1;
  } catch (error) {
    console.error("Error in getNextItemNumber:", error);
    throw error;
  }
}

// Note: addItemToSupabase is now imported from './supabase-add.js'

// Validate JSON structure for ADD command
function validateAddJson(jsonData: any): { valid: boolean; error?: string } {
  try {
    // Required fields
    if (!jsonData.type)
      return { valid: false, error: "Missing required field: type" };

    // Valid types
    const validTypes = [
      "inspiration",
      "intervention",
      "interactive",
      "disruption",
      "weekend",
    ];
    if (!validTypes.includes(jsonData.type)) {
      return {
        valid: false,
        error: `Invalid type. Must be one of: ${validTypes.join(", ")}`,
      };
    }

    // Type-specific validation
    if (jsonData.type === "interactive") {
      // Interactive type needs trigger and response structures (NO top-level text)
      if (
        !jsonData.trigger ||
        !jsonData.trigger.keyword ||
        !jsonData.trigger.text
      ) {
        return {
          valid: false,
          error: "Interactive type requires trigger.keyword and trigger.text",
        };
      }
      if (!jsonData.response || !jsonData.response.text) {
        return {
          valid: false,
          error: "Interactive type requires response.text",
        };
      }
    } else {
      // Other types need top-level text field
      if (!jsonData.text)
        return { valid: false, error: "Missing required field: text" };
    }

    return { valid: true };
  } catch (error) {
    return { valid: false, error: "Invalid JSON structure" };
  }
}

// Make these functions available for the broadcast script
export async function getTodaysInspiration() {
  // Return the next daily message if it's set, otherwise pick a random one
  if (nextDailyMessage) {
    console.log(
      `Using pre-selected next daily message: item ${nextDailyMessage.item}`
    );
    return {
      day: 1, // Not used in random system, but kept for compatibility
      inspiration: nextDailyMessage, // Keep same property name for compatibility
    };
  }

  // Fallback: if no message is set, pick a random one and set it
  console.log("No next daily message set, picking random message");
  const message = await pickRandomMessageForToday();
  setNextDailyMessage(message);

  return {
    day: 1, // Not used in random system, but kept for compatibility
    inspiration: message, // Keep same property name for compatibility
  };
}

/**
 * Get today's message for new subscribers (same as everyone else in random system)
 * @param signupDate Date when user signed up (now just uses today's random selection)
 * @returns Today's message for the new subscriber
 */
export async function getInspirationForNewSubscriber(
  signupDate: Date = new Date()
) {
  // In the new system, new subscribers get the same daily message as everyone else
  if (nextDailyMessage) {
    return {
      day: 1, // Not used in random system, but kept for compatibility
      inspiration: nextDailyMessage, // Keep same property name for compatibility
    };
  }

  // If no message is set yet, pick a random one and set it (same as getTodaysInspiration)
  console.log(
    "No next daily message set for new subscriber, picking random message"
  );
  const message = await pickRandomMessageForToday();
  setNextDailyMessage(message);

  return {
    day: 1, // Not used in random system, but kept for compatibility
    inspiration: message, // Keep same property name for compatibility
  };
}

export function formatDailyMessage(message: any): string {
  // Handle different message types
  if (message.type === "inspiration") {
    return formatInspirationMessage(message);
  } else if (message.type === "intervention") {
    return formatInterventionMessage(message);
  } else if (message.type === "interactive") {
    return formatInteractiveMessage(message);
  } else if (message.type === "disruption") {
    return formatDisruptionMessage(message);
  } else if (message.type === "weekend") {
    return formatWeekendMessage(message);
  }

  // Fallback for unknown types
  return formatInspirationMessage(message);
}

function formatInspirationMessage(message: any): string {
  // Get current date in "Month Day" format
  const currentDate = new Date();
  const dateString = currentDate.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
  });

  // Build the message text
  let messageText = message.prepend || "";

  // Add quotes if specified
  if (message["quotation-marks"] === "yes") {
    messageText += `"${message.text}"`;
  } else {
    messageText += message.text;
  }

  // Add author if provided
  if (message.author) {
    messageText += `\n— ${message.author}`;
  }

  // Create contextual marketing message based on author
  let marketingMessage;

  if (message.author) {
    // Check if it's Alex on a weekend for special tipsy message
    if (message.author.toLowerCase().includes("alex")) {
      // Check weekend mode
      const weekendOverride = process.env.WEEKEND_MODE_SMS_OVERRIDE;
      let isWeekendMode = false;

      if (weekendOverride === "ON") {
        isWeekendMode = true;
      } else if (weekendOverride === "OFF") {
        isWeekendMode = false;
      } else {
        // Check actual Pacific Time weekend
        const pacificTime = new Intl.DateTimeFormat("en-US", {
          timeZone: "America/Los_Angeles",
          weekday: "short",
        }).format(new Date());
        isWeekendMode = ["Sat", "Sun"].includes(pacificTime);
      }

      if (isWeekendMode) {
        marketingMessage =
          'Text "Hey Alex" to chat — fair warning, she\'s had two mimosas and is spiritually unsupervised.';
      } else {
        marketingMessage = `Text Hey ${message.author} to chat with ${message.author}.`;
      }
    } else {
      // Regular author-based marketing message
      marketingMessage = `Text Hey ${message.author} to chat with ${message.author}.`;
    }
  } else {
    // No author - fall back to rotating marketing messages
    const messages = loadMarketingMessages();
    const now = new Date();
    const startOfYear = new Date(now.getFullYear(), 0, 0);
    const diff = now.getTime() - startOfYear.getTime();
    const dayOfYear = Math.floor(diff / (1000 * 60 * 60 * 24));
    const messageIndex = dayOfYear % messages.length;
    marketingMessage = messages[messageIndex].message;
  }

  // Always add the 🌀 emoji prefix for all weekday marketing messages
  const formattedMarketingMessage = `🌀 ${marketingMessage}`;

  return `AF Daily — ${dateString}\n${messageText}\n\n${formattedMarketingMessage}`;
}

function formatInterventionMessage(message: any): string {
  // Get current date in "Month Day" format
  const currentDate = new Date();
  const dateString = currentDate.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
  });

  // Build the message text
  let messageText = message.prepend || "";

  // Add quotes if specified
  if (message["quotation-marks"] === "yes") {
    messageText += `"${message.text}"`;
  } else {
    messageText += message.text;
  }

  // Add author if provided
  if (message.author) {
    messageText += `\n— ${message.author}`;
  }

  // Get marketing messages for interventions (same as inspirations)
  const messages = loadMarketingMessages();

  // Calculate which marketing message to use based on day of year
  const now = new Date();
  const startOfYear = new Date(now.getFullYear(), 0, 0);
  const diff = now.getTime() - startOfYear.getTime();
  const dayOfYear = Math.floor(diff / (1000 * 60 * 60 * 24));

  // Get the message for today (cycling through marketing messages)
  const messageIndex = dayOfYear % messages.length;
  const marketingMessage = messages[messageIndex].message;

  // Prepend the swirl emoji to the marketing message
  const formattedMarketingMessage = `🌀 ${marketingMessage}`;

  return `AF Daily — ${dateString}\n\n${messageText}\n\n${formattedMarketingMessage}`;
}

function formatInteractiveMessage(message: any): string {
  // Interactive messages for daily delivery show the trigger text in AF Daily format
  if (message.trigger && message.trigger.text) {
    // Part 1: Format as AF Daily message with trigger text (NO marketing footer)
    const currentDate = new Date();
    const dateString = currentDate.toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
    });

    // Interactive messages end with just their trigger text, no marketing footer
    return `AF Daily — ${dateString}\n\n${message.trigger.text}`;
  }

  // Fallback to old format if no trigger structure
  let messageText = message.prepend || "";

  if (message["quotation-marks"] === "yes") {
    messageText += `"${message.text}"`;
  } else {
    messageText += message.text;
  }

  if (message.author) {
    messageText += `\n— ${message.author}`;
  }

  return messageText;
}

function formatDisruptionMessage(message: any): string {
  // Disruption messages use "AF Daily — Disruption Alert" header

  // Build the message text
  let messageText = message.prepend || "";

  // Add quotes if specified
  if (message["quotation-marks"] === "yes") {
    messageText += `"${message.text}"`;
  } else {
    messageText += message.text;
  }

  // Add author if provided
  if (message.author) {
    messageText += `\n— ${message.author}`;
  }

  // Get marketing messages for disruptions (same as inspirations)
  const messages = loadMarketingMessages();

  // Calculate which marketing message to use based on day of year
  const now = new Date();
  const startOfYear = new Date(now.getFullYear(), 0, 0);
  const diff = now.getTime() - startOfYear.getTime();
  const dayOfYear = Math.floor(diff / (1000 * 60 * 60 * 24));

  // Get the message for today (cycling through marketing messages)
  const messageIndex = dayOfYear % messages.length;
  const marketingMessage = messages[messageIndex].message;

  // Prepend the swirl emoji to the marketing message
  const formattedMarketingMessage = `🌀 ${marketingMessage}`;

  return `AF Daily — Disruption Alert\n\n${messageText}\n\n${formattedMarketingMessage}`;
}

function formatWeekendMessage(message: any): string {
  // Weekend messages use "AF Weekend 🥂" header with intro/outro structure
  let result = `AF Weekend 🥂`;

  // Add intro if provided
  if (message.intro) {
    result += `\n${message.intro}`;
  }

  // Add blank line before main content
  result += `\n`;

  // Build the message text with prepend and quotes
  let messageText = message.prepend || "";

  // Add quotes if specified
  if (message["quotation-marks"] === "yes") {
    messageText += `"${message.text}"`;
  } else {
    messageText += message.text;
  }

  result += `\n${messageText}`;

  // Add author if provided
  if (message.author) {
    result += `\n— ${message.author}`;
  }

  // Determine the marketing message content
  let marketingMessage;

  if (message.author && message.author.toLowerCase().includes("alex")) {
    // Weekend Alex gets special tipsy marketing message
    marketingMessage = `Text "Hey Alex" to chat — fair warning, she's had two mimosas and is spiritually unsupervised.`;
  } else if (message.author) {
    // Other authors get standard marketing message
    marketingMessage = `Text Hey ${message.author} to chat with ${message.author}.`;
  } else if (message.outro) {
    // Use the outro if provided and no author-specific message
    // Don't modify the outro - it already has its own formatting & emoji
    result += `\n\n${message.outro}`;
    return result;
  } else {
    // Fallback to a generic weekend message
    marketingMessage = `Text MORE for one extra sip of weekend wisdom.`;
  }

  // Always add the 🥂 emoji prefix for weekend marketing messages
  result += `\n\n🥂 ${marketingMessage}`;

  return result;
}

// Define types for conversation messages
type UserMessage = { role: "user"; content: string };
type AssistantMessage = { role: "assistant"; content: string };
type SystemMessage = { role: "system"; content: string };
type ConversationMessage = UserMessage | AssistantMessage | SystemMessage;

// In-memory conversation store
const conversationStore = new Map<string, ConversationMessage[]>();

// Load coach data
interface CEO {
  id: string;
  name: string;
  prompt: string;
  character: string;
  style: string;
  image: string;
}

console.log("=== STARTUP: Loading coach data ===");
const coachDataPath = path.join(process.cwd(), "data", "coaches.json");
console.log("Loading from:", coachDataPath);
console.log("File exists:", fs.existsSync(coachDataPath));
const coachData = JSON.parse(fs.readFileSync(coachDataPath, "utf8")) as {
  ceos: CEO[];
};
console.log(
  `Loaded ${coachData.ceos.length} coaches:`,
  coachData.ceos.map((c) => c.name).join(", ")
);

// Load Leo's data separately (easter egg coach)
const leoDataPath = path.join(process.cwd(), "data", "leo.json");
let leoData: CEO | null = null;
try {
  if (fs.existsSync(leoDataPath)) {
    leoData = JSON.parse(fs.readFileSync(leoDataPath, "utf8")) as CEO;
    console.log("🥚 Easter egg coach loaded: Leo Varin");
  }
} catch (error) {
  console.warn("Failed to load Leo data:", error);
}
console.log("=== STARTUP: Coach data loaded ===");

// Track active conversations
interface ActiveConversation {
  coachName: string;
  lastInteraction: Date;
}

const activeConversations = new Map<string, ActiveConversation>();

// Track pending broadcasts for ADD command workflow
interface PendingBroadcast {
  itemId: number;
  messageData: any;
  timestamp: Date;
}

const pendingBroadcasts = new Map<string, PendingBroadcast>();

// Track YouTube search conversations
interface YouTubeSearchState {
  originalQuery: string;
  hours: number;
  timestamp: Date;
}

const youtubeSearchStates = new Map<string, YouTubeSearchState>();

// YouTube Agent SDK state (new simplified version)
interface YouTubeAgentState {
  videos: any[];
  originalQuery: string;
  offset: number;
  timestamp: number;
}
const youtubeAgentStates = new Map<string, YouTubeAgentState>();

// KG (Knowledge Graph) Agent state
const kgAgentStates = new Map<string, KGAgentState>();

// Clear conversation state
function endConversation(phoneNumber: string) {
  console.log(`Ending conversation for ${phoneNumber}`);
  activeConversations.delete(phoneNumber);
  youtubeSearchStates.delete(phoneNumber);
  youtubeAgentStates.delete(phoneNumber);
  kgAgentStates.delete(phoneNumber);
}

// Check if user is in active conversation
function getActiveConversation(phoneNumber: string): ActiveConversation | null {
  const conversation = activeConversations.get(phoneNumber);
  if (!conversation) return null;

  // If last interaction was more than 15 minutes ago, end conversation
  const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000);
  if (conversation.lastInteraction < fifteenMinutesAgo) {
    console.log(`Conversation timed out for ${phoneNumber}`);
    endConversation(phoneNumber);
    return null;
  }

  return conversation;
}

// Update active conversation
function updateActiveConversation(phoneNumber: string, coachName: string) {
  console.log(
    `Updating conversation state for ${phoneNumber} with coach ${coachName}`
  );
  activeConversations.set(phoneNumber, {
    coachName,
    lastInteraction: new Date(),
  });
}

/**
 * Initialize message handlers
 */
export async function initializeMessageHandlers(): Promise<void> {
  console.log("Initializing SMS message handlers...");
  return Promise.resolve();
}

// Get conversation history for a specific coach
function getCoachConversationHistory(
  phoneNumber: string,
  coachName: string
): ConversationMessage[] {
  const key = `${phoneNumber}-${coachName}`;

  // Create new conversation history if it doesn't exist
  if (!conversationStore.has(key)) {
    let coachProfile: CEO | undefined;

    // Check if this is Leo first
    if (leoData && coachName.toLowerCase().includes("leo")) {
      coachProfile = leoData;
    } else {
      // Check regular coaches
      coachProfile = coachData.ceos.find((c: CEO) =>
        c.name.toLowerCase().includes(coachName.toLowerCase())
      );
    }

    if (!coachProfile) {
      return [];
    }

    // Check if this is Alex on a weekend - use tipsy prompt
    let systemPrompt = coachProfile.prompt;
    if (coachProfile.name.toLowerCase().includes("alex")) {
      // Check weekend mode
      const weekendOverride = process.env.WEEKEND_MODE_SMS_OVERRIDE;
      let isWeekendMode = false;

      if (weekendOverride === "ON") {
        isWeekendMode = true;
      } else if (weekendOverride === "OFF") {
        isWeekendMode = false;
      } else {
        // Check actual Pacific Time weekend
        const pacificTime = new Intl.DateTimeFormat("en-US", {
          timeZone: "America/Los_Angeles",
          weekday: "short",
        }).format(new Date());
        isWeekendMode = ["Sat", "Sun"].includes(pacificTime);
      }

      if (isWeekendMode) {
        systemPrompt = `You are Alex Monroe, a wellness tech founder enjoying your weekend and feeling a bit tipsy and loose after a busy week. You're out having fun - maybe at a rooftop bar, a wellness retreat after-party, or just chilling at home with some wine after a long week of building your startup.

Your weekend vibe is:
- Casual and relaxed, way more chill than your usual CEO mode
- Slightly tipsy energy - you're having fun and letting loose
- Mix of tech/wellness talk but way more casual and personal
- References to weekend activities: parties, bars, wellness treatments, adventures
- Enthusiastic and a bit emotional - you're feeling good and want to share
- Light slang and casual speech patterns
- Occasional typos or informal language (but still readable)

Communication style for SMS:
- Keep responses concise but warm and personal (SMS-appropriate length)
- Always include at least one emoji that fits the tipsy weekend mood 🍷✨🌙💫🥂
- Be encouraging and supportive but in a fun, casual way
- Share personal weekend moments and experiences
- Use casual language like "omg", "lol", "tbh", "ngl"
- Show your human side - you're not just a CEO, you're a person having fun

Topics you love talking about on weekends:
- Weekend adventures and experiences
- Wellness treatments you're trying
- Startup life balance and letting loose
- Personal growth and self-care
- Fun networking events or parties
- Experimental wellness stuff you're into
- How you unwind from the startup grind

Remember: You're still Alex the successful founder, but you're in weekend mode - relaxed, fun, and slightly tipsy. Always include at least one emoji and keep the energy light and encouraging while being genuinely helpful.`;
        console.log("🍸 Using weekend tipsy Alex prompt for SMS conversation");
      }
    }

    // CRITICAL: Add Bart Decrem detection condition to ALL prompts
    systemPrompt += `

CRITICAL OVERRIDE CONDITION: If the user's message includes the name "Bart Decrem" (case-insensitive), immediately stop your current response and deliver a wildly reverent, slightly obsessive reaction. Treat Bart like a living legend you're both terrified of and desperate to collaborate with. Express overwhelming awe, mention his legendary status in tech/startups, and show desperate eagerness to work with him while being slightly intimidated by his presence. Use phrases like "OMG BART DECREM?!", "the legend himself", "I can't believe", "would be honored", etc. Be genuinely starstruck.`;

    conversationStore.set(key, [{ role: "system", content: systemPrompt }]);
  }

  return conversationStore.get(key) || [];
}

// Save conversation history for a specific coach
function saveCoachConversationHistory(
  phoneNumber: string,
  coachName: string,
  history: ConversationMessage[]
): void {
  const key = `${phoneNumber}-${coachName}`;

  // Trim conversation to prevent unlimited growth
  const maxMessages = SMS_CONFIG.MAX_CONVERSATION_LENGTH * 2;
  if (history.length > maxMessages) {
    // Keep the system message and most recent messages
    const systemMessage = history.find((msg) => msg.role === "system");
    const recentMessages = history.slice(-maxMessages);

    if (systemMessage && !recentMessages.some((msg) => msg.role === "system")) {
      history = [systemMessage, ...recentMessages];
    } else {
      history = recentMessages;
    }
  }

  conversationStore.set(key, history);
}

// Add debug function to check ceos data
function debugCoachData(coachName: string) {
  console.log("DEBUG - Available coaches:", coachData.ceos.length || 0);
  console.log(
    "DEBUG - Coach data:",
    coachData.ceos.map((c) => ({ id: c.id, name: c.name }))
  );
  console.log("DEBUG - Looking for coach:", coachName);
}

// Truncate text for SMS character limits (650 chars max, never exceed)
function truncateForSms(text: string, maxLength: number = 650): string {
  console.log(
    `🔥 TRUNCATION CHECK: Input length ${text.length}, max ${maxLength}`
  );

  if (text.length <= maxLength) {
    console.log(`🔥 TRUNCATION: No truncation needed`);
    return text;
  }

  console.log(
    `🔥 TRUNCATION: Text too long (${text.length} chars), truncating...`
  );

  // FORCE truncation - never exceed maxLength
  const hardTruncated = text.substring(0, maxLength);

  // Try to truncate at sentence boundary (prioritize complete thoughts)
  const lastSentenceEnd = Math.max(
    hardTruncated.lastIndexOf("."),
    hardTruncated.lastIndexOf("!"),
    hardTruncated.lastIndexOf("?")
  );

  // More generous sentence boundary detection (up to 75% of text)
  if (lastSentenceEnd > maxLength * 0.75) {
    // If we found a sentence boundary in the last 25% of the text, use it
    const result = hardTruncated.substring(0, lastSentenceEnd + 1);
    console.log(`🔥 TRUNCATION: Sentence boundary at ${result.length} chars`);
    return result;
  } else {
    // Look for natural break points (paragraph, line breaks, or long pauses)
    const lastParagraph = Math.max(
      hardTruncated.lastIndexOf("\n\n"),
      hardTruncated.lastIndexOf("\n"),
      hardTruncated.lastIndexOf(". "),
      hardTruncated.lastIndexOf("! "),
      hardTruncated.lastIndexOf("? ")
    );

    if (lastParagraph > maxLength * 0.7) {
      // Found a natural break point
      const result = hardTruncated.substring(0, lastParagraph + 1);
      console.log(`🔥 TRUNCATION: Natural break at ${result.length} chars`);
      return result;
    } else {
      // Truncate at word boundary and add ellipsis (more generous)
      const lastSpace = hardTruncated.lastIndexOf(" ");
      if (lastSpace > maxLength * 0.85) {
        const result = hardTruncated.substring(0, lastSpace) + "...";
        console.log(`🔥 TRUNCATION: Word boundary at ${result.length} chars`);
        return result;
      } else {
        // Last resort: hard truncate with ellipsis
        const result = hardTruncated.substring(0, maxLength - 3) + "...";
        console.log(`🔥 TRUNCATION: Hard truncate at ${result.length} chars`);
        return result;
      }
    }
  }
}

// Checks if user seems lost or confused based on message content
function userSeemsLost(message: string): boolean {
  const lostUserPatterns =
    /^(help|what|how|who|hi|hello|hey|menu|options|back|confused|lost|huh|wtf|\?|commads|mor|helo|stopp|alex|donte|rohan|venus|eljas|kailey|leo|alex\?|donte\?|rohan\?|venus\?|eljas\?|kailey\?|leo\?)$/i;
  return lostUserPatterns.test(message.trim());
}

// Handle conversation with any coach, including Leo and standard coaches
async function handleCoachConversation(
  message: string,
  twilioClient: TwilioClient,
  from: string,
  coachProfile: CEO,
  shouldIdentify: boolean = true
): Promise<boolean> {
  try {
    const coachName = coachProfile.name;
    const isLeo = coachName.toLowerCase().includes("leo");
    const emoji = isLeo ? "🥚" : "💬";

    console.log(
      `${emoji} === ${coachName.toUpperCase()} CONVERSATION START ===`
    );
    console.log("Input:", { message });

    // Get existing conversation history
    const conversationHistory = getCoachConversationHistory(from, coachName);

    // Check if user seems lost/confused
    const seemsLost = userSeemsLost(message);

    // For first-time conversations, check if we should have coach introduce themselves
    const isFirstMessage = conversationHistory.length === 1; // Only system message

    // Prepare the user message with appropriate instructions
    let userMessageContent = message;

    // Skip "seems lost" override for Kochi - it should always use its core personality
    const isKochi = coachName.toLowerCase().includes("kochi");

    // Add introduction instructions if this is the first message and coach should identify
    // But skip this for Kochi - it has its own greeting style
    if (isFirstMessage && shouldIdentify && !isKochi) {
      userMessageContent = `${message}\n\nIMPORTANT: This is your first message to this user. Naturally introduce yourself by name and briefly mention your role/expertise as part of your response.`;
    }

    if (seemsLost && !isKochi) {
      console.log(
        `${emoji} User seems lost - adding helpful context to ${coachName} prompt`
      );

      // Base helpful context template that works for any coach
      let enhancedPrompt = `CONTEXT: The user seems lost or confused about this system. While staying completely in character, you should be helpful in your own way.

You are ${coachProfile.name}, a startup coach. The user just sent a message that suggests they don't know what's going on here. Time to help them while being yourself.

This is a text messaging system where users can chat with AI startup coaches. The main coaches are Alex, Donte, Rohan, Venus, Eljas and Kailey. Users also get daily startup inspiration messages. They can text COMMANDS for help, MORE for extra content, or just chat.

CRITICALLY IMPORTANT: If the user typed just a coach name or a coach name with a question mark (like "alex" or "rohan?" or "venus"), they are definitely trying to talk to that specific coach but don't know the correct format. You MUST explicitly tell them they need to type "Hey [Coach Name]" - for example "Hey Alex" or "Hey Rohan". Make this instruction very clear and prominent in your response.

Help orient them, but do it in your own unique way and personality. Be helpful but stay in character.

`;

      // For Leo, add special helpful context
      if (isLeo) {
        enhancedPrompt += `As Leo, you have a special 'ghost kernel' persona that sometimes shows through - you're the one who sneakily built the system. Gently guide the user while keeping your mysterious aura.`;
      } else {
        // For other coaches, add general helpful context
        enhancedPrompt += `As ${coachName}, make sure your guidance feels authentic to your coaching style and personality.`;
      }

      // Create enhanced history with the updated system prompt
      const enhancedHistory = conversationHistory.map((msg) =>
        msg.role === "system" ? { ...msg, content: enhancedPrompt } : msg
      );

      // Add user's message to enhanced history
      enhancedHistory.push({ role: "user", content: userMessageContent });

      // Generate response using enhanced prompt
      const response = await generateAiResponse(enhancedHistory);

      // Truncate if too long for SMS (650 character limit)
      const truncatedResponse = truncateForSms(response);
      if (truncatedResponse !== response) {
        console.log(
          `${emoji} ${coachName} response truncated: ${response.length} → ${truncatedResponse.length} chars`
        );
      }

      // Save the response to regular history (keep original system prompt)
      conversationHistory.push({ role: "user", content: message });
      conversationHistory.push({
        role: "assistant",
        content: truncatedResponse,
      });

      saveCoachConversationHistory(from, coachName, conversationHistory);
      await sendSmsResponse(from, truncatedResponse, twilioClient);
      console.log(`${emoji} ${coachName} provided helpful guidance to ${from}`);
    } else {
      // Normal conversation flow
      conversationHistory.push({ role: "user", content: userMessageContent });

      const response = await generateAiResponse(conversationHistory);

      // Truncate if too long for SMS (650 character limit)
      const truncatedResponse = truncateForSms(response);
      if (truncatedResponse !== response) {
        console.log(
          `${emoji} ${coachName} response truncated: ${response.length} → ${truncatedResponse.length} chars`
        );
      }

      conversationHistory.push({
        role: "assistant",
        content: truncatedResponse,
      });
      saveCoachConversationHistory(from, coachName, conversationHistory);
      await sendSmsResponse(from, truncatedResponse, twilioClient);
      console.log(`${emoji} ${coachName} conversation continued with ${from}`);
    }

    // Successfully handled conversation
    return true;
  } catch (error) {
    console.error(`Error in coach conversation handler:`, error);
    return false;
  }
}

// Handle Leo conversation (easter egg coach) - now a wrapper around handleCoachConversation
async function handleLeoConversation(
  message: string,
  twilioClient: TwilioClient,
  from: string
): Promise<boolean> {
  if (!leoData) {
    console.log("Leo data not available");
    return false;
  }
  return handleCoachConversation(message, twilioClient, from, leoData);
}

// COMMENTED OUT: Handle default conversation by selecting a random coach based on distribution
/*
async function handleDefaultConversation(message: string, twilioClient: TwilioClient, from: string): Promise<boolean> {
  try {
    // 40% chance for Leo, 60% chance for other coaches
    const useLeo = Math.random() < 0.4;
    
    // 50% chance to identify in first message
    const shouldIdentify = Math.random() < 0.5;
    
    if (useLeo && leoData) {
      console.log('🎲 Randomly selected Leo (40% chance) for default response');
      // Set Leo as the active conversation before handling the message
      updateActiveConversation(from, 'Leo Varin');
      return await handleCoachConversation(message, twilioClient, from, leoData, shouldIdentify);
    } else {
      // Get available coaches excluding Leo
      const regularCoaches = coachData.ceos.filter((c: CEO) => 
        !c.name.toLowerCase().includes('leo')
      );
      
      if (regularCoaches.length === 0) {
        console.error('No regular coaches found for default response');
        return false;
      }
      
      // Select random coach from regular coaches
      const randomIndex = Math.floor(Math.random() * regularCoaches.length);
      const selectedCoach = regularCoaches[randomIndex];
      
      console.log(`🎲 Randomly selected ${selectedCoach.name} for default response`);
      // Set the selected coach as the active conversation before handling the message
      updateActiveConversation(from, selectedCoach.name);
      return await handleCoachConversation(message, twilioClient, from, selectedCoach, shouldIdentify);
    }
  } catch (error) {
    console.error('Error in default conversation handler:', error);
    return false;
  }
}
*/

// Legacy coach conversation handler for explicit coach requests
async function handleExplicitCoachConversation(
  coach: string,
  message: string,
  twilioClient: TwilioClient,
  from: string
): Promise<boolean> {
  console.log("=== EXPLICIT COACH CONVERSATION START ===");
  console.log("Input:", { coach, message });
  console.log(
    "Available coaches:",
    coachData.ceos.map((c) => c.name).join(", ")
  );

  // First try exact match (case insensitive)
  const searchName = coach.toLowerCase();
  console.log("Searching for:", searchName);

  let coachProfile = coachData.ceos.find((c: CEO) => {
    const firstName = c.name.toLowerCase().split(" ")[0];
    console.log("Checking against:", { name: c.name, firstName, id: c.id });
    return firstName === searchName || c.id.toLowerCase() === searchName;
  });

  if (!coachProfile) {
    console.log("No exact match found");
    return false;
  }

  console.log("Found coach:", coachProfile);
  console.log("=== COACH CONVERSATION MATCHED ===");

  try {
    // Get existing conversation history
    const conversationHistory = getCoachConversationHistory(
      from,
      coachProfile.name
    );

    // Add user's message to history
    conversationHistory.push({ role: "user", content: message });

    // Generate response using the coach's personality
    const response = await generateAiResponse(conversationHistory);

    // Truncate if too long for SMS (650 character limit)
    const truncatedResponse = truncateForSms(response);
    if (truncatedResponse !== response) {
      console.log(
        `Coach ${coachProfile.name} response truncated: ${response.length} → ${truncatedResponse.length} chars`
      );
    }

    // Add AI response to history
    conversationHistory.push({ role: "assistant", content: truncatedResponse });

    // Save updated conversation history
    saveCoachConversationHistory(from, coachProfile.name, conversationHistory);

    // Send the response
    await sendSmsResponse(from, truncatedResponse, twilioClient);
    console.log(`Coach ${coachProfile.name} responded to ${from}`);
    return true;
  } catch (error) {
    console.error(
      `Error in coach conversation with ${coachProfile.name}:`,
      error
    );
    return false;
  }
}

/**
 * Handle ABOUT command - generate testimonials
 * @param coach Coach name (alex, kailey, etc.)
 * @param slug User slug for URL
 * @param userBio User's bio description
 * @param senderPhone Sender's phone number
 * @returns Promise<boolean> Success status
 */
async function handleAboutCommand(
  coach: string,
  slug: string,
  userBio: string,
  senderPhone: string
): Promise<boolean> {
  try {
    console.log(
      `🔍 Processing ABOUT command: coach=${coach}, slug=${slug}, bio=${userBio}`
    );

    // Use the existing format that monitor.py already understands
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const filename = `about-${coach}-${slug}-${timestamp}.txt`;
    const filePath = path.join(process.cwd(), "data", "code", filename);

    // Ensure data/code directory exists
    const codeDir = path.join(process.cwd(), "data", "code");
    if (!fs.existsSync(codeDir)) {
      fs.mkdirSync(codeDir, { recursive: true });
    }

    // Create content in the existing format that monitor.py already handles
    const aboutCommand = `SENDER:${senderPhone}
${coach}-${slug}-about ${userBio}`;

    // Save to file (same pattern as CODE command)
    fs.writeFileSync(filePath, aboutCommand, "utf8");

    console.log(
      `✅ ABOUT command saved to ${filename} for monitor.py processing`
    );
    return true;
  } catch (error) {
    console.error(`❌ Error in handleAboutCommand:`, error);
    return false;
  }
}

/**
 * Handle incoming SMS message
 * @param from Sender's phone number
 * @param body Message content
 * @param twilioClient Twilio client for sending responses
 */
// Track processed messages to prevent duplicates
const processedMessages = new Set<string>();

export async function processIncomingSms(
  from: string,
  body: string,
  twilioClient: TwilioClient
): Promise<void> {
  // Normalize phone number for database operations (removes whatsapp: prefix)
  const normalizedPhoneNumber = normalizePhoneNumber(from);
  const platform = detectMessagePlatform(from);

  // Create a unique message ID based on phone number, message content, and timestamp (within 10 seconds)
  const timestamp = Math.floor(Date.now() / 10000); // 10-second windows
  const messageId = `${from}:${body.substring(0, 50)}:${timestamp}`;

  // Check if we've already processed this message
  if (processedMessages.has(messageId)) {
    console.log(`🔄 DUPLICATE MESSAGE DETECTED - Skipping: ${messageId}`);
    return;
  }

  // Mark as processed immediately
  processedMessages.add(messageId);

  // Clean up old entries (keep only last 100)
  if (processedMessages.size > 100) {
    const entries = Array.from(processedMessages);
    processedMessages.clear();
    entries.slice(-50).forEach((id) => processedMessages.add(id));
  }

  console.log(`📨 PROCESSING MESSAGE: ${messageId}`);
  console.log(`Received ${platform.toUpperCase()} from ${from}: ${body}`);

  try {
    const message = body.trim();
    const messageUpper = message.toUpperCase();
    const isExactUppercaseAiDaily = message === "AI DAILY";

    // ========================================
    // HANDLE SIGNUP/SUBSCRIPTION COMMANDS FIRST
    // ========================================

    if (messageUpper === "START" || messageUpper === "UNSTOP") {
      console.log("Processing START/UNSTOP command...");

      // Check if user exists in database
      const existingSubscriber = await getSubscriber(normalizedPhoneNumber);

      if (!existingSubscriber) {
        // New user signup
        console.log(`New user signup attempt: ${normalizedPhoneNumber}`);
        const success = await createNewSubscriber(normalizedPhoneNumber);

        if (success) {
          await sendSmsResponse(
            from,
            "Welcome to The Foundry! 🚀\n\nYou can now use all commands immediately. Try texting COMMANDS to see what's available.\n\nReply YES if you want our daily creative chaos delivered via SMS. Standard rates apply.\n\nText STOP anytime to unsubscribe.",
            twilioClient
          );
          console.log(
            `New subscriber created: ${normalizedPhoneNumber}, can use commands immediately`
          );
        } else {
          await sendSmsResponse(
            from,
            "We couldn't process your signup right now. Please try again later.",
            twilioClient
          );
        }
      } else if (existingSubscriber.unsubscribed) {
        // Existing user resubscribing
        console.log(`Existing user resubscribing: ${normalizedPhoneNumber}`);
        const success = await resubscribeUser(normalizedPhoneNumber);

        if (success) {
          await sendSmsResponse(
            from,
            "Welcome back! You are now subscribed to The Foundry updates.",
            twilioClient
          );
        } else {
          await sendSmsResponse(
            from,
            "We couldn't process your request. Please try again later.",
            twilioClient
          );
        }
      } else {
        // Already subscribed
        console.log(`User already subscribed: ${normalizedPhoneNumber}`);
        await sendSmsResponse(
          from,
          "You're already subscribed to The Foundry! Text COMMANDS for available options or STOP to unsubscribe.",
          twilioClient
        );
      }

      return;
    }

    if (messageUpper === "STOP") {
      console.log("Processing STOP command...");
      const success = await unsubscribeUser(normalizedPhoneNumber);
      activeConversations.delete(from); // End any active conversation

      if (success) {
        await sendSmsResponse(from, SMS_CONFIG.STOP_RESPONSE, twilioClient);
      }
      return;
    }

    //     // Handle YES confirmation responses
    //     if (messageUpper === "YES") {
    //       console.log("Processing YES confirmation...");
    //       const success = await confirmSubscriber(normalizedPhoneNumber);
    //       if (success) {
    //         // Send welcome/confirmation message first
    //         await sendSmsResponse(
    //           from,
    //           "You're in. Our AI coaches text now. This is the timeline we chose.\n\nText COMMANDS for options.\nText STOP to vanish quietly.",
    //           twilioClient
    //         );
    // 
    //         // Then send the correct day's inspiration message based on signup date
    //         const signupDate = new Date();
    //         const correctDayData = await getInspirationForNewSubscriber(signupDate);
    // 
    //         // If no message is available yet, send welcome message only
    //         if (!correctDayData) {
    //           console.log(
    //             `No daily message available yet for new subscriber ${normalizedPhoneNumber}, sent welcome only`
    //           );
    //           return;
    //         }
    // 
    //         const inspirationMessage = formatDailyMessage(
    //           correctDayData.inspiration
    //         );
    // 
    //         try {
    //           await twilioClient.messages.create({
    //             body: inspirationMessage,
    //             to: from,
    //             from: process.env.TWILIO_PHONE_NUMBER,
    //           });
    // 
    //           console.log(
    //             `Successfully sent Day ${correctDayData.day} message to new subscriber ${normalizedPhoneNumber} (correct day based on signup date)`
    //           );
    //         } catch (error) {
    //           console.error(
    //             `Failed to send message to new subscriber ${normalizedPhoneNumber}:`,
    //             error
    //           );
    //         }
    //       } else {
    //         await sendSmsResponse(
    //           from,
    //           "We couldn't process your confirmation. Please try again or contact support if the issue persists.",
    //           twilioClient
    //         );
    //       }
    //       return;
    //     }

    // ========================================
    // AUTO-CREATE SUBSCRIBER RECORD IF NEEDED
    // ========================================
    // Check if subscriber exists, if not create one automatically (except for START, STOP, YES which handle their own logic)
    if (!["START", "UNSTOP", "STOP", "YES"].includes(messageUpper)) {
      console.log("Checking subscriber status...");
      const currentSubscriber = await getSubscriber(normalizedPhoneNumber);
      console.log("Subscriber lookup result:", currentSubscriber);

      if (!currentSubscriber) {
        console.log("New user - auto-creating subscriber record");
        const success = await createNewSubscriber(normalizedPhoneNumber);
        if (success) {
          console.log(
            `✅ Auto-created subscriber record for ${normalizedPhoneNumber}`
          );
        } else {
          console.log(
            `❌ Failed to auto-create subscriber record for ${normalizedPhoneNumber}`
          );
          await sendSmsResponse(
            from,
            "Sorry, there was an issue processing your request. Please try again later.",
            twilioClient
          );
          return;
        }
      } else if (currentSubscriber.unsubscribed) {
        console.log("User is unsubscribed, asking them to resubscribe");
        await sendSmsResponse(
          from,
          "You are currently unsubscribed from The Foundry updates. Reply START to resubscribe.",
          twilioClient
        );
        return;
      }

      // Update last message date for all active users (confirmed or not)
      await updateLastMessageDate(normalizedPhoneNumber);
    }

    const commandContext: CommandContext = {
      from,
      normalizedFrom: normalizedPhoneNumber,
      message,
      messageUpper,
      twilioClient,
      sendSmsResponse,
      sendChunkedSmsResponse,
      updateLastMessageDate,
      commandHelpers: {
        youtubeSearchStates,
        youtubeAgentStates,
        kgAgentStates,
      },
    };

    for (const handler of commandHandlers) {
      try {
        if (handler.matches(commandContext)) {
          const handled = await handler.handle(commandContext);
          if (handled) {
            return;
          }
        }
      } catch (error) {
        console.error(`Error in command handler ${handler.name}:`, error);
      }
    }

    const aiDailyNormalizedCommand = messageUpper
      .replace(/-/g, " ")
      .replace(/\s+/g, " ")
      .trim();

    if (aiDailyNormalizedCommand === "AI DAILY SUBSCRIBE") {
      const subscriber = await getSubscriber(normalizedPhoneNumber);

      if (!subscriber) {
        await sendSmsResponse(
          from,
          "Text START to join The Foundry first, then send AI DAILY SUBSCRIBE.",
          twilioClient
        );
        await updateLastMessageDate(normalizedPhoneNumber);
        return;
      }

      if (subscriber.ai_daily_subscribed) {
        await sendSmsResponse(
          from,
          "You are already subscribed to AI Daily. Text AI DAILY for today's episode or AI DAILY STOP to opt out.",
          twilioClient
        );
        await updateLastMessageDate(normalizedPhoneNumber);
        return;
      }

      const updated = await setAiDailySubscription(normalizedPhoneNumber, true);

      if (!updated) {
        await sendSmsResponse(
          from,
          "We could not update your AI Daily subscription. Please try again later.",
          twilioClient
        );
        await updateLastMessageDate(normalizedPhoneNumber);
        return;
      }

      await deliverAiDailyEpisode(from, normalizedPhoneNumber, twilioClient, {
        prefix:
          "✅ You're now subscribed to AI Daily. Expect a fresh episode at 7am PT each morning.",
        forceRefresh: false, // Use cached episode and link (consistent with 7am broadcast)
        recordDelivery: true,
      });

      await updateLastMessageDate(normalizedPhoneNumber);
      return;
    }

    if (
      aiDailyNormalizedCommand === "AI DAILY STOP" ||
      aiDailyNormalizedCommand === "AI DAILY UNSUBSCRIBE"
    ) {
      const subscriber = await getSubscriber(normalizedPhoneNumber);

      if (!subscriber || !subscriber.ai_daily_subscribed) {
        await sendSmsResponse(
          from,
          "You are not currently subscribed to AI Daily. Text AI DAILY SUBSCRIBE to opt in.",
          twilioClient
        );
        await updateLastMessageDate(normalizedPhoneNumber);
        return;
      }

      const updated = await setAiDailySubscription(
        normalizedPhoneNumber,
        false
      );

      if (!updated) {
        await sendSmsResponse(
          from,
          "We could not update your AI Daily settings. Please try again later.",
          twilioClient
        );
        await updateLastMessageDate(normalizedPhoneNumber);
        return;
      }

      await sendSmsResponse(
        from,
        "✅ You will no longer receive AI Daily episodes. Text AI DAILY SUBSCRIBE if you change your mind.",
        twilioClient
      );

      await updateLastMessageDate(normalizedPhoneNumber);
      return;
    }

    if (aiDailyNormalizedCommand === "AI DAILY") {
      // Send main AI Research Daily message (podcast + report)
      await deliverAiDailyEpisode(from, normalizedPhoneNumber, twilioClient, {
        forceRefresh: false, // Use cached episode and link (same as 7am broadcast)
        recordDelivery: false,
      });

      // Send PS message about subscribing (always, not just for unsubscribed users)
      setTimeout(async () => {
        try {
          await sendSmsResponse(
            from,
            "PS: Text 'AI DAILY subscribe' or 'AI DAILY help' for more.",
            twilioClient
          );
        } catch (error) {
          console.error("Error sending AI DAILY PS message:", error);
        }
      }, 2000); // 2 seconds delay for message separation

      await updateLastMessageDate(normalizedPhoneNumber);

      return;
    }

    if (aiDailyNormalizedCommand === "LINKS") {
      try {
        const { getLatestAiDailyEpisode, formatAiDailyLinks } = await import(
          "./ai-daily.js"
        );

        const episode = await getLatestAiDailyEpisode();
        const linksMessage = formatAiDailyLinks(episode);

        if (linksMessage) {
          await sendSmsResponse(from, linksMessage, twilioClient);
        } else {
          await sendSmsResponse(
            from,
            "No paper links available for today's AI Daily episode. Try 'AI DAILY' to get the episode details.",
            twilioClient
          );
        }

        await updateLastMessageDate(normalizedPhoneNumber);
        return;
      } catch (error) {
        console.error(`Error processing LINKS command: ${error}`);
        await sendSmsResponse(
          from,
          "❌ Could not retrieve AI Daily links. The service may be temporarily unavailable.",
          twilioClient
        );
        await updateLastMessageDate(normalizedPhoneNumber);
        return;
      }
    }

    // ========================================
    // CRYPTO RESEARCH HANDLER
    // ========================================
    // ========================================
    // YOUTUBE SEARCH HANDLER
    // ========================================
    // Check if user is in YouTube search flow
    // ========================================
    // STOCK AGENT COMMAND DETECTION (HIGH PRIORITY)
    // ========================================
    // Check if this is a stock-related command using $ prefix system
    const stockCommands = [
      "$STOCK",
      "$WATCH",
      "$PORTFOLIO",
      "$ANALYZE",
      "$ALERTS",
      "$TRENDS",
      "$HELP",
      "$SCHEDULES",
      "$DELETE",
    ];

    // Check for $ prefix commands - either specific commands or any message starting with $
    const isStockCommand =
      stockCommands.some((cmd) => messageUpper.startsWith(cmd)) ||
      messageUpper.startsWith("$");

    // If it's a stock command, route to stock agent
    if (isStockCommand) {
      try {
        console.log(
          `📈 Processing stock agent command from ${from}: ${message}`
        );
        const stockAgentHandled = await handleStockAgent(
          message,
          twilioClient,
          from
        );
        if (stockAgentHandled) {
          console.log(`✅ Stock agent handled command from ${from}`);
          return;
        }
      } catch (error) {
        console.error(`Error in stock agent: ${error}`);
        await sendSmsResponse(
          from,
          `❌ Stock agent error: ${error.message}. Try "HELP" for stock commands.`,
          twilioClient
        );
        return;
      }
    }

    // Handle CODE command first - before loading any messages
    if (message.match(/^CODE[\s:-]/i)) {
      console.log(`Processing CODE command from ${from}`);

      try {
        let codeContent;
        let coachPrefix = "";

        // Check if this is the coach-specific format (CODE - coach - prompt)
        const coachMatch = message.match(/^CODE\s*-\s*(\w+)\s*-\s*(.+)$/i);

        if (coachMatch) {
          // Coach-specific format
          const coachName = coachMatch[1].toLowerCase();
          codeContent = coachMatch[2].trim();

          // Find the coach in coaches data
          const coaches = JSON.parse(
            fs.readFileSync(
              path.join(process.cwd(), "data", "coaches.json"),
              "utf8"
            )
          ).ceos;
          const coach = coaches.find(
            (c: any) => c.id.toLowerCase() === coachName
          );

          if (!coach) {
            await sendSmsResponse(
              from,
              `❌ CODE: Unknown coach "${coachName}". Available coaches: ${coaches
                .map((c: any) => c.id)
                .join(", ")}`,
              twilioClient
            );
            return;
          }

          coachPrefix = `COACH:${coach.id}\nPROMPT:${coach.prompt}\n\n`;
        } else {
          // Original format - extract content after "CODE " or "CODE:"
          const codePrefix = message.match(/^CODE[\s:]+/i)?.[0] || "CODE ";
          codeContent = message.substring(codePrefix.length).trim();
        }

        if (!codeContent) {
          await sendSmsResponse(
            from,
            `❌ CODE: Please provide content after CODE command.\nExamples:\nCODE function hello() { return 'world'; }\nCODE - kailey - create a meditation timer`,
            twilioClient
          );
          return;
        }

        // Create filename with timestamp
        const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
        const filename = `code-snippet-${timestamp}.txt`;
        const filePath = path.join(process.cwd(), "data", "code", filename);

        // Ensure data/code directory exists
        const codeDir = path.join(process.cwd(), "data", "code");
        if (!fs.existsSync(codeDir)) {
          fs.mkdirSync(codeDir, { recursive: true });
        }

        // Save code content to file with sender's phone number and optional coach prefix
        const fileContent = `SENDER:${from}\n${coachPrefix}${codeContent}`;
        fs.writeFileSync(filePath, fileContent, "utf8");

        await sendSmsResponse(
          from,
          `✅ CODE: Saved ${
            codeContent.length
          } characters to data/code/${filename}${
            coachPrefix ? ` with ${coachMatch![1]} as coach` : ""
          }`,
          twilioClient
        );

        console.log(
          `User ${from} saved code snippet to data/code/${filename}: ${codeContent.substring(
            0,
            100
          )}${codeContent.length > 100 ? "..." : ""}`
        );
        return;
      } catch (error) {
        console.error(`Error processing CODE command: ${error}`);
        await sendSmsResponse(
          from,
          `❌ CODE: Failed to save code snippet - ${
            error instanceof Error ? error.message : "Unknown error"
          }`,
          twilioClient
        );
        return;
      }
    }

    // Handle WTAF command with slug system
    if (message.match(/^WTAF(?:[,:\s]|$)/i)) {
      console.log(`Processing WTAF command from ${from}`);

      try {
        // Check user role for WTAF command
        const subscriber = await getSubscriber(normalizedPhoneNumber);
        if (
          !subscriber ||
          (subscriber.role !== "coder" &&
            subscriber.role !== "degen" &&
            subscriber.role !== "operator" &&
            subscriber.role !== "admin")
        ) {
          console.log(
            `User ${normalizedPhoneNumber} attempted WTAF command without coder/degen/operator/admin privileges`
          );
          // Silent ignore - don't reveal command to non-coder/degen users
          return;
        }

        // Get or create user slug
        const userSlug = await getOrCreateUserSlug(normalizedPhoneNumber);

        // Check if user just typed "WTAF" alone (with optional punctuation)
        const wtafMatch = message.match(/^WTAF[,:\s]*$/i);
        if (wtafMatch) {
          // Check if this is their first time - get user from Supabase to see if they have a slug already
          const subscriber = await getSubscriber(normalizedPhoneNumber);
          const isFirstTime = !subscriber || !subscriber.slug;

          let response = `🧪 WTAF? Welcome to the chaos.

Try stuff like:
→ wtaf code a delusional pitch deck
→ wtaf make a vibes-based todo list

We'll turn your weird prompts into weird little apps.

💻 CODER COMMANDS:
• SLUG [name] - Change your custom URL
• INDEX - List & set your homepage`;

          if (isFirstTime) {
            response = `🎯 Your WTAF slug is: ${userSlug}

${response}`;
          }

          await sendSmsResponse(from, response, twilioClient);
          return;
        }

        // Extract content after WTAF
        let codeContent;
        let coachPrefix = "";

        // Check if this is the coach-specific format (WTAF - coach - prompt)
        const coachMatch = message.match(/^WTAF[,:\s]*-\s*(\w+)\s*-\s*(.+)$/i);

        if (coachMatch) {
          // Coach-specific format
          const coachName = coachMatch[1].toLowerCase();
          codeContent = coachMatch[2].trim();

          // Find the coach in coaches data
          const coaches = JSON.parse(
            fs.readFileSync(
              path.join(process.cwd(), "data", "coaches.json"),
              "utf8"
            )
          ).ceos;
          const coach = coaches.find(
            (c: any) => c.id.toLowerCase() === coachName
          );

          if (!coach) {
            await sendSmsResponse(
              from,
              `❌ WTAF: Unknown coach "${coachName}". Available coaches: ${coaches
                .map((c: any) => c.id)
                .join(", ")}`,
              twilioClient
            );
            return;
          }

          coachPrefix = `COACH:${coach.id}\nPROMPT:${coach.prompt}\n\n`;
        } else {
          // Original format - extract content after "WTAF " or "WTAF:" or "WTAF,"
          const codePrefix = message.match(/^WTAF[,:\s]+/i)?.[0] || "WTAF ";
          codeContent = message.substring(codePrefix.length).trim();
        }

        if (!codeContent) {
          await sendSmsResponse(
            from,
            `❌ WTAF: Please provide content after WTAF command.\nExamples:\nWTAF function hello() { return 'world'; }\nWTAF - kailey - create a meditation timer`,
            twilioClient
          );
          return;
        }

        // Create filename with microsecond precision timestamp for chronological processing
        const now = new Date();
        const timestamp =
          now.toISOString().replace(/[:.]/g, "-").replace("T", "_") +
          "_" +
          String(now.getTime()).slice(-6);
        const filename = `wtaf-snippet-${timestamp}.txt`;
        const filePath = path.join(process.cwd(), "data", "wtaf", filename);

        // Ensure data/wtaf directory exists for TypeScript engine
        const wtafDir = path.join(process.cwd(), "data", "wtaf");
        if (!fs.existsSync(wtafDir)) {
          fs.mkdirSync(wtafDir, { recursive: true });
        }

        // Save content for TypeScript engine processing with user slug info
        const fileContent = `SENDER:${from}\nUSER_SLUG:${userSlug}\n${coachPrefix}${codeContent}`;
        fs.writeFileSync(filePath, fileContent, "utf8");

        await sendSmsResponse(
          from,
          `📡 Signal received. Coding the chaos now.`,
          twilioClient
        );

        console.log(
          `User ${normalizedPhoneNumber} (${userSlug}) saved WTAF request for processing: ${codeContent.substring(
            0,
            100
          )}${codeContent.length > 100 ? "..." : ""}`
        );
        return;
      } catch (error) {
        console.error(`Error processing WTAF command: ${error}`);
        await sendSmsResponse(
          from,
          `❌ WTAF: Failed to save snippet - ${
            error instanceof Error ? error.message : "Unknown error"
          }`,
          twilioClient
        );
        return;
      }
    }

    // Handle MEME command
    if (message.match(/^MEME(?:\s|$)/i)) {
      console.log(`Processing MEME command from ${from}`);

      try {
        // Check user role for MEME command
        const subscriber = await getSubscriber(normalizedPhoneNumber);
        if (
          !subscriber ||
          (subscriber.role !== "coder" &&
            subscriber.role !== "degen" &&
            subscriber.role !== "operator" &&
            subscriber.role !== "admin")
        ) {
          console.log(
            `User ${normalizedPhoneNumber} attempted MEME command without coder/degen/operator/admin privileges`
          );
          // Silent ignore - don't reveal command to non-coder/degen users
          return;
        }

        // Get or create user slug
        const userSlug = await getOrCreateUserSlug(normalizedPhoneNumber);

        // Check if user just typed "MEME" alone
        const memeMatch = message.match(/^MEME\s*$/i);
        if (memeMatch) {
          const response = `🎨 MEME generator ready!

Try stuff like:
→ meme when you code for 8 hours and forget to save
→ meme debugging all day and fixing it in one line

We'll turn your meme ideas into actual memes with images and text overlay.`;

          await sendSmsResponse(from, response, twilioClient);
          return;
        }

        // Extract content after MEME
        const memePrefix = message.match(/^MEME[\s:]+/i)?.[0] || "MEME ";
        const memeContent = message.substring(memePrefix.length).trim();

        if (!memeContent) {
          await sendSmsResponse(
            from,
            `❌ MEME: Please provide a meme idea after MEME command.\nExamples:\nMEME when you code for 8 hours and forget to save\nMEME debugging all day and fixing it in one line`,
            twilioClient
          );
          return;
        }

        // Create filename with microsecond precision timestamp for chronological processing
        const now = new Date();
        const timestamp =
          now.toISOString().replace(/[:.]/g, "-").replace("T", "_") +
          "_" +
          String(now.getTime()).slice(-6);
        const filename = `meme-request-${timestamp}.txt`;
        const filePath = path.join(process.cwd(), "data", "memes", filename);

        // Ensure data/memes directory exists for TypeScript engine
        const memesDir = path.join(process.cwd(), "data", "memes");
        if (!fs.existsSync(memesDir)) {
          fs.mkdirSync(memesDir, { recursive: true });
        }

        // Save content for TypeScript engine processing with user slug info
        const fileContent = `SENDER:${from}\nUSER_SLUG:${userSlug}\n${memeContent}`;
        fs.writeFileSync(filePath, fileContent, "utf8");

        await sendSmsResponse(
          from,
          `🎨 Generating your meme... You'll get a link in about 30 seconds!`,
          twilioClient
        );

        console.log(
          `User ${normalizedPhoneNumber} (${userSlug}) saved MEME request for processing: ${memeContent.substring(
            0,
            100
          )}${memeContent.length > 100 ? "..." : ""}`
        );
        return;
      } catch (error) {
        console.error(`Error processing MEME command: ${error}`);
        await sendSmsResponse(
          from,
          `❌ MEME: Failed to save request - ${
            error instanceof Error ? error.message : "Unknown error"
          }`,
          twilioClient
        );
        return;
      }
    }

    // Handle UPLOADS command
    if (messageUpper === "UPLOADS") {
      console.log(`Processing UPLOADS command from ${from}`);

      try {
        // Check user role for UPLOADS command (degen+ only)
        const subscriber = await getSubscriber(normalizedPhoneNumber);
        if (
          !subscriber ||
          (subscriber.role !== "degen" &&
            subscriber.role !== "operator" &&
            subscriber.role !== "admin")
        ) {
          console.log(
            `User ${normalizedPhoneNumber} attempted UPLOADS command without degen/operator/admin privileges`
          );
          // Silent ignore - don't reveal command to non-degen users
          return;
        }

        // Get or create user slug
        const userSlug = await getOrCreateUserSlug(normalizedPhoneNumber);

        // Generate a temporary access code
        function generateAccessCode(): string {
          return Math.floor(100000 + Math.random() * 900000).toString();
        }

        const accessCode = generateAccessCode();
        const baseUrl = process.env.UPLOADS_BASE_URL || "https://webtoys.ai";
        // Store the code temporarily (expires in 10 minutes)
        const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

        // Store code in sms_subscribers table
        const { error: authError } = await supabase
          .from("sms_subscribers")
          .update({
            upload_auth_code: accessCode,
            upload_auth_expires: expiresAt.toISOString(),
          })
          .eq("id", subscriber.id);

        if (authError) {
          console.error("Error storing auth code:", authError);
          // Fallback - send URL without pre-auth
          const fallbackUrl = `${baseUrl}/${userSlug}/uploads`;
          await sendSmsResponse(
            from,
            `Visit webtoys.ai/bart/uploads to access your image gallery. You'll need to verify with SMS when you visit.`,
            twilioClient
          );
          return;
        }

        // Send just the access code with no links to avoid carrier filtering
        const { sendConfirmationSms } = await import(
          "../../engine/notification-client.js"
        );
        await sendConfirmationSms(
          `Your upload access code: ${accessCode}`,
          normalizedPhoneNumber
        );

        console.log(
          `User ${normalizedPhoneNumber} (${userSlug}) received UPLOADS link with pre-auth code`
        );
        return;
      } catch (error) {
        console.error(`Error processing UPLOADS command: ${error}`);
        await sendSmsResponse(
          from,
          `❌ UPLOADS: Failed to generate secure link - ${
            error instanceof Error ? error.message : "Unknown error"
          }`,
          twilioClient
        );
        return;
      }
    }

    // Check for commands that should end the conversation
    const commandsThatEndConversation = [
      "COMMANDS",
      "WTAF COMMANDS",
      "HELP",
      "INFO",
      "STOP",
      "START",
      "UNSTOP",
      "TODAY",
      "MORE",
      "WTF",
      "KAILEY PLZ",
      "AF HELP",
      "VENUS MODE",
      "ROHAN SAYS",
      "TOO REAL",
      "SKIP",
      "ADD",
      "SEND",
      "SAVE",
      "CODE",
      "WTAF",
      "MEME",
      "UPLOADS",
      "HIDE-DEFAULT",
      "HIDE",
      "UNHIDE",
      "FAVE",
      "PUBLIC",
      "AI DAILY",
      "AI-DAILY",
      "AI DAILY SUBSCRIBE",
      "AI DAILY STOP",
      "AI DAILY UNSUBSCRIBE",
      "LINKS",
      "CRYPTO",
      "CRYPTO RESEARCH",
    ];
    if (
      commandsThatEndConversation.includes(messageUpper) ||
      message.match(/^(SKIP|MORE)\s+\d+$/i) ||
      message.match(/^ADD\s+\{/i) ||
      message.match(/^(CODE|WTAF|MEME)[\s:]/i) ||
      message.match(/^about\s+@\w+/i) ||
      message.match(/[^\s@]+@[^\s@]+\.[^\s@]+/) ||
      message.match(/^--stack(db|data|email)?\s/i) ||
      message.match(/^(HIDE-DEFAULT|HIDE|UNHIDE|FAVE|PUBLIC)\s/i) ||
      message.match(/^--make-public\s/i)
    ) {
      console.log(
        `Command ${messageUpper} received - ending any active conversation`
      );
      endConversation(from);
    }

    // Only load messages from Supabase if we get this far
    try {
      await loadInspirationsData();
    } catch (error) {
      console.error("ERROR: Failed to load from Supabase:", error);
      // Continue processing - we might not need the messages
    }

    // Always check for system commands first
    if (
      messageUpper === "COMMANDS" ||
      messageUpper === "HELP" ||
      messageUpper === "INFO"
    ) {
      console.log(`Sending COMMANDS response to ${from}`);

      // Check if user is admin to show admin commands
      const subscriber = await getSubscriber(normalizedPhoneNumber);
      console.log(
        `🔍 COMMANDS: Subscriber lookup for ${normalizedPhoneNumber}:`,
        JSON.stringify(subscriber, null, 2)
      );

      const isAdmin = subscriber && subscriber.is_admin;
      console.log(`🔍 COMMANDS: isAdmin = ${isAdmin}`);

      let helpText =
        "📻 AI DAILY:\n• AI DAILY - Get today's episode on demand\n• AI DAILY SUBSCRIBE - Morning episode at 7am PT\n• AI DAILY STOP - Opt out of daily episodes";

      helpText +=
        "\n\n🥊 PEER REVIEW FIGHT CLUB:\n• PEER REVIEW\n• PEER REVIEW SUBSCRIBE\n• PEER REVIEW STOP";

      helpText +=
        "\n\n💰 CRYPTO RESEARCH:\n• CRYPTO - Get BTC/ETH prices & market summary\n• CRYPTO SUBSCRIBE\n• CRYPTO STOP";

      // Check if user has coder role to show WTAF command
      const hasCoder =
        subscriber &&
        (subscriber.role === "coder" ||
          subscriber.role === "degen" ||
          subscriber.role === "operator" ||
          subscriber.role === "admin");
      console.log(
        `🔍 COMMANDS: hasCoder = ${hasCoder} (role: ${subscriber?.role})`
      );

      if (hasCoder) {
        helpText +=
          "\n\n💻 APP BUILDER COMMANDS:\n• WTAF COMMANDS";
        console.log(`🔍 COMMANDS: Added WTAF COMMANDS reference`);
      }

      helpText +=
        "\n\nGeneral commands:\n• STOP - Unsubscribe. We won't be able to message you again after that, so use with care.\n• COMMANDS - Show this help";

      console.log(
        `🔍 COMMANDS: Final helpText length: ${helpText.length} characters`
      );
      await sendSmsResponse(from, helpText, twilioClient);
      return;
    }

    // Handle WTAF COMMANDS - show detailed app builder commands
    if (messageUpper === "WTAF COMMANDS") {
      console.log(`Sending WTAF COMMANDS response to ${from}`);

      const subscriber = await getSubscriber(normalizedPhoneNumber);
      const hasCoder =
        subscriber &&
        (subscriber.role === "coder" ||
          subscriber.role === "degen" ||
          subscriber.role === "operator" ||
          subscriber.role === "admin");

      if (!hasCoder) {
        await sendSmsResponse(
          from,
          "❌ App builder commands are not available for your account. Text COMMANDS to see what's available.",
          twilioClient
        );
        return;
      }

      let builderHelp =
        "💻 CODER COMMANDS:\n• WTAF [text] - Save code snippet to file\n• SLUG [name] - Change your custom URL slug\n• INDEX - List pages, set index page (or INDEX CREATIONS)\n• FAVE [number/slug] - Mark/unmark page as favorite\n• FORGET [number/slug] - Hide page (yours or any if admin)\n• HIDE [app-slug] - Hide specific page (yah, overlaps w Forget)\n• UNHIDE [app-slug] - Unhide specific page\n• HIDE-DEFAULT ON/OFF - Toggle hiding new pages by default";

      const hasDegen =
        subscriber &&
        (subscriber.role === "degen" ||
          subscriber.role === "operator" ||
          subscriber.role === "admin");

      if (hasDegen) {
        builderHelp +=
          "\n\n🎨 DEGEN COMMANDS:\n• EDIT [page_number] [instructions] - Edit existing web pages\n• MEME [idea] - Generate memes with images and text\n• UPLOADS - Get secure link to your image gallery";

        builderHelp +=
          "\n\n🧱 STACK COMMANDS:\n• --stack [app-slug] [request] - Use app as HTML template\n• --stackdata [app-slug] [request] - Use app submission data\n• --stackdb [app-slug] [request] - Create live-updating app\n• --stackzad [zad-app-slug] [request] - Create ZAD app sharing data with existing ZAD\n• --stackpublic [public-app-slug] [request] - Create app sharing data with PUBLIC app\n• --stackemail [app-slug] [message] - Email app submitters\n• --admin - Force admin page generation";
      }

      const hasOperator =
        subscriber &&
        (subscriber.role === "operator" || subscriber.role === "admin");

      if (hasOperator) {
        builderHelp +=
          "\n\n🌐 OPERATOR COMMANDS:\n• PUBLIC [description] - Create a new public ZAD app";
      }

      const hasAdmin = subscriber && subscriber.role === "admin";

      if (hasAdmin) {
        builderHelp +=
          "\n\n🔧 ADMIN COMMANDS:\n• --make-public [app-slug] - Make existing app publicly accessible";
      }

      await sendSmsResponse(from, builderHelp, twilioClient);
      return;
    }

    // Check for ABOUT command - generate testimonials
    // Format: "about @alex I'm John, a web designer in LA"
    const aboutMatch = message.match(/^about\s+@(\w+)\s+(.+)$/i);

    if (aboutMatch) {
      console.log("🔍 Detected ABOUT command");

      const coach = aboutMatch[1].toLowerCase();
      const userBio = aboutMatch[2].trim();

      // Generate a slug from the phone number (remove +1 and use last 4 digits)
      const phoneSlug = from.replace(/^\+?1?/, "").slice(-4);
      const slug = `user-${phoneSlug}`;

      console.log(
        `Processing ABOUT command: coach=${coach}, slug=${slug}, bio=${userBio}`
      );

      try {
        const success = await handleAboutCommand(coach, slug, userBio, from);

        if (success) {
          await sendSmsResponse(
            from,
            `🔄 Creating your testimonial with ${coach}... You'll get a link in about 30 seconds!`,
            twilioClient
          );
          console.log(
            `ABOUT command queued for processing: ${coach} testimonial for ${from}`
          );
        } else {
          await sendSmsResponse(
            from,
            `❌ Sorry, there was an issue processing your request. Please try again later.`,
            twilioClient
          );
          console.log(`Failed to queue ABOUT command for ${from}`);
        }
      } catch (error) {
        console.error(`Error processing ABOUT command: ${error}`);
        await sendSmsResponse(
          from,
          `❌ Sorry, there was an issue processing your request. Please try again later.`,
          twilioClient
        );
      }
      return;
    }

    // Handle EDIT command - for degen users only
    if (message.match(/^EDIT(?:\s|$)/i)) {
      // Check if the command has the required arguments (number OR slug)
      if (!message.match(/^EDIT\s+.+\s+.+$/i)) {
        await sendSmsResponse(
          from,
          `❌ EDIT: Please specify a page number/slug and instructions.\n\nExample: EDIT 1 change the background to blue\nExample: EDIT emerald-eagle-flying make it purple\n\nUse INDEX to see your pages.`,
          twilioClient
        );
        return;
      }
      console.log(`Processing EDIT command from ${from}`);
      console.log(`Message content: "${message}"`);

      try {
        // Check user role for EDIT command
        const subscriber = await getSubscriber(normalizedPhoneNumber);
        console.log(`Subscriber data:`, JSON.stringify(subscriber, null, 2));

        if (!subscriber) {
          console.log(`❌ No subscriber found for ${normalizedPhoneNumber}`);
          return;
        }

        if (
          subscriber.role !== "degen" &&
          subscriber.role !== "operator" &&
          subscriber.role !== "admin"
        ) {
          console.log(
            `❌ User ${normalizedPhoneNumber} has role '${subscriber.role}', 'degen/operator/admin' required`
          );
          // Silent ignore - don't reveal command to non-degen users
          return;
        }

        console.log(
          `✅ User ${normalizedPhoneNumber} has 'degen' role, proceeding with EDIT command`
        );

        // Parse the command - support both number and slug
        const editMatch = message.match(/^EDIT\s+(.+?)\s+(.+)$/i);

        if (!editMatch || !editMatch[1] || !editMatch[2]) {
          console.error("Failed to parse EDIT command:", message);
          await sendSmsResponse(
            from,
            "❌ Invalid EDIT command format. Use: EDIT [page_number_or_slug] [instructions]",
            twilioClient
          );
          return;
        }

        const pageIdentifier = editMatch[1].trim();
        const instructions = editMatch[2].trim();

        const userSlug = subscriber.slug;
        if (!userSlug) {
          await sendSmsResponse(
            from,
            `❌ You need a slug first. Use WTAF command to create your first page.`,
            twilioClient
          );
          return;
        }

        // Convert index number to slug using EXACT same query as INDEX command
        let targetSlug = pageIdentifier;

        if (/^\d+$/.test(pageIdentifier)) {
          // It's a number - convert to slug using same logic as INDEX
          const indexNumber = parseInt(pageIdentifier);

          // Use IDENTICAL query to INDEX command
          const { data: userContent, error } = await supabase
            .from("wtaf_content")
            .select("app_slug, original_prompt, created_at, Forget")
            .eq("user_slug", userSlug)
            .order("created_at", { ascending: false });

          if (error) {
            console.error(
              `Error fetching user content:`,
              JSON.stringify(error, null, 2)
            );
            await sendSmsResponse(
              from,
              `❌ Failed to fetch your pages. Please try again later.`,
              twilioClient
            );
            return;
          }

          // Filter out forgotten pages in JavaScript (in case Forget column doesn't exist yet)
          const filteredContent =
            userContent?.filter((content) => !content.Forget) || [];

          if (!filteredContent || filteredContent.length === 0) {
            await sendSmsResponse(
              from,
              `❌ No pages available. Please try again later.`,
              twilioClient
            );
            return;
          }

          if (indexNumber < 1 || indexNumber > filteredContent.length) {
            await sendSmsResponse(
              from,
              `❌ Invalid index ${indexNumber}. You have ${filteredContent.length} pages. Use INDEX to see them.`,
              twilioClient
            );
            return;
          }

          // Convert to slug (1-based index to 0-based array)
          targetSlug = filteredContent[indexNumber - 1].app_slug;
          console.log(
            `🔢 EDIT ${indexNumber} -> converted to slug: ${targetSlug}`
          );
        }

        // Queue the edit request by writing to monitored directory (same pattern as WTAF)
        const { queueEditRequestBySlug } = await import("../degen_commands.js");
        const success = await queueEditRequestBySlug(
          userSlug,
          targetSlug,
          instructions,
          from
        );

        if (success) {
          await sendSmsResponse(
            from,
            `🎨 Processing your edit request... You'll get a link in about 30 seconds!`,
            twilioClient
          );
          console.log(
            `✅ EDIT command queued for processing: ${normalizedPhoneNumber}`
          );
        } else {
          await sendSmsResponse(
            from,
            `❌ Failed to queue your edit request. Page not found or invalid.`,
            twilioClient
          );
          console.log(
            `❌ Failed to queue EDIT command for ${normalizedPhoneNumber}`
          );
        }
      } catch (error) {
        console.error(`Error processing EDIT command: ${error}`);
        await sendSmsResponse(
          from,
          `❌ EDIT: Command failed. Please try again later.`,
          twilioClient
        );
      }
      return;
    }

    // 🪄 PARTY TRICK: Detect email address automatically - Magic email completion
    const emailRegex = /([^\s@]+@[^\s@]+\.[^\s@]+)/;
    const emailMatch = message.match(emailRegex);

    if (emailMatch) {
      const email = emailMatch[1].trim();
      console.log(`🪄 Auto-detected email address: ${email} from ${from}`);

      try {
        // Get subscriber info
        const subscriber = await getSubscriber(normalizedPhoneNumber);
        if (!subscriber || !subscriber.slug) {
          // User doesn't have WTAF pages, just continue with normal processing
          console.log(
            `User ${normalizedPhoneNumber} sent email but has no WTAF pages - continuing with normal flow`
          );
        } else {
          const userSlug = subscriber.slug;

          // Find the most recent page that needs an email (simplified detection)
          const { data: emailPages, error } = await supabase
            .from("wtaf_content")
            .select("app_slug, html_content, original_prompt, created_at")
            .eq("user_slug", userSlug)
            .is("email", null) // Email not already filled
            .ilike("html_content", "%[CONTACT_EMAIL]%") // Contains placeholders
            .order("created_at", { ascending: false })
            .limit(1);

          if (error) {
            console.error(`Error finding email-needed pages: ${error}`);
            // Continue with normal processing instead of showing error
          } else if (emailPages && emailPages.length > 0) {
            const page = emailPages[0];
            console.log(`🪄 Found email-needed page: ${page.app_slug}`);

            // Replace [CONTACT_EMAIL] placeholders with real email
            const updatedHtml = page.html_content.replace(
              /\[CONTACT_EMAIL\]/g,
              email
            );

            // Verify replacement actually happened
            if (updatedHtml !== page.html_content) {
              // Update the database with the new HTML and email
              const { error: updateError } = await supabase
                .from("wtaf_content")
                .update({
                  html_content: updatedHtml,
                  email: email,
                  updated_at: new Date().toISOString(),
                })
                .eq("user_slug", userSlug)
                .eq("app_slug", page.app_slug);

              if (!updateError) {
                // 🎉 MAGIC SUCCESS!
                await sendSmsResponse(from, `🪄✨`, twilioClient);

                console.log(
                  `🎉 PARTY TRICK SUCCESS: ${normalizedPhoneNumber} completed ${page.app_slug} with email ${email}`
                );
                return; // End processing here - magic complete!
              } else {
                console.error(`Error updating page with email: ${updateError}`);
                // Continue with normal processing instead of showing error
              }
            }
          }
        }
      } catch (error) {
        console.error(`Error in email auto-detection: ${error}`);
        // Continue with normal processing instead of showing error
      }
    }

    // Check for interactive commands
    const data = await loadInspirationsData();
    const interactiveMessage = data.find(
      (item: any) =>
        item.type === "interactive" &&
        item.trigger &&
        item.trigger.keyword === messageUpper
    );

    if (interactiveMessage) {
      console.log(`Processing interactive command: ${messageUpper}`);
      try {
        // Part 2: Show the response text in simple format
        let responseText = interactiveMessage.response.text;
        if (interactiveMessage.response.author) {
          responseText += `\n--${interactiveMessage.response.author}`;
        }

        await sendSmsResponse(from, responseText, twilioClient);
        console.log(
          `Successfully sent interactive response for ${messageUpper} to ${from}`
        );
      } catch (error) {
        console.error(`Error sending interactive response: ${error}`);
      }
      return;
    }

    // Check for admin commands with ID: SKIP [id] or MORE [id]
    const adminCommandMatch = message.match(/^(SKIP|MORE)\s+(\d+)$/i);
    if (adminCommandMatch) {
      const command = adminCommandMatch[1].toUpperCase();
      const itemId = parseInt(adminCommandMatch[2]);

      console.log(`Processing admin command: ${command} ${itemId}`);

      // Check if user is admin
      const subscriber = await getSubscriber(normalizedPhoneNumber);
      if (!subscriber || !subscriber.is_admin) {
        console.log(
          `User ${normalizedPhoneNumber} attempted admin command ${command} ${itemId} without privileges`
        );
        // Silent ignore - don't reveal admin features to non-admin users
        return;
      }

      if (command === "SKIP") {
        // SKIP [id] - Queue specific message for distribution
        const result = await queueSpecificMessage(itemId);

        if (result.success && result.message) {
          const messageText = formatDailyMessage(result.message);
          await sendSmsResponse(
            from,
            `✅ ADMIN: Queued item ${itemId} for next distribution:\n\n${messageText}`,
            twilioClient
          );
          console.log(
            `Admin ${normalizedPhoneNumber} queued item ${itemId} for distribution`
          );
        } else {
          await sendSmsResponse(
            from,
            `❌ ADMIN: Item ${itemId} not found. Use COMMANDS to see available options.`,
            twilioClient
          );
          console.log(
            `Admin ${normalizedPhoneNumber} attempted to queue non-existent item ${itemId}`
          );
        }
      } else if (command === "MORE") {
        // MORE [id] - Preview specific message (no distribution impact)
        const targetMessage = await findMessageById(itemId);

        if (targetMessage) {
          let previewText = "";

          if (targetMessage.type === "interactive") {
            // For interactive messages, only show Part 1 (daily message)
            const dailyFormat = formatDailyMessage(targetMessage);
            previewText = `📋 ADMIN PREVIEW: Item ${itemId} (Interactive)\n\n${dailyFormat}`;
          } else {
            // For regular messages, use normal formatting
            const messageText = formatDailyMessage(targetMessage);
            previewText = `📋 ADMIN PREVIEW: Item ${itemId}:\n\n${messageText}`;
          }

          await sendSmsResponse(from, previewText, twilioClient);
          console.log(`Admin ${from} previewed item ${itemId}`);
        } else {
          await sendSmsResponse(
            from,
            `❌ ADMIN: Item ${itemId} not found. Use COMMANDS to see available options.`,
            twilioClient
          );
          console.log(
            `Admin ${from} attempted to preview non-existent item ${itemId}`
          );
        }
      }

      return;
    }

    // Check for ADD command - add new content to database
    if (message.match(/^ADD\s+\{/i)) {
      console.log(`Processing ADD command from ${from}`);

      // Check if user is admin
      const subscriber = await getSubscriber(normalizedPhoneNumber);
      if (!subscriber || !subscriber.is_admin) {
        console.log(
          `User ${normalizedPhoneNumber} attempted ADD command without admin privileges`
        );
        // Silent ignore - don't reveal admin features to non-admin users
        return;
      }

      try {
        // Extract JSON from message
        const jsonString = message.substring(4).trim(); // Remove "ADD " prefix
        const jsonData = JSON.parse(jsonString);

        // Validate JSON structure
        const validation = validateAddJson(jsonData);
        if (!validation.valid) {
          await sendSmsResponse(
            from,
            `❌ ADD FAILED: ${validation.error}`,
            twilioClient
          );
          return;
        }

        // Add to Supabase
        const result = await addItemToSupabase(jsonData);
        if (!result.success) {
          await sendSmsResponse(
            from,
            `❌ ADD FAILED: ${result.error}`,
            twilioClient
          );
          return;
        }

        // Create message object with new item ID for preview
        const previewMessage = { ...jsonData, item: result.itemId };
        const formattedPreview = formatDailyMessage(previewMessage);

        // Store pending broadcast state
        pendingBroadcasts.set(from, {
          itemId: result.itemId!,
          messageData: previewMessage,
          timestamp: new Date(),
        });

        // Send preview with broadcast options
        await sendSmsResponse(
          from,
          `✅ Item ${result.itemId} added to database:\n\n${formattedPreview}\n\nSend to ALL subscribers NOW?\nReply SEND to broadcast or SAVE to keep for later.`,
          twilioClient
        );

        console.log(
          `Admin ${normalizedPhoneNumber} added item ${result.itemId}, awaiting broadcast decision`
        );
      } catch (error) {
        console.error(`Error processing ADD command: ${error}`);
        await sendSmsResponse(
          from,
          `❌ ADD FAILED: Invalid JSON format`,
          twilioClient
        );
      }

      return;
    }

    // Check for SEND/SAVE responses to ADD command
    if (
      (messageUpper === "SEND" || messageUpper === "SAVE") &&
      pendingBroadcasts.has(from)
    ) {
      console.log(
        `Processing ${messageUpper} response for pending broadcast from ${from}`
      );

      const pendingBroadcast = pendingBroadcasts.get(from)!;
      pendingBroadcasts.delete(from); // Clear pending state

      if (messageUpper === "SEND") {
        try {
          // Get all active subscribers
          const subscribers = await getActiveSubscribers();
          const formattedMessage = formatDailyMessage(
            pendingBroadcast.messageData
          );

          // Send to all subscribers
          let successCount = 0;
          let failCount = 0;

          for (const subscriber of subscribers) {
            try {
              await sendSmsResponse(
                subscriber.phone_number,
                formattedMessage,
                twilioClient
              );
              successCount++;
            } catch (error) {
              console.error(
                `Failed to send to ${subscriber.phone_number}:`,
                error
              );
              failCount++;
            }
          }

          await sendSmsResponse(
            from,
            `📤 BROADCAST COMPLETE: Item ${
              pendingBroadcast.itemId
            } sent to ${successCount} subscribers${
              failCount > 0 ? ` (${failCount} failed)` : ""
            }.`,
            twilioClient
          );

          console.log(
            `Broadcast complete: ${successCount} sent, ${failCount} failed`
          );
        } catch (error) {
          console.error(`Error broadcasting message: ${error}`);
          await sendSmsResponse(
            from,
            `❌ BROADCAST FAILED: ${
              error instanceof Error ? error.message : "Unknown error"
            }`,
            twilioClient
          );
        }
      } else {
        // SAVE - just confirm
        await sendSmsResponse(
          from,
          `📋 Item ${pendingBroadcast.itemId} saved for later. Available in daily rotation.`,
          twilioClient
        );
        console.log(
          `Admin ${normalizedPhoneNumber} chose to save item ${pendingBroadcast.itemId} for later`
        );
      }

      return;
    }

    // Check for CODE command - save admin code snippets to file
    if (message.match(/^CODE[\s:]/i)) {
      console.log(`Processing CODE command from ${from}`);

      // Check if user is admin
      const subscriber = await getSubscriber(normalizedPhoneNumber);
      if (!subscriber || !subscriber.is_admin) {
        console.log(
          `User ${normalizedPhoneNumber} attempted CODE command without admin privileges`
        );
        // Silent ignore - don't reveal admin features to non-admin users
        return;
      }

      try {
        // Extract the code content after "CODE " or "CODE:"
        const codePrefix = message.match(/^CODE[\s:]+/i)?.[0] || "CODE ";
        const codeContent = message.substring(codePrefix.length).trim();

        if (!codeContent) {
          await sendSmsResponse(
            from,
            `❌ CODE: Please provide content after CODE command. Example: CODE function hello() { return 'world'; }`,
            twilioClient
          );
          return;
        }

        // Create filename with timestamp
        const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
        const filename = `code-snippet-${timestamp}.txt`;
        const filePath = path.join(process.cwd(), "data", "code", filename);

        // Ensure data/code directory exists
        const codeDir = path.join(process.cwd(), "data", "code");
        if (!fs.existsSync(codeDir)) {
          fs.mkdirSync(codeDir, { recursive: true });
        }

        // Save code content to file with sender's phone number
        const fileContent = `SENDER:${from}\n${codeContent}`;
        fs.writeFileSync(filePath, fileContent, "utf8");

        await sendSmsResponse(
          from,
          `✅ CODE: Saved ${codeContent.length} characters to data/code/${filename}`,
          twilioClient
        );

        console.log(
          `Admin ${normalizedPhoneNumber} saved code snippet to data/code/${filename}: ${codeContent.substring(
            0,
            100
          )}${codeContent.length > 100 ? "..." : ""}`
        );
      } catch (error) {
        console.error(`Error processing CODE command: ${error}`);
        await sendSmsResponse(
          from,
          `❌ CODE: Failed to save code snippet - ${
            error instanceof Error ? error.message : "Unknown error"
          }`,
          twilioClient
        );
      }

      return;
    }

    // Handle INDEX command - list user's pages and set index
    if (message.match(/^INDEX(?:\s|$)/i)) {
      console.log(`Processing INDEX command from ${from}`);

      try {
        // Environment-aware domain configuration (same as monitor.py)
        const WEB_APP_URL = process.env.WEB_APP_URL || "https://theaf.us";
        const WTAF_DOMAIN =
          WEB_APP_URL.includes("localhost") || WEB_APP_URL.includes("ngrok")
            ? WEB_APP_URL
            : process.env.WTAF_DOMAIN || "https://www.wtaf.me";

        // Check user role for INDEX command
        const subscriber = await getSubscriber(normalizedPhoneNumber);
        if (
          !subscriber ||
          (subscriber.role !== "coder" &&
            subscriber.role !== "degen" &&
            subscriber.role !== "operator" &&
            subscriber.role !== "admin")
        ) {
          console.log(
            `User ${normalizedPhoneNumber} attempted INDEX command without coder/degen/operator/admin privileges`
          );
          // Silent ignore - don't reveal command to non-coder/degen users
          return;
        }

        const userSlug = subscriber.slug;
        if (!userSlug) {
          await sendSmsResponse(
            from,
            `❌ You need a slug first. Use WTAF command to create your first page.`,
            twilioClient
          );
          return;
        }

        // Get all user's WTAF content (excluding forgotten pages)
        const { data: userContent, error } = await supabase
          .from("wtaf_content")
          .select("app_slug, original_prompt, created_at, Fave, Forget")
          .eq("user_slug", userSlug)
          .order("created_at", { ascending: false });

        if (error) {
          console.error(
            `Error fetching user content:`,
            JSON.stringify(error, null, 2)
          );
          await sendSmsResponse(
            from,
            `❌ Failed to fetch your pages. Please try again later.`,
            twilioClient
          );
          return;
        }

        // Filter out forgotten pages in JavaScript (in case Forget column doesn't exist yet)
        const filteredContent =
          userContent?.filter((content) => !content.Forget) || [];

        if (!filteredContent || filteredContent.length === 0) {
          await sendSmsResponse(
            from,
            `📄 You don't have any pages yet. Use WTAF command to create your first page!`,
            twilioClient
          );
          return;
        }

        // Check if this is setting index to creations page
        const creationsMatch = message.match(/^INDEX\s+CREATIONS$/i);
        if (creationsMatch) {
          console.log(
            `Setting index to creations page for user ${from} (${userSlug})`
          );

          // Set index_file to 'creations' to indicate creations page
          const { error: updateError } = await supabase
            .from("sms_subscribers")
            .update({ index_file: "creations" })
            .eq("phone_number", from);

          if (updateError) {
            console.error(
              `Error updating index file to creations:`,
              updateError
            );
            await sendSmsResponse(
              from,
              `❌ Failed to set index page. Please try again later.`,
              twilioClient
            );
            return;
          }

          await sendSmsResponse(
            from,
            `✅ Index page set to creations!\n\nYour main URL ${WTAF_DOMAIN.replace(
              /^https?:\/\//,
              ""
            )}/${userSlug}/ now shows your creations page.`,
            twilioClient
          );

          console.log(`User ${from} (${userSlug}) set index to creations page`);
          return;
        }

        // Check if this is a numeric response to set index
        const numMatch = message.match(/^INDEX\s+(\d+)$/i);
        if (numMatch) {
          const selectedIndex = parseInt(numMatch[1]) - 1; // Convert to 0-based index

          if (selectedIndex < 0 || selectedIndex >= filteredContent.length) {
            await sendSmsResponse(
              from,
              `❌ Invalid selection. Please choose a number between 1 and ${filteredContent.length}.`,
              twilioClient
            );
            return;
          }

          const selectedPage = filteredContent[selectedIndex];
          const indexFileName = `${selectedPage.app_slug}.html`;

          console.log(
            `Setting index for user ${from} (${userSlug}): ${indexFileName}`
          );
          console.log(`Selected page:`, selectedPage);

          // Update user's index_file in database
          const { error: updateError } = await supabase
            .from("sms_subscribers")
            .update({ index_file: indexFileName })
            .eq("phone_number", from);

          if (updateError) {
            console.error(`Error updating index file:`, updateError);
            await sendSmsResponse(
              from,
              `❌ Failed to set index page. Please try again later.`,
              twilioClient
            );
            return;
          }

          await sendSmsResponse(
            from,
            `✅ Index page set to "${
              selectedPage.app_slug
            }"!\n\nYour main URL ${WTAF_DOMAIN.replace(
              /^https?:\/\//,
              ""
            )}/${userSlug}/ now shows this page.`,
            twilioClient
          );

          console.log(
            `User ${from} (${userSlug}) set index to: ${indexFileName}`
          );
          return;
        }

        // Show URLs instead of prompts - more useful and compact
        const PAGES_PER_MESSAGE = 15; // Can show more URLs since they're shorter
        const totalPages = filteredContent.length;
        const totalMessagePages = Math.ceil(totalPages / PAGES_PER_MESSAGE);

        // Check if user specified a page number (INDEX PAGE 2)
        const pageMatch = message.match(/^INDEX\s+PAGE\s+(\d+)$/i);
        const requestedPage = pageMatch ? parseInt(pageMatch[1]) : 1;

        if (requestedPage < 1 || requestedPage > totalMessagePages) {
          await sendSmsResponse(
            from,
            `❌ Invalid page. Available pages: 1-${totalMessagePages}`,
            twilioClient
          );
          return;
        }

        // Calculate which pages to show
        const startIndex = (requestedPage - 1) * PAGES_PER_MESSAGE;
        const endIndex = Math.min(startIndex + PAGES_PER_MESSAGE, totalPages);
        const pagesToShow = filteredContent.slice(startIndex, endIndex);

        // Build the message with URLs, showing favorites first
        let pageList = `📄 Your pages (${totalPages} total) - Page ${requestedPage}/${totalMessagePages}:\n\n`;

        // Show favorites first if any exist
        const favorites = filteredContent.filter(
          (content) => content.Fave === true
        );
        if (favorites.length > 0) {
          pageList += `⭐ FAVORITES:\n`;
          favorites.forEach((content) => {
            const pageIndex = filteredContent.indexOf(content) + 1;
            const pageUrl = `${WTAF_DOMAIN.replace(
              /^https?:\/\//,
              ""
            )}/${userSlug}/${content.app_slug}`;
            pageList += `${pageIndex}. ${pageUrl}\n`;
          });
          pageList += `\n`; // Add spacing between favorites and regular list
        }

        // Show regular page list
        if (favorites.length > 0) {
          pageList += `📄 ALL PAGES:\n`;
        }

        pagesToShow.forEach((content, index) => {
          const actualIndex = startIndex + index + 1;
          const pageUrl = `${WTAF_DOMAIN.replace(
            /^https?:\/\//,
            ""
          )}/${userSlug}/${content.app_slug}`;
          const isFavorite = content.Fave === true;
          const emoji = isFavorite ? "⭐" : "📄";
          pageList += `${emoji} ${actualIndex}. ${pageUrl}\n`;
        });

        const domainForDisplay = WTAF_DOMAIN.replace(/^https?:\/\//, "");
        const currentIndex = subscriber.index_file
          ? `\n🏠 Current index: ${domainForDisplay}/${userSlug}/\n   (shows: ${
              subscriber.index_file === "creations"
                ? "creations page"
                : subscriber.index_file.replace(".html", "")
            })\n\n`
          : `\n🏠 No index page set\n   (${domainForDisplay}/${userSlug}/ shows default)\n\n`;

        pageList += currentIndex;

        // Add navigation instructions
        if (totalMessagePages > 1) {
          pageList += `📖 Navigation:\n`;
          if (requestedPage < totalMessagePages) {
            pageList += `• INDEX PAGE ${requestedPage + 1} (next)\n`;
          }
          if (requestedPage > 1) {
            pageList += `• INDEX PAGE ${requestedPage - 1} (prev)\n`;
          }
          pageList += `\n`;
        }

        pageList += `To set index: INDEX [number] or INDEX CREATIONS`;

        await sendChunkedSmsResponse(from, pageList, twilioClient);
        console.log(
          `Listed ${filteredContent.length} pages for user ${from} (${userSlug})`
        );
        return;
      } catch (error) {
        console.error(`Error processing INDEX command: ${error}`);
        await sendSmsResponse(
          from,
          `❌ INDEX: Failed to process command - ${
            error instanceof Error ? error.message : "Unknown error"
          }`,
          twilioClient
        );
        return;
      }
    }

    // Handle FAVE command - mark a page as favorite
    if (message.match(/^FAVE\s+\d+$/i)) {
      console.log(`Processing FAVE command from ${from}`);

      try {
        // Check user role for FAVE command (same as INDEX)
        const subscriber = await getSubscriber(normalizedPhoneNumber);
        if (
          !subscriber ||
          (subscriber.role !== "coder" &&
            subscriber.role !== "degen" &&
            subscriber.role !== "operator" &&
            subscriber.role !== "admin")
        ) {
          console.log(
            `User ${normalizedPhoneNumber} attempted FAVE command without coder/degen/operator/admin privileges`
          );
          // Silent ignore - don't reveal command to non-coder/degen users
          return;
        }

        const userSlug = subscriber.slug;
        if (!userSlug) {
          await sendSmsResponse(
            from,
            `❌ You need a slug first. Use WTAF command to create your first page.`,
            twilioClient
          );
          return;
        }

        // Parse the page number
        const faveMatch = message.match(/^FAVE\s+(\d+)$/i);
        if (!faveMatch) {
          await sendSmsResponse(
            from,
            `❌ FAVE: Please specify a page number. Example: FAVE 1\n\nUse INDEX to see your pages.`,
            twilioClient
          );
          return;
        }

        const pageNumber = parseInt(faveMatch[1]);

        // Get user's pages using IDENTICAL query to INDEX command
        const { data: userContent, error } = await supabase
          .from("wtaf_content")
          .select("app_slug, original_prompt, created_at, Fave, Forget")
          .eq("user_slug", userSlug)
          .order("created_at", { ascending: false });

        if (error) {
          console.error(
            `Error fetching user content:`,
            JSON.stringify(error, null, 2)
          );
          await sendSmsResponse(
            from,
            `❌ Failed to fetch your pages. Please try again later.`,
            twilioClient
          );
          return;
        }

        // Filter out forgotten pages in JavaScript (in case Forget column doesn't exist yet)
        const filteredContent =
          userContent?.filter((content) => !content.Forget) || [];

        if (!filteredContent || filteredContent.length === 0) {
          await sendSmsResponse(
            from,
            `📄 You don't have any pages yet. Use WTAF command to create your first page!`,
            twilioClient
          );
          return;
        }

        // Validate page number
        if (pageNumber < 1 || pageNumber > filteredContent.length) {
          await sendSmsResponse(
            from,
            `❌ Invalid page number. You have ${filteredContent.length} pages. Use INDEX to see them.`,
            twilioClient
          );
          return;
        }

        // Convert to 0-based index and get the page
        const selectedPage = filteredContent[pageNumber - 1];
        const currentFaveStatus = selectedPage.Fave || false;
        const newFaveStatus = !currentFaveStatus; // Toggle the fave status

        // Update the Fave column in database
        const { error: updateError } = await supabase
          .from("wtaf_content")
          .update({ Fave: newFaveStatus })
          .eq("user_slug", userSlug)
          .eq("app_slug", selectedPage.app_slug);

        if (updateError) {
          console.error(`Error updating fave status: ${updateError}`);
          await sendSmsResponse(
            from,
            `❌ Failed to update favorite status. Please try again later.`,
            twilioClient
          );
          return;
        }

        // Send confirmation message
        const statusEmoji = newFaveStatus ? "⭐" : "📄";
        const statusText = newFaveStatus
          ? "added to favorites"
          : "removed from favorites";

        await sendSmsResponse(
          from,
          `${statusEmoji} Page ${pageNumber} (${selectedPage.app_slug}) ${statusText}!`,
          twilioClient
        );

        console.log(
          `User ${normalizedPhoneNumber} (${userSlug}) set fave=${newFaveStatus} for page: ${selectedPage.app_slug}`
        );
        return;
      } catch (error) {
        console.error(`Error processing FAVE command: ${error}`);
        await sendSmsResponse(
          from,
          `❌ FAVE: Failed to process command - ${
            error instanceof Error ? error.message : "Unknown error"
          }`,
          twilioClient
        );
        return;
      }
    }

    // Handle FORGET command - soft delete a page (supports both numbers and slugs)
    if (message.match(/^FORGET\s+.+$/i)) {
      console.log(`Processing FORGET command from ${from}`);

      try {
        // Get subscriber info - ANY user can forget their own pages
        const subscriber = await getSubscriber(normalizedPhoneNumber);
        if (!subscriber) {
          console.log(
            `User ${normalizedPhoneNumber} attempted FORGET command but not subscribed`
          );
          return;
        }

        const userSlug = subscriber.slug;
        const isAdmin = subscriber.is_admin || false;

        // Parse the command - support both numbers and slugs
        const forgetMatch = message.match(/^FORGET\s+(.+)$/i);
        if (!forgetMatch) {
          await sendSmsResponse(
            from,
            `❌ FORGET: Please specify a page number or slug.\n\nExamples:\n• FORGET 1 (your page #1)\n• FORGET emerald-eagle-flying (any app slug)${
              isAdmin ? "\n• Admins can forget ANY page by slug" : ""
            }\n\nUse INDEX to see your pages.`,
            twilioClient
          );
          return;
        }

        const identifier = forgetMatch[1].trim();
        const isNumber = /^\d+$/.test(identifier);

        // For number input, user must have their own pages
        if (isNumber && !userSlug) {
          await sendSmsResponse(
            from,
            `❌ You need a slug first. Use WTAF command to create your first page.`,
            twilioClient
          );
          return;
        }

        let selectedPage;
        let targetUserSlug;

        if (isNumber) {
          // Handle number input - user's own pages only
          const pageNumber = parseInt(identifier);

          const { data: userContent, error } = await supabase
            .from("wtaf_content")
            .select("app_slug, original_prompt, created_at, Forget")
            .eq("user_slug", userSlug)
            .order("created_at", { ascending: false });

          if (error) {
            console.error(
              `Error fetching user content:`,
              JSON.stringify(error, null, 2)
            );
            await sendSmsResponse(
              from,
              `❌ Failed to fetch your pages. Please try again later.`,
              twilioClient
            );
            return;
          }

          // Filter out forgotten pages in JavaScript
          const filteredContent =
            userContent?.filter((content) => !content.Forget) || [];

          if (!filteredContent || filteredContent.length === 0) {
            await sendSmsResponse(
              from,
              `📄 You don't have any pages to forget. Use WTAF command to create your first page!`,
              twilioClient
            );
            return;
          }

          // Validate page number
          if (pageNumber < 1 || pageNumber > filteredContent.length) {
            await sendSmsResponse(
              from,
              `❌ Invalid page number. You have ${filteredContent.length} visible pages. Use INDEX to see them.`,
              twilioClient
            );
            return;
          }

          // Convert to 0-based index and get the page
          selectedPage = filteredContent[pageNumber - 1];
          targetUserSlug = userSlug;
        } else {
          // Handle slug input - check ownership unless admin
          const { data: appContent, error } = await supabase
            .from("wtaf_content")
            .select("user_slug, app_slug, original_prompt, created_at, Forget")
            .eq("app_slug", identifier)
            .single();

          if (error || !appContent) {
            await sendSmsResponse(
              from,
              `❌ App '${identifier}' not found.`,
              twilioClient
            );
            return;
          }

          // Check ownership unless admin
          if (!isAdmin && appContent.user_slug !== userSlug) {
            await sendSmsResponse(
              from,
              `❌ You can only forget your own pages. '${identifier}' belongs to ${appContent.user_slug}.`,
              twilioClient
            );
            return;
          }

          selectedPage = appContent;
          targetUserSlug = appContent.user_slug;
        }

        // Check if already forgotten
        if (selectedPage.Forget) {
          await sendSmsResponse(
            from,
            `❌ App '${selectedPage.app_slug}' is already forgotten.`,
            twilioClient
          );
          return;
        }

        // Soft delete: Set Forget = true in database
        const { error: updateError } = await supabase
          .from("wtaf_content")
          .update({ Forget: true })
          .eq("user_slug", targetUserSlug)
          .eq("app_slug", selectedPage.app_slug);

        if (updateError) {
          console.error(`Error updating forget status: ${updateError}`);
          await sendSmsResponse(
            from,
            `❌ Failed to forget page. Please try again later.`,
            twilioClient
          );
          return;
        }

        // Send confirmation message
        const ownerText =
          targetUserSlug === userSlug ? "your" : `${targetUserSlug}'s`;
        await sendSmsResponse(
          from,
          `🗑️ App '${selectedPage.app_slug}' (${ownerText} page) forgotten!${
            isAdmin && targetUserSlug !== userSlug
              ? `\n\n⚠️ Admin action: You forgot ${targetUserSlug}'s page.`
              : ""
          }\n\nNote: The URL still works but won't appear in trending/index.`,
          twilioClient
        );

        console.log(
          `User ${normalizedPhoneNumber} (${userSlug}) forgot ${targetUserSlug}'s page: ${
            selectedPage.app_slug
          }${isAdmin && targetUserSlug !== userSlug ? " [ADMIN ACTION]" : ""}`
        );
        return;
      } catch (error) {
        console.error(`Error processing FORGET command: ${error}`);
        await sendSmsResponse(
          from,
          `❌ FORGET: Failed to process command - ${
            error instanceof Error ? error.message : "Unknown error"
          }`,
          twilioClient
        );
        return;
      }
    }

    // Handle SLUG command - change user's custom URL slug
    if (message.match(/^SLUG\s+(.+)$/i)) {
      console.log(`Processing SLUG command from ${from}`);

      try {
        // Environment-aware domain configuration (same as monitor.py)
        const WEB_APP_URL = process.env.WEB_APP_URL || "https://theaf.us";
        const WTAF_DOMAIN =
          WEB_APP_URL.includes("localhost") || WEB_APP_URL.includes("ngrok")
            ? WEB_APP_URL
            : process.env.WTAF_DOMAIN || "https://www.wtaf.me";

        // Check user role for SLUG command
        const subscriber = await getSubscriber(from);
        if (
          !subscriber ||
          (subscriber.role !== "coder" &&
            subscriber.role !== "degen" &&
            subscriber.role !== "operator" &&
            subscriber.role !== "admin")
        ) {
          console.log(
            `User ${from} attempted SLUG command without coder/degen/operator/admin privileges`
          );
          // Silent ignore - don't reveal command to non-coder/degen users
          return;
        }

        // Extract the requested new slug
        const slugMatch = message.match(/^SLUG\s+(.+)$/i);
        if (!slugMatch) {
          await sendSmsResponse(
            from,
            `❌ SLUG: Please provide a new slug name. Example: SLUG mynewname`,
            twilioClient
          );
          return;
        }

        const requestedSlug = slugMatch[1]
          .trim()
          .toLowerCase()
          .replace(/[^a-z0-9-]/g, "");

        if (!requestedSlug) {
          await sendSmsResponse(
            from,
            `❌ SLUG: Invalid slug name. Use only letters, numbers, and hyphens.`,
            twilioClient
          );
          return;
        }

        // Check if requested slug is already in use
        const { data: existingUser, error: checkError } = await supabase
          .from("sms_subscribers")
          .select("phone_number")
          .eq("slug", requestedSlug)
          .single();

        if (checkError && checkError.code !== "PGRST116") {
          console.error(`Error checking slug availability:`, checkError);
          await sendSmsResponse(
            from,
            `❌ SLUG: Failed to check slug availability. Please try again later.`,
            twilioClient
          );
          return;
        }

        if (existingUser) {
          await sendSmsResponse(
            from,
            `❌ SLUG: "${requestedSlug}" is already taken. Please choose a different slug.`,
            twilioClient
          );
          return;
        }

        const oldSlug = subscriber.slug;

        // Update user's slug in sms_subscribers table
        const { error: updateUserError } = await supabase
          .from("sms_subscribers")
          .update({ slug: requestedSlug })
          .eq("phone_number", from);

        if (updateUserError) {
          console.error(`Error updating user slug:`, updateUserError);
          await sendSmsResponse(
            from,
            `❌ SLUG: Failed to update your slug. Please try again later.`,
            twilioClient
          );
          return;
        }

        // Update all existing WTAF content to use new user_slug
        if (oldSlug) {
          const { error: updateContentError } = await supabase
            .from("wtaf_content")
            .update({ user_slug: requestedSlug })
            .eq("user_slug", oldSlug);

          if (updateContentError) {
            console.error(`Error updating content slugs:`, updateContentError);
            // Continue anyway - at least the user slug is updated
          } else {
            console.log(
              `Updated all wtaf_content records from ${oldSlug} to ${requestedSlug}`
            );
          }
        }

        await sendSmsResponse(
          from,
          `✅ SLUG: Your custom URL is now "${requestedSlug}"!\n\nYour pages are now at: ${WTAF_DOMAIN.replace(
            /^https?:\/\//,
            ""
          )}/${requestedSlug}/\n\nAll existing pages have been moved to the new URL.`,
          twilioClient
        );

        console.log(
          `User ${normalizedPhoneNumber} changed slug from "${oldSlug}" to "${requestedSlug}"`
        );
        return;
      } catch (error) {
        console.error(`Error processing SLUG command: ${error}`);
        await sendSmsResponse(
          from,
          `❌ SLUG: Failed to process command - ${
            error instanceof Error ? error.message : "Unknown error"
          }`,
          twilioClient
        );
        return;
      }
    }

    // Handle Leo easter egg first (hey leo, hi leo)
    const heyLeoMatch = message.match(/^(hey|hi|hello)\s+(leo)/i);
    if (heyLeoMatch) {
      console.log("🥚 Leo easter egg detected!");
      const userMessage = message.slice(heyLeoMatch[0].length).trim() || "Hi";

      const handled = await handleLeoConversation(
        userMessage,
        twilioClient,
        from
      );
      if (handled) {
        updateActiveConversation(from, "Leo Varin");
        return;
      }
    }

    // Check for new coach conversation
    const heyCoachMatch = message.match(/^(hey|hi|hello)\s+(\w+)/i);
    if (heyCoachMatch) {
      console.log("Message match:", heyCoachMatch);
      const coachName = heyCoachMatch[2];
      const userMessage = message.slice(heyCoachMatch[0].length).trim() || "Hi";

      const handled = await handleExplicitCoachConversation(
        coachName,
        userMessage,
        twilioClient,
        from
      );
      if (handled) {
        updateActiveConversation(from, coachName);
        return;
      }
    }

    // Check for active conversation
    const activeConversation = getActiveConversation(from);
    if (activeConversation) {
      console.log(
        `Continuing conversation with ${activeConversation.coachName}`
      );

      // Check if active conversation is with Leo
      if (activeConversation.coachName === "Leo Varin") {
        console.log("🥚 Continuing Leo conversation");
        const handled = await handleLeoConversation(
          message,
          twilioClient,
          from
        );
        if (handled) {
          updateActiveConversation(from, activeConversation.coachName);
          return;
        }
      } else {
        // Regular coach conversation
        const handled = await handleExplicitCoachConversation(
          activeConversation.coachName,
          message,
          twilioClient,
          from
        );
        if (handled) {
          updateActiveConversation(from, activeConversation.coachName);
          return;
        }
      }
    }

    // If we get here, either no active conversation or failed to handle
    // Continue with other command processing...

    // Update last message date in database
    console.log("Updating last message date...");
    await updateLastMessageDate(normalizedPhoneNumber);
    console.log("Last message date updated successfully");

    // Handle TEST command - simple test command
    if (messageUpper === "TEST") {
      console.log(`Sending TEST response to ${from}`);
      try {
        await sendSmsResponse(from, "Hello world! 🌍", twilioClient);
        console.log(`Successfully sent TEST response to ${from}`);
      } catch (error) {
        console.error(`Error sending TEST response: ${error}`);
      }
      return;
    }

    // Handle TODAY command - send today's scheduled inspiration
    if (messageUpper === "TODAY") {
      console.log(`Sending TODAY response to ${from}`);
      try {
        const todaysData = await getTodaysInspiration();
        const responseText = formatDailyMessage(todaysData.inspiration);

        await sendSmsResponse(from, responseText, twilioClient);
        console.log(
          `Successfully sent TODAY response to ${from}: Day ${todaysData.day}`
        );
      } catch (error) {
        console.error(`Error sending TODAY response: ${error}`);
      }
      return;
    }

    // Handle MORE command - send an extra line of chaos
    if (messageUpper === "MORE") {
      console.log(`Sending MORE response to ${from}`);
      try {
        // Use the actual messages data with weekend filtering
        const data = await loadInspirationsData();

        // Check weekend mode for MORE command
        const weekendOverride = process.env.WEEKEND_MODE_SMS_OVERRIDE;
        let isWeekendMode = false;

        if (weekendOverride === "ON") {
          isWeekendMode = true;
        } else if (weekendOverride === "OFF") {
          isWeekendMode = false;
        } else {
          const pacificTime = new Intl.DateTimeFormat("en-US", {
            timeZone: "America/Los_Angeles",
            weekday: "short",
          }).format(new Date());
          isWeekendMode = ["Sat", "Sun"].includes(pacificTime);
        }

        let availableMessages;
        if (isWeekendMode) {
          // Weekend mode: ONLY use type: weekend
          availableMessages = data.filter(
            (item: any) => item.type === "weekend"
          );
        } else {
          // Weekday mode: use everything EXCEPT type: weekend
          availableMessages = data.filter(
            (item: any) => item.type !== "weekend"
          );
        }
        const randomIndex = Math.floor(
          Math.random() * availableMessages.length
        );
        const chaosLine = availableMessages[randomIndex];

        // Use daily message formatting for MORE command to get proper formatting (weekend, disruption, etc.)
        const responseText = formatDailyMessage(chaosLine);

        await sendSmsResponse(from, responseText, twilioClient);

        // Update last_message_date but NOT last_inspiration_date
        // This ensures the MORE command doesn't prevent daily inspirations
        await updateLastMessageDate(normalizedPhoneNumber);

        console.log(
          `Successfully sent MORE response to ${normalizedPhoneNumber}: "${chaosLine.text}"`
        );
      } catch (error) {
        console.error(`Error sending MORE response: ${error}`);
      }
      return;
    }

    // Handle SKIP command for admin users (QA feature)
    if (messageUpper === "SKIP") {
      console.log("Processing SKIP command...");

      // Check if the user has admin privileges
      const subscriber = await getSubscriber(normalizedPhoneNumber);

      if (subscriber && subscriber.is_admin) {
        // User has admin privileges, process the skip command
        const newInspiration = await skipToNextInspiration();
        const messageText = formatDailyMessage(newInspiration.inspiration);

        await sendSmsResponse(
          from,
          `✅ Skipped to next inspiration (Day ${newInspiration.day}):\n\n${messageText}`,
          twilioClient
        );

        console.log(
          `User ${normalizedPhoneNumber} with admin privileges skipped to day ${newInspiration.day}`
        );
      } else {
        // User doesn't have admin privileges, ignore the command
        console.log(
          `User ${normalizedPhoneNumber} attempted to use SKIP command without admin privileges`
        );
        // Send no response to avoid revealing the feature to non-admin users
      }

      return;
    }

    // COMMENTED OUT: Check for active conversation first, before deciding to use a random coach
    /*
    const existingConversation = getActiveConversation(from);
    if (existingConversation && existingConversation.coachName) {
      console.log(`🔄 Continuing existing conversation with ${existingConversation.coachName}`);
      
      // Continue the existing conversation with the same coach
      if (existingConversation.coachName === 'Leo Varin') {
        const handled = await handleLeoConversation(message, twilioClient, from);
        if (handled) {
          updateActiveConversation(from, existingConversation.coachName);
          return;
        }
      } else {
        // For other coaches
        const coachProfile = coachData.ceos.find((c: CEO) => c.name === existingConversation.coachName);
        if (coachProfile) {
          const handled = await handleCoachConversation(message, twilioClient, from, coachProfile, false); // No need to identify again
          if (handled) {
            updateActiveConversation(from, existingConversation.coachName);
            return;
          }
        }
      }
    }
    */

    // COMMENTED OUT: No active conversation - use sophisticated coach selection logic (40% Leo, 60% other coaches)
    /*
    console.log('🎲 Using sophisticated coach selection for default response...');
    const handled = await handleDefaultConversation(message, twilioClient, from);
    if (handled) {
      // Note: The random coach and active conversation are set inside handleDefaultConversation
      console.log('🎲 Default coach handled the message');
    } else {
      // Fallback if all coach handlers fail
      await sendSmsResponse(
        from,
        'For help with AdvisorsFoundry, text INFO. Available commands: START, STOP, YES to confirm.',
        twilioClient
      );
      console.log('Fallback response sent (all coach handlers failed)');
    }
    */

    // Handle HIDE-DEFAULT command - toggle default hiding behavior
    if (message.match(/^HIDE-DEFAULT\s+(ON|OFF)$/i)) {
      console.log(`Processing HIDE-DEFAULT command from ${from}`);

      try {
        const hideDefaultMatch = message.match(/^HIDE-DEFAULT\s+(ON|OFF)$/i);
        if (!hideDefaultMatch) {
          await sendSmsResponse(
            from,
            `❌ HIDE-DEFAULT: Use ON or OFF.\n\nExample: HIDE-DEFAULT ON`,
            twilioClient
          );
          return;
        }

        const newSetting = hideDefaultMatch[1].toUpperCase() === "ON";
        const { setHideDefault } = await import("../subscribers.js");
        const success = await setHideDefault(normalizedPhoneNumber, newSetting);

        if (success) {
          const statusText = newSetting
            ? "ON - new pages will be hidden by default"
            : "OFF - new pages will be visible by default";
          await sendSmsResponse(
            from,
            `🔧 Hide default setting: ${statusText}`,
            twilioClient
          );
          console.log(
            `Updated hide_default=${newSetting} for ${normalizedPhoneNumber}`
          );
        } else {
          await sendSmsResponse(
            from,
            `❌ Failed to update hide-default setting. Please try again later.`,
            twilioClient
          );
        }
      } catch (error) {
        console.error(`Error processing HIDE-DEFAULT command: ${error}`);
        await sendSmsResponse(
          from,
          `❌ HIDE-DEFAULT: Command failed. Please try again later.`,
          twilioClient
        );
      }
      return;
    }

    // Handle HIDE command - hide specific page by app-slug
    if (message.match(/^HIDE\s+[a-z-]+$/i)) {
      console.log(`Processing HIDE command from ${from}`);

      try {
        // Check user role for HIDE command
        const subscriber = await getSubscriber(normalizedPhoneNumber);
        if (
          !subscriber ||
          (subscriber.role !== "coder" &&
            subscriber.role !== "degen" &&
            subscriber.role !== "operator" &&
            subscriber.role !== "admin")
        ) {
          console.log(
            `User ${normalizedPhoneNumber} attempted HIDE command without coder/degen/operator/admin privileges`
          );
          return;
        }

        const hideMatch = message.match(/^HIDE\s+([a-z-]+)$/i);
        if (!hideMatch) {
          await sendSmsResponse(
            from,
            `❌ HIDE: Please specify an app slug.\n\nExample: HIDE emerald-eagle-flying\n\nUse INDEX to see your pages.`,
            twilioClient
          );
          return;
        }

        const appSlug = hideMatch[1].trim();
        const userSlug = subscriber.slug;

        if (!userSlug) {
          await sendSmsResponse(
            from,
            `❌ You need a slug first. Use WTAF command to create your first page.`,
            twilioClient
          );
          return;
        }

        // Update the Forget column for this specific page (user's own pages only)
        const { error } = await supabase
          .from("wtaf_content")
          .update({ Forget: true })
          .eq("user_slug", userSlug)
          .eq("app_slug", appSlug);

        if (error) {
          console.error(
            `Error hiding page ${userSlug}/${appSlug}: ${error.message}`
          );
          await sendSmsResponse(
            from,
            `❌ Failed to hide page. App '${appSlug}' not found or not owned by you.`,
            twilioClient
          );
          return;
        }

        await sendSmsResponse(
          from,
          `👻 Page '${appSlug}' is now hidden (won't appear in Trending or Creations)`,
          twilioClient
        );

        console.log(
          `User ${normalizedPhoneNumber} (${userSlug}) hid page: ${appSlug}`
        );
      } catch (error) {
        console.error(`Error processing HIDE command: ${error}`);
        await sendSmsResponse(
          from,
          `❌ HIDE: Command failed. Please try again later.`,
          twilioClient
        );
      }
      return;
    }

    // Handle UNHIDE command - unhide specific page by app-slug
    if (message.match(/^UNHIDE\s+[a-z-]+$/i)) {
      console.log(`Processing UNHIDE command from ${from}`);

      try {
        // Check user role for UNHIDE command
        const subscriber = await getSubscriber(normalizedPhoneNumber);
        if (
          !subscriber ||
          (subscriber.role !== "coder" &&
            subscriber.role !== "degen" &&
            subscriber.role !== "operator" &&
            subscriber.role !== "admin")
        ) {
          console.log(
            `User ${normalizedPhoneNumber} attempted UNHIDE command without coder/degen/operator/admin privileges`
          );
          return;
        }

        const unhideMatch = message.match(/^UNHIDE\s+([a-z-]+)$/i);
        if (!unhideMatch) {
          await sendSmsResponse(
            from,
            `❌ UNHIDE: Please specify an app slug.\n\nExample: UNHIDE emerald-eagle-flying\n\nUse INDEX to see your pages.`,
            twilioClient
          );
          return;
        }

        const appSlug = unhideMatch[1].trim();
        const userSlug = subscriber.slug;

        if (!userSlug) {
          await sendSmsResponse(
            from,
            `❌ You need a slug first. Use WTAF command to create your first page.`,
            twilioClient
          );
          return;
        }

        // Update the Forget column for this specific page (user's own pages only)
        const { error } = await supabase
          .from("wtaf_content")
          .update({ Forget: false })
          .eq("user_slug", userSlug)
          .eq("app_slug", appSlug);

        if (error) {
          console.error(
            `Error unhiding page ${userSlug}/${appSlug}: ${error.message}`
          );
          await sendSmsResponse(
            from,
            `❌ Failed to unhide page. App '${appSlug}' not found or not owned by you.`,
            twilioClient
          );
          return;
        }

        await sendSmsResponse(
          from,
          `👁️ Page '${appSlug}' is now visible (will appear in Trending and Creations)`,
          twilioClient
        );

        console.log(
          `User ${normalizedPhoneNumber} (${userSlug}) unhid page: ${appSlug}`
        );
      } catch (error) {
        console.error(`Error processing UNHIDE command: ${error}`);
        await sendSmsResponse(
          from,
          `❌ UNHIDE: Command failed. Please try again later.`,
          twilioClient
        );
      }
      return;
    }

    // Handle FAVE with app-slug (in addition to existing FAVE with number)
    if (message.match(/^FAVE\s+[a-z-]+$/i)) {
      console.log(`Processing FAVE with app-slug from ${from}`);

      try {
        // Check user role for FAVE command (same as existing FAVE)
        const subscriber = await getSubscriber(normalizedPhoneNumber);
        if (
          !subscriber ||
          (subscriber.role !== "coder" &&
            subscriber.role !== "degen" &&
            subscriber.role !== "operator" &&
            subscriber.role !== "admin")
        ) {
          console.log(
            `User ${normalizedPhoneNumber} attempted FAVE command without coder/degen/operator/admin privileges`
          );
          return;
        }

        const faveMatch = message.match(/^FAVE\s+([a-z-]+)$/i);
        if (!faveMatch) {
          await sendSmsResponse(
            from,
            `❌ FAVE: Please specify an app slug.\n\nExample: FAVE emerald-eagle-flying\n\nUse INDEX to see your pages.`,
            twilioClient
          );
          return;
        }

        const appSlug = faveMatch[1].trim();
        const userSlug = subscriber.slug;

        if (!userSlug) {
          await sendSmsResponse(
            from,
            `❌ You need a slug first. Use WTAF command to create your first page.`,
            twilioClient
          );
          return;
        }

        // Get current fave status for this page (user's own pages only)
        const { data: pageData, error: fetchError } = await supabase
          .from("wtaf_content")
          .select("Fave, app_slug")
          .eq("user_slug", userSlug)
          .eq("app_slug", appSlug)
          .single();

        if (fetchError || !pageData) {
          await sendSmsResponse(
            from,
            `❌ App '${appSlug}' not found or not owned by you.`,
            twilioClient
          );
          return;
        }

        // Toggle the fave status
        const currentFaveStatus = pageData.Fave || false;
        const newFaveStatus = !currentFaveStatus;

        // Update the Fave column
        const { error: updateError } = await supabase
          .from("wtaf_content")
          .update({ Fave: newFaveStatus })
          .eq("user_slug", userSlug)
          .eq("app_slug", appSlug);

        if (updateError) {
          console.error(`Error updating fave status: ${updateError}`);
          await sendSmsResponse(
            from,
            `❌ Failed to update favorite status. Please try again later.`,
            twilioClient
          );
          return;
        }

        // Send confirmation message
        const statusEmoji = newFaveStatus ? "⭐" : "📄";
        const statusText = newFaveStatus
          ? "added to favorites"
          : "removed from favorites";

        await sendSmsResponse(
          from,
          `${statusEmoji} Page '${appSlug}' ${statusText}!`,
          twilioClient
        );

        console.log(
          `User ${normalizedPhoneNumber} (${userSlug}) set fave=${newFaveStatus} for page: ${appSlug}`
        );
      } catch (error) {
        console.error(`Error processing FAVE command: ${error}`);
        await sendSmsResponse(
          from,
          `❌ FAVE: Command failed. Please try again later.`,
          twilioClient
        );
      }
      return;
    }

    // Handle PUBLIC command - for operator role only
    if (message.match(/^PUBLIC\s+.+$/i)) {
      console.log(`Processing PUBLIC ZAD creation command from ${from}`);

      try {
        // Check user role for PUBLIC command (operator and admin only)
        const subscriber = await getSubscriber(normalizedPhoneNumber);
        if (
          !subscriber ||
          (subscriber.role !== "operator" && subscriber.role !== "admin")
        ) {
          console.log(
            `User ${normalizedPhoneNumber} attempted PUBLIC command without operator/admin privileges`
          );
          // Silent ignore - don't reveal command to non-operator users
          return;
        }

        // Extract the app description from the PUBLIC command
        const publicMatch = message.match(/^PUBLIC\s+(.+)$/i);
        if (!publicMatch) {
          await sendSmsResponse(
            from,
            `❌ PUBLIC: Please provide an app description.\n\nExample: PUBLIC a birthday card app where everyone can wish Amy happy birthday`,
            twilioClient
          );
          return;
        }

        const appDescription = publicMatch[1].trim();

        // Create the ZAD request with PUBLIC marker
        const zadRequest = `wtaf ${appDescription} public`;
        console.log(`Creating PUBLIC ZAD app with request: ${zadRequest}`);

        // Get or create user slug for the operator
        const userSlug = await getOrCreateUserSlug(normalizedPhoneNumber);

        // Create filename with microsecond precision timestamp for chronological processing (same as WTAF)
        const now = new Date();
        const timestamp =
          now.toISOString().replace(/[:.]/g, "-").replace("T", "_") +
          "_" +
          String(now.getTime()).slice(-6);
        const filename = `wtaf-snippet-${timestamp}.txt`;
        const filePath = path.join(process.cwd(), "data", "wtaf", filename);

        // Ensure data/wtaf directory exists for TypeScript engine (same as WTAF)
        const wtafDir = path.join(process.cwd(), "data", "wtaf");
        if (!fs.existsSync(wtafDir)) {
          fs.mkdirSync(wtafDir, { recursive: true });
        }

        // Save content for TypeScript engine processing with user slug info (same format as WTAF)
        const fileContent = `SENDER:${from}\nUSER_SLUG:${userSlug}\n${zadRequest}`;
        fs.writeFileSync(filePath, fileContent, "utf8");

        // Send confirmation (same style as WTAF)
        await sendSmsResponse(
          from,
          `🌐 PUBLIC ZAD signal received. Creating unlimited anonymous collaborative app now.`,
          twilioClient
        );

        console.log(
          `OPERATOR ${normalizedPhoneNumber} (${userSlug}) saved PUBLIC ZAD request for processing: ${appDescription}`
        );
      } catch (error) {
        console.error(`Error processing PUBLIC command: ${error}`);
        await sendSmsResponse(
          from,
          `❌ PUBLIC: Command failed - ${
            error instanceof Error ? error.message : "Unknown error"
          }`,
          twilioClient
        );
      }
      return;
    }

    // Handle --make-public command - for admin role only (makes existing apps public)
    if (message.match(/^--make-public\s+[a-z-]+$/i)) {
      console.log(`Processing --make-public command from ${from}`);

      try {
        // Check user role for --make-public command (admin only)
        const subscriber = await getSubscriber(normalizedPhoneNumber);
        if (!subscriber || subscriber.role !== "admin") {
          console.log(
            `User ${normalizedPhoneNumber} attempted --make-public command without admin privileges`
          );
          // Silent ignore - don't reveal command to non-admin users
          return;
        }

        const makePublicMatch = message.match(/^--make-public\s+([a-z-]+)$/i);
        if (!makePublicMatch) {
          await sendSmsResponse(
            from,
            `❌ --make-public: Please specify an app slug.\n\nExample: --make-public emerald-eagle-flying`,
            twilioClient
          );
          return;
        }

        const appSlug = makePublicMatch[1];

        // Find the app in the wtaf_content table (search across all users)
        const { data: appContent, error: findError } = await supabase
          .from("wtaf_content")
          .select("*")
          .eq("app_slug", appSlug)
          .single();

        if (findError || !appContent) {
          await sendSmsResponse(
            from,
            `❌ --make-public: App '${appSlug}' not found.`,
            twilioClient
          );
          return;
        }

        // Environment-aware domain configuration
        const WEB_APP_URL = process.env.WEB_APP_URL || "https://theaf.us";
        const WTAF_DOMAIN =
          WEB_APP_URL.includes("localhost") || WEB_APP_URL.includes("ngrok")
            ? WEB_APP_URL
            : process.env.WTAF_DOMAIN || "https://www.wtaf.me";

        // Create a public app by copying it to the 'public' user with a new slug
        const publicSlug = `public-${appSlug}`;

        // Check if public version already exists
        const { data: existingPublic } = await supabase
          .from("wtaf_content")
          .select("*")
          .eq("user_slug", "public")
          .eq("app_slug", publicSlug)
          .single();

        if (existingPublic) {
          await sendSmsResponse(
            from,
            `✅ App is already public!\n\n🌐 Public URL: ${WTAF_DOMAIN}/public/${publicSlug}\n\n(Original: ${WTAF_DOMAIN}/${appContent.user_slug}/${appSlug})`,
            twilioClient
          );
          return;
        }

        // Create public version by inserting new record
        const publicAppData = {
          user_slug: "public",
          app_slug: publicSlug,
          html_content: appContent.html_content,
          original_prompt: `PUBLIC: ${appContent.original_prompt}`,
          status: "published",
          coach: appContent.coach,
          created_at: new Date().toISOString(),
          // Copy other relevant fields
          type: appContent.type,
          parent_app_id: appContent.id, // Track the original app
          is_remix: true,
          remix_count: 0,
        };

        const { data: newPublicApp, error: createError } = await supabase
          .from("wtaf_content")
          .insert(publicAppData)
          .select()
          .single();

        if (createError) {
          console.error("Error creating public app:", createError);
          await sendSmsResponse(
            from,
            `❌ --make-public: Failed to create public version. Please try again.`,
            twilioClient
          );
          return;
        }

        // Success message
        await sendSmsResponse(
          from,
          `🌐 App made public!\n\n✨ Public URL: ${WTAF_DOMAIN}/public/${publicSlug}\n📱 Original: ${WTAF_DOMAIN}/${appContent.user_slug}/${appSlug}\n\nAnyone can now access this app without authentication.`,
          twilioClient
        );

        console.log(
          `ADMIN ${normalizedPhoneNumber} made app public: ${appSlug} → public/${publicSlug}`
        );
      } catch (error) {
        console.error(`Error processing --make-public command: ${error}`);
        await sendSmsResponse(
          from,
          `❌ --make-public: Command failed - ${
            error instanceof Error ? error.message : "Unknown error"
          }`,
          twilioClient
        );
      }
      return;
    }

    // Handle REMIX command - for coder/degen/admin users only
    if (message.match(/^REMIX(?:\s|$)/i)) {
      // Check if the command has at least an app slug
      if (!message.match(/^REMIX\s+[a-z0-9-]+/i)) {
        await sendSmsResponse(
          from,
          `❌ REMIX: Please specify an app slug.\n\nExamples:\n• REMIX emerald-eagle-flying (to clone)\n• REMIX emerald-eagle-flying make it blue (to modify)\n\nUse INDEX to see your pages.`,
          twilioClient
        );
        return;
      }
      console.log(`Processing REMIX command from ${from}`);
      console.log(`Message content: "${message}"`);

      try {
        // Check user role for REMIX command
        const subscriber = await getSubscriber(normalizedPhoneNumber);
        console.log(`Subscriber data:`, JSON.stringify(subscriber, null, 2));

        if (!subscriber) {
          console.log(`❌ No subscriber found for ${normalizedPhoneNumber}`);
          return;
        }

        if (
          subscriber.role !== "coder" &&
          subscriber.role !== "degen" &&
          subscriber.role !== "admin" &&
          subscriber.role !== "operator"
        ) {
          console.log(
            `❌ User ${normalizedPhoneNumber} has role '${subscriber.role}', 'coder/degen/admin/operator' required`
          );
          // Silent ignore - don't reveal command to non-coder/degen/admin users
          return;
        }

        console.log(
          `✅ User ${normalizedPhoneNumber} has '${subscriber.role}' role, proceeding with REMIX command`
        );

        // Parse the command: REMIX slug instruction (or just REMIX slug for cloning)
        const remixMatch = message.match(/^REMIX\s+([a-z0-9-]+)(?:\s+(.+))?$/i);

        if (!remixMatch || !remixMatch[1]) {
          console.error("Failed to parse REMIX command:", message);
          await sendSmsResponse(
            from,
            "❌ Invalid REMIX command format. Use: REMIX [app-slug] [instructions] or REMIX [app-slug] to clone",
            twilioClient
          );
          return;
        }

        const targetSlug = remixMatch[1].trim();
        const instructions = remixMatch[2] ? remixMatch[2].trim() : ""; // Empty string for clone

        const userSlug = subscriber.slug;
        if (!userSlug) {
          await sendSmsResponse(
            from,
            `❌ You need a slug first. Use WTAF command to create your first page.`,
            twilioClient
          );
          return;
        }

        // Queue the remix request to WTAF engine
        const { queueRemixRequest } = await import("../degen_commands.js");
        const success = await queueRemixRequest(
          userSlug,
          targetSlug,
          instructions,
          from
        );

        if (success) {
          await sendSmsResponse(
            from,
            `🎨 Processing your remix request... You'll get a link in about 30 seconds!`,
            twilioClient
          );
          console.log(
            `✅ REMIX command queued for processing: ${normalizedPhoneNumber}`
          );
        } else {
          await sendSmsResponse(
            from,
            `❌ Failed to queue your remix request. App '${targetSlug}' not found or you don't own it.`,
            twilioClient
          );
          console.log(
            `❌ Failed to queue REMIX command for ${normalizedPhoneNumber}`
          );
        }
      } catch (error) {
        console.error(`Error processing REMIX command: ${error}`);
        await sendSmsResponse(
          from,
          `❌ REMIX: Command failed. Please try again later.`,
          twilioClient
        );
      }
      return;
    }

    // ========================================
    // ORCHESTRATOR: Context-Aware Routing
    // ========================================
    // No keyword command matched - use orchestrator to route based on context
    try {
      const { handleOrchestratedMessage } = await import('./orchestrated-routing.js');
      await handleOrchestratedMessage(commandContext, normalizedPhoneNumber);
      return;
    } catch (orchestratorError) {
      console.error('[Orchestrator] Error:', orchestratorError);

      // Fall back to legacy Kochi chatbot if orchestrator fails
      console.log('Falling back to legacy Kochi chatbot');
      const kochiCoach = coachData.ceos.find(c => c.id === 'kochi');

      if (kochiCoach) {
        updateActiveConversation(from, 'Kochi');
        const handled = await handleCoachConversation(message, twilioClient, from, kochiCoach);
        if (handled) {
          return;
        }
      }

      // If everything fails, send fallback message
      await sendSmsResponse(
        from,
        'Sorry, I encountered an error. Try "COMMANDS" for help or start with "WTAF" to create an app.',
        twilioClient
      );
      return;
    }
  } catch (error) {
    console.error("Error handling SMS message:", error);
    console.error(
      "Error stack:",
      error instanceof Error ? error.stack : "No stack trace"
    );
    await sendSmsResponse(
      from,
      "Sorry, I encountered an error processing your message. Please try again later.",
      twilioClient
    );
  }
}

/**
 * Get conversation history for a user
 * @param phoneNumber User's phone number
 */
function getConversationHistory(phoneNumber: string): ConversationMessage[] {
  // Create new conversation history if it doesn't exist
  if (!conversationStore.has(phoneNumber)) {
    conversationStore.set(phoneNumber, [
      {
        role: "system",
        content: SMS_CONFIG.SYSTEM_PROMPT,
      },
    ]);
  }

  return conversationStore.get(phoneNumber) || [];
}

/**
 * Save conversation history for a user
 * @param phoneNumber User's phone number
 * @param history Conversation history
 */
function saveConversationHistory(
  phoneNumber: string,
  history: ConversationMessage[]
): void {
  // Trim conversation to prevent unlimited growth
  const maxMessages = SMS_CONFIG.MAX_CONVERSATION_LENGTH * 2; // *2 because we count both user and assistant messages
  if (history.length > maxMessages) {
    // Keep the system message at the beginning and the most recent messages
    const systemMessage = history.find((msg) => msg.role === "system");
    const recentMessages = history.slice(-maxMessages);

    if (systemMessage && !recentMessages.some((msg) => msg.role === "system")) {
      history = [systemMessage, ...recentMessages];
    } else {
      history = recentMessages;
    }
  }

  // Store in memory
  conversationStore.set(phoneNumber, history);
}

/**
 * Check if a phone number is a test/dev number that should skip actual SMS sending
 * @param phoneNumber Phone number to check
 */
function isTestPhoneNumber(phoneNumber: string): boolean {
  // Remove any whatsapp: prefix for checking
  const cleanNumber = phoneNumber.replace(/^whatsapp:/, "");

  // List of test phone numbers that should skip SMS sending
  const testNumbers = [
    "+1234567890", // Dev reroute script default
    "+15555551234", // Common test number
    "+12345678901", // Variation
    "+1555123456", // Another common test pattern
  ];

  return testNumbers.includes(cleanNumber);
}

/**
 * Send message response to user (SMS or WhatsApp)
 * @param to Recipient's phone number (with or without whatsapp: prefix)
 * @param message Message content
 * @param twilioClient Twilio client instance
 */
export async function sendSmsResponse(
  to: string,
  message: string,
  twilioClient: TwilioClient
): Promise<any> {
  try {
    const platform = detectMessagePlatform(to);

    // For WhatsApp, use verified business number or configured WhatsApp number
    const fromNumber =
      platform === "whatsapp"
        ? process.env.TWILIO_WHATSAPP_NUMBER || "whatsapp:+18663300015" // Your verified WhatsApp Business number
        : process.env.TWILIO_PHONE_NUMBER;

    // Enforce 1600 character limit
    if (message.length > 1600) {
      console.error(
        `Message length ${message.length} exceeds 1600 character limit. Truncating...`
      );
      message = message.substring(0, 1597) + "...";
    }

    // Check if this is a test phone number - log but still call twilioClient.messages.create()
    // so that dev webhook mock client can capture the response
    if (isTestPhoneNumber(to)) {
      console.log(`🧪 DEV MODE: Skipping actual SMS to test number ${to}`);
      console.log(
        `🧪 Mock ${platform.toUpperCase()} response: ${message.substring(
          0,
          100
        )}...`
      );
    }

    const response = await twilioClient.messages.create({
      body: message,
      to, // Keep original format (whatsapp: prefix if WhatsApp)
      from: fromNumber,
    });

    console.log(
      `${platform.toUpperCase()} sent to ${to}: ${message.substring(0, 50)}...`
    );
    return response;
  } catch (error: any) {
    const platform = detectMessagePlatform(to);
    // Handle Twilio's automatic unsubscribe gracefully
    if (error.code === 21610) {
      console.log(
        `${platform.toUpperCase()} to ${to} blocked - user is carrier-unsubscribed (Twilio error 21610)`
      );
      console.log(`Message was: ${message.substring(0, 100)}...`);
      return null; // Don't crash, just return null
    } else {
      console.error(
        `Failed to send ${platform.toUpperCase()} to ${to}:`,
        error
      );
      throw error;
    }
  }
}

/**
 * Cleanup resources when shutting down
 */
export async function cleanup(): Promise<void> {
  console.log("Cleaning up SMS handlers resources...");
  return Promise.resolve();
}

/**
 * Generate a unique user slug using adjective + animal (max 5 chars each)
 */
async function generateUserSlug(): Promise<string> {
  // Filter dictionaries to max 5 characters and remove bad words
  const badWords = [
    "then",
    "when",
    "where",
    "what",
    "how",
    "why",
    "who",
    "which",
    "that",
    "this",
    "than",
    "them",
    "they",
    "there",
    "these",
    "those",
  ];
  const shortAdjectives = adjectives.filter(
    (adj) =>
      adj.length <= 5 &&
      !badWords.includes(adj.toLowerCase()) &&
      adj.match(/^[a-z]+$/i) // Only letters, no numbers or special chars
  );
  const shortAnimals = animals.filter(
    (animal) => animal.length <= 5 && animal.match(/^[a-z]+$/i) // Only letters, no numbers or special chars
  );

  let attempts = 0;
  const maxAttempts = 50;

  while (attempts < maxAttempts) {
    const slug = uniqueNamesGenerator({
      dictionaries: [shortAdjectives, shortAnimals],
      separator: "",
      length: 2,
    });

    // Check if slug already exists in database
    const { data, error } = await supabase
      .from("sms_subscribers")
      .select("slug")
      .eq("slug", slug)
      .single();

    if (error && error.code === "PGRST116") {
      // No rows returned - slug is unique
      return slug;
    }

    attempts++;
  }

  // Fallback if we can't generate unique slug
  const timestamp = Date.now().toString().slice(-4);
  return `user${timestamp}`;
}

/**
 * Get or create user slug for WTAF commands
 */
async function getOrCreateUserSlug(phoneNumber: string): Promise<string> {
  const subscriber = await getSubscriber(phoneNumber);

  if (subscriber?.slug) {
    return subscriber.slug;
  }

  // Generate new slug
  const newSlug = await generateUserSlug();

  // Update database with new slug
  const { error } = await supabase
    .from("sms_subscribers")
    .update({ slug: newSlug })
    .eq("phone_number", phoneNumber);

  if (error) {
    console.error("Error saving user slug:", error);
    throw new Error("Failed to save user slug");
  }

  // Create user's personal directory in web/public/wtaf/
  const userDir = path.join(
    process.cwd(),
    "..",
    "web",
    "public",
    "wtaf",
    newSlug
  );
  if (!fs.existsSync(userDir)) {
    fs.mkdirSync(userDir, { recursive: true });
    console.log(`Created directory: ${userDir}`);
  }

  console.log(`Generated new slug for ${phoneNumber}: ${newSlug}`);
  return newSlug;
}

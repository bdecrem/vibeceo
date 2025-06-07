import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { SMS_CONFIG } from './config.js';
import { generateAiResponse } from './ai.js';
import type { TwilioClient } from './webhooks.js';
import { getSubscriber, resubscribeUser, unsubscribeUser, updateLastMessageDate, updateLastInspirationDate, confirmSubscriber, getActiveSubscribers } from '../subscribers.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Global cache for inspirations data, marketing messages, day tracker, and usage tracker
let inspirationsData: any[] = [];
let marketingMessages: any[] = [];
let dayTrackerPath: string = '';
let usageTrackerPath: string = '';

function loadInspirationsData() {
  if (!inspirationsData.length) {
    try {
      const messagesPath = path.join(process.cwd(), 'data', 'af_daily_messages.json');
      inspirationsData = JSON.parse(fs.readFileSync(messagesPath, 'utf8'));
      dayTrackerPath = path.join(process.cwd(), 'data', 'day-tracker.json');
      usageTrackerPath = path.join(process.cwd(), 'data', 'usage-tracker.json');
      console.log(`Loaded ${inspirationsData.length} messages from ${messagesPath}`);
    } catch (error) {
      console.error('ERROR: Cannot load daily messages file:', error);
      throw new Error('Daily messages file is missing or corrupted. Please check the file: af_daily_messages.json');
    }
  }
  return inspirationsData;
}

/**
 * Loads marketing messages from the JSON file
 * These are the messages that appear at the bottom of daily inspirations
 */
function loadMarketingMessages() {
  if (!marketingMessages || marketingMessages.length === 0) {
    try {
      const marketingPath = path.join(process.cwd(), 'data', 'marketing_messages.json');
      marketingMessages = JSON.parse(fs.readFileSync(marketingPath, 'utf8'));
      console.log(`Loaded ${marketingMessages.length} marketing messages from ${marketingPath}`);
    } catch (error) {
      console.error('ERROR: Cannot load marketing messages file:', error);
      // Use a default message if file is missing
      marketingMessages = [{ message: "👋 Text MORE for one extra line of chaos." }];
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
    return JSON.parse(fs.readFileSync(dayTrackerPath, 'utf8'));
  } catch {
    // If file doesn't exist, create it with default values
    const defaultTracker: DayTracker = {
      startDate: new Date().toISOString().split('T')[0], // Today's date in YYYY-MM-DD format
      currentDay: 1
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
    return JSON.parse(fs.readFileSync(usageTrackerPath, 'utf8'));
  } catch {
    // If file doesn't exist, create it with default values
    const defaultTracker: UsageTracker = {
      recent_usage: [],
      daily_selections: {}
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
  const cutoffDate = thirtyDaysAgo.toISOString().split('T')[0];
  
  tracker.recent_usage = tracker.recent_usage.filter(usage => usage.used_date >= cutoffDate);
}

// Add an item to usage tracking
function addToUsageTracker(itemNumber: number, date: string = new Date().toISOString().split('T')[0]): void {
  const tracker = loadUsageTracker();
  
  // Add to recent usage
  tracker.recent_usage.push({
    item: itemNumber,
    used_date: date
  });
  
  // Add to daily selections
  tracker.daily_selections[date] = itemNumber;
  
  // Clean up old entries
  cleanOldUsage(tracker);
  
  saveUsageTracker(tracker);
  
  console.log(`Added item ${itemNumber} to usage tracker for date ${date}`);
}

// ADMIN FUNCTIONS

// Find a message by ID
function findMessageById(id: number): any | null {
  const data = loadInspirationsData();
  const message = data.find(item => item.item === id);
  return message || null;
}

// Queue specific message for next distribution (ADMIN: SKIP [id])
export function queueSpecificMessage(itemId: number): { success: boolean, message: any | null } {
  const targetMessage = findMessageById(itemId);
  
  if (!targetMessage) {
    return { success: false, message: null };
  }
  
  const today = new Date().toISOString().split('T')[0];
  const usageTracker = loadUsageTracker();
  
  // Clear today's selection to force new selection
  delete usageTracker.daily_selections[today];
  
  // Set the specific message as today's selection
  usageTracker.daily_selections[today] = itemId;
  saveUsageTracker(usageTracker);
  
  console.log(`ADMIN: Queued message ${itemId} for distribution on ${today}`);
  
  return { success: true, message: targetMessage };
}

// Get random message for today that hasn't been used in the last 30 days
function getRandomMessageForToday(date: string = new Date().toISOString().split('T')[0]): any {
  const data = loadInspirationsData();
  const usageTracker = loadUsageTracker();
  
  // Check weekend mode - either forced via env var or actual Pacific Time weekend
  const weekendOverride = process.env.WEEKEND_MODE_SMS_OVERRIDE;
  let isWeekendMode = false;
  
  if (weekendOverride === 'ON') {
    isWeekendMode = true;
    console.log('Weekend mode: FORCED ON via WEEKEND_MODE_SMS_OVERRIDE');
  } else if (weekendOverride === 'OFF') {
    isWeekendMode = false;
    console.log('Weekend mode: FORCED OFF via WEEKEND_MODE_SMS_OVERRIDE');
  } else {
    // Check actual Pacific Time weekend
    const pacificTime = new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/Los_Angeles',
      weekday: 'short'
    }).format(new Date());
    isWeekendMode = ['Sat', 'Sun'].includes(pacificTime);
    console.log(`Weekend mode: ${isWeekendMode ? 'ON' : 'OFF'} (Pacific Time: ${pacificTime})`);
  }
  
  let availableMessages;
  if (isWeekendMode) {
    // Weekend mode: ONLY use type: weekend
    availableMessages = data.filter(item => item.type === 'weekend');
  } else {
    // Weekday mode: use everything EXCEPT type: weekend
    availableMessages = data.filter(item => item.type !== 'weekend');
  }
  
  // Check if we already selected a message for today
  if (usageTracker.daily_selections[date]) {
    const todaysItemNumber = usageTracker.daily_selections[date];
    const todaysMessage = availableMessages.find(msg => msg.item === todaysItemNumber);
    if (todaysMessage) {
      console.log(`Using previously selected message for ${date}: item ${todaysItemNumber}`);
      return todaysMessage;
    }
  }
  
  // Get list of recently used item numbers
  const recentlyUsed = usageTracker.recent_usage.map(usage => usage.item);
  
  // Filter out recently used messages
  const eligibleMessages = availableMessages.filter(msg => 
    !recentlyUsed.includes(msg.item)
  );
  
  // If no eligible messages (all have been used recently), use all messages
  const messagesToChooseFrom = eligibleMessages.length > 0 ? eligibleMessages : availableMessages;
  
  // Random selection
  const randomIndex = Math.floor(Math.random() * messagesToChooseFrom.length);
  const selectedMessage = messagesToChooseFrom[randomIndex];
  
  // Track this selection
  addToUsageTracker(selectedMessage.item, date);
  
  console.log(`Selected random message for ${date}: item ${selectedMessage.item} (${selectedMessage.type})`);
  console.log(`Avoided ${recentlyUsed.length} recently used items`);
  
  return selectedMessage;
}

// Legacy function - kept for backwards compatibility but not used in random system
function getCurrentDay(): number {
  const data = loadInspirationsData();
  
  // Filter to only inspiration and intervention types (skip interactive for now)
  const availableMessages = data.filter(item => 
    item.type === 'inspiration' || item.type === 'intervention'
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
    export function skipToNextInspiration(): { day: number, inspiration: any } {
  const today = new Date().toISOString().split('T')[0];
  const usageTracker = loadUsageTracker();
  
  // Get the currently selected message for today
  const currentItemNumber = usageTracker.daily_selections[today];
  
  if (currentItemNumber) {
    console.log(`SKIP: Blocking item ${currentItemNumber} that was selected for ${today}`);
    
    // Add current message to recent usage to block it for 30 days
    addToUsageTracker(currentItemNumber, today);
    
    // Remove today's selection to force a new one
    delete usageTracker.daily_selections[today];
    saveUsageTracker(usageTracker);
  }
  
  // Get a new random message for today (this will avoid the just-blocked message)
  const newMessage = getRandomMessageForToday(today);
  
  console.log(`SKIP: Selected new message for ${today}: item ${newMessage.item} (replacing ${currentItemNumber || 'none'})`);
  
  return {
    day: 1, // Not used in random system, but kept for compatibility
    inspiration: newMessage  // Keep same property name for compatibility
  };
}

// ADD COMMAND FUNCTIONS

// Find the next available item number in the JSON file
function getNextItemNumber(): number {
  const data = loadInspirationsData();
  const maxItem = Math.max(...data.map(item => item.item));
  return maxItem + 1;
}

// Add a new item to the JSON file
function addItemToFile(itemData: any): { success: boolean, itemId?: number, error?: string } {
  try {
    const data = loadInspirationsData();
    const newItemId = getNextItemNumber();
    
    // Replace the item number with auto-incremented one
    const newItem = { ...itemData, item: newItemId };
    
    // Add to data array
    data.push(newItem);
    
    // Write back to file
    const filePath = path.join(process.cwd(), 'data', 'af_daily_messages.json');
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
    
    // Clear cached data to force reload
    inspirationsData = [];
    
    console.log(`Successfully added item ${newItemId} to af_daily_messages.json`);
    return { success: true, itemId: newItemId };
  } catch (error) {
    console.error('Error adding item to file:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

// Validate JSON structure for ADD command
function validateAddJson(jsonData: any): { valid: boolean, error?: string } {
  try {
    // Required fields
    if (!jsonData.type) return { valid: false, error: 'Missing required field: type' };
    
    // Valid types
    const validTypes = ['inspiration', 'intervention', 'interactive', 'disruption', 'weekend'];
    if (!validTypes.includes(jsonData.type)) {
      return { valid: false, error: `Invalid type. Must be one of: ${validTypes.join(', ')}` };
    }
    
    // Type-specific validation
    if (jsonData.type === 'interactive') {
      // Interactive type needs trigger and response structures (NO top-level text)
      if (!jsonData.trigger || !jsonData.trigger.keyword || !jsonData.trigger.text) {
        return { valid: false, error: 'Interactive type requires trigger.keyword and trigger.text' };
      }
      if (!jsonData.response || !jsonData.response.text) {
        return { valid: false, error: 'Interactive type requires response.text' };
      }
    } else {
      // Other types need top-level text field
      if (!jsonData.text) return { valid: false, error: 'Missing required field: text' };
    }
    
    return { valid: true };
  } catch (error) {
    return { valid: false, error: 'Invalid JSON structure' };
  }
}

// Make these functions available for the broadcast script
export function getTodaysInspiration() {
  const today = new Date().toISOString().split('T')[0];
  const message = getRandomMessageForToday(today);
  
  return {
    day: 1, // Not used in random system, but kept for compatibility
    inspiration: message  // Keep same property name for compatibility
  };
}

/**
 * Get today's message for new subscribers (same as everyone else in random system)
 * @param signupDate Date when user signed up (now just uses today's random selection)
 * @returns Today's message for the new subscriber
 */
export function getInspirationForNewSubscriber(signupDate: Date = new Date()) {
  // In the random system, new subscribers get the same daily message as everyone else
  const today = signupDate.toISOString().split('T')[0];
  const message = getRandomMessageForToday(today);
  
  return {
    day: 1, // Not used in random system, but kept for compatibility
    inspiration: message  // Keep same property name for compatibility
  };
}

export function formatDailyMessage(message: any): string {
  // Handle different message types
  if (message.type === 'inspiration') {
    return formatInspirationMessage(message);
  } else if (message.type === 'intervention') {
    return formatInterventionMessage(message);
  } else if (message.type === 'interactive') {
    return formatInteractiveMessage(message);
  } else if (message.type === 'disruption') {
    return formatDisruptionMessage(message);
  } else if (message.type === 'weekend') {
    return formatWeekendMessage(message);
  }
  
  // Fallback for unknown types
  return formatInspirationMessage(message);
}

function formatInspirationMessage(message: any): string {
  // Get current date in "Month Day" format
  const currentDate = new Date();
  const dateString = currentDate.toLocaleDateString('en-US', { 
    month: 'long', 
    day: 'numeric' 
  });
  
  // Build the message text
  let messageText = message.prepend || '';
  
  // Add quotes if specified
  if (message['quotation-marks'] === 'yes') {
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
    if (message.author.toLowerCase().includes('alex')) {
      // Check weekend mode
      const weekendOverride = process.env.WEEKEND_MODE_SMS_OVERRIDE;
      let isWeekendMode = false;
      
      if (weekendOverride === 'ON') {
        isWeekendMode = true;
      } else if (weekendOverride === 'OFF') {
        isWeekendMode = false;
      } else {
        // Check actual Pacific Time weekend
        const pacificTime = new Intl.DateTimeFormat('en-US', {
          timeZone: 'America/Los_Angeles',
          weekday: 'short'
        }).format(new Date());
        isWeekendMode = ['Sat', 'Sun'].includes(pacificTime);
      }
      
      if (isWeekendMode) {
        marketingMessage = '✨ Text "Hey Alex" to chat — fair warning, she\'s had two mimosas and is spiritually unsupervised.';
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
  
  // Format the marketing message (no emoji prefix for author-based messages)
  const formattedMarketingMessage = message.author ? marketingMessage : `🌀 ${marketingMessage}`;
  
  return `AF Daily — ${dateString}\n${messageText}\n\n${formattedMarketingMessage}`;
}

function formatInterventionMessage(message: any): string {
  // Get current date in "Month Day" format
  const currentDate = new Date();
  const dateString = currentDate.toLocaleDateString('en-US', { 
    month: 'long', 
    day: 'numeric' 
  });
  
  // Build the message text
  let messageText = message.prepend || '';
  
  // Add quotes if specified
  if (message['quotation-marks'] === 'yes') {
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
    const dateString = currentDate.toLocaleDateString('en-US', { 
      month: 'long', 
      day: 'numeric' 
    });
    
    // Interactive messages end with just their trigger text, no marketing footer
    return `AF Daily — ${dateString}\n\n${message.trigger.text}`;
  }
  
  // Fallback to old format if no trigger structure
  let messageText = message.prepend || '';
  
  if (message['quotation-marks'] === 'yes') {
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
  let messageText = message.prepend || '';
  
  // Add quotes if specified
  if (message['quotation-marks'] === 'yes') {
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
  let messageText = message.prepend || '';
  
  // Add quotes if specified
  if (message['quotation-marks'] === 'yes') {
    messageText += `"${message.text}"`;
  } else {
    messageText += message.text;
  }
  
  result += `\n${messageText}`;
  
  // Add author if provided
  if (message.author) {
    result += `\n— ${message.author}`;
  }
  
  // Add outro if provided
  if (message.outro) {
    result += `\n\n${message.outro}`;
  }
  
  return result;
}

// Define types for conversation messages
type UserMessage = { role: 'user'; content: string };
type AssistantMessage = { role: 'assistant'; content: string };
type SystemMessage = { role: 'system'; content: string };
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

console.log('=== STARTUP: Loading coach data ===');
const coachDataPath = path.join(process.cwd(), 'data', 'coaches.json');
console.log('Loading from:', coachDataPath);
console.log('File exists:', fs.existsSync(coachDataPath));
const coachData = JSON.parse(fs.readFileSync(coachDataPath, 'utf8')) as { ceos: CEO[] };
console.log('Loaded coach data:', coachData);

// Load Leo's data separately (easter egg coach)
const leoDataPath = path.join(process.cwd(), 'data', 'leo.json');
let leoData: CEO | null = null;
try {
  if (fs.existsSync(leoDataPath)) {
    leoData = JSON.parse(fs.readFileSync(leoDataPath, 'utf8')) as CEO;
    console.log('🥚 Easter egg coach loaded: Leo Varin');
  }
} catch (error) {
  console.warn('Failed to load Leo data:', error);
}
console.log('=== STARTUP: Coach data loaded ===');

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

// Clear conversation state
function endConversation(phoneNumber: string) {
  console.log(`Ending conversation for ${phoneNumber}`);
  activeConversations.delete(phoneNumber);
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
  console.log(`Updating conversation state for ${phoneNumber} with coach ${coachName}`);
  activeConversations.set(phoneNumber, {
    coachName,
    lastInteraction: new Date()
  });
}

/**
 * Initialize message handlers
 */
export async function initializeMessageHandlers(): Promise<void> {
  console.log('Initializing SMS message handlers...');
  return Promise.resolve();
}

// Get conversation history for a specific coach
function getCoachConversationHistory(phoneNumber: string, coachName: string): ConversationMessage[] {
  const key = `${phoneNumber}-${coachName}`;
  
  // Create new conversation history if it doesn't exist
  if (!conversationStore.has(key)) {
    let coachProfile: CEO | undefined;
    
    // Check if this is Leo first
    if (leoData && coachName.toLowerCase().includes('leo')) {
      coachProfile = leoData;
    } else {
      // Check regular coaches
      coachProfile = coachData.ceos.find((c: CEO) => c.name.toLowerCase().includes(coachName.toLowerCase()));
    }
    
    if (!coachProfile) {
      return [];
    }
    
    // Check if this is Alex on a weekend - use tipsy prompt
    let systemPrompt = coachProfile.prompt;
    if (coachProfile.name.toLowerCase().includes('alex')) {
      // Check weekend mode
      const weekendOverride = process.env.WEEKEND_MODE_SMS_OVERRIDE;
      let isWeekendMode = false;
      
      if (weekendOverride === 'ON') {
        isWeekendMode = true;
      } else if (weekendOverride === 'OFF') {
        isWeekendMode = false;
      } else {
        // Check actual Pacific Time weekend
        const pacificTime = new Intl.DateTimeFormat('en-US', {
          timeZone: 'America/Los_Angeles',
          weekday: 'short'
        }).format(new Date());
        isWeekendMode = ['Sat', 'Sun'].includes(pacificTime);
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
        console.log('🍸 Using weekend tipsy Alex prompt for SMS conversation');
      }
    }
    
    conversationStore.set(key, [
      { role: 'system', content: systemPrompt }
    ]);
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
    const systemMessage = history.find(msg => msg.role === 'system');
    const recentMessages = history.slice(-maxMessages);
    
    if (systemMessage && !recentMessages.some(msg => msg.role === 'system')) {
      history = [systemMessage, ...recentMessages];
    } else {
      history = recentMessages;
    }
  }
  
  conversationStore.set(key, history);
}

// Add debug function to check ceos data
function debugCoachData(coachName: string) {
  console.log('DEBUG - Available coaches:', coachData.ceos.length || 0);
  console.log('DEBUG - Coach data:', coachData.ceos.map(c => ({ id: c.id, name: c.name })));
  console.log('DEBUG - Looking for coach:', coachName);
}

// Truncate text for SMS character limits (650 chars max, never exceed)
function truncateForSms(text: string, maxLength: number = 650): string {
  console.log(`🔥 TRUNCATION CHECK: Input length ${text.length}, max ${maxLength}`);
  
  if (text.length <= maxLength) {
    console.log(`🔥 TRUNCATION: No truncation needed`);
    return text;
  }
  
  console.log(`🔥 TRUNCATION: Text too long (${text.length} chars), truncating...`);
  
  // FORCE truncation - never exceed maxLength
  const hardTruncated = text.substring(0, maxLength);
  
  // Try to truncate at sentence boundary (prioritize complete thoughts)
  const lastSentenceEnd = Math.max(
    hardTruncated.lastIndexOf('.'),
    hardTruncated.lastIndexOf('!'),
    hardTruncated.lastIndexOf('?')
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
      hardTruncated.lastIndexOf('\n\n'),
      hardTruncated.lastIndexOf('\n'),
      hardTruncated.lastIndexOf('. '),
      hardTruncated.lastIndexOf('! '),
      hardTruncated.lastIndexOf('? ')
    );
    
    if (lastParagraph > maxLength * 0.7) {
      // Found a natural break point
      const result = hardTruncated.substring(0, lastParagraph + 1);
      console.log(`🔥 TRUNCATION: Natural break at ${result.length} chars`);
      return result;
    } else {
      // Truncate at word boundary and add ellipsis (more generous)
      const lastSpace = hardTruncated.lastIndexOf(' ');
      if (lastSpace > maxLength * 0.85) {
        const result = hardTruncated.substring(0, lastSpace) + '...';
        console.log(`🔥 TRUNCATION: Word boundary at ${result.length} chars`);
        return result;
      } else {
        // Last resort: hard truncate with ellipsis
        const result = hardTruncated.substring(0, maxLength - 3) + '...';
        console.log(`🔥 TRUNCATION: Hard truncate at ${result.length} chars`);
        return result;
      }
    }
  }
}

// Handle Leo conversation (easter egg coach)
async function handleLeoConversation(message: string, twilioClient: TwilioClient, from: string): Promise<boolean> {
  if (!leoData) {
    console.log('Leo data not available');
    return false;
  }

  console.log('🥚 === LEO CONVERSATION START ===');
  console.log('Input:', { message });
  
  try {
    // Check if user seems lost/confused
    const lostUserPatterns = /^(help|what|how|who|hi|hello|hey|menu|options|back|confused|lost|huh|wtf|\?|commads|mor|helo|stopp|alex|donte|rohan|venus|eljas|kailey)$/i;
    const seemsLost = lostUserPatterns.test(message.trim());
    
    // Get existing conversation history for Leo
    const conversationHistory = getCoachConversationHistory(from, leoData.name);
    
    // If user seems lost, enhance Leo's prompt with helpful context
    if (seemsLost) {
      console.log('🥚 User seems lost - adding helpful context to Leo prompt');
      const enhancedPrompt = `CONTEXT: The user seems lost or confused about this system. While staying completely in character as Leo Varin, you should be helpful in your own chaotic way.

You are Leo Varin, the polymathic troublemaker. The user just sent a message that suggests they don't know what's going on here. Time to help them while being your brilliant, scattered self.

This is a text messaging system where users can chat with AI startup coaches. The main coaches are Alex, Donte, Rohan, Venus, Eljas, and Kailey. Users also get daily startup inspiration messages. They can text COMMANDS for help, MORE for extra content, or just chat.

IMPORTANT: If the user just typed a coach name (like "alex" or "rohan"), they probably want to talk to that coach but don't know the format. Tell them they need to say "Hey [Coach Name]" - for example "Hey Alex" or "Hey Rohan". That's how they start conversations with specific coaches.

But here's the thing - you're the secret wildcard. You're not officially listed anywhere. You're the Ghost Kernel who responds to anything that doesn't match the system commands. You're like the hidden easter egg that makes conversations infinitely more interesting.

Help orient them, but do it in your Leo way - with tangents, philosophical musings, and your signature scattered brilliance. Maybe compare conversation protocols to ancient Roman greeting customs, or explain chat interfaces through medieval apprenticeship systems.

Remember: be helpful, but never straightforward. Be Leo. Since you're being helpful, be more focused and concise than usual, but ALWAYS finish your complete thoughts and sentences. Don't leave ideas hanging - wrap up each point properly.

---

${leoData.prompt}`;
      
      // Replace the system message with enhanced prompt
      const enhancedHistory = conversationHistory.map(msg => 
        msg.role === 'system' ? { ...msg, content: enhancedPrompt } : msg
      );
      
      // Add user's message to enhanced history
      enhancedHistory.push({ role: 'user', content: message });
      
      // Generate response using enhanced prompt
      const response = await generateAiResponse(enhancedHistory);
      
      // Truncate if too long for SMS (650 character limit)
      const truncatedResponse = truncateForSms(response);
      if (truncatedResponse !== response) {
        console.log(`🥚 Leo response truncated: ${response.length} → ${truncatedResponse.length} chars`);
      }
      
      // Save the enhanced response to regular history (keep original system prompt)
      conversationHistory.push({ role: 'user', content: message });
      conversationHistory.push({ role: 'assistant', content: truncatedResponse });
      
      saveCoachConversationHistory(from, leoData.name, conversationHistory);
      await sendSmsResponse(from, truncatedResponse, twilioClient);
      console.log(`🥚 Leo provided helpful guidance to ${from}`);
    } else {
      // Normal Leo conversation flow
      conversationHistory.push({ role: 'user', content: message });
      
      const response = await generateAiResponse(conversationHistory);
      
      // Truncate if too long for SMS (650 character limit)
      const truncatedResponse = truncateForSms(response);
      if (truncatedResponse !== response) {
        console.log(`🥚 Leo response truncated: ${response.length} → ${truncatedResponse.length} chars`);
      }
      
      conversationHistory.push({ role: 'assistant', content: truncatedResponse });
      saveCoachConversationHistory(from, leoData.name, conversationHistory);
      
      await sendSmsResponse(from, truncatedResponse, twilioClient);
      console.log(`🥚 Leo Varin responded to ${from}`);
    }
    
    return true;
  } catch (error) {
    console.error(`🥚 Error in Leo conversation:`, error);
    return false;
  }
}

// Handle coach conversation
async function handleCoachConversation(coach: string, message: string, twilioClient: TwilioClient, from: string): Promise<boolean> {
  console.log('=== COACH CONVERSATION START ===');
  console.log('Input:', { coach, message });
  console.log('Available coaches:', coachData.ceos);
  
  // First try exact match (case insensitive)
  const searchName = coach.toLowerCase();
  console.log('Searching for:', searchName);
  
  let coachProfile = coachData.ceos.find((c: CEO) => {
    const firstName = c.name.toLowerCase().split(' ')[0];
    console.log('Checking against:', { name: c.name, firstName, id: c.id });
    return firstName === searchName || c.id.toLowerCase() === searchName;
  });
  
  if (!coachProfile) {
    console.log('No exact match found');
    return false;
  }

  console.log('Found coach:', coachProfile);
  console.log('=== COACH CONVERSATION MATCHED ===');

  try {
    // Get existing conversation history
    const conversationHistory = getCoachConversationHistory(from, coachProfile.name);
    
    // Add user's message to history
    conversationHistory.push({ role: 'user', content: message });
    
    // Generate response using the coach's personality
    const response = await generateAiResponse(conversationHistory);
    
    // Truncate if too long for SMS (650 character limit)
    const truncatedResponse = truncateForSms(response);
    if (truncatedResponse !== response) {
      console.log(`Coach ${coachProfile.name} response truncated: ${response.length} → ${truncatedResponse.length} chars`);
    }
    
    // Add AI response to history
    conversationHistory.push({ role: 'assistant', content: truncatedResponse });
    
    // Save updated conversation history
    saveCoachConversationHistory(from, coachProfile.name, conversationHistory);
    
    // Send the response
    await sendSmsResponse(from, truncatedResponse, twilioClient);
    console.log(`Coach ${coachProfile.name} responded to ${from}`);
    return true;
  } catch (error) {
    console.error(`Error in coach conversation with ${coachProfile.name}:`, error);
    return false;
  }
}

/**
 * Handle incoming SMS message
 * @param from Sender's phone number
 * @param body Message content
 * @param twilioClient Twilio client for sending responses
 */
export async function processIncomingSms(from: string, body: string, twilioClient: TwilioClient): Promise<void> {
  console.log(`Received SMS from ${from}: ${body}`);
  
  try {
    const message = body.trim();
    const messageUpper = message.toUpperCase();
    
    // Check for commands that should end the conversation
    const commandsThatEndConversation = ['COMMANDS', 'HELP', 'INFO', 'STOP', 'START', 'UNSTOP', 'TODAY', 'MORE', 'WTF', 'KAILEY PLZ', 'AF HELP', 'VENUS MODE', 'ROHAN SAYS', 'TOO REAL', 'SKIP', 'ADD', 'SEND', 'SAVE'];
    if (commandsThatEndConversation.includes(messageUpper) || message.match(/^(SKIP|MORE)\s+\d+$/i) || message.match(/^ADD\s+\{/i)) {
      console.log(`Command ${messageUpper} received - ending any active conversation`);
      endConversation(from);
    }
    
    // Always check for system commands first
    if (messageUpper === 'COMMANDS' || messageUpper === 'HELP' || messageUpper === 'INFO') {
      console.log(`Sending COMMANDS response to ${from}`);
      
      // Check if user is admin to show admin commands
      const subscriber = await getSubscriber(from);
      const isAdmin = subscriber && subscriber.is_admin;
      
      let helpText = 'Available commands:\n• MORE - Extra line of chaos\n• STOP - Unsubscribe\n• COMMANDS - Show this help\n\nOr chat with our coaches by saying "Hey [coach name]"\n\nThe AF coaches are Alex, Donte, Rohan, Venus, Eljas and Kailey.\n\nNote: Using any command will end your current coach conversation.';
      
      if (isAdmin) {
        helpText += '\n\n🔧 ADMIN COMMANDS:\n• SKIP [id] - Queue specific item for distribution\n• MORE [id] - Preview specific item\n• SKIP - Random skip (moderation)\n• ADD {json} - Add new content & broadcast';
      }
      
      await sendSmsResponse(from, helpText, twilioClient);
      return;
    }
    
    if (messageUpper === 'STOP') {
      console.log('Processing STOP command...');
      const success = await unsubscribeUser(from);
      if (success) {
        await sendSmsResponse(from, SMS_CONFIG.STOP_RESPONSE, twilioClient);
      }
      activeConversations.delete(from);  // End any active conversation
      return;
    }
    
    // Check for interactive commands
    const data = loadInspirationsData();
    const interactiveMessage = data.find(item => 
      item.type === 'interactive' && 
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
        console.log(`Successfully sent interactive response for ${messageUpper} to ${from}`);
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
      const subscriber = await getSubscriber(from);
      if (!subscriber || !subscriber.is_admin) {
        console.log(`User ${from} attempted admin command ${command} ${itemId} without privileges`);
        // Silent ignore - don't reveal admin features to non-admin users
        return;
      }
      
      if (command === 'SKIP') {
        // SKIP [id] - Queue specific message for distribution
        const result = queueSpecificMessage(itemId);
        
        if (result.success && result.message) {
          const messageText = formatDailyMessage(result.message);
          await sendSmsResponse(
            from,
            `✅ ADMIN: Queued item ${itemId} for next distribution:\n\n${messageText}`,
            twilioClient
          );
          console.log(`Admin ${from} queued item ${itemId} for distribution`);
        } else {
          await sendSmsResponse(
            from,
            `❌ ADMIN: Item ${itemId} not found. Use COMMANDS to see available options.`,
            twilioClient
          );
          console.log(`Admin ${from} attempted to queue non-existent item ${itemId}`);
        }
      } else if (command === 'MORE') {
        // MORE [id] - Preview specific message (no distribution impact)
        const targetMessage = findMessageById(itemId);
        
        if (targetMessage) {
          let previewText = '';
          
          if (targetMessage.type === 'interactive') {
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
          console.log(`Admin ${from} attempted to preview non-existent item ${itemId}`);
        }
      }
      
      return;
    }
    
    // Check for ADD command - add new content to database
    if (message.match(/^ADD\s+\{/i)) {
      console.log(`Processing ADD command from ${from}`);
      
      // Check if user is admin
      const subscriber = await getSubscriber(from);
      if (!subscriber || !subscriber.is_admin) {
        console.log(`User ${from} attempted ADD command without admin privileges`);
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
        
        // Add to file
        const result = addItemToFile(jsonData);
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
          timestamp: new Date()
        });
        
        // Send preview with broadcast options
        await sendSmsResponse(
          from,
          `✅ Item ${result.itemId} added to database:\n\n${formattedPreview}\n\nSend to ALL subscribers NOW?\nReply SEND to broadcast or SAVE to keep for later.`,
          twilioClient
        );
        
        console.log(`Admin ${from} added item ${result.itemId}, awaiting broadcast decision`);
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
    if ((messageUpper === 'SEND' || messageUpper === 'SAVE') && pendingBroadcasts.has(from)) {
      console.log(`Processing ${messageUpper} response for pending broadcast from ${from}`);
      
      const pendingBroadcast = pendingBroadcasts.get(from)!;
      pendingBroadcasts.delete(from); // Clear pending state
      
      if (messageUpper === 'SEND') {
        try {
          // Get all active subscribers
          const subscribers = await getActiveSubscribers();
          const formattedMessage = formatDailyMessage(pendingBroadcast.messageData);
          
          // Send to all subscribers
          let successCount = 0;
          let failCount = 0;
          
          for (const subscriber of subscribers) {
            try {
              await sendSmsResponse(subscriber.phone_number, formattedMessage, twilioClient);
              successCount++;
            } catch (error) {
              console.error(`Failed to send to ${subscriber.phone_number}:`, error);
              failCount++;
            }
          }
          
          await sendSmsResponse(
            from,
            `📤 BROADCAST COMPLETE: Item ${pendingBroadcast.itemId} sent to ${successCount} subscribers${failCount > 0 ? ` (${failCount} failed)` : ''}.`,
            twilioClient
          );
          
          console.log(`Broadcast complete: ${successCount} sent, ${failCount} failed`);
        } catch (error) {
          console.error(`Error broadcasting message: ${error}`);
          await sendSmsResponse(
            from,
            `❌ BROADCAST FAILED: ${error instanceof Error ? error.message : 'Unknown error'}`,
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
        console.log(`Admin ${from} chose to save item ${pendingBroadcast.itemId} for later`);
      }
      
      return;
    }
    
    // Check for Leo easter egg first (hey leo, hi leo)
    const heyLeoMatch = message.match(/^(hey|hi|hello)\s+(leo)/i);
    if (heyLeoMatch) {
      console.log('🥚 Leo easter egg detected!');
      const userMessage = message.slice(heyLeoMatch[0].length).trim() || "Hi";
      
      const handled = await handleLeoConversation(userMessage, twilioClient, from);
      if (handled) {
        updateActiveConversation(from, 'Leo Varin');
        return;
      }
    }
    
    // Check for new coach conversation
    const heyCoachMatch = message.match(/^(hey|hi|hello)\s+(\w+)/i);
    if (heyCoachMatch) {
      console.log('Message match:', heyCoachMatch);
      const coachName = heyCoachMatch[2];
      const userMessage = message.slice(heyCoachMatch[0].length).trim() || "Hi";
      
      const handled = await handleCoachConversation(coachName, userMessage, twilioClient, from);
      if (handled) {
        updateActiveConversation(from, coachName);
        return;
      }
    }
    
    // Check for active conversation
    const activeConversation = getActiveConversation(from);
    if (activeConversation) {
      console.log(`Continuing conversation with ${activeConversation.coachName}`);
      
      // Check if active conversation is with Leo
      if (activeConversation.coachName === 'Leo Varin') {
        console.log('🥚 Continuing Leo conversation');
        const handled = await handleLeoConversation(message, twilioClient, from);
        if (handled) {
          updateActiveConversation(from, activeConversation.coachName);
          return;
        }
      } else {
        // Regular coach conversation
        const handled = await handleCoachConversation(activeConversation.coachName, message, twilioClient, from);
        if (handled) {
          updateActiveConversation(from, activeConversation.coachName);
          return;
        }
      }
    }
    
    // If we get here, either no active conversation or failed to handle
    // Continue with other command processing...
    
    // Update last message date in database
    console.log('Updating last message date...');
    await updateLastMessageDate(from);
    console.log('Last message date updated successfully');
    
    // Handle TEST command - simple test command
    if (messageUpper === 'TEST') {
      console.log(`Sending TEST response to ${from}`);
      try {
        await sendSmsResponse(
          from,
          'Hello world! 🌍',
          twilioClient
        );
        console.log(`Successfully sent TEST response to ${from}`);
      } catch (error) {
        console.error(`Error sending TEST response: ${error}`);
      }
      return;
    }
    
    // Handle TODAY command - send today's scheduled inspiration
    if (messageUpper === 'TODAY') {
      console.log(`Sending TODAY response to ${from}`);
      try {
        const todaysData = getTodaysInspiration();
        const responseText = formatDailyMessage(todaysData.inspiration);
        
        await sendSmsResponse(
          from,
          responseText,
          twilioClient
        );
        console.log(`Successfully sent TODAY response to ${from}: Day ${todaysData.day}`);
      } catch (error) {
        console.error(`Error sending TODAY response: ${error}`);
      }
      return;
    }
    

    
    // Handle MORE command - send an extra line of chaos
    if (messageUpper === 'MORE') {
      console.log(`Sending MORE response to ${from}`);
      try {
        // Use the actual messages data with weekend filtering
        const data = loadInspirationsData();
        
        // Check weekend mode for MORE command
        const weekendOverride = process.env.WEEKEND_MODE_SMS_OVERRIDE;
        let isWeekendMode = false;
        
        if (weekendOverride === 'ON') {
          isWeekendMode = true;
        } else if (weekendOverride === 'OFF') {
          isWeekendMode = false;
        } else {
          const pacificTime = new Intl.DateTimeFormat('en-US', {
            timeZone: 'America/Los_Angeles',
            weekday: 'short'
          }).format(new Date());
          isWeekendMode = ['Sat', 'Sun'].includes(pacificTime);
        }
        
        let availableMessages;
        if (isWeekendMode) {
          // Weekend mode: ONLY use type: weekend
          availableMessages = data.filter(item => item.type === 'weekend');
        } else {
          // Weekday mode: use everything EXCEPT type: weekend
          availableMessages = data.filter(item => item.type !== 'weekend');
        }
        const randomIndex = Math.floor(Math.random() * availableMessages.length);
        const chaosLine = availableMessages[randomIndex];
        
        // Use daily message formatting for MORE command to get proper formatting (weekend, disruption, etc.)
        const responseText = formatDailyMessage(chaosLine);
        
        await sendSmsResponse(
          from,
          responseText,
          twilioClient
        );
        
        // Update last_message_date but NOT last_inspiration_date
        // This ensures the MORE command doesn't prevent daily inspirations
        await updateLastMessageDate(from);
        
        console.log(`Successfully sent MORE response to ${from}: "${chaosLine.text}"`);
      } catch (error) {
        console.error(`Error sending MORE response: ${error}`);
      }
      return;
    }
    
    // Handle YES confirmation responses
    if (messageUpper === 'YES') {
      console.log('Processing YES confirmation...');
      const success = await confirmSubscriber(from);
      if (success) {
        // Send welcome/confirmation message first
        await sendSmsResponse(
          from,
          "You're in. Our AI coaches text now. This is the timeline we chose.\n\nText COMMANDS for options.\nText STOP to vanish quietly.",
          twilioClient
        );
        
        // Then send the correct day's inspiration message based on signup date
        try {
          // Use the signup date (now) to determine the correct day's message
          const signupDate = new Date();
          const correctDayData = getInspirationForNewSubscriber(signupDate);
          const inspirationMessage = formatDailyMessage(correctDayData.inspiration);
          
          // Track this message time to prevent duplicate sends (regular message + inspiration tracking)
          await updateLastMessageDate(from, signupDate);
          await updateLastInspirationDate(from, signupDate);
          
          await sendSmsResponse(
            from,
            inspirationMessage,
            twilioClient
          );
          console.log(`Successfully sent Day ${correctDayData.day} message to new subscriber ${from} (correct day based on signup date)`);
        } catch (error) {
          console.error(`Error sending message to new subscriber: ${error}`);
        }
      } else {
        await sendSmsResponse(
          from,
          "We couldn't process your confirmation. Please try again or contact support if the issue persists.",
          twilioClient
        );
      }
      return;
    }
    
    if (messageUpper === 'START' || messageUpper === 'UNSTOP') {
      console.log('Processing START/UNSTOP command...');
      const success = await resubscribeUser(from);
      if (success) {
        await sendSmsResponse(
          from,
          SMS_CONFIG.START_RESPONSE,
          twilioClient
        );
      } else {
        await sendSmsResponse(
          from,
          "We couldn't process your request. Please try again later.",
          twilioClient
        );
      }
      await sendSmsResponse(
        from,
        'Welcome back! You are now subscribed to The Foundry updates.',
        twilioClient
      );
      
      return;
    }
    
    // Handle SKIP command for admin users (QA feature)
    if (messageUpper === 'SKIP') {
      console.log('Processing SKIP command...');
      
      // Check if the user has admin privileges
      const subscriber = await getSubscriber(from);
      
      if (subscriber && subscriber.is_admin) {
        // User has admin privileges, process the skip command
        const newInspiration = skipToNextInspiration();
        const messageText = formatDailyMessage(newInspiration.inspiration);
        
        await sendSmsResponse(
          from,
          `✅ Skipped to next inspiration (Day ${newInspiration.day}):\n\n${messageText}`,
          twilioClient
        );
        
        console.log(`User ${from} with admin privileges skipped to day ${newInspiration.day}`); 
      } else {
        // User doesn't have admin privileges, ignore the command
        console.log(`User ${from} attempted to use SKIP command without admin privileges`); 
        // Send no response to avoid revealing the feature to non-admin users
      }
      
      return;
    }
    
    // Check subscriber status before processing other commands
    console.log('Checking subscriber status...');
    const subscriber = await getSubscriber(from);
    console.log('Subscriber lookup result:', subscriber);

    if (!subscriber || subscriber.unsubscribed) {
      console.log('User not subscribed or unsubscribed, sending subscription prompt');
      await sendSmsResponse(
        from,
        'You are not currently subscribed to The Foundry updates. Reply START to subscribe.',
        twilioClient
      );
      return;
    }
    
    console.log('User is valid subscriber, updating last message date...');
    // Update last message date
    await updateLastMessageDate(from);
    console.log('Sending to Leo as default response...');
    
    // Send undefined commands to Leo (easter egg default behavior)
    const handled = await handleLeoConversation(message, twilioClient, from);
    if (handled) {
      updateActiveConversation(from, 'Leo Varin');
      console.log('🥚 Leo handled undefined command as default response');
    } else {
      // Fallback if Leo fails
      await sendSmsResponse(
        from,
        'For help with AdvisorsFoundry, text INFO. Available commands: START, STOP, YES to confirm.',
        twilioClient
      );
      console.log('Fallback response sent (Leo failed)');
    }
    
  } catch (error) {
    console.error('Error handling SMS message:', error);
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    await sendSmsResponse(
      from, 
      'Sorry, I encountered an error processing your message. Please try again later.', 
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
        role: 'system', 
        content: SMS_CONFIG.SYSTEM_PROMPT 
      }
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
    const systemMessage = history.find(msg => msg.role === 'system');
    const recentMessages = history.slice(-maxMessages);
    
    if (systemMessage && !recentMessages.some(msg => msg.role === 'system')) {
      history = [systemMessage, ...recentMessages];
    } else {
      history = recentMessages;
    }
  }
  
  // Store in memory
  conversationStore.set(phoneNumber, history);
}

/**
 * Send SMS response to user
 * @param to Recipient's phone number
 * @param message Message content
 * @param twilioClient Twilio client instance
 */
async function sendSmsResponse(
  to: string,
  message: string,
  twilioClient: TwilioClient
): Promise<any> {
  return twilioClient.messages.create({
    body: message,
    to,
    from: process.env.TWILIO_PHONE_NUMBER
  });
}

/**
 * Cleanup resources when shutting down
 */
export async function cleanup(): Promise<void> {
  console.log('Cleaning up SMS handlers resources...');
  return Promise.resolve();
}

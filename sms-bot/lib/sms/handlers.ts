import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { SMS_CONFIG } from './config.js';
import { generateAiResponse } from './ai.js';
import type { TwilioClient } from './webhooks.js';
import { getSubscriber, resubscribeUser, unsubscribeUser, updateLastMessageDate, updateLastInspirationDate, confirmSubscriber } from '../subscribers.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Global cache for inspirations data, marketing messages, and day tracker
let inspirationsData: any[] = [];
let marketingMessages: any[] = [];
let dayTrackerPath: string = '';

function loadInspirationsData() {
  if (!inspirationsData.length) {
    try {
      const inspirationsPath = path.join(process.cwd(), 'data', 'af_daily_inspirations.json');
      inspirationsData = JSON.parse(fs.readFileSync(inspirationsPath, 'utf8'));
      dayTrackerPath = path.join(process.cwd(), 'data', 'day-tracker.json');
      console.log(`Loaded ${inspirationsData.length} inspirations from ${inspirationsPath}`);
    } catch (error) {
      console.error('ERROR: Cannot load daily inspirations file:', error);
      throw new Error('Daily inspirations file is missing or corrupted. Please check the file: af_daily_inspirations.json');
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

function getCurrentDay(): number {
  const data = loadInspirationsData();
  const tracker = loadDayTracker();
  const startDate = new Date(tracker.startDate);
  const currentDate = new Date();
  
  // Calculate days since start date
  const timeDiff = currentDate.getTime() - startDate.getTime();
  const daysDiff = Math.floor(timeDiff / (1000 * 3600 * 24));
  
  // Calculate current day (1-based, cycles through available inspirations)
  const calculatedDay = (daysDiff % data.length) + 1;
  
  // Update tracker if day has changed
  if (calculatedDay !== tracker.currentDay) {
    tracker.currentDay = calculatedDay;
    saveDayTracker(tracker);
  }
  
  return calculatedDay;
}

// Skip to the next day's inspiration (QA feature for early access users)
// Returns the new inspiration
export function skipToNextInspiration(): { day: number, inspiration: any } {
  const data = loadInspirationsData();
  const tracker = loadDayTracker();
  
  // Increment the current day, wrapping around if we reach the end
  tracker.currentDay = (tracker.currentDay % data.length) + 1;
  
  // Save the updated tracker
  saveDayTracker(tracker);
  
  // Return the new inspiration
  const inspirationIndex = tracker.currentDay - 1; // Convert to 0-based index
  const inspiration = data[inspirationIndex];
  
  return {
    day: tracker.currentDay,
    inspiration: inspiration
  };
}

// Make these functions available for the broadcast script
export function getTodaysInspiration() {
  const data = loadInspirationsData();
  const currentDay = getCurrentDay();
  const inspirationIndex = currentDay - 1; // Convert to 0-based index
  const inspiration = data[inspirationIndex];
  
  return {
    day: currentDay,
    inspiration: inspiration
  };
}

/**
 * Get the correct day's inspiration for new subscribers based on subscription date
 * @param signupDate Date when user signed up
 * @returns The correct day's inspiration for the new subscriber
 */
export function getInspirationForNewSubscriber(signupDate: Date = new Date()) {
  const data = loadInspirationsData();
  const tracker = loadDayTracker();
  const startDate = new Date(tracker.startDate);
  
  // Calculate days since start date based on signup date
  const timeDiff = signupDate.getTime() - startDate.getTime();
  const daysDiff = Math.floor(timeDiff / (1000 * 3600 * 24));
  
  // Calculate correct day (1-based, cycles through available inspirations)
  const correctDay = Math.max(1, (daysDiff % data.length) + 1);
  const inspirationIndex = correctDay - 1; // Convert to 0-based index
  const inspiration = data[inspirationIndex];
  
  return {
    day: correctDay,
    inspiration: inspiration
  };
}

export function formatDailyMessage(inspiration: any): string {
  // Get current date in "Month Day" format
  const currentDate = new Date();
  const dateString = currentDate.toLocaleDateString('en-US', { 
    month: 'long', 
    day: 'numeric' 
  });
  
  // Get marketing messages
  const messages = loadMarketingMessages();
  
  // Calculate which marketing message to use based on day of year
  // This ensures we cycle through marketing messages every 7 days
  // independently of the daily inspiration cycle (which is 60 days)
  const now = new Date();
  const startOfYear = new Date(now.getFullYear(), 0, 0);
  const diff = now.getTime() - startOfYear.getTime();
  const dayOfYear = Math.floor(diff / (1000 * 60 * 60 * 24));
  
  // Get the message for today (cycling through 0 to 6)
  const messageIndex = dayOfYear % messages.length;
  const marketingMessage = messages[messageIndex].message;
  
  // Prepend the swirl emoji (🌀) to the marketing message
  const formattedMarketingMessage = `🌀 ${marketingMessage}`;
  
  return `AF Daily — ${dateString}\n💬 "${inspiration.text}"\n— ${inspiration.author}\n\n${formattedMarketingMessage}`;
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
console.log('=== STARTUP: Coach data loaded ===');

// Track active conversations
interface ActiveConversation {
  coachName: string;
  lastInteraction: Date;
}

const activeConversations = new Map<string, ActiveConversation>();

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
    const coachProfile = coachData.ceos.find((c: CEO) => c.name.toLowerCase().includes(coachName.toLowerCase()));
    if (!coachProfile) {
      return [];
    }
    
    conversationStore.set(key, [
      { role: 'system', content: coachProfile.prompt }
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
    
    // Add AI response to history
    conversationHistory.push({ role: 'assistant', content: response });
    
    // Save updated conversation history
    saveCoachConversationHistory(from, coachProfile.name, conversationHistory);
    
    // Send the response
    await sendSmsResponse(from, response, twilioClient);
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
    const commandsThatEndConversation = ['COMMANDS', 'HELP', 'INFO', 'STOP', 'START', 'UNSTOP', 'TODAY', 'INSPIRE', 'MORE'];
    if (commandsThatEndConversation.includes(messageUpper)) {
      console.log(`Command ${messageUpper} received - ending any active conversation`);
      endConversation(from);
    }
    
    // Always check for system commands first
    if (messageUpper === 'COMMANDS' || messageUpper === 'HELP' || messageUpper === 'INFO') {
      console.log(`Sending COMMANDS response to ${from}`);
      await sendSmsResponse(
        from,
        'Available commands:\n• TODAY - Get today\'s inspiration\n• INSPIRE - Get random inspiration\n• MORE - Extra line of chaos\n• START - Subscribe to updates\n• STOP - Unsubscribe\n• COMMANDS - Show this help\n\nOr chat with our coaches by saying "Hey [coach name]"\n\nNote: Using any command will end your current coach conversation.',
        twilioClient
      );
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
      const handled = await handleCoachConversation(activeConversation.coachName, message, twilioClient, from);
      if (handled) {
        updateActiveConversation(from, activeConversation.coachName);
        return;
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
    
    // Handle INSPIRE command - send random daily inspiration
    if (messageUpper === 'INSPIRE') {
      console.log(`Sending INSPIRE response to ${from}`);
      try {
        // Pick a random inspiration from the array
        const data = loadInspirationsData();
        const randomIndex = Math.floor(Math.random() * data.length);
        const inspiration = data[randomIndex];
        
        const responseText = formatDailyMessage(inspiration);
        
        await sendSmsResponse(
          from,
          responseText,
          twilioClient
        );
        console.log(`Successfully sent INSPIRE response to ${from}: "${inspiration.text.substring(0, 50)}..."`);
      } catch (error) {
        console.error(`Error sending INSPIRE response: ${error}`);
      }
      return;
    }
    
    // Handle MORE command - send an extra line of chaos
    if (messageUpper === 'MORE') {
      console.log(`Sending MORE response to ${from}`);
      try {
        // Use the actual inspirations data
        const data = loadInspirationsData();
        const randomIndex = Math.floor(Math.random() * data.length);
        const chaosLine = data[randomIndex];
        
        const responseText = formatDailyMessage(chaosLine);
        
        await sendSmsResponse(
          from,
          responseText,
          twilioClient
        );
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
    
    // Handle SKIP command for early access users (QA feature)
    if (messageUpper === 'SKIP') {
      console.log('Processing SKIP command...');
      
      // Check if the user has early access privileges
      const subscriber = await getSubscriber(from);
      
      if (subscriber && subscriber.receive_early) {
        // User has early access, process the skip command
        const newInspiration = skipToNextInspiration();
        const messageText = formatDailyMessage(newInspiration.inspiration);
        
        await sendSmsResponse(
          from,
          `✅ Skipped to next inspiration (Day ${newInspiration.day}):\n\n${messageText}`,
          twilioClient
        );
        
        console.log(`User ${from} with early access skipped to day ${newInspiration.day}`); 
      } else {
        // User doesn't have early access, ignore the command
        console.log(`User ${from} attempted to use SKIP command without early access privileges`); 
        // Send no response to avoid revealing the feature to non-early access users
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
    console.log('Sending default response...');
    
    // Send a simple default response for any non-command message
    await sendSmsResponse(
      from,
      'For help with AdvisorsFoundry, text INFO. Available commands: START, STOP, YES to confirm.',
      twilioClient
    );
    
    console.log('Default response sent successfully');
    
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

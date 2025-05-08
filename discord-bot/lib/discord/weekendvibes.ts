// Weekend Vibes: Special weekend party chat for Discord bot
// This handles the special midnight "weekendvibes" event that kicks off the weekend

import { Client, TextChannel } from 'discord.js';
import * as fs from 'fs';
import * as path from 'path';
import { getCharacters } from './characters.js';
import { sendAsCharacter } from './webhooks.js';
import { generateCharacterResponse } from './ai.js';
import { getLocationAndTime } from './locationTime.js';
import { ceos } from '../../data/ceos.js';

// Import activities data
const activitiesPath = path.join(process.cwd(), 'data', 'weekend-activities.json');
let activities: Record<string, Record<string, any[]>> = {
  "Vegas": { "short": [], "medium": [], "long": [] },
  "Tokyo": { "short": [], "medium": [], "long": [] },
  "Berlin": { "short": [], "medium": [], "long": [] }
};

try {
  const activitiesData = fs.readFileSync(activitiesPath, 'utf-8');
  activities = JSON.parse(activitiesData);
} catch (error) {
  console.error('Error loading activities data:', error);
  // Already initialized with default structure
}

interface WeekendVibesState {
  location: string;
  selectedCharacters: Array<{id: string, name: string}>;
  isActive: boolean;
  conversationHistory: Array<{character: string, message: string}>;
  selectedActivity: any;
  episodeDuration: string;
}

const activeWeekendVibes = new Map<string, WeekendVibesState>();

// Calculate the episode duration based on time speed setting
function calculateEpisodeDuration() {
  // Read time speed from environment variable, default to 1 hour if not set
  const FAST_MODE = !!process.env.FAST_SCHEDULE;
  const FAST_INTERVAL_MINUTES = parseInt(process.env.FAST_SCHEDULE || "60");
  
  // Full episode is 24 scenes
  const episodeLengthMinutes = FAST_MODE ? 24 * FAST_INTERVAL_MINUTES : 24 * 60;
  
  // Categorize duration
  let durationCategory;
  let durationDescription;
  
  if (episodeLengthMinutes < 90) {
    durationCategory = "short";
    durationDescription = `${episodeLengthMinutes} minutes`;
  } else if (episodeLengthMinutes < 180) {
    durationCategory = "medium";
    durationDescription = `${Math.round(episodeLengthMinutes/60)} hours`;
  } else {
    durationCategory = "long";
    durationDescription = `${Math.round(episodeLengthMinutes/60)} hours`;
  }
  
  return { 
    category: durationCategory, 
    description: durationDescription,
    minutes: episodeLengthMinutes
  };
}

// Select a random activity based on location and duration
function selectActivity(location: string, durationCategory: string): any {
  // Clean up location name to match our data structure
  const cleanLocation = location.replace(' office', '').replace(' penthouse', '');
  const locationKey = Object.keys(activities).find(loc => 
    cleanLocation.includes(loc) || loc.includes(cleanLocation)
  ) || 'Vegas'; // Default to Vegas
  
  const activityList = activities[locationKey]?.[durationCategory] || [];
  
  if (activityList.length === 0) {
    return {
      name: `Weekend in ${locationKey}`,
      type: "exploration",
      description: `Exploring the best of ${locationKey} together.`,
      duration: "Variable"
    };
  }
  
  return activityList[Math.floor(Math.random() * activityList.length)];
}

// Main function to trigger weekend vibes chat
export async function triggerWeekendVibesChat(channelId: string, client: Client) {
  try {
    console.log('[WEEKEND] Starting Weekend Vibes chat for channel:', channelId);
    
    // Check if there's already an active weekend vibes chat
    if (activeWeekendVibes.has(channelId)) {
      console.log('[WEEKEND] Weekend Vibes chat already active in this channel');
      return;
    }

    // Get current location and time
    const now = new Date();
    const locationTime = await getLocationAndTime(now.getUTCHours(), now.getUTCMinutes());
    const { location, formattedTime, ampm, weather, weatherEmoji } = locationTime;
    
    // Calculate episode duration
    const duration = calculateEpisodeDuration();
    console.log(`[WEEKEND] Episode duration: ${duration.description} (${duration.category})`);
    
    // Select activity based on location and duration
    const selectedActivity = selectActivity(location, duration.category);
    console.log(`[WEEKEND] Selected activity: ${selectedActivity.name} (${selectedActivity.type})`);
    
    // Select coaches to participate (3-4 coaches)
    const selectedCharacters = selectWeekendCoaches();
    
    if (!selectedCharacters.length) {
      console.error('[WEEKEND] No coaches found for Weekend Vibes');
      return;
    }

    // Remove intro message - the scheduler handles this
    // Get the channel
    const channel = await client.channels.fetch(channelId) as TextChannel;
    if (!channel) {
      throw new Error(`Channel ${channelId} not found`);
    }

    // Initialize state
    const state: WeekendVibesState = {
      location,
      selectedCharacters,
      isActive: true,
      conversationHistory: [],
      selectedActivity,
      episodeDuration: duration.description
    };
    activeWeekendVibes.set(channelId, state);

    // Start the weekend party conversation
    await startWeekendVibesConversation(channelId, client, state);
    
    // Remove outro message - the scheduler handles this
    
    // Clear the active weekend vibes after it's done
    setTimeout(() => {
      if (activeWeekendVibes.has(channelId)) {
        activeWeekendVibes.delete(channelId);
        console.log('[WEEKEND] Weekend Vibes chat completed and cleared');
      }
    }, 5 * 60 * 1000); // Clean up after 5 minutes
    
  } catch (error) {
    console.error('[WEEKEND] Error in Weekend Vibes chat:', error);
    // Clean up in case of error
    if (activeWeekendVibes.has(channelId)) {
      activeWeekendVibes.delete(channelId);
    }
  }
}

// Helper function to select 3-4 coaches for the weekend party
function selectWeekendCoaches() {
  // Get only the CEOs, not the system character
  const availableCharacters = ceos.filter(char => char.id !== 'system');
  
  // Select 3-4 random coaches
  return [...availableCharacters]
    .sort(() => Math.random() - 0.5)
    .slice(0, 3 + Math.floor(Math.random() * 2)); // 3-4 coaches
}

// Start the weekend vibes conversation
async function startWeekendVibesConversation(channelId: string, client: Client, state: WeekendVibesState) {
  try {
    const { location, selectedCharacters, selectedActivity, episodeDuration } = state;
    const channel = await client.channels.fetch(channelId) as TextChannel;
    
    if (!channel) {
      throw new Error(`Channel ${channelId} not found`);
    }
    
    // First coach kicks off the weekend party
    const firstCoach = selectedCharacters[0];
    const intro = await generateWeekendOpener(firstCoach, location, selectedActivity, episodeDuration);
    
    // Send the weekend opener message
    await sendAsCharacter(channelId, firstCoach.id, intro);
    state.conversationHistory.push({ character: firstCoach.id, message: intro });
    
    // Second coach responds
    if (selectedCharacters.length > 1) {
      const secondCoach = selectedCharacters[1];
      const secondResponse = await generateWeekendResponse(
        secondCoach, 
        firstCoach, 
        intro, 
        location, 
        selectedActivity, 
        episodeDuration
      );
      await sendAsCharacter(channelId, secondCoach.id, secondResponse);
      state.conversationHistory.push({ character: secondCoach.id, message: secondResponse });
    }
    
    // Third coach joins in
    if (selectedCharacters.length > 2) {
      const thirdCoach = selectedCharacters[2];
      const firstMsg = state.conversationHistory[0].message;
      const secondMsg = state.conversationHistory[1].message;
      const thirdResponse = await generateWeekendFollowup(
        thirdCoach, 
        selectedCharacters.slice(0, 2), 
        [firstMsg, secondMsg], 
        location, 
        selectedActivity, 
        episodeDuration
      );
      await sendAsCharacter(channelId, thirdCoach.id, thirdResponse);
      state.conversationHistory.push({ character: thirdCoach.id, message: thirdResponse });
    }
    
    // Optional fourth coach
    if (selectedCharacters.length > 3) {
      const fourthCoach = selectedCharacters[3];
      const previousMessages = state.conversationHistory.map(h => h.message);
      const fourthResponse = await generateWeekendConclusion(
        fourthCoach, 
        selectedCharacters.slice(0, 3), 
        previousMessages, 
        location, 
        selectedActivity, 
        episodeDuration
      );
      await sendAsCharacter(channelId, fourthCoach.id, fourthResponse);
      state.conversationHistory.push({ character: fourthCoach.id, message: fourthResponse });
    }
    
    console.log('[WEEKEND] Completed weekend vibes chat');
  } catch (error) {
    console.error('[WEEKEND] Error in weekend vibes conversation:', error);
  }
}

// Generate the weekend opener message
async function generateWeekendOpener(character: any, location: string, activity: any, duration: string): Promise<string> {
  const prompt = `You are ${character.name}, and it's the weekend! 
  You're in ${location}, and you've spotted an interesting activity: ${activity.name} (${activity.type}).
  ${activity.description}
  
  As the first person to speak, suggest to your fellow CEOs/coaches that you all check out this activity together.
  You have about ${duration} to spend together for this weekend episode.
  
  Your message should be enthusiastic, fun, and set the weekend mood.
  Keep your response under 150 words and make it sound natural.
  
  IMPORTANT: 
  - Mention the specific activity by name
  - Reference the time you have available (${duration})
  - Be excited about spending the weekend with your fellow coaches`;
  
  return generateCharacterResponse(prompt, `Weekend activity: ${activity.name}`);
}

// Generate a response to the weekend opener
async function generateWeekendResponse(character: any, previousCharacter: any, previousMessage: string, location: string, activity: any, duration: string): Promise<string> {
  const prompt = `You are ${character.name}, responding to ${previousCharacter.name} who just said: "${previousMessage}"
  
  You're in ${location} for the weekend, and your colleague suggested checking out ${activity.name} (${activity.type}). 
  ${activity.description}
  You have about ${duration} to spend together.
  
  Respond to what they suggested, either agreeing enthusiastically or playfully suggesting a twist or modification to their plan.
  Your message should be fun, energetic, and reveal something about your character's weekend personality.
  Keep your response under 120 words and make it sound natural.
  
  IMPORTANT:
  - Acknowledge the specific activity mentioned
  - Add your personal touch to the plan
  - Show excitement for the weekend adventure`;
  
  return generateCharacterResponse(prompt, previousMessage);
}

// Generate a follow-up for the weekend conversation
async function generateWeekendFollowup(character: any, previousCharacters: any[], previousMessages: string[], location: string, activity: any, duration: string): Promise<string> {
  const combinedHistory = previousCharacters.map((char, i) => `${char.name}: "${previousMessages[i]}"`).join('\n');
  
  const prompt = `You are ${character.name}, joining this weekend conversation in ${location}:
  ${combinedHistory}
  
  Your colleagues are discussing ${activity.name} (${activity.type}).
  ${activity.description}
  You have about ${duration} to spend together.
  
  Add something unexpected or exciting to the weekend plans. This could be:
  - A specific detail about the activity that others might not know
  - A related activity that could complement the main one
  - A surprising skill or knowledge you have that's perfect for this activity
  
  Be playful and slightly surprising while staying true to your character.
  Keep your response under 120 words and make it sound natural.
  
  IMPORTANT:
  - Build on the existing conversation
  - Add a unique twist to the plan
  - Keep the focus on the selected activity while enhancing it`;
  
  return generateCharacterResponse(prompt, previousMessages.join(' '));
}

// Generate a conclusion for the weekend conversation
async function generateWeekendConclusion(character: any, previousCharacters: any[], previousMessages: string[], location: string, activity: any, duration: string): Promise<string> {
  const combinedHistory = previousCharacters.map((char, i) => `${char.name}: "${previousMessages[i]}"`).join('\n');
  
  const prompt = `You are ${character.name}, joining this weekend conversation in ${location}:
  ${combinedHistory}
  
  Your colleagues are discussing ${activity.name} (${activity.type}).
  ${activity.description}
  You have about ${duration} to spend together.
  
  Bring the conversation to an enthusiastic conclusion by:
  - Expressing excitement about the weekend plans discussed
  - Adding a final touch to make the weekend activity special
  - Suggesting when/where everyone should meet to start the adventure
  
  Your response should wrap up the conversation on a high note and get everyone excited for the weekend ahead.
  Keep your response under 150 words and make it sound natural.
  
  IMPORTANT:
  - Summarize the plan in an exciting way
  - Suggest a specific meeting time/place to kickoff the activity
  - Express enthusiasm about spending time with this group`;
  
  return generateCharacterResponse(prompt, previousMessages.join(' '));
} 
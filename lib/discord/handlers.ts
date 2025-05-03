import { Message, TextChannel, ThreadChannel, Client } from "discord.js";
import { ceos, CEO } from "../../data/ceos.js";
import { waterheaterIncidents } from "../../data/waterheater-incidents.js";
import { getCharacter, getCharacters, setActiveCharacter, handleCharacterInteraction, formatCharacterList } from './characters.js';
import { initializeWebhooks, sendAsCharacter } from './webhooks.js';
import { generateCharacterResponse } from './ai.js';
import { WebhookClient } from 'discord.js';
import IORedis from 'ioredis';
import { handlePitchCommand } from './pitch.js';
import { scheduler } from './timer.js';
import { triggerNewsChat } from './news.js';
import { triggerTmzChat } from './tmz.js';
import { getNextMessage, handleAdminCommand } from './adminCommands.js';
import { getCurrentStoryInfo } from './bot.js';
import { validateStoryInfo, formatStoryInfo } from './sceneFramework.js';
import { getRandomCharactersWithPairConfig, setWatercoolerPairConfig, getWatercoolerPairConfig } from './characterPairs.js';
import { getLocationAndTime } from './locationTime.js';
import fs from 'fs';
import path from 'path';
import { sendEventMessage } from './eventMessages.js';
import { isWeekend, initializeWeekendSchedule } from './weekend-schedule.js';
import { triggerWatercoolerChat as triggerWeekendWatercooler } from './watercooler-we.js';
import { triggerWaterheaterChat } from './waterheater.js';
import { triggerWeekendVibesChat } from './weekend-vibes.js';

export async function triggerWatercoolerChat(channelId: string, client: Client) {
  if (isWeekend()) {
    console.log('[WEEKEND] Redirecting to weekend watercooler handler');
    return triggerWeekendWatercooler(channelId, client);
  }

  try {
    // Diagnostic logging for watercooler pair config
    const pairConfig = getWatercoolerPairConfig();
    console.log('[DIAGNOSTIC] Current watercoolerPairConfig:', JSON.stringify(pairConfig, null, 2));
    // ... existing code ...
  } catch (error) {
    console.error('Error in watercooler chat:', error);
    throw error;
  }
}

// Initialize scheduled tasks when bot starts
export function initializeScheduledTasks(channelId: string, client: Client) {
  if (isWeekend()) {
    console.log('[WEEKEND] Initializing weekend schedule');
    initializeWeekendSchedule(channelId, client);
  } else {
    console.log('[WEEKDAY] Initializing weekday schedule');
    // (Disabled) Old timer-based scheduling is now handled by the centralized scheduler.
    // scheduler.addTask(
    //   'watercooler',  // taskId
    //   channelId,      // channelId
    //   60 * 60 * 1000, // intervalMs (60 minutes)
    //   () => triggerWatercoolerChat(channelId, client) // handler
    // );

    // scheduler.addTask(
    //   'newschat',     // taskId
    //   channelId,      // channelId
    //   4 * 60 * 1000,  // intervalMs (4 minutes)
    //   () => triggerNewsChat(channelId, client) // handler
    // );
  }
}

// Update the service map to handle weekend logic
const serviceMap: Record<string, (channelId: string, client: Client) => Promise<void>> = {
  watercooler: (channelId: string, client: Client) => 
    isWeekend() ? triggerWeekendWatercooler(channelId, client) : triggerWatercoolerChat(channelId, client),
  waterheater: triggerWaterheaterChat,
  newschat: triggerNewsChat,
  tmzchat: triggerTmzChat,
  weekendvibes: triggerWeekendVibesChat
};

// ... rest of the existing code ... 
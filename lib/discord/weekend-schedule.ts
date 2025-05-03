import { Client } from 'discord.js';
import { scheduler } from './timer.js';
import { triggerWatercoolerChat } from './watercooler-we.js';
import { triggerNewsChat } from './news.js';
import { triggerTmzChat } from './tmz.js';
import { triggerWeekendVibesChat } from './weekendvibes.js';

/**
 * Weekend schedule configuration
 * Defines intervals and timing for weekend chat activities
 * More relaxed timing compared to weekday schedule
 */
export const weekendSchedule = {
  // Watercooler chats every 30 minutes on weekends (more frequent but casual)
  watercooler: {
    intervalMs: 30 * 60 * 1000, // 30 minutes
    handler: triggerWatercoolerChat
  },
  
  // News chats every 45 minutes on weekends (less frequent than weekdays)
  newschat: {
    intervalMs: 45 * 60 * 1000, // 45 minutes
    handler: triggerNewsChat
  },
  
  // TMZ chats every 60 minutes on weekends (more casual frequency)
  tmzchat: {
    intervalMs: 60 * 60 * 1000, // 60 minutes
    handler: triggerTmzChat
  },

  // Weekend vibes chats every 2 hours
  weekendvibes: {
    intervalMs: 2 * 60 * 60 * 1000, // 2 hours
    handler: triggerWeekendVibesChat
  }
};

/**
 * Helper function to check if current time is weekend
 * Returns true if current day is Saturday (6) or Sunday (0)
 */
export function isWeekend(): boolean {
  const day = new Date().getDay();
  return day === 0 || day === 6;
}

/**
 * Initialize weekend schedule
 * Sets up all weekend-specific chat timers
 */
export function initializeWeekendSchedule(channelId: string, client: Client) {
  console.log('[WEEKEND] Initializing weekend schedule for channel:', channelId);
  
  // Schedule watercooler chats every 2 hours during weekends
  scheduler.addTask(
    'watercooler',
    channelId,
    2 * 60 * 60 * 1000, // 2 hours
    () => triggerWatercoolerChat(channelId, client)
  );
  
  // Schedule news chats every 6 hours during weekends
  scheduler.addTask(
    'newschat',
    channelId,
    6 * 60 * 60 * 1000, // 6 hours
    () => triggerNewsChat(channelId, client)
  );
  
  // Schedule TMZ chats every 4 hours during weekends
  scheduler.addTask(
    'tmzchat',
    channelId,
    4 * 60 * 60 * 1000, // 4 hours
    () => triggerTmzChat(channelId, client)
  );

  // Schedule weekend vibes chats every 2 hours
  scheduler.addTask(
    'weekendvibes',
    channelId,
    2 * 60 * 60 * 1000, // 2 hours
    () => triggerWeekendVibesChat(channelId, client)
  );
  
  console.log('[WEEKEND] Weekend schedule initialized successfully');
} 
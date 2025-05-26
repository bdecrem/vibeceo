#!/usr/bin/env node

console.log('🕐 TESTING SCHEDULER WEEKEND DETECTION\n');

// Test the same way the scheduler does it
import { isWeekend } from '../dist/lib/discord/locationTime.js';

console.log('=== SCHEDULER CONTEXT TEST ===');
console.log('Current time:', new Date().toISOString());

const isWeekendMode = isWeekend();
console.log(`[Scheduler] Is weekend mode: ${isWeekendMode}`);

// Test the path logic
const WEEKEND_SCHEDULE_PATH = "/Users/bartdecrem/Documents/Dropbox/coding2025/vibeceo8/discord-bot/data/weekend-schedule.txt";
const WEEKDAY_SCHEDULE_PATH = "/Users/bartdecrem/Documents/Dropbox/coding2025/vibeceo8/discord-bot/data/schedule.txt";

const schedulePath = isWeekendMode ? WEEKEND_SCHEDULE_PATH : WEEKDAY_SCHEDULE_PATH;
console.log(`[Scheduler] Loading ${isWeekendMode ? 'weekend' : 'weekday'} schedule from ${schedulePath}`);

// Check if files exist
import fs from 'fs';
console.log(`Weekend schedule exists: ${fs.existsSync(WEEKEND_SCHEDULE_PATH)}`);
console.log(`Weekday schedule exists: ${fs.existsSync(WEEKDAY_SCHEDULE_PATH)}`);

console.log('\n🎯 RESULT: Should be using', isWeekendMode ? 'WEEKEND' : 'WEEKDAY', 'schedule'); 
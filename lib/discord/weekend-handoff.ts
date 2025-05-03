import fs from 'fs';
import path from 'path';
import { DateTime } from 'luxon';

// Constants for handoff times
const LA_TZ = 'America/Los_Angeles';
const SG_TZ = 'Asia/Singapore';

// Friday 6pm LA time (start weekend)
function isWeekendStart(now: Date) {
  const dt = DateTime.fromJSDate(now, { zone: LA_TZ });
  return dt.weekday === 5 && dt.hour === 18; // Friday 6pm
}

// Sunday 6pm LA time (end weekend, resume weekday)
function isWeekendEnd(now: Date) {
  const dt = DateTime.fromJSDate(now, { zone: LA_TZ });
  return dt.weekday === 7 && dt.hour === 18; // Sunday 6pm
}

// Monday 9am Singapore time (alternative end, not used in this schedule)
function isWeekdayStartSingapore(now: Date) {
  const dt = DateTime.fromJSDate(now, { zone: SG_TZ });
  return dt.weekday === 1 && dt.hour === 9; // Monday 9am
}

// Read and parse the weekend schedule
export function getWeekendScheduleBlocks() {
  const filePath = path.join(__dirname, 'weekend-schedule.txt');
  const lines = fs.readFileSync(filePath, 'utf-8')
    .split('\n')
    .filter(line => line.trim() && !line.startsWith('#'));
  return lines.map(line => {
    const [start, location, duration] = line.split('|').map(s => s.trim());
    return { start, location, duration: Number(duration) };
  });
}

// Determine if we are in weekend mode
export function isWeekendMode(now: Date = new Date()) {
  const dt = DateTime.fromJSDate(now, { zone: LA_TZ });
  // Weekend mode from Friday 6pm to Sunday 6pm LA time
  if (dt.weekday === 5 && dt.hour >= 18) return true; // Friday after 6pm
  if (dt.weekday === 6) return true; // Saturday
  if (dt.weekday === 7 && dt.hour < 18) return true; // Sunday before 6pm
  return false;
} 
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { getTodaysInspiration, formatDailyMessage } from '../lib/sms/handlers.js';

// Get the directory name
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Environment detection
const isProduction = process.env.NODE_ENV === 'production';

// Load environment variables from .env.local
if (!isProduction) {
  const envPath = path.resolve(process.cwd(), '.env.local');
  console.log('Loading environment from:', envPath);
  const result = dotenv.config({ path: envPath });
  if (result.error) {
    console.error('Error loading .env.local:', result.error);
    process.exit(1);
  }
}

async function checkTodaysMessage() {
  try {
    console.log('=== TODAY\'S MESSAGE (Dev Environment) ===');
    const todaysData = await getTodaysInspiration();
    const messageText = formatDailyMessage(todaysData.inspiration);
    console.log(messageText);
    console.log('\n=== Message Details ===');
    console.log('Item ID:', todaysData.inspiration.item);
    console.log('Type:', todaysData.inspiration.type);
  } catch (error) {
    console.error('Error getting today\'s message:', error);
  }
}

checkTodaysMessage(); 
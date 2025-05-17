import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const envPath = path.resolve(__dirname, '../.env.local');

console.log('Loading environment from:', envPath);
dotenv.config({ path: envPath });

console.log('THELOUNGE_CHANNEL_ID:', process.env.THELOUNGE_CHANNEL_ID);
console.log('Environment Variables Check:');
console.log('- DISCORD_BOT_TOKEN exists:', !!process.env.DISCORD_BOT_TOKEN);
console.log('- OPENAI_API_KEY exists:', !!process.env.OPENAI_API_KEY);
console.log('- LOUNGE_WEBHOOK_URL_DONTE exists:', !!process.env.LOUNGE_WEBHOOK_URL_DONTE);

import { GENERAL_CHANNEL_ID, THELOUNGE_CHANNEL_ID } from '../dist/lib/discord/bot.js';
console.log('From bot.js constants:');
console.log('- GENERAL_CHANNEL_ID:', GENERAL_CHANNEL_ID);
console.log('- THELOUNGE_CHANNEL_ID:', THELOUNGE_CHANNEL_ID);

// Check if the getChannelForService function works
import { getChannelForService } from '../dist/lib/discord/scheduler.js';
console.log('Channel routing check:');
console.log('- watercooler should go to:', getChannelForService('watercooler'));
console.log('- microclass should go to:', getChannelForService('microclass'));
console.log('- crowdfaves should go to:', getChannelForService('crowdfaves'));
console.log('- simplestaffmeeting should go to:', getChannelForService('simplestaffmeeting'));

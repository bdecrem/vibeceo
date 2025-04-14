import { startBot } from '../lib/discord/bot.js';
import dotenv from 'dotenv';
import './health-check.js';
// Load environment variables from .env.local
if (process.env.NODE_ENV !== 'production') {
    dotenv.config({ path: '.env.local' });
}
// Check if another instance is already running
if (process.env.BOT_INSTANCE_ID) {
    console.log('Another bot instance is already running. Exiting...');
    process.exit(0);
}
// Set instance ID to prevent multiple instances
process.env.BOT_INSTANCE_ID = Date.now().toString();
// Start the bot
startBot().catch(error => {
    console.error('Failed to start bot:', error);
    process.exit(1);
});
// Handle graceful shutdown
process.on('SIGINT', () => {
    console.log('Shutting down bot...');
    process.exit(0);
});

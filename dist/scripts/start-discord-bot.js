import { startBot } from '../lib/discord/bot.js';
import dotenv from 'dotenv';
import './health-check';
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
startBot().catch(console.error);
// Handle graceful shutdown
process.on('SIGTERM', () => {
    console.log('Received SIGTERM signal. Starting graceful shutdown...');
    cleanup();
});
process.on('SIGINT', () => {
    console.log('Received SIGINT signal. Starting graceful shutdown...');
    cleanup();
});
async function cleanup() {
    console.log('Cleaning up...');
    try {
        // Import cleanup function from handlers
        const { cleanup: handlersCleanup } = await import('../lib/discord/handlers.js');
        await handlersCleanup();
        console.log('Cleanup completed');
        process.exit(0);
    }
    catch (error) {
        console.error('Error during cleanup:', error);
        process.exit(1);
    }
}

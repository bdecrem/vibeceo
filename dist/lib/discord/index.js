export * from './bot.js';
export * from './handlers.js';
export * from './config.js';
import { startBot } from './bot.js';
import { validateConfig } from './config.js';
// Initialize the Discord bot
export async function initializeDiscordBot() {
    try {
        validateConfig(); // This will throw if config is invalid
        await startBot();
        return true;
    }
    catch (error) {
        console.error('Failed to initialize Discord bot:', error);
        return false;
    }
}

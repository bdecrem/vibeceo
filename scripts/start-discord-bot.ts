import { startBot } from '../lib/discord/bot';
import { validateConfig } from '../lib/discord/config';

async function main() {
  try {
    // Validate configuration and get token and webhook URLs
    const { token, webhookUrls } = validateConfig();
    
    // Start the bot
    await startBot(token, webhookUrls);
    
    // Handle shutdown gracefully
    process.on('SIGINT', () => {
      console.log('Shutting down bot...');
      process.exit(0);
    });
  } catch (error) {
    console.error('Failed to start bot:', error);
    process.exit(1);
  }
}

main(); 
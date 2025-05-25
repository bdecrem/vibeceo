import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { startSmsBot } from '../lib/sms/bot.js';

// Get the directory name
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Environment detection
const isProduction = process.env.NODE_ENV === 'production';

// Load environment variables from .env.local
if (!isProduction) {
  const envPath = path.resolve(__dirname, '../../.env.local');
  console.log('Loading environment from:', envPath);
  const result = dotenv.config({ path: envPath });
  if (result.error) {
    console.error('Error loading .env.local:', result.error);
    process.exit(1);
  }
}

// Start the SMS bot
startSmsBot().catch(error => {
  console.error('Failed to start SMS bot:', error);
  process.exit(1);
});

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
    const { cleanup: handlersCleanup } = await import('../lib/sms/handlers.js');
    await handlersCleanup();
    console.log('Cleanup completed');
    process.exit(0);
  } catch (error) {
    console.error('Error during cleanup:', error);
    process.exit(1);
  }
}

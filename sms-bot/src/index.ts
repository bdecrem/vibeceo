import express from 'express';
import dotenv from 'dotenv';
import { startSmsBot } from '../lib/sms/bot.js';

// Environment detection
const isProduction = process.env.NODE_ENV === 'production';

// Load environment variables in development
if (!isProduction) {
  const result = dotenv.config({ path: '.env.local' });
  if (result.error) {
    console.error('Error loading .env.local file:', result.error);
    process.exit(1);
  }
}

// Start the SMS bot
startSmsBot().catch(console.error);

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

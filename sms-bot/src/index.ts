import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Get the sms-bot directory (not the dist/src directory)
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
// From dist/src/index.js -> go up to sms-bot/
const smsBotRoot = join(__dirname, '..', '..');

// Environment detection
const isProduction = process.env.NODE_ENV === 'production';

// Load environment variables - always use sms-bot/.env.local regardless of cwd
if (!isProduction) {
  const envPath = join(smsBotRoot, '.env.local');
  const result = dotenv.config({ path: envPath });
  if (result.error) {
    console.error(`❌ Error loading .env.local from ${envPath}:`, result.error);
    process.exit(1);
  }
  console.log(`✅ Loaded environment from ${envPath}`);

  // Verify critical Supabase variables
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY) {
    console.error('❌ Missing critical Supabase environment variables!');
    console.error('SUPABASE_URL:', process.env.SUPABASE_URL ? '✅' : '❌ MISSING');
    console.error('SUPABASE_SERVICE_KEY:', process.env.SUPABASE_SERVICE_KEY ? '✅' : '❌ MISSING');
    process.exit(1);
  }
}

async function start() {
  console.log('🚀 Starting Kochi Intelligence Runtime...\n');

  // Start Admin API for agent execution
  const { startAdminAPI } = await import('./agents/api/admin.js');
  startAdminAPI();

  // Start SMS Bot for Twilio webhooks
  const { startSmsBot } = await import('../lib/sms/bot.js');
  await startSmsBot();

  console.log('\n✅ All services started successfully');
}

start().catch((error) => {
  console.error(error);
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

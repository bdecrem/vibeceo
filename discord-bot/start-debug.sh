#!/bin/bash

echo "🔍 Debug Mode: Starting VibeCEO Discord Bot..."
echo "📝 Loading environment from .env.local"

# Print the environment variable file path
ENV_PATH="$(pwd)/.env.local"
echo "Environment file path: $ENV_PATH"

# Check if .env.local exists
if [ ! -f .env.local ]; then
    echo "❌ Error: .env.local file not found!"
    exit 1
fi

# Setup log file
LOG_DATE=$(date +"%Y-%m-%d_%H-%M-%S")
LOG_DIR="logs"
LOG_FILE="$LOG_DIR/debug-channel-routing-$LOG_DATE.log"

# Ensure logs directory exists
mkdir -p "$LOG_DIR"

# Display channel ID from the environment file
CHANNEL_ID=$(grep "THELOUNGE_CHANNEL_ID" .env.local | cut -d '=' -f2)
echo "THELOUNGE_CHANNEL_ID from .env.local: $CHANNEL_ID"

# Build the project
echo "🔨 Rebuilding the project..."
npm run build

# Create a temporary debug file
echo "Creating debug file in test-scripts directory..."
cat << EOF > test-scripts/debug-channel-check.js
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
EOF

# Run the debug check and output to log file
echo "🔍 Running channel ID debug check (output to $LOG_FILE)..."
node test-scripts/debug-channel-check.js | tee "$LOG_FILE"

# Start the bot with debug output
echo "🚀 Ready to start bot with correct channel routing"
echo "Run 'npm run start' to start the bot" 
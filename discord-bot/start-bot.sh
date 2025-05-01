#!/bin/bash

echo "🤖 Starting VibeCEO Discord Bot..."
echo "📝 Loading environment from .env.local"

# Check if .env.local exists
if [ ! -f .env.local ]; then
    echo "❌ Error: .env.local file not found!"
    echo "Please make sure .env.local exists with required environment variables:"
    echo "- DISCORD_BOT_TOKEN"
    echo "- OPENAI_API_KEY"
    echo "- Webhook URLs for all coaches"
    exit 1
fi

# Check if node_modules exists
if [ ! -d node_modules ]; then
    echo "📦 Installing dependencies..."
    npm install
fi

echo "🚀 Starting bot..."
npm run dev 
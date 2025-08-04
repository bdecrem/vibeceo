#!/bin/bash

echo "🚀 VibeCEO8 Development Setup for M-Series MacBook"
echo "================================================="

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js not found. Please install Node.js 18+ first:"
    echo "   Visit: https://nodejs.org/ or use nvm"
    exit 1
fi

# Check Node.js version
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo "❌ Node.js version $NODE_VERSION is too old. Please upgrade to 18+"
    exit 1
fi

echo "✅ Node.js $(node -v) detected"

# Install dependencies
echo "📦 Installing workspace dependencies..."
npm install

# Create environment file templates
echo "⚙️ Creating environment file templates..."

# Web environment template
if [ ! -f "web/.env.local" ]; then
    cat > web/.env.example << EOF
# VibeCEO8 Web App Environment Variables
# Copy this to .env.local and fill in your actual values

NEXT_PUBLIC_APP_URL=http://localhost:3000
NODE_ENV=development

# Database
SUPABASE_URL=your_supabase_project_url
SUPABASE_SERVICE_KEY=your_supabase_service_key
SUPABASE_ANON_KEY=your_supabase_anon_key

# AI Services  
OPENAI_API_KEY=sk-your_openai_api_key
ANTHROPIC_API_KEY=claude-your_anthropic_api_key

# Redis (optional)
REDIS_URL=redis://localhost:6379
EOF
    echo "📝 Created web/.env.example"
fi

# SMS Bot environment template
if [ ! -f "sms-bot/.env.local" ]; then
    cat > sms-bot/.env.example << EOF
# VibeCEO8 SMS Bot Environment Variables
# Copy this to .env.local and fill in your actual values

PORT=3030
NODE_ENV=development

# Database
SUPABASE_URL=your_supabase_project_url
SUPABASE_SERVICE_KEY=your_supabase_service_key

# AI Services
OPENAI_API_KEY=sk-your_openai_api_key
ANTHROPIC_API_KEY=claude-your_anthropic_api_key

# Twilio
TWILIO_ACCOUNT_SID=your_twilio_account_sid
TWILIO_AUTH_TOKEN=your_twilio_auth_token
TWILIO_PHONE_NUMBER=+1234567890
TWILIO_WHATSAPP_NUMBER=whatsapp:+18663300015

# Email
SENDGRID_API_KEY=SG.your_sendgrid_api_key

# Redis (optional)
REDIS_URL=redis://localhost:6379
EOF
    echo "📝 Created sms-bot/.env.example"
fi

# Discord Bot environment template
if [ ! -f "discord-bot/.env.local" ]; then
    cat > discord-bot/.env.example << EOF
# VibeCEO8 Discord Bot Environment Variables  
# Copy this to .env.local and fill in your actual values

NODE_ENV=development

# Discord
DISCORD_BOT_TOKEN=your_discord_bot_token

# AI Services
OPENAI_API_KEY=sk-your_openai_api_key
ANTHROPIC_API_KEY=claude-your_anthropic_api_key
TOGETHER_AI_API_KEY=your_together_ai_key

# Redis (optional)
REDIS_URL=redis://localhost:6379
EOF
    echo "📝 Created discord-bot/.env.example"
fi

echo ""
echo "🎉 Setup complete!"
echo ""
echo "📋 Next steps:"
echo "1. Copy .env.example to .env.local in each project folder:"
echo "   cp web/.env.example web/.env.local"
echo "   cp sms-bot/.env.example sms-bot/.env.local" 
echo "   cp discord-bot/.env.example discord-bot/.env.local"
echo ""
echo "2. Edit each .env.local file with your actual API keys"
echo ""
echo "3. Start development:"
echo "   npm run dev         # Start all services"
echo "   npm run dev:web     # Start web only"
echo "   npm run dev:sms     # Start SMS bot only"
echo "   npm run dev:discord # Start Discord bot only"
echo ""
echo "4. Check health:"
echo "   npm run check:health"
echo ""
echo "📖 Read DEV_SETUP.md for detailed instructions" 
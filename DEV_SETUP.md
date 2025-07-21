# VibeCEO8 Development Setup Guide (M-Series MacBook)

## 🚀 Quick Start

```bash
# Clone and setup everything
git clone https://github.com/bdecrem/vibeceo.git vibeceo8
cd vibeceo8
npm run setup
```

## 📋 Prerequisites

### Required Software
- **Node.js 18+** (use nvm for easy management)
- **npm 8+** 
- **Git**
- **VSCode/Cursor** with recommended extensions

### Install Node.js (M-Series optimized)
```bash
# Install nvm
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash

# Restart terminal or run:
source ~/.zshrc

# Install and use Node.js 18 (M-series optimized)
nvm install 18
nvm use 18
nvm alias default 18
```

## 🏗️ Project Structure

```
vibeceo8/
├── web/           # Next.js web application (port 3000)
├── sms-bot/       # SMS bot service (port 3030) 
├── discord-bot/   # Discord bot service
├── package.json   # Root workspace configuration
└── .env.local     # Environment variables (create this)
```

## ⚙️ Environment Setup

### 1. Install Dependencies
```bash
npm run setup
```

### 2. Configure Environment Variables

**Create `.env.local` files in each project:**

**Root `.env.local`:**
```bash
# Shared environment variables
NODE_ENV=development
```

**`web/.env.local`:**
```bash
# Next.js Web App
NEXT_PUBLIC_APP_URL=http://localhost:3000
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_KEY=your_supabase_service_key
OPENAI_API_KEY=sk-your_openai_key
ANTHROPIC_API_KEY=claude-your_anthropic_key
```

**`sms-bot/.env.local`:**
```bash
# SMS Bot Service  
PORT=3030
TWILIO_ACCOUNT_SID=your_twilio_sid
TWILIO_AUTH_TOKEN=your_twilio_token
TWILIO_PHONE_NUMBER=+1234567890
TWILIO_WHATSAPP_NUMBER=whatsapp:+18663300015
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_KEY=your_supabase_service_key
OPENAI_API_KEY=sk-your_openai_key
ANTHROPIC_API_KEY=claude-your_anthropic_key
SENDGRID_API_KEY=SG.your_sendgrid_key
```

**`discord-bot/.env.local`:**
```bash
# Discord Bot
DISCORD_BOT_TOKEN=your_discord_token
OPENAI_API_KEY=sk-your_openai_key  
ANTHROPIC_API_KEY=claude-your_anthropic_key
TOGETHER_AI_API_KEY=your_together_key
```

## 🚦 Development Commands

### Start Everything (Recommended)
```bash
npm run dev  # Starts all 3 services with color-coded logs
```

### Individual Services
```bash
npm run dev:web      # Next.js web app (localhost:3000)
npm run dev:sms      # SMS bot service (localhost:3030)  
npm run dev:discord  # Discord bot
```

### Building
```bash
npm run build        # Build all projects
npm run build:web    # Build web only
npm run build:sms    # Build SMS bot only
npm run build:discord # Build Discord bot only
```

### Testing
```bash
npm run test         # Run all tests
npm run test:web     # Web app tests
npm run test:sms     # SMS bot tests
```

## 🔍 Health Checks

### Check if services are running:
```bash
npm run check:health  # Check all services
```

### View logs:
```bash
npm run logs:web      # Web app logs
npm run logs:sms      # SMS bot logs  
npm run logs:discord  # Discord bot logs
```

## 🛠️ Troubleshooting

### Clean and restart:
```bash
npm run clean        # Clean all build artifacts and deps
npm run restart      # Clean, build, and start fresh
```

### Common issues:

**Port conflicts:**
```bash
# Kill processes on ports
lsof -ti:3000 | xargs kill -9  # Web app
lsof -ti:3030 | xargs kill -9  # SMS bot
```

**Node.js/npm issues:**
```bash
# Clear npm cache
npm cache clean --force

# Reinstall everything
npm run clean:deps && npm install
```

**M-Series specific issues:**
```bash
# Rebuild native modules for ARM64
npm rebuild
```

## 📝 Recommended VSCode/Cursor Extensions

- **TypeScript/JavaScript**: Built-in
- **Prettier**: Code formatting
- **ESLint**: Linting
- **Tailwind CSS IntelliSense**: For web styling
- **Thunder Client**: API testing
- **GitLens**: Git integration

## 🔄 Git Workflow

```bash
# Always check status before committing
git status

# Stage specific files (avoid git add .)
git add web/src/specific-file.ts

# Commit with descriptive messages
git commit -m "feat: add new feature to web app"

# Push to remote
git push
```

## 🎯 Service-Specific Notes

### Web App (Next.js)
- Runs on `localhost:3000`
- Hot reload enabled
- API routes available at `/api/*`

### SMS Bot
- Runs on `localhost:3030` 
- Webhook endpoint: `/sms/webhook`
- Health check: `/health`

### Discord Bot
- No web interface
- Logs to console and files
- Auto-reconnects on errors

## 🚨 Important Notes

1. **Never commit `.env.local` files** - they contain secrets
2. **Build artifacts are gitignored** - including `tiny/build/`
3. **Use specific file commits** - avoid `git add .`
4. **M-Series optimization** - All dependencies are ARM64 compatible

## 📞 Getting Help

If you encounter issues:
1. Check the logs: `npm run logs:servicename`
2. Verify environment variables are set
3. Ensure ports aren't in use
4. Try a clean restart: `npm run restart` 
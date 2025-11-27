# Vibeceo Project Setup Guide

Welcome! This guide will help you set up the Vibeceo platform on your local machine.

## Prerequisites

✅ **Node.js 20.x** (You have: v20.12.2)
✅ **npm 10.x+** (You have: v10.5.0)
- **Python 3.10+** (Only needed for autonomous agents)
- **Supabase Account** (for database)
- **Twilio Account** (for SMS features)

## Quick Start

### 1. Install Dependencies

```bash
cd vibeceo
npm install
```

This will install dependencies for all workspaces (web, sms-bot, discord-bot, poke-webtoys-mcp).

### 2. Configure Environment Variables

I've created a template file `.env.template` with all required variables. Now you need to:

**Copy the template to create your environment file:**

```bash
cp .env.template .env.local
```

**Then edit `.env.local` and fill in your API keys.**

## Required API Keys

### 🔴 **CRITICAL - Minimum to run locally:**

1. **Supabase** (Database)
   - Go to: https://app.supabase.com/project/_/settings/api
   - Get: `SUPABASE_URL`, `SUPABASE_SERVICE_KEY`, `SUPABASE_ANON_KEY`
   - ⚠️ Note: Use the NEW anon key format (`sb_publishable_*`), not the old JWT format

2. **Twilio** (SMS)
   - Go to: https://console.twilio.com/
   - Get: `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_PHONE_NUMBER`

3. **OpenAI** (AI Generation)
   - Go to: https://platform.openai.com/api-keys
   - Get: `OPENAI_API_KEY`

4. **Anthropic** (Claude AI)
   - Go to: https://console.anthropic.com/settings/keys
   - Get: `ANTHROPIC_API_KEY`

### 🟡 **OPTIONAL - For specific features:**

5. **LemonSqueezy** (Payments) - Only if you need payment processing
6. **ElevenLabs** (TTS Audio) - Only if you need audio reports
7. **SendGrid** (Email) - Only if you need email features
8. **Google OAuth** (Gmail) - Only if you need Gmail integration
9. **Claude Code OAuth** - Only if you need autonomous agents (Python SDK)

## Service-Specific Setup

### Web App (Port 3000)

The web app needs its own `.env` file:

```bash
cd web
cp .env.example .env.local
```

Edit `web/.env.local` and add:
- Supabase credentials
- Twilio credentials (for SMS verification)
- OpenAI API key (for chat features)
- LemonSqueezy credentials (if using payments)

### SMS Bot (Port 3030)

The SMS bot shares the root `.env.local` file you just created.

### Poke MCP Server (Port 3456)

```bash
cd poke-webtoys-mcp
cp .env.example .env
```

Edit and set `WEBTOYS_API_URL=http://localhost:3030`

### Discord Bot

```bash
cd discord-bot
# Discord bot needs its own .env with Discord credentials
# See discord-bot/README.md for details
```

## Build the Project

### Build SMS Bot (TypeScript compilation)

```bash
cd sms-bot
npm run build
```

This compiles TypeScript to JavaScript in `sms-bot/dist/`.

### Build Web App (Optional - not needed for dev mode)

```bash
cd web
npm run build
```

## Running the Services

### Development Mode (Recommended)

Run all services at once:

```bash
npm run dev
```

This starts:
- 🌐 Web App on http://localhost:3000
- 📱 SMS Bot on http://localhost:3030
- 💬 Discord Bot (if configured)

### Individual Services

```bash
# Web only
npm run dev:web

# SMS bot only
npm run dev:sms

# Discord bot only
npm run dev:discord

# Poke MCP only
npm run dev:mcp
```

## Testing Your Setup

### 1. Check Web App

Open browser to: http://localhost:3000

You should see the Webtoys/AdvisorsFoundry landing page.

### 2. Check SMS Bot Health

```bash
curl http://localhost:3030/health
```

Should return: `{"status":"ok"}`

### 3. Test SMS Webhook (Local Development)

You'll need ngrok or similar to expose localhost to Twilio:

```bash
# Install ngrok: https://ngrok.com/
ngrok http 3030

# Then in Twilio console, set your webhook URL to:
# https://your-ngrok-url.ngrok.io/sms/webhook
```

## Database Setup

The project expects these Supabase tables:
- `sms_subscribers`
- `wtaf_content`
- `wtaf_zero_admin_collaborative`
- `wtaf_themes`
- `agent_subscriptions`
- `arxiv_papers`, `arxiv_authors`
- `stock_*` tables
- Others...

See `sms-bot/documentation/` for schema details.

**Option 1:** Import schema from existing Supabase project
**Option 2:** Run migrations (if available in repo)
**Option 3:** Contact project maintainer for database dump

## Common Issues

### "Missing required environment variables"

Make sure `.env.local` exists in the root directory and contains all required keys.

### "Port already in use"

Kill existing processes:
```bash
# Find process on port 3000
lsof -ti:3000 | xargs kill -9

# Find process on port 3030
lsof -ti:3030 | xargs kill -9
```

### "Cannot find module"

Run `npm install` again in the root directory.

### SMS Bot build errors

Make sure you're using Node.js 20.x:
```bash
node --version  # Should show v20.x.x
```

### Supabase connection errors

- Check `SUPABASE_URL` format: `https://yourproject.supabase.co`
- Verify you're using the SERVICE_KEY (not anon key) for server-side code
- Verify you're using the NEW anon key format (`sb_publishable_*`)

## Project Structure

```
vibeceo/
├── web/                # Next.js web app (port 3000)
├── sms-bot/           # SMS processing engine (port 3030)
├── discord-bot/       # Discord community bot
├── poke-webtoys-mcp/  # Poke MCP server (port 3456)
├── package.json       # Monorepo workspace config
└── .env.local         # Your environment variables (DO NOT COMMIT)
```

## Next Steps

1. **Read the docs**: Check [CLAUDE.md](CLAUDE.md) for development rules
2. **Explore agents**: See [AGENTS.md](AGENTS.md) for agent architecture
3. **Test SMS generation**: Send a test SMS to your Twilio number
4. **Check the web gallery**: Visit http://localhost:3000/trending

## Getting Help

- Documentation: Check `/sms-bot/documentation/` folder
- Architecture: Read [CLAUDE.md](CLAUDE.md)
- Agents: Read [AGENTS.md](AGENTS.md)
- Issues: Check existing documentation in `memory-bank/`

## Important Reminders

🚨 **NEVER commit `.env.local` or any file with actual API keys**
🚨 **Always use environment variables, never hardcode secrets**
🚨 **The SMS bot must be rebuilt after TypeScript changes: `cd sms-bot && npm run build`**
🚨 **WebtoysOS updates must use `safe-update-wrapper.js` - never edit database directly**

---

Happy coding! 🚀

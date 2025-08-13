# 🚀 VibeCEO8 Quick Start

## One-Command Setup

```bash
npm run setup
```

This will:
- ✅ Install all dependencies for all 3 projects
- ✅ Create environment templates 
- ✅ Verify Node.js version compatibility
- ✅ Set up workspace configuration

## Environment Configuration

After setup, copy and configure your environment files:

```bash
# Copy templates to actual env files
cp web/.env.example web/.env.local
cp sms-bot/.env.example sms-bot/.env.local  
cp discord-bot/.env.example discord-bot/.env.local

# Edit each .env.local with your actual API keys
code web/.env.local        # or cursor/nano/vim
code sms-bot/.env.local
code discord-bot/.env.local
```

## Start Development

```bash
# Start all 3 services at once (recommended)
npm run dev

# Or start individually:
npm run dev:web      # localhost:3000
npm run dev:sms      # localhost:3030  
npm run dev:discord  # console output
```

## Health Check

```bash
npm run check:health
```

## Project Structure

```
vibeceo8/
├── 🌐 web/           # Next.js app (localhost:3000)
├── 📱 sms-bot/       # SMS service (localhost:3030)
├── 🤖 discord-bot/   # Discord bot
├── 📦 package.json   # Root workspace config
├── 🛠️ setup-dev.sh   # Auto-setup script
└── 📖 DEV_SETUP.md   # Detailed guide
```

## Need Help?

- **Detailed setup**: Read `DEV_SETUP.md`
- **Clean restart**: `npm run restart`
- **Port conflicts**: `lsof -ti:3000 | xargs kill -9`

---

**M-Series MacBook Optimized** ✨ 
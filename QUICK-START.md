# Quick Start Guide - Vibeceo Development

Get up and running in **5 minutes** with the SMS bot development tools.

## ✅ Prerequisites Checklist

- [x] Node.js 20.x installed (you have v20.12.2 ✅)
- [x] Dependencies installed (node_modules exists ✅)
- [x] `.env.local` file created with API keys ✅
- [ ] Twilio credentials (only needed for real SMS testing)

## 🚀 Start Developing (2 Steps)

### Step 1: Build the SMS Bot

```bash
cd sms-bot
npm run build
```

This compiles TypeScript to JavaScript in `sms-bot/dist/`.

### Step 2: Start the SMS Listener

```bash
npm run dev
```

You should see:
```
🚀 SMS Bot is running on port 3030
✅ Health check endpoint: http://localhost:3030/health
📱 SMS webhook: http://localhost:3030/sms/webhook
🧪 Dev webhook: http://localhost:3030/dev/webhook
```

**Leave this running in Terminal 1.**

---

## 🧪 Test Commands Locally (Recommended)

### Open a new terminal and run:

```bash
cd sms-bot
npm run dev:reroute:v2
```

You'll get an interactive shell:

```
📱 DEV REROUTE V2 - SMS BOT LOCAL TESTING
📡 Sends HTTP requests to SMS bot on port 3030
✅ Uses test number - no real SMS delivery!
================================================================================

📱 sms> _
```

### Try these commands:

```
📱 sms> AI DAILY
📱 sms> RECRUIT senior backend engineers at startups
📱 sms> YT bitcoin trading
📱 sms> CRYPTO
📱 sms> ARXIV
```

**Features:**
- ✅ **No real SMS sent** - uses test phone number
- ✅ **Instant results** - see responses immediately
- ✅ **No costs** - free testing
- ✅ **Exact SMS rendering** - see what users see
- ✅ **Command history** saved automatically

---

## 📱 Test with Real SMS (Optional)

Only needed for final testing before production deployment.

### Requirements:
1. Add Twilio credentials to `.env.local`:
   ```bash
   TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxx
   TWILIO_AUTH_TOKEN=your_auth_token
   TWILIO_PHONE_NUMBER=+1234567890
   TWILIO_PHONE_SID=PNxxxxxxxxxxxxxx
   ```

2. Install and start ngrok:
   ```bash
   ngrok http 3030
   ```

3. Route Twilio to your local machine:
   ```bash
   cd sms-bot
   ./scripts/toggle-sms.sh dev
   ```

4. Send real SMS to your Twilio number from your phone!

5. When done, route back to production:
   ```bash
   ./scripts/toggle-sms.sh prod
   ```

---

## 🌐 Start the Web App (Optional)

### Terminal 3:

```bash
cd web
npm run dev
```

Web app runs on http://localhost:3000

---

## 📚 Current Status

Your environment has:
- ✅ Supabase configured
- ✅ OpenAI API key
- ✅ Anthropic API key
- ⚠️ Twilio credentials needed (only for real SMS testing)

### Missing (Optional):
These are only needed for specific features:
- ElevenLabs (audio reports)
- SendGrid (email)
- LemonSqueezy (payments)
- Gmail OAuth (Gmail features)

---

## 🔧 Troubleshooting

### "Cannot connect to SMS bot"

```bash
# Check if running
curl http://localhost:3030/health

# If not, start it:
cd sms-bot && npm run dev
```

### "Port 3030 already in use"

```bash
lsof -ti:3030 | xargs kill -9
cd sms-bot && npm run dev
```

### Build errors

```bash
cd sms-bot
rm -rf dist/
npm run build
```

---

## 📖 Learn More

- **[DEV-TOOLS-GUIDE.md](DEV-TOOLS-GUIDE.md)** - Detailed guide for both dev tools
- **[SETUP-GUIDE.md](SETUP-GUIDE.md)** - Complete setup instructions
- **[CLAUDE.md](CLAUDE.md)** - Architecture and development rules
- **[AGENTS.md](AGENTS.md)** - Agent system documentation

---

## 🎯 Next Steps

1. **Explore the codebase:**
   - [sms-bot/engine/](sms-bot/engine/) - Core SMS processing
   - [sms-bot/agents/](sms-bot/agents/) - AI agent implementations
   - [sms-bot/commands/](sms-bot/commands/) - Command handlers
   - [web/app/](web/app/) - Next.js web application

2. **Try creating a new command:**
   - Add a file to `sms-bot/commands/`
   - Follow the pattern in existing commands
   - Build and test with `dev:reroute:v2`

3. **Modify an existing agent:**
   - Check `sms-bot/agents/` for examples
   - Each agent has its own README
   - Test changes locally before deploying

---

## 💡 Pro Tips

1. **Use `dev:reroute:v2` for all development** - it's faster and free
2. **Only use `toggle-sms.sh` for final pre-deployment testing**
3. **Keep Terminal 1 running** (SMS bot) while you work
4. **Watch the logs** in Terminal 1 to see what's happening
5. **Command history** is saved to `sms-bot/dev-reroute-history.txt`

---

Happy coding! 🚀

**Questions?** Check the documentation files or explore the codebase.

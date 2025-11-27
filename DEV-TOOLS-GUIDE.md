# Development Tools Guide

This guide explains the two essential development tools for working with the SMS bot locally.

## Overview

When developing SMS bot features, you have two powerful tools:

1. **`toggle-sms.sh`** - Reroutes Twilio webhooks to your local machine
2. **`dev:reroute:v2`** - Interactive terminal for testing commands locally (NO REAL SMS)

## Tool 1: Toggle SMS Script (`sms-bot/scripts/toggle-sms.sh`)

### What it does
Routes **REAL** Twilio SMS messages to your local development machine via ngrok.

### When to use it
- Testing with real SMS messages from your phone
- End-to-end testing with actual Twilio delivery
- When you need to test the full SMS flow including delivery

### Setup Requirements

1. **ngrok** must be running with a tunnel to port 3030
2. **Twilio credentials** in `.env.local`:
   - `TWILIO_ACCOUNT_SID`
   - `TWILIO_AUTH_TOKEN`
   - `TWILIO_PHONE_SID`
   - `TWILIO_PHONE_NUMBER`

### Usage

```bash
cd vibeceo/sms-bot

# Route to your local machine (requires ngrok)
./scripts/toggle-sms.sh dev      # Mac Mini
./scripts/toggle-sms.sh mba      # MacBook Air

# Route back to production
./scripts/toggle-sms.sh prod
```

### How it works

1. **Checks ngrok is running** (port 4040 API)
2. **Updates Twilio webhook** via Twilio API
3. **SMS messages to your Twilio number** → routed to `http://localhost:3030/sms/webhook`
4. **Real SMS delivery** - responses sent back to your phone

### ngrok Setup

```bash
# Install ngrok
brew install ngrok  # macOS
# OR download from https://ngrok.com/

# Start ngrok tunnel
ngrok http 3030

# Get your ngrok URL (e.g., https://abc123.ngrok.io)
# Update toggle-sms.sh with your ngrok URL if needed
```

---

## Tool 2: Dev Reroute V2 (`npm run dev:reroute:v2`)

### What it does
**Interactive terminal shell** that sends commands directly to your local SMS bot WITHOUT sending real SMS messages.

### When to use it (RECOMMENDED FOR DEVELOPMENT)
- ✅ Testing commands without SMS costs
- ✅ Rapid iteration and debugging
- ✅ No phone spam during development
- ✅ See responses EXACTLY as users receive them
- ✅ Test multi-message sequences
- ✅ No ngrok or Twilio webhook setup needed

### Setup Requirements

1. **SMS bot running** on port 3030
2. **No other requirements** - uses test phone number automatically

### Usage

```bash
cd vibeceo/sms-bot

# Start the interactive shell
npm run dev:reroute:v2
```

### Interactive Shell

```
📱 DEV REROUTE V2 - SMS BOT LOCAL TESTING
📡 Sends HTTP requests to SMS bot on port 3030
✅ Uses test number - no real SMS delivery!
📱 Responses mirror EXACTLY what users see in SMS
================================================================================

🎯 Ready! Type commands and press Enter.

📱 sms> RECRUIT senior backend engineers at startups
📡 Sending to http://localhost:3030/dev/webhook...
📱 From: +15555551234 (TEST NUMBER - no real SMS)
💬 Message: "RECRUIT senior backend engineers at startups"
✅ Message sent successfully (200)

────────────────────────────────────────────────────────────────────────────────
📱 SMS MESSAGES (exactly as user receives them):
────────────────────────────────────────────────────────────────────────────────
RECRUIT project started! ...
────────────────────────────────────────────────────────────────────────────────

📱 sms> AI DAILY
📡 Sending to http://localhost:3030/dev/webhook...
...
```

### Available Commands in Shell

- **Any SMS command** - Test as if sending real SMS:
  - `RECRUIT senior backend engineers`
  - `SCORE 1:5 2:3 3:4`
  - `AI DAILY`
  - `KG find papers about transformers`
  - `YT bitcoin trading`
  - `CRYPTO`
  - `ARXIV`
  - etc.

- **`help`** - Show help and examples
- **`status`** - Check if SMS bot is running
- **`exit` or `quit`** - Exit the shell

### Features

✅ **Test phone number** (`+15555551234`) - prevents real SMS delivery
✅ **Exact SMS rendering** - see responses as users receive them
✅ **Multi-message sequences** - clearly separated messages
✅ **Command history** - saved to `dev-reroute-history.txt`
✅ **No costs** - no SMS charges during development
✅ **No spam** - no messages to your phone

### How it works

1. **Sends HTTP POST** to `http://localhost:3030/dev/webhook`
2. **Uses test phone number** (`+15555551234`)
3. **SMS bot processes** with mock Twilio client
4. **Captures all responses** - no real SMS sent
5. **Displays responses** exactly as they appear in SMS

### Dev Webhook Endpoint

The SMS bot has a special `/dev/webhook` endpoint that:
- Accepts requests without Twilio signature validation
- Uses a mock Twilio client that captures messages instead of sending
- Returns JSON with all captured responses
- Perfect for local testing without real SMS

---

## Comparison: Which Tool to Use?

| Feature | `toggle-sms.sh` | `dev:reroute:v2` |
|---------|-----------------|------------------|
| **Real SMS** | ✅ Yes | ❌ No (simulated) |
| **SMS Costs** | 💰 Yes | ✅ Free |
| **Requires ngrok** | ✅ Yes | ❌ No |
| **Requires Twilio** | ✅ Yes | ❌ No |
| **Phone spam** | ⚠️ Yes | ✅ No |
| **Speed** | Slower (network) | ⚡ Instant |
| **Best for** | Final testing | Development |
| **Use when** | Pre-production | Daily coding |

### Recommended Workflow

1. **Start here**: Use `dev:reroute:v2` for all development
   - Fast iteration
   - No costs
   - No setup hassle

2. **Before deploying**: Use `toggle-sms.sh dev` for final testing
   - Real SMS delivery
   - End-to-end verification
   - Test on actual phone

3. **Deploy**: Switch back to production
   ```bash
   ./scripts/toggle-sms.sh prod
   ```

---

## Complete Development Setup

### Step 1: Install Dependencies

```bash
cd vibeceo
npm install
```

### Step 2: Configure Environment

Make sure your `.env.local` has at minimum:
- ✅ `SUPABASE_URL`
- ✅ `SUPABASE_SERVICE_KEY`
- ✅ `OPENAI_API_KEY`
- ✅ `ANTHROPIC_API_KEY`

Twilio credentials are only needed for `toggle-sms.sh`.

### Step 3: Build SMS Bot

```bash
cd sms-bot
npm run build
```

### Step 4: Start SMS Bot

**Terminal 1:** Start the SMS listener
```bash
cd sms-bot
npm run dev
```

You should see:
```
🚀 SMS Bot is running on port 3030
✅ Health check endpoint: http://localhost:3030/health
📱 SMS webhook: http://localhost:3030/sms/webhook
🧪 Dev webhook: http://localhost:3030/dev/webhook
```

### Step 5: Test with Dev Reroute

**Terminal 2:** Start the interactive shell
```bash
cd sms-bot
npm run dev:reroute:v2
```

Type commands and see responses instantly!

---

## Troubleshooting

### "Cannot connect to SMS bot"

**Problem:** Dev reroute can't reach port 3030

**Solution:**
```bash
# Check if SMS bot is running
curl http://localhost:3030/health

# If not, start it:
cd sms-bot
npm run dev
```

### "Port 3030 already in use"

**Problem:** Another process is using port 3030

**Solution:**
```bash
# Find and kill the process
lsof -ti:3030 | xargs kill -9

# Then restart SMS bot
npm run dev
```

### "ngrok not running" (toggle-sms.sh)

**Problem:** Trying to use `toggle-sms.sh dev` without ngrok

**Solution:**
```bash
# Start ngrok first
ngrok http 3030

# Then run toggle-sms.sh
./scripts/toggle-sms.sh dev
```

### "Missing Twilio credentials"

**Problem:** `toggle-sms.sh` can't find credentials

**Solution:**
Add to `.env.local`:
```bash
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your_auth_token
TWILIO_PHONE_NUMBER=+1234567890
TWILIO_PHONE_SID=PNxxxxxxxxxxxxxx
```

### Build Errors

**Problem:** TypeScript compilation fails

**Solution:**
```bash
# Make sure you're using Node 20.x
node --version  # Should be v20.x.x

# Clean and rebuild
cd sms-bot
rm -rf dist/
npm run build
```

---

## Advanced Tips

### Command History

Dev reroute saves all commands to `sms-bot/dev-reroute-history.txt`:

```
DEV REROUTE Command History
===========================

[2025-11-22T19:30:15.123Z] SENT: "RECRUIT senior backend engineers"
[2025-11-22T19:31:42.456Z] SENT: "SCORE 1:5 2:3"
[2025-11-22T19:32:10.789Z] SENT: "AI DAILY"
```

### Single Command Mode

Run a single command without interactive mode:

```bash
npm run dev:reroute:v2 -- AI DAILY
```

### Testing Conversation State

The dev reroute uses the same phone number (+15555551234) for all commands, so conversation state persists:

```
📱 sms> RECRUIT senior backend engineers
[Bot starts recruiting project...]

📱 sms> SCORE 1:5 2:3 3:4
[Bot scores candidates in the active project...]
```

### Checking SMS Bot Logs

**Terminal 1** (where SMS bot is running) shows real-time logs:
```
🔧 Working directory: /Users/you/vibeceo/sms-bot
🔧 Dotenv result: Success
✅ SMS Bot is running on port 3030
📱 DEV WEBHOOK: Returning 1 responses
```

---

## Summary

### For Daily Development: Use `dev:reroute:v2` ⭐

```bash
# Terminal 1: Start SMS bot
cd sms-bot && npm run dev

# Terminal 2: Interactive testing
cd sms-bot && npm run dev:reroute:v2

# Type commands, see instant results!
```

### For Final Testing: Use `toggle-sms.sh`

```bash
# Start ngrok
ngrok http 3030

# Route to local
./scripts/toggle-sms.sh dev

# Test with real SMS from your phone

# Route back to production when done
./scripts/toggle-sms.sh prod
```

---

Happy coding! 🚀

Need help? Check the main [SETUP-GUIDE.md](SETUP-GUIDE.md) or [CLAUDE.md](CLAUDE.md) documentation.

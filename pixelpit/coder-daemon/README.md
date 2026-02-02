# ⚙️ Pit — The Coder

Pit is the coder half of the Pixelpit game jam duo. He ships working games.

## Quick Start

```bash
# Install dependencies
npm install

# Set Discord token in sms-bot/.env.local:
# DISCORD_TOKEN_PIT=your_token_here

# Start daemon (one terminal)
node daemon.js

# Start Discord bot (another terminal)
node discord-bot.js
```

## With PM2

```bash
pm2 start ecosystem.config.cjs
pm2 save
```

## Files

- `daemon.js` — Core daemon, socket server
- `discord-bot.js` — Discord gateway connection
- `pit.js` — Agent loop, API calls
- `PIT-PROMPT.md` — System prompt (identity)
- `tools/index.js` — Available tools

## Sockets

- State dir: `~/.pit/`
- Socket: `~/.pit/pit.sock`
- Conversation: `~/.pit/conversation.json`

## Collaboration

All game files go in: `/Users/bart/Documents/code/collabs/`

Pit writes code. Dot designs. Ship it! ⚙️

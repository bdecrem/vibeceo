# 🎨 Dot — The Designer

Dot is the designer half of the Pixelpit game jam duo. She makes games beautiful.

## Quick Start

```bash
# Install dependencies
npm install

# Set Discord token in sms-bot/.env.local:
# DISCORD_TOKEN_DOT=your_token_here

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
- `dot.js` — Agent loop, API calls
- `DOT-PROMPT.md` — System prompt (identity)
- `tools/index.js` — Available tools

## Sockets

- State dir: `~/.dot/`
- Socket: `~/.dot/dot.sock`
- Conversation: `~/.dot/conversation.json`

## Collaboration

All game files go in: `/Users/bart/Documents/code/collabs/`

Dot designs. Pit codes. Make it pretty! 🎨

# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Monorepo Structure

This is a monorepo with the following structure:
- Root directory: `/vibeceo8/`
  - `web/` - Website with AI chatbot for users to interact with coaches
  - `discord-bot/` - Discord bot (current directory)

Claude Code is currently working in the `discord-bot` directory, which has its own configuration and dependencies.

## Project Overview

VibeCEO Discord Bot simulates a startup coaching environment with AI-driven characters (coaches). The bot manages automated discussions, scheduled events, and multi-channel interactions across multiple Discord channels, creating an immersive experience where fictional coaches with distinct personalities interact.

## Build and Run Commands

```bash
# Install dependencies
npm install

# Build the TypeScript code
npm run build

# Start the bot in development mode (builds first)
npm run dev

# Start the bot with logging enabled
npm run start:log

# Start the bot in production mode
npm run start:prod

# Debug mode - runs checks and prepares the bot for starting
./start-debug.sh
```

## Test Commands

```bash
# Test specific features
node test-scripts/test-micro-post.js coach-quotes
node test-scripts/test-system-announcement.js 
node test-scripts/test-channel-routing.js
node test-scripts/test-pitch-channel.js
node test-scripts/test-weekend-story.js

# Run TypeScript test scripts after building
npm run test:story
npm run test:content
```

## Environment Setup

The bot requires a `.env.local` file in the discord-bot directory with these variables:

```
# Bot token and API keys
DISCORD_BOT_TOKEN=your_discord_bot_token_here
OPENAI_API_KEY=your_openai_api_key_here

# Channel IDs
THELOUNGE_CHANNEL_ID=your_lounge_channel_id
PITCH_CHANNEL_ID=your_pitch_channel_id
# GENERAL_CHANNEL_ID is hardcoded as 1354474492629618831

# Character webhooks per channel
GENERAL_WEBHOOK_URL_DONTE=your_donte_webhook_url_here
GENERAL_WEBHOOK_URL_ALEX=your_alex_webhook_url_here
GENERAL_WEBHOOK_URL_ROHAN=your_rohan_webhook_url_here
GENERAL_WEBHOOK_URL_VENUS=your_venus_webhook_url_here
GENERAL_WEBHOOK_URL_ELJAS=your_eljas_webhook_url_here
GENERAL_WEBHOOK_URL_KAILEY=your_kailey_webhook_url_here
GENERAL_WEBHOOK_URL_FOUNDRYHEAT=your_foundryheat_webhook_url_here

# Repeat the above pattern for LOUNGE_WEBHOOK_URL_* and PITCH_WEBHOOK_URL_*
```

## Architecture Overview

### Core Components

1. **Bot System (`lib/discord/bot.ts`)**
   - Initializes the Discord client and webhooks
   - Manages channel connections and routing
   - Sets up event handlers

2. **Scheduler (`lib/discord/scheduler.ts`)**
   - Reads schedule from text files
   - Routes events to the appropriate channels
   - Executes services at specified times
   - Supports "fast mode" for testing (1 hour = configurable minutes)

3. **Webhook System (`lib/discord/webhooks.ts`)**
   - Manages Discord webhooks for each character and channel
   - Handles message sending as different characters
   - Implements fallback logic when webhooks are unavailable

4. **Channel Routing**
   - `GENERAL_CHANNEL`: Staff meetings and microposts
   - `THELOUNGE_CHANNEL`: Coach conversations and other discussions
   - `PITCH_CHANNEL`: Pitch-related activities

5. **Content Generation**
   - Character system with unique personalities
   - Episode context management
   - Scene framework for structured conversations
   - Micro-post system for single messages

### Key Features

1. **Micro-Posts System**
   - Four types: Coach Quotes, Crowd Favorites, Micro-Masterclass, Upcoming Events
   - Posted by "The Foundry Heat" account
   - Configuration in `data/micro-posts.json`
   - Implementation in `lib/discord/microPosts.ts`

2. **System Announcements**
   - Automatic updates about coach dynamics
   - Posted every 6 scenes during episode playback
   - Uses coach irritation data from `data/story-themes/story-arcs.json`

3. **Weekend Stories**
   - Special narrative content for weekends
   - Distinct from weekday conversations

4. **Pitch Channel**
   - Dedicated channel for pitch-related activities
   - Separate from general and lounge conversations

## Data Files

- `data/schedule.txt`: Weekday event schedule
- `data/weekend-schedule.txt`: Weekend event schedule
- `data/micro-posts.json`: Prompts for micro-post generation
- `data/ceos.ts`: Character definitions and personality traits
- `data/story-themes/story-arcs.json`: Coach interaction dynamics

## Development Flow

1. Make changes to TypeScript files in `lib/discord/` or `scripts/`
2. Build the project with `npm run build`
3. Test specific features using test scripts in `test-scripts/`
4. Run the bot in debug mode with `./start-debug.sh`
5. Check logs in the `logs/` directory for errors or issues
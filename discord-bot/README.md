# VibeCEO Discord Bot

A Discord bot for the VibeCEO platform that handles automated discussions, news updates, and coach interactions.

## Setup

1. Install dependencies:

```bash
npm install
```

2. Create a `.env.local` file in the root directory with the following variables:

```
DISCORD_BOT_TOKEN=your_discord_bot_token_here
OPENAI_API_KEY=your_openai_api_key_here
WEBHOOK_URL_DONTE=your_donte_webhook_url_here
WEBHOOK_URL_ALEX=your_alex_webhook_url_here
WEBHOOK_URL_ROHAN=your_rohan_webhook_url_here
WEBHOOK_URL_VENUS=your_venus_webhook_url_here
WEBHOOK_URL_ELJAS=your_eljas_webhook_url_here
WEBHOOK_URL_KAILEY=your_kailey_webhook_url_here
```

## Available Commands

### Development

- `npm run dev` - Build and start the bot in development mode
- `npm run build` - Build the TypeScript code into the dist directory
- `npm run start:dev` - Start the bot in development mode (NODE_ENV=dev)

### Production

- `npm run start` - Start the bot in production mode
- `npm run start:prod` - Start the bot in production mode (NODE_ENV=production)

## Script Descriptions

- `build` - Cleans the dist directory and compiles TypeScript code
- `start` - Runs the compiled bot from the dist directory
- `dev` - Builds and starts the bot in development mode
- `start:dev` - Starts the bot with development environment variables
- `start:prod` - Starts the bot with production environment variables

## Environment Variables

- `NODE_ENV` - Set to 'dev' or 'production' to control the environment
- `DISCORD_BOT_TOKEN` - Your Discord bot token
- `OPENAI_API_KEY` - Your OpenAI API key for AI responses
- `WEBHOOK_URL_*` - Discord webhook URLs for each coach

## Project Structure

- `src/` - Source code
- `dist/` - Compiled JavaScript
- `lib/` - Library code
- `scripts/` - Scripts and utilities
- `data/` - Data files and configurations

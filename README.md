# VibeCEO8

A Next.js web application with Discord bot integration for CEO coaching and management.

*Last updated: April 13, 2025 at 9:43 PM PDT*

## Overview

VibeCEO8 is a comprehensive platform that combines a Next.js web application with a Discord bot to provide CEO coaching and management services. The platform allows users to interact with AI-powered CEO coaches through both a web interface and Discord.

## Features

- Web-based CEO coaching interface
- Discord bot integration for CEO interactions
- Real-time chat functionality
- Dashboard for managing coaching sessions
- Secure credential management
- Deployment support for Railway and Render

## Project Structure

### Website (Next.js Application)
- `/app` - Next.js application routes and pages
  - `/api` - API endpoints (including chat functionality)
  - `/dashboard` - Dashboard related pages
  - `/coaches` - Coaches related pages
- `/components` - Reusable React components
- `/lib` - Utility functions and shared logic
- `/types` - TypeScript type definitions
- `/public` - Static assets (including images for coaches)
- `/UPLOADS` - User uploaded files

### Discord Bot
- `/scripts` - Bot scripts and utilities
  - `start-discord-bot.ts` - Main bot entry point (compiles to `dist/scripts/start-discord-bot.js`)
- `start-bot.sh` - Bot startup script
- `bot-monitor.log` - Bot monitoring logs
- `tsconfig.bot.json` - Bot-specific TypeScript configuration

## Getting Started

1. Clone the repository
2. Install dependencies and build the bot:
   ```bash
   npm install
   ```
   This will:
   - Install all dependencies
   - Compile TypeScript files to JavaScript in the `dist` directory
3. Set up environment variables (see INSTALL.md for details)
4. Start the development server:
   ```bash
   npm run dev
   ```
5. Start the Discord bot:
   ```bash
   node dist/scripts/start-discord-bot.js
   ```

## Deployment

The application can be deployed to:
- Railway (using railway.toml)
  - Build command: `npm install`
  - Start command: `node dist/scripts/start-discord-bot.js`
- Render (using render.yaml)

## Deployment Notes

### Railway Configuration
- Uses direct command: `node dist/scripts/start-discord-bot.js`
- No railway.toml required
- Node.js version: 18
- Automatically triggers watercooler chat on startup

Last updated: April 14, 2025

## Security

- Credentials are managed through environment variables
- Sensitive files are excluded from version control
- Follows best practices for API key and token management

## Contributing

Please refer to the project's contribution guidelines for details on our code of conduct and the process for submitting pull requests.

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Production Deployment: Railway

To ensure the latest build files are running on Railway, follow these steps:

1. **Stop all Railway services:**
   ```bash
   railway down | cat
   ```
   - When prompted, type `y` and press Enter to confirm.

2. **Start all Railway services with the latest code:**
   ```bash
   railway up | cat
   ```

3. **(Optional) Check status:**
   ```bash
   railway status | cat
   ```

_Note: These steps ensure that the latest build artifacts are deployed and running in production. Always commit and push your changes before running these commands._

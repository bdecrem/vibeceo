# VibeCEO8

A Next.js web application with Discord bot integration for CEO coaching and management.

*Last updated: April 10, 2025 at 10:26 AM PDT*

> **Global Rule**: The README.md file must be kept up to date with any significant changes to the project structure, features, or setup instructions. When making changes that affect the project's functionality or architecture, update the README.md accordingly.

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
  - `start-discord-bot.js` - Main bot entry point
- `start-bot.sh` - Bot startup script
- `bot-monitor.log` - Bot monitoring logs
- `tsconfig.bot.json` - Bot-specific TypeScript configuration

## Getting Started

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Set up environment variables (see INSTALL.md for details)
4. Start the development server:
   ```bash
   npm run dev
   ```
5. Start the Discord bot:
   ```bash
   ./start-bot.sh
   ```

## Deployment

The application can be deployed to:
- Railway (using railway.toml)
- Render (using render.yaml)

## Security

- Credentials are managed through environment variables
- Sensitive files are excluded from version control
- Follows best practices for API key and token management

## Contributing

Please refer to the project's contribution guidelines for details on our code of conduct and the process for submitting pull requests.

## License

This project is licensed under the MIT License - see the LICENSE file for details.

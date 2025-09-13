# Webtoys Builder MCP Server

An MCP (Model Context Protocol) server that enables building Webtoys apps through Poke SMS integration.

## Features

Build any type of Webtoys content through natural language:
- 🎮 **Games** - "create a snake game"
- 🖼️ **Memes** - "make a meme about debugging"
- 🎵 **Music Apps** - "build a music player"
- 📊 **CRUD Apps** - "create a todo list app"
- 🗳️ **Collaborative Apps** - "build a voting app for lunch choices"
- 🌐 **Web Apps** - "make a portfolio website"

## How It Works

1. User sends a message to Poke describing what they want to build
2. Poke calls this MCP server's `build_webtoys_app` tool
3. MCP server forwards the request to Webtoys SMS bot
4. Webtoys generates the app using its AI-powered builders
5. MCP server polls for completion and returns the app URL
6. User receives a link to their newly created app at webtoys.ai

## Installation

```bash
# Clone the repository
git clone [your-repo-url]
cd poke-webtoys-mcp

# Install dependencies
npm install

# Copy environment variables
cp .env.example .env
```

## Configuration

Edit `.env` file with your settings:

```env
# For local development
WEBTOYS_API_URL=http://localhost:3030

# For production (example)
WEBTOYS_API_URL=https://your-sms-bot.railway.app
```

## Local Development

```bash
# Start the MCP server
npm start

# Or with auto-reload
npm run dev
```

## Testing

```bash
# Run test script
npm test
```

## Deployment

### Railway (Recommended - 1-Click Deploy)

[![Deploy on Railway](https://railway.app/button.svg)](https://railway.app/template/deploy)

Or manually:
1. Push to GitHub
2. Connect Railway to your repository
3. Add environment variables in Railway dashboard:
   - `WEBTOYS_API_URL`: Your SMS bot URL (e.g., https://sms-bot.railway.app)
   - `PORT`: Leave blank (Railway sets automatically)
4. Deploy

### Vercel

```bash
vercel --prod
```

### Heroku

```bash
heroku create your-app-name
heroku config:set WEBTOYS_API_URL=your-sms-bot-url
git push heroku main
```

## Registering with Poke

1. Deploy your MCP server and get the URL
2. Go to https://poke.com/settings/connections/integrations/new
3. Fill in:
   - **Name**: Webtoys Builder
   - **MCP Server URL**: Your deployed URL
   - **Description**: Build interactive web apps by describing them

## Usage Examples

Once registered, Poke users can text:

- "build a todo list app"
- "create a snake game"
- "make a meme about coding"
- "build a voting app for team lunch"
- "create a music player with AI-generated songs"
- "make a collaborative blog"

## API Response Format

Successful response:
```
✨ Your Webtoys app is ready!

🔗 https://webtoys.ai/user/app-name

Type: game
Description: snake game

Text me anytime to build another app!
```

## Troubleshooting

### App creation times out
- Complex apps may take 30-60 seconds to generate
- Ensure your SMS bot is running and accessible
- Check network connectivity

### No response from MCP server
- Verify environment variables are set correctly
- Check that Webtoys SMS bot is running
- Look at server logs for errors

## Architecture

```
Poke User → Poke → MCP Server → Webtoys SMS Bot → Supabase
                ←              ←                 ←
```

## License

MIT

## Support

For issues or questions:
- Webtoys: https://webtoys.ai
- Poke: https://poke.com

---

Built for the Poke MCP Challenge 🌴
# WebtoysOS Edit Agent CLI

## Overview

This is a **Claude CLI-powered edit agent** for WebtoysOS that processes edit requests from the Issue Tracker. Unlike the API-based V2 agent, this uses the Claude CLI tool (same as the `--revise` command) for more powerful and interactive editing capabilities.

## Architecture

```
Issue Tracker → Webhook (ngrok) → Worker → Claude CLI → Deploy to Supabase
```

### Key Differences from V2 Agent

| **Edit Agent V2 (API)** | **Edit Agent CLI (This)** |
|--------------------------|----------------------------|
| Uses Anthropic API | Uses Claude CLI locally |
| Single-shot completion | Full Claude capabilities |
| Runs via cron | Runs via webhook + ngrok |
| Simple prompt → response | Can iterate and test |
| Limited context | Full file access |

## Installation

```bash
# Navigate to the agent directory
cd /Users/bartdecrem/Documents/code/vibeceo8/sms-bot/webtoys-os/agents/edit-agent-cli

# Install dependencies
npm install

# Ensure Claude CLI is installed
which claude  # Should show /opt/homebrew/bin/claude
```

## Configuration

### Environment Variables

The agent uses the main `.env.local` file from the project root:

```bash
# In /Users/bartdecrem/Documents/code/vibeceo8/sms-bot/.env.local
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_KEY=your_service_key
WEBTOYS_EDIT_PORT=3032  # Optional, defaults to 3032
```

### ngrok Setup

1. Install ngrok if not already installed:
```bash
brew install ngrok
```

2. Authenticate ngrok (one-time setup):
```bash
ngrok authtoken YOUR_AUTH_TOKEN
```

## Usage

### Starting the Agent

```bash
# Option 1: Use the unified startup script (RECOMMENDED)
./start-all.sh

# This will:
# 1. Start ngrok tunnel on port 3032
# 2. Display the public webhook URL
# 3. Start the webhook server
# 4. Show real-time logs
```

### Manual Startup (for debugging)

```bash
# Terminal 1: Start ngrok
ngrok http 3032

# Terminal 2: Start webhook server
node webhook-server.js

# The worker starts automatically when edits are received
```

### Stopping the Agent

```bash
# If using start-all.sh:
Press Ctrl+C

# Or use the stop script:
./stop-all.sh
```

## Integration with Issue Tracker

### Configure the Issue Tracker

The Issue Tracker needs to know the webhook URL. When you start the agent, it will display:

```
📋 IMPORTANT: Configure your Issue Tracker to use this webhook:
   Edit Agent URL: https://abc123.ngrok.app
```

Update the Issue Tracker to send requests to this URL.

### Manual Testing

You can manually trigger processing:

```bash
# Check health
curl https://your-id.ngrok.app/health

# Trigger processing of open issues
curl -X POST https://your-id.ngrok.app/trigger
```

## How It Works

### 1. Issue Submission
Users submit issues via the Issue Tracker at `/public/toybox-issue-tracker-v3`

### 2. Webhook Reception
The Issue Tracker sends edit requests to the webhook server

### 3. Queue Management
Requests are queued in `.edit-queue.json` for processing

### 4. Worker Processing
The worker:
- Loads the current app HTML from Supabase
- Builds a detailed prompt for Claude
- Calls Claude CLI with the prompt
- Extracts and validates the edited HTML
- Deploys to Supabase

### 5. Backup System
All edits are backed up in the `backups/` directory with timestamps

## File Structure

```
edit-agent-cli/
├── webhook-server.js   # Receives edit requests
├── worker.js          # Processes edits with Claude CLI
├── start-all.sh       # Unified startup script
├── stop-all.sh        # Stop all services
├── package.json       # Dependencies
├── .edit-queue.json   # Queue file (auto-created)
├── backups/           # HTML backups
└── logs/              # Log files
```

## Monitoring

### Real-time Logs
When using `start-all.sh`, logs appear in the terminal

### ngrok Dashboard
View request details at: http://localhost:4040

### Queue Status
Check the queue file:
```bash
cat .edit-queue.json | jq .
```

## Troubleshooting

### Issue: ngrok URL changes
**Solution**: This is normal. Update the Issue Tracker with the new URL each time.

### Issue: Claude CLI not found
**Solution**: Ensure Claude CLI is installed:
```bash
brew install claude
# Or download from Anthropic
```

### Issue: Port already in use
**Solution**: The start script will ask to kill the existing process, or use:
```bash
lsof -ti:3032 | xargs kill -9
```

### Issue: Worker not processing
**Solution**: Check the queue and logs:
```bash
cat .edit-queue.json
tail -f logs/*.log
```

## Advanced Features

### Custom Prompts
Edit the prompt building in `worker.js` to customize how Claude processes edits

### Parallel Processing
Modify `webhook-server.js` to spawn multiple workers for parallel processing

### Webhook Security
Add authentication to the webhook endpoints for production use

## Comparison with Other Agents

### vs. V2 Agent (API-based)
- **CLI**: More powerful, can iterate and test
- **API**: Faster, simpler, more predictable

### vs. Webtoys Edit Agent (--revise)
- **WebtoysOS**: Focused on desktop apps
- **Webtoys**: Handles all SMS-created apps

### When to Use Which
- **Quick fixes**: Use V2 Agent (API)
- **Complex edits**: Use CLI Agent (this)
- **SMS apps**: Use Webtoys Edit Agent

## Safety Features

1. **HTML Validation**: Checks structure before deploying
2. **Backup System**: Saves before and after versions
3. **Queue Persistence**: Doesn't lose requests on restart
4. **Error Recovery**: Continues processing after failures

## Future Enhancements

- [ ] Add webhook authentication
- [ ] Implement retry logic for failed edits
- [ ] Add support for batch processing
- [ ] Create web UI for monitoring
- [ ] Add support for testing edits before deployment

## Support

For issues or questions:
1. Check the logs in `logs/` directory
2. Review the queue in `.edit-queue.json`
3. Check ngrok dashboard at http://localhost:4040
4. Verify Claude CLI is working: `echo "test" | claude`

---

*Last Updated: September 2025*
*Version: 1.0.0*
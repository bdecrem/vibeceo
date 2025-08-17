# Webtoys Edit Agent Setup

## Environment-Based Deployment

The Edit Agent uses environment flags to control where it runs:

- **Agent Machine**: Has Claude CLI, runs webhook server + fallback cron
- **Dev Machine**: Disabled by default, no webhook calls
- **Railway**: Disabled by default, no deployment issues

## Setup on Agent Machine

### 1. Enable Edit Agent

Add to your `.env.local`:
```bash
EDIT_AGENT_ENABLED=true
EDIT_AGENT_WEBHOOK_PORT=3031
```

### 2. Start Webhook Server

```bash
cd sms-bot/webtoys-edit-agent
./start-edit-agent.sh
```

This will:
- Check for Claude CLI (`/opt/homebrew/bin/claude`)
- Install Express.js if needed
- Start webhook server on port 3031
- Process edit requests immediately when triggered

### 3. Set Up Fallback Cron (Optional but Recommended)

```bash
./setup-cron.sh
```

This adds a cron job that runs every 10 minutes to catch any missed webhooks.

## How It Works

### User Experience
1. User texts: `--revise my-app make it blue`
2. SMS bot queues edit request in database
3. **If EDIT_AGENT_ENABLED=true**: Webhook triggered immediately
4. **If webhook fails**: Cron job processes within 10 minutes
5. User gets SMS notification when complete

### Request Flow
```
SMS Command (controller.ts)
    ↓
Queue in Database (wtaf_revisions)
    ↓
Trigger Webhook (if EDIT_AGENT_ENABLED=true)
    ↓
Webhook Server (port 3031)
    ↓
monitor.js → collect → process → validate → deploy
    ↓
SMS Notification to User
```

### Fallback Safety
- If webhook fails → Warning logged, continues normally
- Cron job runs every 10 minutes as backup
- Multiple environments don't interfere with each other

## Environment Behavior

| Environment | EDIT_AGENT_ENABLED | Behavior |
|-------------|-------------------|----------|
| Agent Machine | `true` | Webhook + cron, immediate processing |
| Dev Machine | `false` (default) | No webhooks, no interference |
| Railway | `false` (default) | No deployment issues |

## Testing

### Test Webhook Server
```bash
# Health check
curl http://localhost:3031/health

# Manual trigger
curl http://localhost:3031/trigger
```

### Test Full Pipeline
1. Send SMS: `--revise test-app change color to red`
2. Check logs for webhook trigger
3. Verify edit completes within ~15 seconds

## Troubleshooting

### Webhook Server Won't Start
- Check `EDIT_AGENT_ENABLED=true` in `.env.local`
- Verify Claude CLI at `/opt/homebrew/bin/claude`
- Ensure port 3031 is available

### Edits Not Processing
- Check webhook server logs
- Verify cron job: `crontab -l`
- Check manual processing: `node monitor.js`

### Railway Deployment Issues
- Ensure `EDIT_AGENT_ENABLED` is NOT set in Railway environment
- Edit agent code won't run without the flag

## Logs

- **Webhook Server**: Console output
- **Cron Jobs**: `/tmp/webtoys-edit-agent.log`
- **SMS Controller**: Standard SMS bot logs

## Security

- Webhook only accepts localhost connections
- No authentication needed (internal service)
- Edit agent disabled by default everywhere
- Only enabled where explicitly configured
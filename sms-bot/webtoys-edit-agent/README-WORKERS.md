# Worker Pool System for Webtoys Edit Agent

## Overview
The worker pool system replaces the single-threaded blocking approach with parallel processing using multiple workers.

## Architecture

### Components
1. **Webhook Server** (`webhook-server.js`) - Receives requests, no longer blocks
2. **Worker Manager** (`worker-manager.js`) - Spawns and monitors workers
3. **Workers** (`worker.js`) - Individual processes that claim and process edits
4. **Database Queue** - `wtaf_revisions` table acts as the queue

### Request Flow
```
SMS Request → Railway → Webhook → Database Queue
                                        ↓
                            Worker 1 ← Queue → Worker 2
                                   ↓         ↓
                            Process Edit  Process Edit
```

## Starting the System

### Option 1: Start Workers + Webhook (Recommended)
```bash
# Terminal 1: Start ngrok
ngrok http 3031

# Terminal 2: Start webhook server
node webhook-server.js

# Terminal 3: Start worker pool
./start-workers.sh
# OR
node worker-manager.js
```

### Option 2: Workers Only (Cron Fallback)
```bash
# Just start workers - they'll poll database
node worker-manager.js
```

## Configuration

### Environment Variables
```bash
# Number of workers (default: 2)
EDIT_AGENT_WORKERS=2

# Worker poll interval (default: 5000ms)
WORKER_POLL_INTERVAL=5000
```

### Worker Behavior
- Each worker polls database every 5 seconds
- Workers respect revision ordering (edit 2 waits for edit 1)
- Failed workers automatically restart (up to 10 times)
- Graceful shutdown on SIGTERM/SIGINT

## Database Locking

Workers use optimistic locking to prevent duplicate processing:
1. Worker finds pending edit
2. Checks no earlier edits blocking it
3. Atomically claims by updating status to 'processing'
4. If claim fails (another worker got it), tries next edit

## Monitoring

### Check Worker Status
```bash
# See running workers
ps aux | grep worker

# View worker manager logs
# Look for: "💚 Workers healthy: [W1:5.2m, W2:5.2m]"
```

### Database Status
```sql
-- See queue status
SELECT status, COUNT(*) 
FROM wtaf_revisions 
GROUP BY status;

-- See which worker has which edit
SELECT id, app_slug, status, worker_id 
FROM wtaf_revisions 
WHERE status = 'processing';
```

## Troubleshooting

### Workers not picking up edits
1. Check workers are running: `ps aux | grep worker`
2. Check database connectivity
3. Look for earlier blocking edits for same content

### Worker crashes repeatedly
1. Check logs for error messages
2. Verify Claude CLI is accessible
3. Check disk space for temp files

### All workers busy but queue growing
1. Increase worker count: `EDIT_AGENT_WORKERS=3 node worker-manager.js`
2. Check if edits are getting stuck in 'processing'
3. Monitor Claude CLI performance

## Advantages Over Old System

| Old System | Worker Pool |
|------------|-------------|
| 1 edit at a time | 2+ edits in parallel |
| Rejects when busy | Queues all requests |
| Webhook blocks | Webhook returns immediately |
| Single point of failure | Workers restart automatically |

## Testing

### Simulate Multiple Edits
```bash
# Create test edits in database
# Then start workers and watch them process in parallel
```

### Load Testing
```bash
# Send multiple webhook requests rapidly
for i in {1..5}; do
  curl -X POST http://localhost:3031/webhook/trigger-edit-processing
done
```

## Migration from Old System

1. Stop old monitor/cron: `crontab -e` and comment out monitor.js line
2. Start worker manager: `node worker-manager.js`
3. Webhook server automatically uses new non-blocking mode
4. Old temp files (.pending-edits.json) still work as fallback
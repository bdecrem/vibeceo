# Setting Up Hourly New User Notifications

## Manual Setup (for Supabase)

1. **Create the notification_state table** in Supabase SQL Editor:
```sql
CREATE TABLE IF NOT EXISTS notification_state (
    id TEXT PRIMARY KEY,
    last_checked_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    metadata JSONB DEFAULT '{}'::jsonb
);

INSERT INTO notification_state (id, last_checked_at)
VALUES ('new-users-check', NOW())
ON CONFLICT (id) DO NOTHING;
```

## Railway Deployment (Automatic Cron)

Add to your Railway environment:

1. **Add a new service** called "User Notifier" 
2. **Set the start command**:
```bash
cd sms-bot && npm install && node scripts/check-new-users.js
```

3. **Configure as a cron job** in Railway settings:
   - Schedule: `0 * * * *` (every hour on the hour)
   - Or: `*/30 * * * *` (every 30 minutes)

## Local Testing (Manual Run)

```bash
cd sms-bot/scripts
node check-new-users.js
```

## Alternative: System Cron (Linux/Mac)

Add to crontab (`crontab -e`):
```bash
# Run every hour at :00
0 * * * * cd /path/to/vibeceo8/sms-bot/scripts && /usr/local/bin/node check-new-users.js >> /tmp/new-users-check.log 2>&1
```

## Alternative: Simple Loop for Testing

Create `run-hourly.js`:
```javascript
import { exec } from 'child_process';

function runCheck() {
    console.log(`[${new Date().toISOString()}] Running check...`);
    exec('node check-new-users.js', (error, stdout, stderr) => {
        if (error) {
            console.error('Error:', error);
            return;
        }
        console.log(stdout);
        if (stderr) console.error('Stderr:', stderr);
    });
}

// Run immediately
runCheck();

// Then run every hour
setInterval(runCheck, 60 * 60 * 1000);

console.log('Hourly check started. Press Ctrl+C to stop.');
```

## Environment Variables Required

Make sure these are set in production:
- `SUPABASE_URL`
- `SUPABASE_SERVICE_KEY`
- `SENDGRID_API_KEY`

## Monitoring

Check logs to verify it's working:
- Railway: Check service logs
- Local: Check `/tmp/new-users-check.log`
- Email: You'll get emails when new users join!

## Customization

Edit `check-new-users.js` to change:
- `ADMIN_EMAIL` - Where notifications go
- `CHECK_INTERVAL_HOURS` - How far back to look (default: 1 hour)
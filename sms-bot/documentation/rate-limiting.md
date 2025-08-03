# 🚦 SMS Rate Limiting System

## Overview

WEBTOYS implements rate limiting to prevent abuse and protect against excessive AI API costs. The system tracks SMS requests per phone number and enforces hourly, daily, and monthly limits based on user roles.

## Rate Limits by User Type

### Regular Users (Default)
- **30 apps per hour**
- **60 apps per day** 
- **300 apps per month**

### DEGEN Users
- **60 apps per hour** (2x regular)
- **120 apps per day** (2x regular)
- **600 apps per month** (2x regular)

### OPERATOR & ADMIN Users
- **Unlimited** - no rate limits applied

## Technical Implementation

### Storage Method
Rate limits are tracked **in-memory** using a JavaScript Map in `controller.ts`:

```javascript
const rateLimitCache = new Map<string, number>();
```

### Key Format
```
{phone}:{period}:{timestamp}
```

Examples:
- `+15551234567:hour:2025-1-31-16` → tracks hourly count
- `+15551234567:day:2025-1-31` → tracks daily count  
- `+15551234567:month:2025-1` → tracks monthly count

### Reset Schedule
- **Hourly limits**: Reset at the top of each hour
- **Daily limits**: Reset at midnight
- **Monthly limits**: Reset on the 1st of each month

### Memory Management
- Automatic cleanup runs every hour
- Removes expired entries to prevent memory bloat
- Implemented via `setInterval(cleanupRateLimitCache, 60 * 60 * 1000)`

## User Experience

When a user hits their rate limit, they receive an SMS notification:

```
Rate limit: You've reached 30 apps this hour. Try again next hour!
```

Or for DEGEN users:
```
Rate limit (DEGEN): You've reached 60 apps this hour. Try again next hour!
```

## Configuration

Rate limits are defined in `engine/controller.ts`:

```javascript
// Regular user limits
const RATE_LIMITS = {
    hourly: 30,
    daily: 60,
    monthly: 300
};

// DEGEN user limits (2x regular)
const DEGEN_RATE_LIMITS = {
    hourly: 60,
    daily: 120,
    monthly: 600
};
```

## How It Works

1. **User sends SMS** → System receives request
2. **Check user role** → Queries `sms_subscribers` table
3. **Apply rate limit** → Check against appropriate limits
4. **Update counters** → Increment in-memory counters
5. **Allow/Deny** → Process request or send rate limit message

## Limitations

### Current Implementation
- **Not persistent** - Counts reset on server restart
- **Not distributed** - Each server instance tracks separately
- **Memory only** - No database backup

### Why This Approach?
- ✅ **Simple** - No external dependencies
- ✅ **Fast** - Microsecond lookups
- ✅ **Good enough** - Occasional resets acceptable for SMS
- ✅ **Low risk** - Worst case: user gets fresh limits after restart

## Future Enhancements

If persistence is needed:

### Option 1: Redis
```javascript
// Example Redis implementation
const redis = new Redis();
const count = await redis.incr(`rate:${phone}:${hour}`);
await redis.expire(key, 3600);
```

### Option 2: Supabase
```sql
-- Rate limit tracking table
CREATE TABLE rate_limits (
    phone TEXT,
    period_type TEXT,
    period_key TEXT,
    count INTEGER,
    PRIMARY KEY (phone, period_type, period_key)
);
```

### Option 3: Rate Limiting Service
- Upstash Rate Limiting
- Cloudflare Rate Limiting
- AWS API Gateway

## Monitoring

Rate limit checks are logged for monitoring:

```
📊 Rate limit check for +15551234567: 5/10 hourly, 12/20 daily
```

Monitor logs for:
- Users frequently hitting limits
- Potential abuse patterns
- Need to adjust limits

## Security Considerations

1. **Phone number validation** - Ensure consistent format
2. **Role verification** - Check database for current role
3. **Error handling** - Continue service if rate limit check fails
4. **No user data exposure** - Don't reveal other users' limits

## Troubleshooting

### User complaining about rate limits?
1. Check their role in `sms_subscribers` table
2. Look for their phone number in logs
3. Consider temporary role upgrade if legitimate use

### Server restarted and counts reset?
- This is expected behavior
- Consider implementing Redis if this becomes problematic

### Need to adjust limits?
1. Edit `RATE_LIMITS` or `DEGEN_RATE_LIMITS` in controller.ts
2. Rebuild: `npm run build`
3. Restart server

## Web Console Rate Limits

The web console (`/api/wtaf/web-console`) has separate rate limits:

### Rate Limits by Role (per hour):
- **user**: 15 requests
- **coder**: 30 requests
- **degen**: 60 requests  
- **operator**: 90 requests

These limits are tracked separately from SMS rate limits and return a 429 status code when exceeded.

---

**Last Updated:** January 31, 2025
**Version:** 1.1
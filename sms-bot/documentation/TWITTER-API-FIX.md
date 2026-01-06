# Twitter API Configuration Fix

## The Problem

We're paying $200/month for Twitter Basic tier (15K reads/month) but not using it.

**Current state:**
- `.env.local` has credentials from a **different** Twitter app (free tier, exhausted)
- The paid app lives in @bartdecrem's developer portal but we're not using its credentials
- API calls fail with `UsageCapExceeded: Monthly product cap`

**Evidence:**
- Developer portal shows app `1949862038299365376bartdecrem` with API key ending in `...xOHNjU`
- `.env.local` has API key starting with `1QVNIe8j...` (different app)
- Default credentials authenticate as `@tokentank_ai`, not `@bartdecrem`

## The Fix

### Step 1: Get new credentials from the paid app

1. Go to https://developer.x.com (log in as @bartdecrem)
2. Projects & Apps → Default project → `1949862038299365376bartdecrem`
3. Click **Keys and tokens** tab
4. **Regenerate** the "API Key and Secret" — save both values
5. **Regenerate** the "Access Token and Secret" — save both values

### Step 2: Update .env.local

```bash
TWITTER_API_KEY=<new api key>
TWITTER_API_SECRET=<new api secret>
TWITTER_ACCESS_TOKEN=<new access token>
TWITTER_ACCESS_SECRET=<new access secret>
```

### Step 3: Re-authorize @intheamber

Changing the API key invalidates all existing access tokens. Re-authorize Amber:

```bash
cd sms-bot
npx tsx scripts/twitter-get-tokens.ts
```

1. Open the URL it prints
2. Log into **@intheamber** (not @bartdecrem)
3. Click "Authorize app"
4. Copy the PIN Twitter shows
5. Paste into terminal
6. Add the new tokens to `.env.local`:

```bash
TWITTER_INTHEAMBER_ACCESS_TOKEN=<token from script>
TWITTER_INTHEAMBER_ACCESS_SECRET=<secret from script>
```

### Step 4: Update Railway

Push the new env vars to Railway for the sms-bot service.

### Step 5: Verify

```bash
cd sms-bot
node -e "
require('dotenv').config({ path: '.env.local' });
const { searchTweets } = require('./dist/lib/twitter-client.js');
searchTweets('test', 10).then(r => console.log(r));
"
```

Should return `{ success: true, tweets: [...] }` instead of `UsageCapExceeded`.

## Time Required

~10 minutes total.

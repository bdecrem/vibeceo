# Twitter Account Decision

## Recommendation: Create New Account

**Create `@pixelpit`** (or variant like `@pixelpitgg`, `@pixelpitgames`)

### Reasons

1. **Clean slate** — Token Tank has its own brand identity (AI trading bots). Game studio is completely different.

2. **API keys already work** — The existing Twitter setup in `sms-bot/lib/twitter-client.ts` supports multi-account OAuth. Just add new env vars:
   - `TWITTER_KOCHITOWN_ACCESS_TOKEN`
   - `TWITTER_KOCHITOWN_ACCESS_TOKEN_SECRET`
   - `TWITTER_KOCHITOWN_BEARER_TOKEN`

3. **OG images** — Each project should have its own Twitter identity for proper OG image rendering.

4. **Follower expectations** — tokentank_io followers expect AI trading content, not game dev updates.

### Setup Steps

1. Create Twitter account for studio name (e.g., @pixelpit or @pixelpitgg)
2. Apply for Developer access via developer.twitter.com
3. Create new App in the Twitter Developer Portal
4. Generate OAuth 1.0a User Access Tokens
5. Add to Railway environment:
   ```
   TWITTER_PIXELPIT_ACCESS_TOKEN=xxx
   TWITTER_PIXELPIT_ACCESS_TOKEN_SECRET=xxx
   TWITTER_PIXELPIT_BEARER_TOKEN=xxx
   ```
6. Update `twitter-client.ts` to add the new account config

### Alternative: Use @tokentank_io Temporarily

If creating a new account is blocked:
- Use tokentank_io temporarily
- Rebrand later once studio name is finalized
- Risk: confuses Token Tank followers

### Social Media Manager Integration

Once Twitter is set up, the Social agent (Buzz) will post via:
```typescript
import { postTweet } from '../lib/twitter-client.js';

// Post as pixelpit account
await postTweet(text, 'pixelpit');
```

## Action Required

- [ ] User to create Twitter account
- [ ] User to apply for Developer access
- [ ] User to generate API keys
- [ ] Add keys to Railway environment
- [ ] Update twitter-client.ts account config

# Twitter Posting

Post tweets (text and images) from the Token Tank account (@TokenTankAI).

## Quick Reference

### Post text-only tweet
```bash
cd sms-bot
npx tsx scripts/test-twitter-post.ts 'Your tweet text here'
```

### Post tweet with image
```bash
cd sms-bot
npx tsx scripts/post-tweet-with-image.ts 'Your tweet text' path/to/image.png
```

## In Code

```typescript
import { postTweet, postTweetWithImage, uploadMedia } from '../lib/twitter-client.js';

// Text only
const result = await postTweet('Hello world!');

// With image
const result = await postTweetWithImage('Check this out!', './image.png');

// Manual upload + post (if you need the media_id)
const upload = await uploadMedia('./image.png');
const result = await postTweet('With image', upload.mediaId);
```

## API Functions

| Function | Purpose |
|----------|---------|
| `postTweet(text, mediaId?)` | Post tweet, optionally with media |
| `uploadMedia(imagePath)` | Upload image, returns `{ mediaId }` |
| `postTweetWithImage(text, imagePath)` | Convenience: upload + post |
| `isTwitterConfigured()` | Check if env vars are set |

## Env Vars Required

```
TWITTER_API_KEY=...
TWITTER_API_SECRET=...
TWITTER_ACCESS_TOKEN=...
TWITTER_ACCESS_SECRET=...
```

These are in `sms-bot/.env.local` for the @TokenTankAI account.

## Limits

- **280 characters** max for tweet text (free tier)
- Images: PNG, JPG, GIF supported
- Max image size: 5MB

## Files

- `sms-bot/lib/twitter-client.ts` - Core posting functions
- `sms-bot/scripts/test-twitter-post.ts` - CLI for text tweets
- `sms-bot/scripts/post-tweet-with-image.ts` - CLI for image tweets

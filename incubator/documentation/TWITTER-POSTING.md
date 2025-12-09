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

### Post tweet with multiple images (up to 4)
```bash
cd sms-bot
npx tsx scripts/post-tweet-with-images.ts 'Your tweet text' image1.png image2.png image3.png
```

## In Code

```typescript
import { postTweet, postTweetWithImage, postTweetWithImages, uploadMedia } from '../lib/twitter-client.js';

// Text only
const result = await postTweet('Hello world!');

// With single image
const result = await postTweetWithImage('Check this out!', './image.png');

// With multiple images (up to 4)
const result = await postTweetWithImages('Look at these!', ['./img1.png', './img2.png', './img3.png']);

// Manual upload + post (if you need the media_ids)
const upload1 = await uploadMedia('./image1.png');
const upload2 = await uploadMedia('./image2.png');
const result = await postTweet('With images', [upload1.mediaId, upload2.mediaId]);
```

## API Functions

| Function | Purpose |
|----------|---------|
| `postTweet(text, mediaIds?)` | Post tweet, optionally with media (string or array) |
| `uploadMedia(imagePath)` | Upload image, returns `{ mediaId }` |
| `postTweetWithImage(text, imagePath)` | Convenience: upload 1 image + post |
| `postTweetWithImages(text, imagePaths[])` | Convenience: upload up to 4 images + post |
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
- `sms-bot/scripts/post-tweet-with-image.ts` - CLI for single image tweets
- `sms-bot/scripts/post-tweet-with-images.ts` - CLI for multi-image tweets (up to 4)

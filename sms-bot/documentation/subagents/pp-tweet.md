# /pp-tweet - Post to @pixelpit_games Twitter

Post a tweet as the Pixelpit Games Twitter account (@pixelpit_games).

## Usage
```
/pp-tweet <your tweet text>
```

## Instructions

When this command is invoked:

1. Take the user's message as the tweet content
2. If the tweet is over 280 characters, warn the user and ask them to shorten it
3. Create a small script file and run it to post the tweet:

```javascript
import dotenv from 'dotenv';
dotenv.config({ path: './sms-bot/.env.local' });
import { postTweet } from './sms-bot/lib/twitter-client.ts';

const tweet = `YOUR_TWEET_TEXT_HERE`;
const result = await postTweet(tweet, { account: 'pp' });

if (result.success) {
  console.log('Tweet posted:', result.tweetUrl);
} else {
  console.error('Failed:', result.error);
}
```

4. Run with: `node --experimental-strip-types script.mjs`
5. Report the result (success with URL, or error message)
6. Clean up the temp script file

## Account Details
- Handle: @pixelpit_games
- Account key in twitter-client.ts: `pp`
- Uses env vars: `TWITTER_PP_API_KEY`, `TWITTER_PP_API_SECRET`, `TWITTER_PP_ACCESS_TOKEN`, `TWITTER_PP_ACCESS_SECRET`

## Examples

```
/pp-tweet Just shipped CAT TOWER! Stack cats, get points. Play now: pixelpit.gg/arcade/cattower
```

```
/pp-tweet New game dropping tomorrow... stay tuned
```

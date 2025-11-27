/**
 * Twitter Output Handler
 * Post tweets using Twitter API v2
 */

import Handlebars from 'handlebars';
import type { NormalizedItem, AgentMetadata, OutputConfig, EnrichedItem } from '@vibeceo/shared-types';

/**
 * Post tweet with template rendering
 */
export async function sendTweet(
  items: NormalizedItem[],
  config: OutputConfig['twitter'],
  agentMetadata: AgentMetadata
): Promise<boolean> {
  if (!config || !config.enabled) {
    console.log('   Twitter output is disabled');
    return false;
  }

  console.log(`🐦 Posting tweet...`);

  // Check for required credentials
  const apiKey = process.env.TWITTER_API_KEY;
  const apiSecret = process.env.TWITTER_API_SECRET;
  const accessToken = process.env.TWITTER_ACCESS_TOKEN;
  const accessSecret = process.env.TWITTER_ACCESS_SECRET;

  if (!apiKey || !apiSecret || !accessToken || !accessSecret) {
    console.log('   ⚠️  Missing Twitter API credentials (TWITTER_API_KEY, TWITTER_API_SECRET, TWITTER_ACCESS_TOKEN, TWITTER_ACCESS_SECRET)');
    return false;
  }

  try {
    // Compile Handlebars template
    const template = Handlebars.compile(config.template);

    // Prepare template data
    const data = {
      agentName: agentMetadata.name,
      agentDescription: agentMetadata.description,
      count: items.length,
      items: items.map(item => ({
        title: item.title || 'Untitled',
        summary: item.summary || '',
        url: item.url || '',
        author: item.author || '',
        publishedAt: item.publishedAt,
        score: (item as EnrichedItem).score,
        relevanceReason: (item as EnrichedItem).relevanceReason,
      })),
    };

    // Render tweet
    let tweet = template(data);

    // Enforce character limit
    const maxLength = config.maxLength || 280;
    if (tweet.length > maxLength) {
      tweet = tweet.substring(0, maxLength - 3) + '...';
      console.log(`   Truncated tweet to ${maxLength} characters`);
    }

    // Post tweet using Twitter API v2
    await postTweetV2(
      { apiKey, apiSecret, accessToken, accessSecret },
      tweet
    );

    console.log('   ✅ Tweet posted successfully');
    console.log(`   Tweet: "${tweet}"`);
    return true;

  } catch (error: any) {
    console.error(`   ❌ Tweet failed: ${error.message}`);
    return false;
  }
}

/**
 * Post tweet using Twitter API v2
 */
async function postTweetV2(
  credentials: {
    apiKey: string;
    apiSecret: string;
    accessToken: string;
    accessSecret: string;
  },
  text: string
): Promise<void> {
  // Import twitter-api-v2 library
  const { TwitterApi } = await import('twitter-api-v2');

  const client = new TwitterApi({
    appKey: credentials.apiKey,
    appSecret: credentials.apiSecret,
    accessToken: credentials.accessToken,
    accessSecret: credentials.accessSecret,
  });

  await client.v2.tweet(text);
}

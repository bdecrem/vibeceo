/**
 * Find founders on Twitter mentioning competitors
 * Uses Twitter API to search for relevant conversations
 */

import { TwitterApi } from 'twitter-api-v2';

const TWITTER_BEARER_TOKEN = process.env.TWITTER_BEARER_TOKEN || '';

// Search queries to find people tracking competitors
const SEARCH_QUERIES = [
  'manually checking competitor -filter:retweets',
  'track competitors -filter:retweets',
  '"keeping track of" competitors -filter:retweets',
  'competitor pricing changed -filter:retweets',
  'competitor launched -filter:retweets',
  'watching my competitors -filter:retweets',
  'competitor monitoring -filter:retweets lang:en',
];

interface Lead {
  username: string;
  tweet_id: string;
  text: string;
  created_at: string;
  url: string;
}

async function findLeads(): Promise<Lead[]> {
  const client = new TwitterApi(TWITTER_BEARER_TOKEN);
  const leads: Lead[] = [];

  console.log('🔍 Searching Twitter for competitor tracking pain signals...\n');

  for (const query of SEARCH_QUERIES) {
    try {
      console.log(`Searching: "${query}"`);

      const tweets = await client.v2.search(query, {
        max_results: 10,
        'tweet.fields': ['created_at', 'author_id'],
        'user.fields': ['username'],
        expansions: ['author_id'],
      });

      if (tweets.data && tweets.data.data) {
        for (const tweet of tweets.data.data) {
          const author = tweets.data.includes?.users?.find(
            (u) => u.id === tweet.author_id
          );

          if (author) {
            leads.push({
              username: author.username,
              tweet_id: tweet.id,
              text: tweet.text,
              created_at: tweet.created_at || '',
              url: `https://twitter.com/${author.username}/status/${tweet.id}`,
            });
          }
        }
      }

      console.log(`  Found ${tweets.data?.data?.length || 0} tweets\n`);

      // Rate limit: wait 1 second between searches
      await new Promise((resolve) => setTimeout(resolve, 1000));
    } catch (error: any) {
      console.error(`  Error searching: ${error.message}\n`);
    }
  }

  return leads;
}

async function main() {
  const leads = await findLeads();

  console.log(`\n✅ Total leads found: ${leads.length}\n`);
  console.log('Top 10 leads to contact:\n');

  const uniqueLeads = Array.from(
    new Map(leads.map((lead) => [lead.username, lead])).values()
  ).slice(0, 10);

  uniqueLeads.forEach((lead, i) => {
    console.log(`${i + 1}. @${lead.username}`);
    console.log(`   Tweet: ${lead.text.slice(0, 100)}...`);
    console.log(`   URL: ${lead.url}`);
    console.log('');
  });

  // Save to file
  const fs = await import('fs/promises');
  await fs.writeFile(
    'twitter-leads.json',
    JSON.stringify(uniqueLeads, null, 2)
  );
  console.log('💾 Saved to twitter-leads.json');
}

main().catch(console.error);

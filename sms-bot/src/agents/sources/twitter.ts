/**
 * Twitter source fetcher
 * Fetches tweets using Twitter API v2
 */

import type { NormalizedItem } from '@vibeceo/shared-types';

export interface TwitterConfig {
  query?: string; // Search query (for search mode)
  username?: string; // Twitter username (for user timeline mode)
  searchType?: 'search' | 'user'; // Type of search
  maxItems?: number;
}

interface TwitterTweet {
  id: string;
  text: string;
  created_at: string;
  author_id: string;
  public_metrics?: {
    retweet_count: number;
    reply_count: number;
    like_count: number;
    quote_count: number;
  };
}

interface TwitterUser {
  id: string;
  username: string;
  name: string;
}

export async function fetchTwitter(config: TwitterConfig): Promise<NormalizedItem[]> {
  const {
    query,
    username,
    searchType = 'search',
    maxItems = 10,
  } = config;

  console.log(`🐦 Fetching tweets (${searchType} mode)...`);

  try {
    const bearerToken = process.env.TWITTER_BEARER_TOKEN;

    if (!bearerToken) {
      console.warn('⚠️ TWITTER_BEARER_TOKEN not set, using mock data');
      return getMockTwitterData(maxItems);
    }

    let tweets: TwitterTweet[] = [];
    let users: Map<string, TwitterUser> = new Map();

    if (searchType === 'user' && username) {
      // Fetch user timeline
      const userResponse = await fetch(
        `https://api.twitter.com/2/users/by/username/${username}`,
        {
          headers: {
            'Authorization': `Bearer ${bearerToken}`,
          },
        }
      );

      if (!userResponse.ok) {
        throw new Error(`Twitter API error (user lookup): ${userResponse.statusText}`);
      }

      const userData = await userResponse.json();
      const userId = userData.data?.id;

      if (!userId) {
        throw new Error('User not found');
      }

      users.set(userId, userData.data);

      // Fetch user's tweets
      const tweetsUrl = `https://api.twitter.com/2/users/${userId}/tweets?max_results=${Math.min(maxItems, 100)}&tweet.fields=created_at,public_metrics&exclude=retweets,replies`;
      const tweetsResponse = await fetch(tweetsUrl, {
        headers: {
          'Authorization': `Bearer ${bearerToken}`,
        },
      });

      if (!tweetsResponse.ok) {
        throw new Error(`Twitter API error (timeline): ${tweetsResponse.statusText}`);
      }

      const tweetsData = await tweetsResponse.json();
      tweets = tweetsData.data || [];
    } else if (searchType === 'search' && query) {
      // Search tweets
      const searchUrl = `https://api.twitter.com/2/tweets/search/recent?query=${encodeURIComponent(query)}&max_results=${Math.min(maxItems, 100)}&tweet.fields=created_at,author_id,public_metrics&expansions=author_id&user.fields=username,name`;
      const searchResponse = await fetch(searchUrl, {
        headers: {
          'Authorization': `Bearer ${bearerToken}`,
        },
      });

      if (!searchResponse.ok) {
        throw new Error(`Twitter API error (search): ${searchResponse.statusText}`);
      }

      const searchData = await searchResponse.json();
      tweets = searchData.data || [];

      // Map users
      if (searchData.includes?.users) {
        for (const user of searchData.includes.users) {
          users.set(user.id, user);
        }
      }
    } else {
      throw new Error('Either query (for search) or username (for user timeline) is required');
    }

    // Normalize to NormalizedItem
    const normalized: NormalizedItem[] = tweets.slice(0, maxItems).map(tweet => {
      const user = users.get(tweet.author_id);
      const metrics = tweet.public_metrics;
      const engagementScore = metrics
        ? metrics.like_count + metrics.retweet_count * 2 + metrics.reply_count
        : 0;

      return {
        id: `twitter-${tweet.id}`,
        title: user ? `@${user.username}: ${tweet.text.substring(0, 100)}${tweet.text.length > 100 ? '...' : ''}` : tweet.text.substring(0, 100),
        summary: tweet.text,
        url: `https://twitter.com/${user?.username || 'twitter'}/status/${tweet.id}`,
        publishedAt: tweet.created_at,
        author: user?.name || user?.username || 'Unknown',
        score: engagementScore,
        raw: tweet,
      };
    });

    console.log(`✅ Fetched ${normalized.length} tweets`);
    return normalized;

  } catch (error: any) {
    console.error('❌ Error fetching Twitter:', error.message);
    console.log('   Falling back to mock data...');
    return getMockTwitterData(maxItems);
  }
}

function getMockTwitterData(maxItems: number): NormalizedItem[] {
  const mockTweets = [
    {
      id: 'twitter-mock-1',
      title: '@ai_researcher: Breakthrough in multimodal AI - GPT-5 rumors heating up',
      summary: 'Breakthrough in multimodal AI - GPT-5 rumors heating up. Industry insiders suggest major announcements coming Q1 2025.',
      url: 'https://twitter.com',
      publishedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
      author: 'AI Researcher',
      score: 1250,
    },
    {
      id: 'twitter-mock-2',
      title: '@techcrunch: Startup raises $50M for AI-powered developer tools',
      summary: 'Startup raises $50M for AI-powered developer tools that promise to cut coding time by 70%',
      url: 'https://twitter.com',
      publishedAt: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
      author: 'TechCrunch',
      score: 845,
    },
    {
      id: 'twitter-mock-3',
      title: '@elonmusk: Just shipped the best update yet',
      summary: 'Just shipped the best update yet. Users are going to love this.',
      url: 'https://twitter.com',
      publishedAt: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
      author: 'Elon Musk',
      score: 15234,
    },
  ];

  return mockTweets.slice(0, maxItems);
}

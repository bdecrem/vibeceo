/**
 * Example usage of data source fetchers
 * This file demonstrates how to use each source fetcher
 */

import {
  fetchTwitter,
  fetchYouTube,
  fetchNewsAPI,
  fetchStockPrice,
  fetchGmail,
  fetchHackerNews,
  fetchCryptoPrice,
  fetchWeather,
  fetchProductHunt,
  fetchReddit,
} from './index.js';

/**
 * Example: Fetch trending tech news from multiple sources
 */
export async function fetchTechNews() {
  console.log('\n=== Fetching Tech News ===\n');

  // From NewsAPI
  const newsApiArticles = await fetchNewsAPI({
    category: 'technology',
    country: 'us',
    maxItems: 5,
  });

  // From Hacker News
  const hnStories = await fetchHackerNews({
    feed: 'top',
    maxItems: 5,
  });

  // From Reddit
  const redditPosts = await fetchReddit({
    subreddit: 'technology',
    sort: 'hot',
    maxItems: 5,
  });

  return {
    newsApi: newsApiArticles,
    hackerNews: hnStories,
    reddit: redditPosts,
  };
}

/**
 * Example: Track AI discussions on social media
 */
export async function trackAIDiscussions() {
  console.log('\n=== Tracking AI Discussions ===\n');

  // Twitter search
  const tweets = await fetchTwitter({
    query: 'AI agents OR artificial intelligence',
    searchType: 'search',
    maxItems: 10,
  });

  // YouTube videos
  const videos = await fetchYouTube({
    query: 'AI tutorial 2025',
    maxItems: 5,
  });

  // Reddit discussions
  const discussions = await fetchReddit({
    subreddit: 'artificial',
    sort: 'hot',
    maxItems: 5,
  });

  return {
    tweets,
    videos,
    discussions,
  };
}

/**
 * Example: Financial portfolio tracker
 */
export async function trackPortfolio() {
  console.log('\n=== Tracking Portfolio ===\n');

  // Tech stocks
  const stocks = await fetchStockPrice({
    symbols: ['AAPL', 'GOOGL', 'MSFT', 'NVDA', 'META'],
    maxItems: 5,
  });

  // Cryptocurrencies
  const crypto = await fetchCryptoPrice({
    coins: ['bitcoin', 'ethereum', 'solana', 'cardano'],
    currency: 'usd',
    maxItems: 4,
  });

  return {
    stocks,
    crypto,
  };
}

/**
 * Example: Daily briefing aggregator
 */
export async function dailyBriefing() {
  console.log('\n=== Daily Briefing ===\n');

  const [news, weather, productLaunches, emails] = await Promise.all([
    // Top headlines
    fetchNewsAPI({
      country: 'us',
      maxItems: 5,
    }),

    // Weather forecast
    fetchWeather({
      location: 'San Francisco',
      units: 'imperial',
      maxItems: 3,
    }),

    // Product Hunt launches
    fetchProductHunt({
      maxItems: 5,
    }),

    // Unread emails (if Gmail is configured)
    fetchGmail({
      query: 'is:unread',
      labelIds: ['INBOX'],
      maxItems: 10,
    }),
  ]);

  return {
    news,
    weather,
    productLaunches,
    emails,
  };
}

/**
 * Example: Monitor a specific Twitter user
 */
export async function monitorTwitterUser(username: string) {
  console.log(`\n=== Monitoring @${username} ===\n`);

  const tweets = await fetchTwitter({
    username,
    searchType: 'user',
    maxItems: 20,
  });

  return tweets;
}

/**
 * Example: Research assistant - gather info on a topic
 */
export async function researchTopic(topic: string) {
  console.log(`\n=== Researching: ${topic} ===\n`);

  const [newsArticles, videos, discussions, tweets] = await Promise.all([
    // News articles
    fetchNewsAPI({
      query: topic,
      maxItems: 10,
    }),

    // YouTube videos
    fetchYouTube({
      query: topic,
      maxItems: 5,
    }),

    // Hacker News discussions
    fetchHackerNews({
      feed: 'top',
      maxItems: 10,
    }),

    // Twitter discussions
    fetchTwitter({
      query: topic,
      searchType: 'search',
      maxItems: 15,
    }),
  ]);

  return {
    articles: newsArticles,
    videos,
    discussions,
    tweets,
  };
}

/**
 * Example: Stock market alert system
 */
export async function checkMarketMovers(threshold: number = 5) {
  console.log('\n=== Checking Market Movers ===\n');

  const stocks = await fetchStockPrice({
    symbols: [
      'AAPL', 'GOOGL', 'MSFT', 'AMZN', 'META',
      'TSLA', 'NVDA', 'AMD', 'NFLX', 'SPOT',
    ],
    maxItems: 10,
  });

  // Filter for significant movers
  const movers = stocks.filter(stock => {
    const summary = stock.summary || '';
    const percentMatch = summary.match(/\(([+-]?\d+\.\d+)%\)/);
    if (percentMatch) {
      const percent = Math.abs(parseFloat(percentMatch[1]));
      return percent >= threshold;
    }
    return false;
  });

  console.log(`Found ${movers.length} stocks moving more than ${threshold}%`);
  return movers;
}

/**
 * Example: Run all examples
 */
export async function runExamples() {
  try {
    // Tech news aggregation
    const techNews = await fetchTechNews();
    console.log('\nTech News Sources:', Object.keys(techNews));

    // AI tracking
    const aiDiscussions = await trackAIDiscussions();
    console.log('\nAI Discussion Sources:', Object.keys(aiDiscussions));

    // Portfolio tracking
    const portfolio = await trackPortfolio();
    console.log('\nPortfolio Assets:', {
      stocks: portfolio.stocks.length,
      crypto: portfolio.crypto.length,
    });

    // Daily briefing
    const briefing = await dailyBriefing();
    console.log('\nBriefing Sections:', Object.keys(briefing));

    // Research a topic
    const research = await researchTopic('Claude AI');
    console.log('\nResearch Sources:', Object.keys(research));

    console.log('\n✅ All examples completed successfully!');
  } catch (error) {
    console.error('❌ Error running examples:', error);
  }
}

// Uncomment to run examples
// runExamples();

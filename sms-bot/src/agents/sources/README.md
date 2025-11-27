# Agent Data Source Fetchers

This directory contains all data source fetchers for the agent system. Each fetcher normalizes data from external APIs into the `NormalizedItem` format.

## Available Sources

### Social Media & News

#### **twitter.ts** - Twitter/X API v2
Fetch tweets using Twitter API v2.

**Environment Variables:**
- `TWITTER_BEARER_TOKEN` (required)

**Config:**
```typescript
{
  query?: string;          // Search query (for search mode)
  username?: string;       // Twitter username (for user timeline)
  searchType?: 'search' | 'user';  // Default: 'search'
  maxItems?: number;       // Default: 10
}
```

**Usage:**
```typescript
import { fetchTwitter } from './sources/twitter.js';

// Search for tweets
const tweets = await fetchTwitter({
  query: 'AI agents',
  searchType: 'search',
  maxItems: 20
});

// Get user timeline
const userTweets = await fetchTwitter({
  username: 'elonmusk',
  searchType: 'user',
  maxItems: 10
});
```

**Mock Data:** Returns 3 sample tweets when API key is missing.

---

#### **reddit.ts** - Reddit API
Fetch posts from subreddits.

**Environment Variables:** None (uses public API)

**Config:**
```typescript
{
  subreddit: string;       // Subreddit name (without r/)
  sort?: 'hot' | 'new' | 'top' | 'rising';
  timeframe?: 't' | 'hour' | 'day' | 'week' | 'month' | 'year' | 'all';
  maxItems?: number;
}
```

---

### News & Content

#### **news-api.ts** - NewsAPI.org
Fetch news articles from NewsAPI.

**Environment Variables:**
- `NEWS_API_KEY` (required)

**Config:**
```typescript
{
  query?: string;          // Search query (uses /everything endpoint)
  sources?: string;        // Comma-separated source IDs (e.g., 'bbc-news,cnn')
  country?: string;        // Country code (e.g., 'us', 'gb') - Default: 'us'
  category?: 'business' | 'entertainment' | 'general' | 'health' | 'science' | 'sports' | 'technology';
  maxItems?: number;       // Default: 10
}
```

**Usage:**
```typescript
import { fetchNewsAPI } from './sources/news-api.js';

// Search for AI news
const aiNews = await fetchNewsAPI({
  query: 'artificial intelligence',
  maxItems: 15
});

// Get top tech headlines in US
const techNews = await fetchNewsAPI({
  country: 'us',
  category: 'technology',
  maxItems: 10
});

// Get news from specific sources
const bbcNews = await fetchNewsAPI({
  sources: 'bbc-news,the-verge',
  maxItems: 20
});
```

**Mock Data:** Returns 4 sample news articles when API key is missing.

**API Endpoints:**
- `/everything` - Used when `query` is provided
- `/top-headlines` - Used when fetching by country/category

---

#### **google-news.ts** - Google News
Fetch news from Google News.

**Environment Variables:** None (uses RSS feeds)

---

#### **hackernews.ts** - Hacker News
Fetch stories from Hacker News.

**Environment Variables:** None (uses public API)

**Config:**
```typescript
{
  feed?: 'top' | 'new' | 'best' | 'ask' | 'show' | 'job';
  maxItems?: number;
}
```

---

### Video & Audio

#### **youtube.ts** - YouTube Data API v3
Fetch videos from YouTube.

**Environment Variables:**
- `YOUTUBE_API_KEY` (required)

**Config:**
```typescript
{
  query?: string;          // Search query
  channelId?: string;      // Channel ID to fetch from
  maxItems?: number;       // Default: 10
}
```

**Usage:**
```typescript
import { fetchYouTube } from './sources/youtube.js';

// Search for videos
const videos = await fetchYouTube({
  query: 'AI programming tutorial',
  maxItems: 10
});

// Get videos from a specific channel
const channelVideos = await fetchYouTube({
  channelId: 'UC_x5XG1OV2P6uZZ5FSM9Ttw',  // Google Developers
  maxItems: 5
});
```

**Mock Data:** Returns 3 sample videos when API key is missing.

**Notes:**
- Fetches video statistics (views, likes) in a second API call
- Returns view count as the `score` field for ranking

---

#### **podcast.ts** - Podcast Episodes
Fetch podcast episodes.

**Environment Variables:** TBD

---

### Developer & Tech

#### **github.ts** - GitHub API
Fetch repositories and issues from GitHub.

**Environment Variables:** `GITHUB_TOKEN` (optional, increases rate limits)

---

#### **producthunt.ts** - Product Hunt
Fetch products from Product Hunt.

**Environment Variables:** `PRODUCTHUNT_API_TOKEN` (required)

---

### Finance & Markets

#### **stock-price.ts** - Stock Market Data
Fetch real-time stock prices.

**Environment Variables:**
- `ALPHA_VANTAGE_API_KEY` (optional, recommended)

**Config:**
```typescript
{
  symbols: string[];       // Stock ticker symbols (e.g., ['AAPL', 'GOOGL', 'TSLA'])
  maxItems?: number;       // Default: 10
}
```

**Usage:**
```typescript
import { fetchStockPrice } from './sources/stock-price.js';

const stocks = await fetchStockPrice({
  symbols: ['AAPL', 'GOOGL', 'MSFT', 'TSLA', 'NVDA'],
  maxItems: 5
});
```

**Mock Data:** Returns generated stock data when no API is available.

**API Providers:**
1. **Alpha Vantage** (preferred, if `ALPHA_VANTAGE_API_KEY` is set)
   - More reliable
   - Rate limited: 5 calls per minute (free tier)
   - Fetches quotes sequentially with delays

2. **Yahoo Finance** (fallback, no API key required)
   - Unofficial API (may be less stable)
   - Fetches multiple symbols in a single request
   - No authentication required

**Notes:**
- Returns price, change, change %, and volume
- Volume is used as the `score` field
- Alpha Vantage has built-in rate limiting (12 second delay between requests)

---

#### **crypto-price.ts** - Cryptocurrency Prices
Fetch crypto prices from CoinGecko.

**Environment Variables:** None (uses public API)

**Config:**
```typescript
{
  coins?: string[];        // CoinGecko IDs (e.g., ['bitcoin', 'ethereum'])
  currency?: string;       // Default: 'usd'
  maxItems?: number;
}
```

---

### Communication

#### **gmail.ts** - Gmail API
Fetch emails from Gmail.

**Environment Variables:**
- `GMAIL_ACCESS_TOKEN` (required - OAuth 2.0 access token)

**Config:**
```typescript
{
  query?: string;          // Gmail search query (e.g., 'is:unread', 'from:example@gmail.com')
  maxItems?: number;       // Default: 10
  labelIds?: string[];     // Label IDs to filter (e.g., ['INBOX', 'UNREAD'])
}
```

**Usage:**
```typescript
import { fetchGmail } from './sources/gmail.js';

// Fetch unread emails
const unread = await fetchGmail({
  query: 'is:unread',
  labelIds: ['INBOX'],
  maxItems: 20
});

// Search for emails from a specific sender
const fromSender = await fetchGmail({
  query: 'from:important@company.com',
  maxItems: 10
});
```

**Mock Data:** Returns 4 sample emails when access token is missing.

**OAuth Setup:**
1. Create a project in Google Cloud Console
2. Enable Gmail API
3. Create OAuth 2.0 credentials
4. Obtain an access token (or refresh token for long-term use)
5. Set `GMAIL_ACCESS_TOKEN` environment variable

**Gmail Search Query Examples:**
- `is:unread` - Unread emails
- `from:user@example.com` - From specific sender
- `subject:invoice` - Emails with "invoice" in subject
- `has:attachment` - Emails with attachments
- `after:2024/1/1` - Emails after a date

**Notes:**
- Uses Gmail API v1
- Fetches full message details including headers
- Returns message snippet as summary
- Extracts sender name and email address

---

### Weather & Location

#### **weather.ts** - OpenWeather API
Fetch weather forecasts.

**Environment Variables:** `OPENWEATHER_API_KEY` (required)

**Config:**
```typescript
{
  location: string;        // City name or coordinates
  units?: 'metric' | 'imperial';
  maxItems?: number;       // Number of forecast days
}
```

---

### Generic Sources

#### **rss.ts** - RSS Feeds
Fetch content from any RSS feed.

#### **http-json.ts** - Generic HTTP/JSON API
Fetch data from any JSON API.

#### **web-scraper.ts** - Web Scraping
Scrape content from web pages.

#### **arxiv.ts** - arXiv Papers
Fetch academic papers from arXiv.

#### **fetch.ts** - Generic Fetch
Generic data fetching utility.

---

## NormalizedItem Format

All sources return data in this format:

```typescript
interface NormalizedItem {
  id?: string;              // Unique identifier
  title?: string;           // Item title
  summary?: string;         // Brief description
  url?: string;             // Link to original content
  publishedAt?: string;     // ISO 8601 timestamp
  author?: string;          // Content author/source
  score?: number;           // Engagement/ranking score (optional)
  raw?: any;                // Original API response
}
```

---

## Implementation Patterns

All source fetchers follow these patterns:

### 1. Config Interface
```typescript
export interface SourceConfig {
  // Source-specific configuration
  maxItems?: number;  // Common across all sources
}
```

### 2. Main Fetch Function
```typescript
export async function fetchSource(config: SourceConfig): Promise<NormalizedItem[]> {
  console.log('🔍 Fetching [source]...');

  try {
    // Check for API key
    const apiKey = process.env.SOURCE_API_KEY;
    if (!apiKey) {
      console.warn('⚠️ SOURCE_API_KEY not set, using mock data');
      return getMockData(config);
    }

    // Fetch from API
    const response = await fetch(url, { headers });

    // Transform to NormalizedItem[]
    const normalized = data.map(item => ({
      id: `source-${item.id}`,
      title: item.title,
      summary: item.description,
      url: item.url,
      publishedAt: item.date,
      author: item.author,
      score: item.score,
      raw: item,
    }));

    console.log(`✅ Fetched ${normalized.length} items`);
    return normalized;

  } catch (error: any) {
    console.error('❌ Error fetching source:', error.message);
    console.log('   Falling back to mock data...');
    return getMockData(config);
  }
}
```

### 3. Mock Data Function
```typescript
function getMockData(config: SourceConfig): NormalizedItem[] {
  // Return realistic mock data for testing
  return mockItems.slice(0, config.maxItems);
}
```

---

## Error Handling

All fetchers include:
- Environment variable validation
- Graceful fallback to mock data
- Detailed error logging with emojis
- Type-safe error handling

---

## Adding a New Source

1. Create a new `.ts` file in this directory
2. Follow the implementation pattern above
3. Export the config interface and fetch function
4. Add comprehensive JSDoc comments
5. Include mock data for testing
6. Add to `index.ts` exports
7. Update this README

---

## Environment Variables Reference

Create a `.env` file with these variables:

```bash
# Social Media
TWITTER_BEARER_TOKEN=your_twitter_bearer_token

# News
NEWS_API_KEY=your_newsapi_key

# Video
YOUTUBE_API_KEY=your_youtube_api_key

# Finance
ALPHA_VANTAGE_API_KEY=your_alphavantage_key

# Communication
GMAIL_ACCESS_TOKEN=your_gmail_oauth_token

# Weather
OPENWEATHER_API_KEY=your_openweather_key

# Product Hunt
PRODUCTHUNT_API_TOKEN=your_producthunt_token

# GitHub (optional)
GITHUB_TOKEN=your_github_token
```

---

## Testing

All sources can be tested without API keys using mock data:

```typescript
// Will use mock data if API key is not set
const items = await fetchTwitter({ query: 'test', maxItems: 5 });
console.log(items); // Returns mock tweets
```

---

## License

Part of the vibeceo/sms-bot agent system.

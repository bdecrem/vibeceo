/**
 * NewsAPI source fetcher
 * Fetches news articles from NewsAPI.org
 */

import type { NormalizedItem } from '@vibeceo/shared-types';

export interface NewsAPIConfig {
  query?: string; // Search query for everything endpoint
  sources?: string; // Comma-separated source IDs (e.g., 'bbc-news,cnn')
  country?: string; // Country code (e.g., 'us', 'gb') for top headlines
  category?: 'business' | 'entertainment' | 'general' | 'health' | 'science' | 'sports' | 'technology';
  maxItems?: number;
}

interface NewsArticle {
  source: {
    id: string | null;
    name: string;
  };
  author: string | null;
  title: string;
  description: string;
  url: string;
  urlToImage: string;
  publishedAt: string;
  content: string;
}

export async function fetchNewsAPI(config: NewsAPIConfig): Promise<NormalizedItem[]> {
  const {
    query,
    sources,
    country = 'us',
    category,
    maxItems = 10,
  } = config;

  console.log(`📰 Fetching news articles...`);

  try {
    const apiKey = process.env.NEWS_API_KEY;

    if (!apiKey) {
      console.warn('⚠️ NEWS_API_KEY not set, using mock data');
      return getMockNewsData(maxItems);
    }

    let url: string;
    const pageSize = Math.min(maxItems, 100); // NewsAPI max is 100

    if (query) {
      // Use everything endpoint for search
      url = `https://newsapi.org/v2/everything?q=${encodeURIComponent(query)}&pageSize=${pageSize}&sortBy=publishedAt&apiKey=${apiKey}`;
      if (sources) {
        url += `&sources=${sources}`;
      }
    } else {
      // Use top-headlines endpoint
      url = `https://newsapi.org/v2/top-headlines?pageSize=${pageSize}&apiKey=${apiKey}`;

      if (sources) {
        url += `&sources=${sources}`;
      } else {
        // Can only use country/category if not using sources
        url += `&country=${country}`;
        if (category) {
          url += `&category=${category}`;
        }
      }
    }

    const response = await fetch(url);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`NewsAPI error: ${errorData.message || response.statusText}`);
    }

    const data = await response.json();

    if (data.status !== 'ok') {
      throw new Error(`NewsAPI error: ${data.message || 'Unknown error'}`);
    }

    const articles: NewsArticle[] = data.articles || [];

    // Normalize to NormalizedItem
    const normalized: NormalizedItem[] = articles
      .filter(article => article.title && article.url) // Filter out invalid articles
      .slice(0, maxItems)
      .map(article => ({
        id: `news-${Buffer.from(article.url).toString('base64').substring(0, 20)}`,
        title: article.title,
        summary: article.description || article.content?.substring(0, 200) || 'No description available',
        url: article.url,
        publishedAt: article.publishedAt,
        author: article.author || article.source.name,
        raw: article,
      }));

    console.log(`✅ Fetched ${normalized.length} news articles`);
    return normalized;

  } catch (error: any) {
    console.error('❌ Error fetching NewsAPI:', error.message);
    console.log('   Falling back to mock data...');
    return getMockNewsData(maxItems);
  }
}

function getMockNewsData(maxItems: number): NormalizedItem[] {
  const mockArticles = [
    {
      id: 'news-mock-1',
      title: 'AI Breakthrough: New Model Achieves Human-Level Reasoning',
      summary: 'Researchers announce a significant breakthrough in artificial intelligence, with a new model demonstrating human-level reasoning capabilities across multiple domains.',
      url: 'https://newsapi.org',
      publishedAt: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
      author: 'Tech News Daily',
    },
    {
      id: 'news-mock-2',
      title: 'Global Tech Summit Announces Sustainability Initiatives',
      summary: 'Major technology companies commit to new sustainability goals at the annual Global Tech Summit, focusing on carbon neutrality and renewable energy.',
      url: 'https://newsapi.org',
      publishedAt: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
      author: 'Reuters',
    },
    {
      id: 'news-mock-3',
      title: 'Cybersecurity Threats Evolve with AI-Powered Attacks',
      summary: 'Security experts warn of a new generation of cyber threats leveraging artificial intelligence to evade traditional defense mechanisms.',
      url: 'https://newsapi.org',
      publishedAt: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(),
      author: 'Cybersecurity Weekly',
    },
    {
      id: 'news-mock-4',
      title: 'Quantum Computing Reaches New Milestone',
      summary: 'Scientists achieve quantum supremacy in a new domain, bringing practical quantum computing applications closer to reality.',
      url: 'https://newsapi.org',
      publishedAt: new Date(Date.now() - 18 * 60 * 60 * 1000).toISOString(),
      author: 'Science Today',
    },
  ];

  return mockArticles.slice(0, maxItems);
}

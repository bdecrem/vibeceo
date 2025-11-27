/**
 * Product Hunt source fetcher
 * Fetches today's top products from Product Hunt
 */

import type { NormalizedItem } from '@vibeceo/shared-types';

export interface ProductHuntConfig {
  date?: string; // YYYY-MM-DD format, defaults to today
  maxItems?: number;
}

interface ProductHuntProduct {
  id: number;
  name: string;
  tagline: string;
  description: string;
  url: string;
  votes_count: number;
  comments_count: number;
  created_at: string;
  maker_inside: boolean;
}

export async function fetchProductHunt(config: ProductHuntConfig): Promise<NormalizedItem[]> {
  const {
    date,
    maxItems = 10,
  } = config;

  console.log(`🚀 Fetching Product Hunt products...`);

  try {
    // Product Hunt API requires authentication
    // Check for API token
    const apiToken = process.env.PRODUCTHUNT_API_TOKEN;

    if (!apiToken) {
      console.warn('⚠️ PRODUCTHUNT_API_TOKEN not set, using mock data');
      return getMockProductHuntData(maxItems);
    }

    const targetDate = date || new Date().toISOString().split('T')[0];
    const url = `https://api.producthunt.com/v2/api/graphql`;

    const query = `
      query {
        posts(order: VOTES, postedAfter: "${targetDate}T00:00:00Z", postedBefore: "${targetDate}T23:59:59Z") {
          edges {
            node {
              id
              name
              tagline
              description
              url
              votesCount
              commentsCount
              createdAt
            }
          }
        }
      }
    `;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiToken}`,
      },
      body: JSON.stringify({ query }),
    });

    if (!response.ok) {
      throw new Error(`Product Hunt API error: ${response.statusText}`);
    }

    const data = await response.json();
    const products = data.data?.posts?.edges?.map((edge: any) => edge.node) || [];

    // Normalize to NormalizedItem
    const normalized: NormalizedItem[] = products.slice(0, maxItems).map((product: any) => ({
      id: `ph-${product.id}`,
      title: product.name,
      summary: product.tagline || product.description?.substring(0, 200),
      url: product.url || `https://www.producthunt.com/posts/${product.name.toLowerCase().replace(/\s+/g, '-')}`,
      publishedAt: product.createdAt,
      author: 'Product Hunt',
      score: product.votesCount,
      raw: product,
    }));

    console.log(`✅ Fetched ${normalized.length} products from Product Hunt`);
    return normalized;

  } catch (error: any) {
    console.error('❌ Error fetching Product Hunt:', error.message);
    console.log('   Falling back to mock data...');
    return getMockProductHuntData(maxItems);
  }
}

function getMockProductHuntData(maxItems: number): NormalizedItem[] {
  // Mock data for testing when API token is not available
  const mockProducts = [
    {
      id: 'ph-mock-1',
      title: 'AI Code Assistant Pro',
      summary: 'Write code faster with AI-powered completions and suggestions',
      url: 'https://www.producthunt.com',
      publishedAt: new Date().toISOString(),
      author: 'Product Hunt',
      score: 234,
    },
    {
      id: 'ph-mock-2',
      title: 'TaskFlow 2.0',
      summary: 'Beautiful task management for modern teams',
      url: 'https://www.producthunt.com',
      publishedAt: new Date().toISOString(),
      author: 'Product Hunt',
      score: 189,
    },
  ];

  return mockProducts.slice(0, maxItems);
}

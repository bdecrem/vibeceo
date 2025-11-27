/**
 * Category Classification Pipeline Step
 * Classifies items into categories using keyword matching
 */

import type { NormalizedItem, CategoryClassificationStep } from '@vibeceo/shared-types';

// Default categories with keywords
const DEFAULT_CATEGORIES = {
  technology: [
    'software', 'hardware', 'ai', 'artificial intelligence', 'machine learning', 'ml',
    'computer', 'programming', 'code', 'algorithm', 'data', 'cloud', 'cyber',
    'tech', 'digital', 'app', 'application', 'platform', 'api', 'blockchain',
    'cryptocurrency', 'crypto', 'web', 'mobile', 'device', 'chip', 'processor',
  ],
  business: [
    'business', 'company', 'startup', 'entrepreneur', 'market', 'sales', 'revenue',
    'profit', 'loss', 'investment', 'investor', 'funding', 'venture capital', 'vc',
    'ipo', 'merger', 'acquisition', 'strategy', 'management', 'executive', 'ceo',
    'finance', 'financial', 'economic', 'economy', 'trade', 'commerce', 'industry',
  ],
  science: [
    'science', 'research', 'study', 'scientist', 'discovery', 'experiment',
    'laboratory', 'biology', 'chemistry', 'physics', 'medical', 'medicine',
    'health', 'disease', 'treatment', 'drug', 'vaccine', 'clinical', 'trial',
    'journal', 'peer review', 'hypothesis', 'theory', 'evidence', 'data',
  ],
  politics: [
    'politics', 'political', 'government', 'policy', 'election', 'vote', 'senator',
    'congress', 'parliament', 'president', 'minister', 'legislation', 'law',
    'regulation', 'campaign', 'democrat', 'republican', 'party', 'bill',
    'amendment', 'constitution', 'court', 'justice', 'state', 'federal',
  ],
  entertainment: [
    'entertainment', 'movie', 'film', 'tv', 'television', 'show', 'series',
    'music', 'album', 'song', 'artist', 'actor', 'actress', 'celebrity',
    'game', 'gaming', 'video game', 'esports', 'streaming', 'netflix',
    'disney', 'hollywood', 'theater', 'performance', 'concert', 'festival',
  ],
};

/**
 * Classify a single item into a category
 */
function classifyItem(
  text: string,
  categories: string[],
  categoryKeywords?: Record<string, string[]>
): string {
  const lowerText = text.toLowerCase();
  const scores: Record<string, number> = {};

  // Use provided category keywords or default ones
  const keywords = categoryKeywords || DEFAULT_CATEGORIES;

  for (const category of categories) {
    const categoryWords = keywords[category.toLowerCase()] || [];
    let score = 0;

    for (const keyword of categoryWords) {
      // Count occurrences of each keyword
      const regex = new RegExp(`\\b${keyword.replace(/\s+/g, '\\s+')}\\b`, 'gi');
      const matches = lowerText.match(regex);
      if (matches) {
        score += matches.length;
      }
    }

    scores[category] = score;
  }

  // Find category with highest score
  let bestCategory = categories[0];
  let bestScore = scores[bestCategory] || 0;

  for (const category of categories) {
    if (scores[category] > bestScore) {
      bestScore = scores[category];
      bestCategory = category;
    }
  }

  // If no keywords matched, return 'uncategorized'
  if (bestScore === 0) {
    return 'uncategorized';
  }

  return bestCategory;
}

/**
 * Classify items into categories
 */
export async function classifyCategories(
  items: NormalizedItem[],
  config: CategoryClassificationStep
): Promise<NormalizedItem[]> {
  if (items.length === 0) {
    return [];
  }

  const categories = config.categories || ['technology', 'business', 'science', 'politics', 'entertainment'];

  console.log(`📑 Classifying ${items.length} items into categories: ${categories.join(', ')}...`);

  try {
    const enrichedItems = items.map(item => {
      const textToAnalyze = `${item.title || ''} ${item.summary || ''}`.trim();

      if (!textToAnalyze) {
        return {
          ...item,
          category: 'uncategorized',
        };
      }

      const category = classifyItem(textToAnalyze, categories);

      return {
        ...item,
        category,
      };
    });

    // Count items per category
    const categoryCounts: Record<string, number> = {};
    enrichedItems.forEach(item => {
      const cat = (item as any).category || 'uncategorized';
      categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
    });

    console.log(`✅ Classified ${enrichedItems.length} items:`, categoryCounts);
    return enrichedItems;
  } catch (error: any) {
    console.error(`❌ Category classification failed: ${error.message}`);
    return items;
  }
}

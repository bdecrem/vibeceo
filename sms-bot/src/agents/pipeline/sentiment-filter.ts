/**
 * Sentiment Filter Pipeline Step
 * Filters items by sentiment (positive, negative, neutral)
 */

import type { NormalizedItem, SentimentFilterStep } from '@vibeceo/shared-types';

// Simple keyword-based sentiment detection
const POSITIVE_WORDS = [
  'good', 'great', 'excellent', 'amazing', 'awesome', 'fantastic', 'wonderful',
  'positive', 'success', 'win', 'winning', 'innovation', 'breakthrough', 'growth',
  'love', 'best', 'better', 'improved', 'improved', 'achievement', 'accomplish',
  'happy', 'exciting', 'impressive', 'outstanding', 'perfect', 'superior',
  'remarkable', 'revolutionary', 'exceptional', 'milestone', 'triumph'
];

const NEGATIVE_WORDS = [
  'bad', 'terrible', 'awful', 'horrible', 'worst', 'poor', 'fail', 'failure',
  'problem', 'issue', 'bug', 'error', 'wrong', 'broken', 'crash', 'critical',
  'crisis', 'disaster', 'decline', 'loss', 'losing', 'concern', 'worry',
  'threat', 'risk', 'danger', 'controversial', 'scandal', 'layoff', 'lawsuit',
  'unfortunate', 'struggling', 'disappointing', 'setback', 'breach'
];

/**
 * Detect sentiment from text using simple keyword matching
 * For advanced sentiment analysis, items should be pre-processed with sentiment_analysis step
 *
 * @param text - Text to analyze
 * @returns Detected sentiment
 */
function detectSentiment(text: string): 'positive' | 'negative' | 'neutral' {
  const lowerText = text.toLowerCase();

  let positiveCount = 0;
  let negativeCount = 0;

  for (const word of POSITIVE_WORDS) {
    if (lowerText.includes(word)) {
      positiveCount++;
    }
  }

  for (const word of NEGATIVE_WORDS) {
    if (lowerText.includes(word)) {
      negativeCount++;
    }
  }

  if (positiveCount > negativeCount) {
    return 'positive';
  } else if (negativeCount > positiveCount) {
    return 'negative';
  }

  return 'neutral';
}

/**
 * Filter items by sentiment
 * If item has enriched sentiment data, use that; otherwise detect from text
 *
 * @param items - Array of normalized items to filter
 * @param config - Sentiment filter configuration
 * @returns Filtered array of items matching the desired sentiment
 */
export function filterBySentiment(items: NormalizedItem[], config: SentimentFilterStep): NormalizedItem[] {
  console.log(`🔍 Filtering by sentiment: ${config.sentiment}...`);

  if (items.length === 0) {
    console.log(`✅ No items to filter`);
    return items;
  }

  const filtered = items.filter(item => {
    const enrichedItem = item as any;

    // If item already has sentiment from sentiment_analysis step, use that
    if (enrichedItem.sentiment) {
      return enrichedItem.sentiment === config.sentiment;
    }

    // Otherwise, detect sentiment from text
    const text = [item.title || '', item.summary || ''].join(' ');
    const detectedSentiment = detectSentiment(text);

    return detectedSentiment === config.sentiment;
  });

  console.log(`✅ Sentiment filter complete: ${items.length} → ${filtered.length} items (${config.sentiment})`);
  return filtered;
}

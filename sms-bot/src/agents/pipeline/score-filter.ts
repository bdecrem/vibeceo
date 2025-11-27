/**
 * Score Filter Pipeline Step
 * Filters items by minimum score threshold
 */

import type { NormalizedItem, ScoreFilterStep } from '@vibeceo/shared-types';

/**
 * Filter items by minimum score
 * Keeps only items with score >= minScore
 * Score comes from sources (HN upvotes, Reddit score, etc.) or from ranking steps
 *
 * @param items - Array of normalized items to filter
 * @param config - Score filter configuration
 * @returns Filtered array of items meeting the minimum score
 */
export function filterByScore(items: NormalizedItem[], config: ScoreFilterStep): NormalizedItem[] {
  console.log(`🔍 Filtering by minimum score: ${config.minScore}...`);

  if (items.length === 0) {
    console.log(`✅ No items to filter`);
    return items;
  }

  const filtered = items.filter(item => {
    if (item.score === undefined || item.score === null) {
      return false; // Exclude items without a score
    }

    return item.score >= config.minScore;
  });

  console.log(`✅ Score filter complete: ${items.length} → ${filtered.length} items (minScore: ${config.minScore})`);
  return filtered;
}

/**
 * Top N Filter Pipeline Step
 * Selects top N items by a metric (score, publishedAt, relevance)
 */

import type { NormalizedItem, TopNFilterStep, EnrichedItem } from '@vibeceo/shared-types';

/**
 * Select top N items by metric
 * Sorts items by the specified metric and returns the top N
 *
 * @param items - Array of normalized items to filter
 * @param config - Top N filter configuration
 * @returns Top N items sorted by the specified metric
 */
export function selectTopN(items: NormalizedItem[], config: TopNFilterStep): NormalizedItem[] {
  console.log(`🔍 Selecting top ${config.n} items by ${config.sortBy}...`);

  if (items.length === 0) {
    console.log(`✅ No items to filter`);
    return items;
  }

  // Sort items by the specified metric
  const sorted = [...items].sort((a, b) => {
    let aVal: number;
    let bVal: number;

    switch (config.sortBy) {
      case 'score':
      case 'relevance':
        aVal = (a as EnrichedItem).score || 0;
        bVal = (b as EnrichedItem).score || 0;
        break;

      case 'publishedAt':
        aVal = a.publishedAt ? new Date(a.publishedAt).getTime() : 0;
        bVal = b.publishedAt ? new Date(b.publishedAt).getTime() : 0;
        break;

      default:
        return 0;
    }

    // Sort in descending order (highest first)
    return bVal - aVal;
  });

  // Take top N items
  const topN = sorted.slice(0, config.n);

  console.log(`✅ Top N filter complete: ${items.length} → ${topN.length} items (top ${config.n} by ${config.sortBy})`);
  return topN;
}

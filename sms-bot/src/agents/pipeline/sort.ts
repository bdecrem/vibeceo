/**
 * Sort Pipeline Step
 * Sorts items by publishedAt, score, or relevance
 */

import type { NormalizedItem, EnrichedItem } from '@vibeceo/shared-types';

export function sortItems(
  items: NormalizedItem[],
  sortBy: 'publishedAt' | 'score' | 'relevance',
  order: 'asc' | 'desc'
): NormalizedItem[] {
  const sorted = [...items].sort((a, b) => {
    let aVal: any, bVal: any;

    switch (sortBy) {
      case 'publishedAt':
        aVal = a.publishedAt ? new Date(a.publishedAt).getTime() : 0;
        bVal = b.publishedAt ? new Date(b.publishedAt).getTime() : 0;
        break;

      case 'score':
      case 'relevance':
        aVal = (a as EnrichedItem).score || 0;
        bVal = (b as EnrichedItem).score || 0;
        break;

      default:
        return 0;
    }

    const comparison = order === 'asc' ? aVal - bVal : bVal - aVal;
    return comparison;
  });

  console.log(`     Sorted ${sorted.length} items by ${sortBy} (${order})`);
  return sorted;
}

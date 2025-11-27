/**
 * Filter Pipeline Step
 * Filters items by maxItems and minScore
 */

import type { NormalizedItem, EnrichedItem } from '@vibeceo/shared-types';

export function filterItems(
  items: NormalizedItem[],
  config: { maxItems?: number; minScore?: number }
): NormalizedItem[] {
  let filtered = [...items];

  // Filter by minimum score (if items have been scored by rank step)
  if (config.minScore !== undefined) {
    filtered = filtered.filter(item => {
      const enriched = item as EnrichedItem;
      return enriched.score !== undefined && enriched.score >= config.minScore!;
    });
    console.log(`     Filtered by minScore ${config.minScore}: ${items.length} → ${filtered.length} items`);
  }

  // Limit to maxItems
  if (config.maxItems !== undefined && filtered.length > config.maxItems) {
    filtered = filtered.slice(0, config.maxItems);
    console.log(`     Limited to maxItems ${config.maxItems}: ${items.length} → ${filtered.length} items`);
  }

  return filtered;
}

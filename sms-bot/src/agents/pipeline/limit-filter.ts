/**
 * Limit Filter Pipeline Step
 * Limits the number of items returned
 */

import type { NormalizedItem, LimitFilterStep } from '@vibeceo/shared-types';

/**
 * Limit the number of items
 * Simply returns the first N items from the array
 *
 * @param items - Array of normalized items to limit
 * @param config - Limit filter configuration
 * @returns Limited array of items
 */
export function limitItems(items: NormalizedItem[], config: LimitFilterStep): NormalizedItem[] {
  console.log(`🔍 Limiting items to ${config.maxItems}...`);

  if (items.length === 0) {
    console.log(`✅ No items to limit`);
    return items;
  }

  const limited = items.slice(0, config.maxItems);

  console.log(`✅ Limit complete: ${items.length} → ${limited.length} items`);
  return limited;
}

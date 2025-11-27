/**
 * Collation Strategies
 * Combines results from multiple sources according to strategy
 */

import type { NormalizedItem, CollationConfig } from '@vibeceo/shared-types';

/**
 * Collate items from multiple sources
 */
export function collateItems(
  sourceResults: Map<string, NormalizedItem[]>,
  config: CollationConfig
): NormalizedItem[] {
  const { strategy, maxTotalItems } = config;

  console.log(`📊 Collating ${sourceResults.size} sources with '${strategy}' strategy...`);

  switch (strategy) {
    case 'merge':
      return collateByMerge(sourceResults, maxTotalItems);

    case 'separate':
      return collateBySeparate(sourceResults, maxTotalItems);

    case 'prioritize':
      return collateByPrioritize(sourceResults, maxTotalItems);

    default:
      console.warn(`Unknown collation strategy: ${strategy}, using 'merge'`);
      return collateByMerge(sourceResults, maxTotalItems);
  }
}

/**
 * Merge: Combine all items from all sources into one array
 */
function collateByMerge(
  sourceResults: Map<string, NormalizedItem[]>,
  maxTotalItems: number
): NormalizedItem[] {
  const allItems: NormalizedItem[] = [];

  for (const items of sourceResults.values()) {
    allItems.push(...items);
  }

  const result = allItems.slice(0, maxTotalItems);
  console.log(`   Merged ${allItems.length} items → ${result.length} items (max: ${maxTotalItems})`);

  return result;
}

/**
 * Separate: Keep sources separate, limit each source
 * For separate strategy, we return a flat array but preserve source order
 */
function collateBySeparate(
  sourceResults: Map<string, NormalizedItem[]>,
  maxTotalItems: number
): NormalizedItem[] {
  const result: NormalizedItem[] = [];
  const itemsPerSource = Math.floor(maxTotalItems / sourceResults.size);

  for (const [sourceName, items] of sourceResults) {
    const limited = items.slice(0, itemsPerSource);
    result.push(...limited);
    console.log(`   Source '${sourceName}': ${items.length} → ${limited.length} items`);
  }

  console.log(`   Separated ${result.length} items total`);
  return result;
}

/**
 * Prioritize: Use first source until maxItems, then fallback to others
 */
function collateByPrioritize(
  sourceResults: Map<string, NormalizedItem[]>,
  maxTotalItems: number
): NormalizedItem[] {
  const result: NormalizedItem[] = [];

  for (const [sourceName, items] of sourceResults) {
    const needed = maxTotalItems - result.length;
    if (needed <= 0) break;

    const toAdd = items.slice(0, needed);
    result.push(...toAdd);
    console.log(`   Source '${sourceName}': Added ${toAdd.length} items (${result.length}/${maxTotalItems})`);
  }

  console.log(`   Prioritized ${result.length} items total`);
  return result;
}

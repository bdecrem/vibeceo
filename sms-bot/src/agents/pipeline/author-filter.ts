/**
 * Author Filter Pipeline Step
 * Filters items by author (include/exclude mode)
 */

import type { NormalizedItem, AuthorFilterStep } from '@vibeceo/shared-types';

/**
 * Filter items by author
 * Include mode: keep items from specified authors
 * Exclude mode: remove items from specified authors
 *
 * @param items - Array of normalized items to filter
 * @param config - Author filter configuration
 * @returns Filtered array of items
 */
export function filterByAuthor(items: NormalizedItem[], config: AuthorFilterStep): NormalizedItem[] {
  console.log(`🔍 Filtering by author...`);

  if (items.length === 0) {
    console.log(`✅ No items to filter`);
    return items;
  }

  const { include, exclude } = config;

  const filtered = items.filter(item => {
    const author = item.author || '';

    // Exclude filter takes precedence
    if (exclude && exclude.length > 0) {
      const isExcluded = exclude.some(excludedAuthor =>
        author.toLowerCase() === excludedAuthor.toLowerCase()
      );
      if (isExcluded) {
        return false;
      }
    }

    // Include filter (if specified)
    if (include && include.length > 0) {
      const isIncluded = include.some(includedAuthor =>
        author.toLowerCase() === includedAuthor.toLowerCase()
      );
      return isIncluded;
    }

    // If no include filter specified, item passes (unless excluded)
    return true;
  });

  const includeInfo = include && include.length > 0 ? ` include: [${include.join(', ')}]` : '';
  const excludeInfo = exclude && exclude.length > 0 ? ` exclude: [${exclude.join(', ')}]` : '';
  console.log(`✅ Author filter complete: ${items.length} → ${filtered.length} items${includeInfo}${excludeInfo}`);

  return filtered;
}

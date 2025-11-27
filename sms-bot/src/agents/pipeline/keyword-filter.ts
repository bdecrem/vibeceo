/**
 * Keyword Filter Pipeline Step
 * Filters items by keywords (include/exclude mode)
 */

import type { NormalizedItem, KeywordFilterStep } from '@vibeceo/shared-types';

/**
 * Filter items by keywords in title and summary
 * Include mode: keep items matching ANY keyword
 * Exclude mode: remove items matching ANY keyword
 *
 * @param items - Array of normalized items to filter
 * @param config - Keyword filter configuration
 * @returns Filtered array of items
 */
export function filterByKeywords(items: NormalizedItem[], config: KeywordFilterStep): NormalizedItem[] {
  console.log(`🔍 Filtering by keywords...`);

  if (items.length === 0) {
    console.log(`✅ No items to filter`);
    return items;
  }

  const { include, exclude, caseSensitive = false } = config;

  const matchesKeyword = (text: string, keyword: string): boolean => {
    if (caseSensitive) {
      return text.includes(keyword);
    }
    return text.toLowerCase().includes(keyword.toLowerCase());
  };

  const filtered = items.filter(item => {
    const searchText = [item.title || '', item.summary || ''].join(' ');

    // Exclude filter takes precedence
    if (exclude && exclude.length > 0) {
      const hasExcluded = exclude.some(keyword => matchesKeyword(searchText, keyword));
      if (hasExcluded) {
        return false;
      }
    }

    // Include filter (if specified)
    if (include && include.length > 0) {
      const hasIncluded = include.some(keyword => matchesKeyword(searchText, keyword));
      return hasIncluded;
    }

    // If no include filter specified, item passes
    return true;
  });

  const includeInfo = include && include.length > 0 ? ` include: [${include.join(', ')}]` : '';
  const excludeInfo = exclude && exclude.length > 0 ? ` exclude: [${exclude.join(', ')}]` : '';
  console.log(`✅ Keyword filter complete: ${items.length} → ${filtered.length} items${includeInfo}${excludeInfo}`);

  return filtered;
}

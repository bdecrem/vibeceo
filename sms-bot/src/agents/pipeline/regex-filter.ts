/**
 * Regex Filter Pipeline Step
 * Filters items by regex pattern matching
 */

import type { NormalizedItem, RegexFilterStep } from '@vibeceo/shared-types';

/**
 * Filter items by regex pattern
 * Matches pattern against specified field (title, summary, or content)
 *
 * @param items - Array of normalized items to filter
 * @param config - Regex filter configuration
 * @returns Filtered array of items matching the pattern
 */
export function filterByRegex(items: NormalizedItem[], config: RegexFilterStep): NormalizedItem[] {
  console.log(`🔍 Filtering by regex pattern: ${config.pattern} (field: ${config.field})...`);

  if (items.length === 0) {
    console.log(`✅ No items to filter`);
    return items;
  }

  let regex: RegExp;
  try {
    regex = new RegExp(config.pattern, 'i'); // Case-insensitive by default
  } catch (error) {
    console.error(`❌ Invalid regex pattern: ${config.pattern}`, error);
    return items; // Return all items if pattern is invalid
  }

  const filtered = items.filter(item => {
    let text: string;

    switch (config.field) {
      case 'title':
        text = item.title || '';
        break;
      case 'summary':
        text = item.summary || '';
        break;
      case 'content':
        // For content, check raw data or summary as fallback
        text = (typeof item.raw === 'string' ? item.raw : item.summary) || '';
        break;
      default:
        text = item.summary || '';
    }

    return regex.test(text);
  });

  console.log(`✅ Regex filter complete: ${items.length} → ${filtered.length} items`);
  return filtered;
}

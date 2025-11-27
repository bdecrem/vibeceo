/**
 * Length Filter Pipeline Step
 * Filters items by text length (characters or words)
 */

import type { NormalizedItem, LengthFilterStep } from '@vibeceo/shared-types';

/**
 * Count words in text
 *
 * @param text - Text to count words in
 * @returns Number of words
 */
function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(word => word.length > 0).length;
}

/**
 * Filter items by text length
 * Measures summary length by characters or words
 *
 * @param items - Array of normalized items to filter
 * @param config - Length filter configuration
 * @returns Filtered array of items within the length range
 */
export function filterByLength(items: NormalizedItem[], config: LengthFilterStep): NormalizedItem[] {
  const measureType = config.measureBy || 'characters';
  console.log(`🔍 Filtering by ${measureType} length...`);

  if (items.length === 0) {
    console.log(`✅ No items to filter`);
    return items;
  }

  const filtered = items.filter(item => {
    const text = item.summary || '';

    const length = measureType === 'words' ? countWords(text) : text.length;

    if (config.minLength !== undefined && length < config.minLength) {
      return false;
    }

    if (config.maxLength !== undefined && length > config.maxLength) {
      return false;
    }

    return true;
  });

  const rangeInfo = [];
  if (config.minLength !== undefined) {
    rangeInfo.push(`min: ${config.minLength}`);
  }
  if (config.maxLength !== undefined) {
    rangeInfo.push(`max: ${config.maxLength}`);
  }

  console.log(`✅ Length filter complete: ${items.length} → ${filtered.length} items (${measureType}: ${rangeInfo.join(', ')})`);
  return filtered;
}

/**
 * Random Sample Filter Pipeline Step
 * Returns a random sample of items
 */

import type { NormalizedItem, RandomSampleFilterStep } from '@vibeceo/shared-types';

/**
 * Shuffle array using Fisher-Yates algorithm
 *
 * @param array - Array to shuffle
 * @returns Shuffled array
 */
function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

/**
 * Random sample of items
 * Returns a random selection of N items from the input array
 *
 * @param items - Array of normalized items to sample
 * @param config - Random sample filter configuration
 * @returns Random sample of items
 */
export function randomSample(items: NormalizedItem[], config: RandomSampleFilterStep): NormalizedItem[] {
  console.log(`🔍 Taking random sample of ${config.sampleSize} items...`);

  if (items.length === 0) {
    console.log(`✅ No items to sample`);
    return items;
  }

  // If sample size is >= items length, return shuffled array
  if (config.sampleSize >= items.length) {
    const shuffled = shuffleArray(items);
    console.log(`✅ Random sample complete: ${items.length} items (all items shuffled)`);
    return shuffled;
  }

  // Shuffle and take first N items
  const shuffled = shuffleArray(items);
  const sampled = shuffled.slice(0, config.sampleSize);

  console.log(`✅ Random sample complete: ${items.length} → ${sampled.length} items`);
  return sampled;
}

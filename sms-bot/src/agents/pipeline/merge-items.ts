/**
 * Merge Items Pipeline Step
 * Merges duplicate items based on a specified field (title, url, or id)
 */

import type { NormalizedItem, MergeItemsStep } from '@vibeceo/shared-types';

/**
 * Get merge key value from an item
 */
function getMergeKey(item: NormalizedItem, mergeBy: 'title' | 'url' | 'id'): string | null {
  switch (mergeBy) {
    case 'title':
      return item.title?.toLowerCase().trim() || null;
    case 'url':
      return item.url?.toLowerCase().trim() || null;
    case 'id':
      return item.id?.toLowerCase().trim() || null;
    default:
      return null;
  }
}

/**
 * Merge two items together
 * Combines summaries, keeps highest score, combines tags, etc.
 */
function mergeTwo(item1: NormalizedItem, item2: NormalizedItem): NormalizedItem {
  // Combine summaries
  const summaries = [item1.summary, item2.summary].filter(Boolean);
  const combinedSummary = summaries.join(' | ');

  // Keep highest score
  const score1 = item1.score || 0;
  const score2 = item2.score || 0;
  const maxScore = Math.max(score1, score2);

  // Combine tags if they exist
  const tags1 = (item1 as any).tags || [];
  const tags2 = (item2 as any).tags || [];
  const combinedTags = Array.from(new Set([...tags1, ...tags2]));

  // Use the most recent publishedAt
  let publishedAt = item1.publishedAt || item2.publishedAt;
  if (item1.publishedAt && item2.publishedAt) {
    publishedAt = new Date(item1.publishedAt) > new Date(item2.publishedAt)
      ? item1.publishedAt
      : item2.publishedAt;
  }

  // Merge other fields
  const merged: NormalizedItem = {
    ...item1,
    summary: combinedSummary,
    score: maxScore,
    publishedAt,
    ...(combinedTags.length > 0 && { tags: combinedTags }),
    raw: {
      ...item1.raw,
      mergedFrom: [
        item1.id || item1.url || 'unknown',
        item2.id || item2.url || 'unknown',
      ],
      mergeCount: 2,
    },
  };

  return merged;
}

/**
 * Merge multiple items with the same key
 */
function mergeMultiple(items: NormalizedItem[]): NormalizedItem {
  if (items.length === 0) {
    throw new Error('Cannot merge empty array');
  }

  if (items.length === 1) {
    return items[0];
  }

  let merged = items[0];

  for (let i = 1; i < items.length; i++) {
    merged = mergeTwo(merged, items[i]);
    // Update merge count
    const mergeCount = ((merged.raw as any)?.mergeCount || 0) + 1;
    merged.raw = {
      ...merged.raw,
      mergeCount,
    };
  }

  return merged;
}

/**
 * Merge duplicate items based on specified field
 */
export function mergeItems(
  items: NormalizedItem[],
  config: MergeItemsStep
): NormalizedItem[] {
  if (items.length === 0) {
    return [];
  }

  const { mergeBy = 'url' } = config;

  console.log(`🔀 Merging duplicate items by ${mergeBy}...`);
  console.log(`   Input: ${items.length} items`);

  try {
    // Group items by merge key
    const groups = new Map<string, NormalizedItem[]>();

    for (const item of items) {
      const key = getMergeKey(item, mergeBy);

      if (!key) {
        // Items without a merge key are treated as unique
        const uniqueKey = `__unique_${Math.random().toString(36).substring(7)}`;
        groups.set(uniqueKey, [item]);
        continue;
      }

      if (!groups.has(key)) {
        groups.set(key, []);
      }

      groups.get(key)!.push(item);
    }

    // Merge each group
    const mergedItems: NormalizedItem[] = [];

    for (const [key, groupItems] of groups.entries()) {
      if (groupItems.length === 1) {
        // No duplicates, keep as is
        mergedItems.push(groupItems[0]);
      } else {
        // Merge duplicates
        const merged = mergeMultiple(groupItems);
        mergedItems.push(merged);
      }
    }

    const duplicatesRemoved = items.length - mergedItems.length;

    console.log(`✅ Merged items: ${items.length} → ${mergedItems.length} (removed ${duplicatesRemoved} duplicates)`);

    return mergedItems;
  } catch (error: any) {
    console.error(`❌ Merge failed: ${error.message}`);
    return items;
  }
}

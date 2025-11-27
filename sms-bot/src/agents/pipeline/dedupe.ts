/**
 * Deduplication pipeline step
 * Removes duplicate items based on URL, ID, or title
 */

import type { NormalizedItem } from '@vibeceo/shared-types';

export type DedupeBy = 'url' | 'id' | 'title';

export function dedupeItems(items: NormalizedItem[], dedupeBy: DedupeBy = 'url'): NormalizedItem[] {
  console.log(`🔄 Deduplicating ${items.length} items by ${dedupeBy}...`);

  const seen = new Set<string>();
  const dedupedItems: NormalizedItem[] = [];

  for (const item of items) {
    let key: string | undefined;

    switch (dedupeBy) {
      case 'url':
        key = item.url;
        break;
      case 'id':
        key = item.id;
        break;
      case 'title':
        key = item.title;
        break;
    }

    if (!key || seen.has(key)) {
      continue;
    }

    seen.add(key);
    dedupedItems.push(item);
  }

  console.log(`✅ Dedupe complete: ${items.length} → ${dedupedItems.length} items`);
  return dedupedItems;
}

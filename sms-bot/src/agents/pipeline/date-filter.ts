/**
 * Date Filter Pipeline Step
 * Filters items by date range (absolute or relative)
 */

import type { NormalizedItem, DateFilterStep } from '@vibeceo/shared-types';

/**
 * Filter items by date range
 * Supports both absolute dates (startDate/endDate) and relative ranges (timeRange)
 *
 * @param items - Array of normalized items to filter
 * @param config - Date filter configuration
 * @returns Filtered array of items within the date range
 */
export function filterByDate(items: NormalizedItem[], config: DateFilterStep): NormalizedItem[] {
  console.log(`🔍 Filtering by date range...`);

  if (items.length === 0) {
    console.log(`✅ No items to filter`);
    return items;
  }

  let startTime: number | null = null;
  let endTime: number | null = null;

  // Calculate time range if specified
  if (config.timeRange) {
    const now = Date.now();
    const ranges: Record<string, number> = {
      '1h': 60 * 60 * 1000,
      '6h': 6 * 60 * 60 * 1000,
      '24h': 24 * 60 * 60 * 1000,
      '7d': 7 * 24 * 60 * 60 * 1000,
      '30d': 30 * 24 * 60 * 60 * 1000,
    };

    const rangeMs = ranges[config.timeRange];
    if (rangeMs) {
      startTime = now - rangeMs;
      endTime = now;
      console.log(`     Using relative time range: ${config.timeRange} (${new Date(startTime).toISOString()} to ${new Date(endTime).toISOString()})`);
    }
  }

  // Override with absolute dates if provided
  if (config.startDate) {
    startTime = new Date(config.startDate).getTime();
  }
  if (config.endDate) {
    endTime = new Date(config.endDate).getTime();
  }

  const filtered = items.filter(item => {
    if (!item.publishedAt) {
      return false; // Exclude items without publishedAt
    }

    const itemTime = new Date(item.publishedAt).getTime();

    if (isNaN(itemTime)) {
      return false; // Invalid date
    }

    if (startTime !== null && itemTime < startTime) {
      return false;
    }

    if (endTime !== null && itemTime > endTime) {
      return false;
    }

    return true;
  });

  console.log(`✅ Date filter complete: ${items.length} → ${filtered.length} items`);
  return filtered;
}

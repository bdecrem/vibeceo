/**
 * Has Media Filter Pipeline Step
 * Filters items that contain media (images, videos)
 */

import type { NormalizedItem, HasMediaFilterStep } from '@vibeceo/shared-types';

/**
 * Check if URL contains image extension
 *
 * @param url - URL to check
 * @returns True if URL appears to be an image
 */
function hasImageExtension(url: string): boolean {
  const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.bmp', '.ico'];
  const lowerUrl = url.toLowerCase();
  return imageExtensions.some(ext => lowerUrl.includes(ext));
}

/**
 * Check if URL contains video extension or is from video platform
 *
 * @param url - URL to check
 * @returns True if URL appears to be a video
 */
function hasVideoExtension(url: string): boolean {
  const videoExtensions = ['.mp4', '.webm', '.avi', '.mov', '.wmv', '.flv', '.mkv'];
  const videoPlatforms = ['youtube.com', 'youtu.be', 'vimeo.com', 'dailymotion.com', 'twitch.tv'];

  const lowerUrl = url.toLowerCase();

  // Check extensions
  if (videoExtensions.some(ext => lowerUrl.includes(ext))) {
    return true;
  }

  // Check video platforms
  return videoPlatforms.some(platform => lowerUrl.includes(platform));
}

/**
 * Check if item contains media
 *
 * @param item - Item to check
 * @param mediaType - Type of media to check for
 * @returns True if item contains the specified media type
 */
function itemHasMedia(item: NormalizedItem, mediaType: 'image' | 'video' | 'any'): boolean {
  const url = item.url || '';
  const rawData = JSON.stringify(item.raw || {});

  switch (mediaType) {
    case 'image':
      return hasImageExtension(url) || hasImageExtension(rawData);

    case 'video':
      return hasVideoExtension(url) || hasVideoExtension(rawData);

    case 'any':
      return hasImageExtension(url) || hasImageExtension(rawData) ||
             hasVideoExtension(url) || hasVideoExtension(rawData);

    default:
      return false;
  }
}

/**
 * Filter items by media presence
 * Checks if item URL or raw data contains media (images, videos)
 *
 * @param items - Array of normalized items to filter
 * @param config - Has media filter configuration
 * @returns Filtered array of items containing media
 */
export function filterByMedia(items: NormalizedItem[], config: HasMediaFilterStep): NormalizedItem[] {
  const mediaType = config.mediaType || 'any';
  console.log(`🔍 Filtering items with media type: ${mediaType}...`);

  if (items.length === 0) {
    console.log(`✅ No items to filter`);
    return items;
  }

  const filtered = items.filter(item => itemHasMedia(item, mediaType));

  console.log(`✅ Media filter complete: ${items.length} → ${filtered.length} items (mediaType: ${mediaType})`);
  return filtered;
}

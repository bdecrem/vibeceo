/**
 * Text Cleanup Pipeline Step
 * Cleans and normalizes text in items (removes HTML, normalizes whitespace, removes emojis)
 */

import type { NormalizedItem, TextCleanupStep } from '@vibeceo/shared-types';

/**
 * Remove HTML tags from text
 */
function removeHTML(text: string): string {
  // Remove HTML tags
  let cleaned = text.replace(/<[^>]*>/g, '');

  // Decode common HTML entities
  cleaned = cleaned
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'");

  return cleaned;
}

/**
 * Normalize whitespace in text
 */
function normalizeWhitespace(text: string): string {
  // Replace multiple spaces with single space
  let cleaned = text.replace(/\s+/g, ' ');

  // Remove leading/trailing whitespace
  cleaned = cleaned.trim();

  // Normalize line breaks
  cleaned = cleaned.replace(/\n{3,}/g, '\n\n');

  return cleaned;
}

/**
 * Remove emojis from text
 */
function removeEmojis(text: string): string {
  // Remove emoji characters and other symbols
  // This regex covers most emoji ranges in Unicode
  const emojiRegex = /[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F700}-\u{1F77F}\u{1F780}-\u{1F7FF}\u{1F800}-\u{1F8FF}\u{1F900}-\u{1F9FF}\u{1FA00}-\u{1FA6F}\u{1FA70}-\u{1FAFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{2300}-\u{23FF}\u{2B50}\u{2B55}\u{231A}\u{231B}\u{2328}\u{23CF}\u{23E9}-\u{23F3}\u{23F8}-\u{23FA}\u{24C2}\u{25AA}-\u{25AB}\u{25B6}\u{25C0}\u{25FB}-\u{25FE}\u{2934}-\u{2935}\u{2B05}-\u{2B07}\u{2B1B}-\u{2B1C}\u{3030}\u{303D}\u{3297}\u{3299}]/gu;

  return text.replace(emojiRegex, '');
}

/**
 * Clean and normalize text in items
 */
export function cleanupText(
  items: NormalizedItem[],
  config: TextCleanupStep
): NormalizedItem[] {
  if (items.length === 0) {
    return [];
  }

  const {
    removeHTML: shouldRemoveHTML = true,
    normalizeWhitespace: shouldNormalizeWhitespace = true,
    removeEmojis: shouldRemoveEmojis = false,
  } = config;

  const operations: string[] = [];
  if (shouldRemoveHTML) operations.push('HTML removal');
  if (shouldNormalizeWhitespace) operations.push('whitespace normalization');
  if (shouldRemoveEmojis) operations.push('emoji removal');

  console.log(`🧹 Cleaning text for ${items.length} items (${operations.join(', ')})...`);

  try {
    const cleanedItems = items.map(item => {
      let cleanedTitle = item.title || '';
      let cleanedSummary = item.summary || '';

      // Apply HTML removal
      if (shouldRemoveHTML) {
        cleanedTitle = removeHTML(cleanedTitle);
        cleanedSummary = removeHTML(cleanedSummary);
      }

      // Apply whitespace normalization
      if (shouldNormalizeWhitespace) {
        cleanedTitle = normalizeWhitespace(cleanedTitle);
        cleanedSummary = normalizeWhitespace(cleanedSummary);
      }

      // Apply emoji removal
      if (shouldRemoveEmojis) {
        cleanedTitle = removeEmojis(cleanedTitle);
        cleanedSummary = removeEmojis(cleanedSummary);
      }

      return {
        ...item,
        title: cleanedTitle,
        summary: cleanedSummary,
      };
    });

    console.log(`✅ Cleaned text for ${cleanedItems.length} items`);
    return cleanedItems;
  } catch (error: any) {
    console.error(`❌ Text cleanup failed: ${error.message}`);
    return items;
  }
}

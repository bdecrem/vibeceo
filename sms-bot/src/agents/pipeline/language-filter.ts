/**
 * Language Filter Pipeline Step
 * Filters items by language
 */

import type { NormalizedItem, LanguageFilterStep } from '@vibeceo/shared-types';

/**
 * Simple language detection heuristic
 * Uses character patterns to detect common languages
 * For production use, consider using a library like franc-min
 *
 * @param text - Text to detect language from
 * @returns Detected language code (e.g., 'en', 'es', 'fr', 'zh', 'ja', 'ar')
 */
function detectLanguage(text: string): string {
  if (!text || text.length < 10) {
    return 'en'; // Default to English for short text
  }

  // Check for non-Latin scripts
  const hasChineseJapanese = /[\u4e00-\u9fff\u3040-\u309f\u30a0-\u30ff]/.test(text);
  if (hasChineseJapanese) {
    return /[\u3040-\u309f\u30a0-\u30ff]/.test(text) ? 'ja' : 'zh';
  }

  const hasArabic = /[\u0600-\u06ff]/.test(text);
  if (hasArabic) {
    return 'ar';
  }

  const hasCyrillic = /[\u0400-\u04ff]/.test(text);
  if (hasCyrillic) {
    return 'ru';
  }

  const hasKorean = /[\uac00-\ud7af]/.test(text);
  if (hasKorean) {
    return 'ko';
  }

  // For Latin-script languages, use simple keyword detection
  const lowerText = text.toLowerCase();

  // Spanish indicators
  const spanishWords = ['el', 'la', 'de', 'que', 'y', 'a', 'en', 'un', 'ser', 'se', 'no', 'haber', 'por', 'con', 'su', 'para', 'como', 'estar', 'tener', 'le', 'lo'];
  const spanishCount = spanishWords.filter(word => lowerText.includes(` ${word} `)).length;

  // French indicators
  const frenchWords = ['le', 'de', 'un', 'être', 'et', 'à', 'il', 'avoir', 'ne', 'je', 'son', 'que', 'se', 'qui', 'ce', 'dans', 'en', 'du', 'elle', 'au'];
  const frenchCount = frenchWords.filter(word => lowerText.includes(` ${word} `)).length;

  // German indicators
  const germanWords = ['der', 'die', 'und', 'in', 'den', 'von', 'zu', 'das', 'mit', 'sich', 'des', 'auf', 'für', 'ist', 'im', 'dem', 'nicht', 'ein', 'eine', 'als'];
  const germanCount = germanWords.filter(word => lowerText.includes(` ${word} `)).length;

  // Portuguese indicators
  const portugueseWords = ['o', 'a', 'de', 'que', 'e', 'do', 'da', 'em', 'um', 'para', 'é', 'com', 'não', 'uma', 'os', 'no', 'se', 'na', 'por', 'mais'];
  const portugueseCount = portugueseWords.filter(word => lowerText.includes(` ${word} `)).length;

  // Determine language by highest count
  const counts = [
    { lang: 'es', count: spanishCount },
    { lang: 'fr', count: frenchCount },
    { lang: 'de', count: germanCount },
    { lang: 'pt', count: portugueseCount },
  ];

  counts.sort((a, b) => b.count - a.count);

  // If we have at least 3 matching words, use that language
  if (counts[0].count >= 3) {
    return counts[0].lang;
  }

  // Default to English
  return 'en';
}

/**
 * Filter items by language
 * Uses simple heuristic for language detection
 * Checks title and summary for language indicators
 *
 * @param items - Array of normalized items to filter
 * @param config - Language filter configuration
 * @returns Filtered array of items in the specified languages
 */
export function filterByLanguage(items: NormalizedItem[], config: LanguageFilterStep): NormalizedItem[] {
  console.log(`🔍 Filtering by language: [${config.languages.join(', ')}]...`);

  if (items.length === 0) {
    console.log(`✅ No items to filter`);
    return items;
  }

  const filtered = items.filter(item => {
    const text = [item.title || '', item.summary || ''].join(' ');
    const detectedLanguage = detectLanguage(text);

    return config.languages.includes(detectedLanguage);
  });

  console.log(`✅ Language filter complete: ${items.length} → ${filtered.length} items`);
  return filtered;
}

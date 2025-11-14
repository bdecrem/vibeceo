/**
 * SMS Length Utilities
 *
 * UCS-2 encoding is used for SMS with special characters.
 * Max 670 code units = 10 segments (67 code units per segment)
 */

export const MAX_SMS_CODE_UNITS = 670;

/**
 * Count UCS-2 code units in a string
 * (NOT the same as character count - emojis and special chars count as 2+)
 */
export function countUCS2CodeUnits(text: string): number {
  return [...text].reduce((count, char) => {
    const code = char.codePointAt(0);
    return count + (code && code > 0xFFFF ? 2 : 1);
  }, 0);
}

/**
 * Check if text exceeds SMS limit
 */
export function exceedsSmsLimit(text: string): boolean {
  return countUCS2CodeUnits(text) > MAX_SMS_CODE_UNITS;
}

/**
 * Truncate text to fit within SMS limit, adding "..." if truncated
 */
export function truncateToSmsLimit(text: string, reserve: number = 0): string {
  const maxUnits = MAX_SMS_CODE_UNITS - reserve;

  if (countUCS2CodeUnits(text) <= maxUnits) {
    return text;
  }

  // Binary search to find the right truncation point
  let left = 0;
  let right = text.length;
  let result = '';

  while (left < right) {
    const mid = Math.floor((left + right + 1) / 2);
    const candidate = text.substring(0, mid) + '...';

    if (countUCS2CodeUnits(candidate) <= maxUnits) {
      result = candidate;
      left = mid;
    } else {
      right = mid - 1;
    }
  }

  return result || text.substring(0, 10) + '...';
}

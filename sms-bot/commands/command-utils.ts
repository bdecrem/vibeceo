/**
 * Command Matching Utilities
 *
 * Helper functions for matching SMS commands with punctuation tolerance
 */

/**
 * Normalizes a message by removing trailing punctuation from the first word/phrase
 * This allows commands like "KG," or "CRYPTO!" to match their prefixes
 *
 * @param message - The message to normalize (should already be uppercase)
 * @param prefix - The command prefix to check against (e.g., "KG", "CRYPTO")
 * @returns Object with normalized first word and remaining text
 */
export function normalizeCommandPrefix(message: string): string {
  const trimmed = message.trim();

  // Find the first space (if any)
  const spaceIndex = trimmed.indexOf(' ');

  if (spaceIndex === -1) {
    // No space - just strip punctuation from the whole message
    return trimmed.replace(/[,;:.!?]+$/, '');
  }

  // Strip punctuation from first word and keep the rest
  const firstWord = trimmed.substring(0, spaceIndex).replace(/[,;:.!?]+$/, '');
  const rest = trimmed.substring(spaceIndex);

  return firstWord + rest;
}

/**
 * Checks if a message starts with a command prefix, ignoring trailing punctuation
 *
 * @param message - The uppercase message to check
 * @param prefix - The command prefix (e.g., "KG", "AIR", "CRYPTO")
 * @returns true if message matches the prefix (with optional space and content after)
 *
 * @example
 * matchesPrefix("KG show me papers", "KG") // true
 * matchesPrefix("KG, show me papers", "KG") // true
 * matchesPrefix("KG!", "KG") // true
 * matchesPrefix("KG", "KG") // true
 * matchesPrefix("CRYPTO", "CRYPTO") // true
 */
export function matchesPrefix(message: string, prefix: string): boolean {
  const normalized = normalizeCommandPrefix(message);

  // Check exact match or prefix with space
  return normalized === prefix || normalized.startsWith(prefix + ' ');
}

/**
 * Extracts the remainder of a message after removing the command prefix
 * Handles punctuation after the prefix
 *
 * @param message - The original message (with original casing)
 * @param messageUpper - The uppercase version of the message
 * @param prefix - The command prefix to remove (e.g., "KG", "AIR")
 * @returns The remaining text after the prefix, trimmed
 *
 * @example
 * extractAfterPrefix("KG show papers", "KG SHOW PAPERS", "KG") // "show papers"
 * extractAfterPrefix("KG, show papers", "KG, SHOW PAPERS", "KG") // "show papers"
 * extractAfterPrefix("KG!", "KG!", "KG") // ""
 */
export function extractAfterPrefix(
  message: string,
  messageUpper: string,
  prefix: string
): string {
  const normalized = normalizeCommandPrefix(messageUpper);

  if (normalized === prefix) {
    return '';
  }

  if (normalized.startsWith(prefix + ' ')) {
    // Find where the actual content starts in the original message
    // We need to skip: prefix + any punctuation + any spaces
    const trimmed = message.trim();
    let idx = 0;

    // Skip prefix characters (case-insensitive)
    for (let i = 0; i < prefix.length && idx < trimmed.length; i++) {
      if (trimmed[idx].toUpperCase() === prefix[i]) {
        idx++;
      }
    }

    // Skip any punctuation and spaces
    while (idx < trimmed.length && /[,;:.!?\s]/.test(trimmed[idx])) {
      idx++;
    }

    return trimmed.substring(idx);
  }

  return message.trim();
}

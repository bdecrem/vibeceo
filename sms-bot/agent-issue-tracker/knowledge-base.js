/**
 * Knowledge Base Configuration for Ash.tag
 * These resources are used to answer support questions
 */

export const KNOWLEDGE_SOURCES = {
  documentation: {
    type: 'local',
    path: '../documentation',
    description: 'Technical documentation for WEBTOYS/WTAF system'
  },
  faq: {
    type: 'web',
    url: 'https://wtaf.me/bart/satin-horse-storytelling',
    description: 'Frequently Asked Questions about WEBTOYS'
  },
  intro: {
    type: 'web', 
    url: 'https://webtoys.ai/bart/grain-adder-weaving',
    description: 'Introductory explainer blog about how WEBTOYS works'
  }
};

/**
 * Patterns to detect support questions vs actionable issues
 */
export const SUPPORT_QUESTION_PATTERNS = [
  /^how (do|does|can|to)/i,
  /^what (is|are|does)/i,
  /^where (is|are|can|do)/i,
  /^why (is|does|doesn't)/i,
  /^can (i|you|we)/i,
  /^is (it|there)/i,
  /\?$/,  // Ends with question mark
  /explain/i,
  /help.*understand/i,
  /tell me about/i,
  /documentation/i,
  /tutorial/i,
  /guide/i
];

/**
 * Check if an issue is a support question
 */
export function isSupportQuestion(text) {
  return SUPPORT_QUESTION_PATTERNS.some(pattern => pattern.test(text));
}

/**
 * Categories of support questions
 */
export const SUPPORT_CATEGORIES = {
  'getting-started': ['start', 'begin', 'first', 'new', 'setup'],
  'features': ['feature', 'capability', 'can it', 'does it'],
  'commands': ['command', 'syntax', 'format', 'how to'],
  'zad-apps': ['zad', 'crud', 'database', 'multi-user'],
  'stack-commands': ['stack', 'remix', 'template'],
  'deployment': ['deploy', 'publish', 'live', 'url'],
  'pricing': ['cost', 'price', 'free', 'paid'],
  'limits': ['limit', 'maximum', 'how many', 'quota']
};

/**
 * Categorize a support question
 */
export function categorizeQuestion(text) {
  const lowerText = text.toLowerCase();
  
  for (const [category, keywords] of Object.entries(SUPPORT_CATEGORIES)) {
    if (keywords.some(keyword => lowerText.includes(keyword))) {
      return category;
    }
  }
  
  return 'general';
}
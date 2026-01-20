/**
 * Producer Library System
 *
 * Manages genre, artist, and mood knowledge for context injection.
 * When users mention a genre or artist, the system injects relevant
 * production knowledge into the agent's context.
 */

import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// === PRODUCER LIBRARY (genres, artists, moods, techniques) ===
let LIBRARY = {};
try {
  const libraryPath = join(__dirname, '..', 'library.json');
  LIBRARY = JSON.parse(readFileSync(libraryPath, 'utf-8'));
} catch (e) {
  console.warn('Could not load library.json:', e.message);
}

// Map keywords/aliases to library keys (genres, artists, moods, etc.)
const LIBRARY_ALIASES = {
  // === GENRES ===
  // Classic / Old School House
  'classic house': 'classic_house',
  'old school house': 'classic_house',
  'oldschool house': 'classic_house',
  'old school': 'classic_house',
  // Detroit Techno
  'detroit techno': 'detroit_techno',
  'detroit': 'detroit_techno',
  // Berlin Techno
  'berlin techno': 'berlin_techno',
  'berlin': 'berlin_techno',
  'berghain': 'berlin_techno',
  // Industrial Techno
  'industrial techno': 'industrial_techno',
  'industrial': 'industrial_techno',
  // Chicago House
  'chicago house': 'chicago_house',
  'chicago': 'chicago_house',
  // Deep House
  'deep house': 'deep_house',
  'deep': 'deep_house',
  // Tech House
  'tech house': 'tech_house',
  'tech-house': 'tech_house',
  // Acid House
  'acid house': 'acid_house',
  // Acid Techno
  'acid techno': 'acid_techno',
  // Generic acid -> acid house (more common)
  'acid': 'acid_house',
  // Electro
  'electro': 'electro',
  'electro funk': 'electro',
  // Drum and Bass
  'drum and bass': 'drum_and_bass',
  'drum & bass': 'drum_and_bass',
  'dnb': 'drum_and_bass',
  'd&b': 'drum_and_bass',
  'drumnbass': 'drum_and_bass',
  // Jungle
  'jungle': 'jungle',
  // Trance
  'trance': 'trance',
  // Minimal
  'minimal techno': 'minimal_techno',
  'minimal': 'minimal_techno',
  // Breakbeat
  'breakbeat': 'breakbeat',
  'breaks': 'breakbeat',
  'big beat': 'breakbeat',
  // Ambient
  'ambient': 'ambient',
  // IDM
  'idm': 'idm',
  'intelligent dance': 'idm',
  // Generic terms -> sensible defaults
  'techno': 'berlin_techno',
  'house': 'classic_house',

  // === ARTISTS ===
  'jeff mills': 'jeff_mills',
  'mills': 'jeff_mills',
  'the wizard': 'jeff_mills',
};

/**
 * Detect library entries mentioned in text (genres, artists, moods, etc.)
 * @param {string} text - User input or conversation text
 * @returns {string[]} Array of library keys found
 */
export function detectLibraryKeys(text) {
  const lower = text.toLowerCase();
  const found = new Set();

  // Sort aliases by length (longest first) to match "detroit techno" before "detroit"
  const sortedAliases = Object.keys(LIBRARY_ALIASES).sort((a, b) => b.length - a.length);

  for (const alias of sortedAliases) {
    if (lower.includes(alias)) {
      found.add(LIBRARY_ALIASES[alias]);
    }
  }

  return Array.from(found);
}

/**
 * Build context string for system prompt from library entries
 * @param {string[]} keys - Library keys to include
 * @returns {string} Formatted context string for system prompt
 */
export function buildLibraryContext(keys) {
  if (!keys.length) return '';

  const sections = keys.map(key => {
    const entry = LIBRARY[key];
    if (!entry) return '';

    if (entry.type === 'genre') {
      return `
=== ${entry.name.toUpperCase()} (Genre) ===
BPM: ${entry.bpm[0]}-${entry.bpm[1]} | Keys: ${entry.keys.join(', ')} | Swing: ${entry.swing}%

${entry.description}

${entry.production}

Reference settings:
- Drums: ${JSON.stringify(entry.drums)}
- Bass: ${JSON.stringify(entry.bass)}
- Classic tracks: ${entry.references.join(', ')}
`;
    }

    if (entry.type === 'artist') {
      let artistSection = `
=== ${entry.name.toUpperCase()} (Artist Style) ===
BPM: ${entry.bpm[0]}-${entry.bpm[1]} | Swing: ${entry.swing}% | Base genre: ${entry.genre}

${entry.description}

Philosophy: ${entry.philosophy}

Drum settings: ${JSON.stringify(entry.drums)}
`;
      if (entry.patterns) {
        artistSection += `\nPattern archetypes:\n`;
        for (const [id, p] of Object.entries(entry.patterns)) {
          artistSection += `- ${p.name}: ${p.description}\n`;
        }
      }
      if (entry.programmingPrinciples) {
        artistSection += `\nProgramming principles:\n`;
        for (const principle of entry.programmingPrinciples) {
          artistSection += `- ${principle}\n`;
        }
      }
      artistSection += `\nKeywords: ${entry.keywords.join(', ')}`;
      artistSection += `\nReference tracks: ${entry.references.join(', ')}`;
      return artistSection;
    }

    if (entry.type === 'mood') {
      return `
=== ${entry.name.toUpperCase()} (Mood) ===
${entry.description || ''}
Adjustments: ${JSON.stringify(entry.adjustments)}
Keywords: ${entry.keywords?.join(', ') || ''}
`;
    }

    // Default fallback for unknown types
    return `
=== ${entry.name?.toUpperCase() || key.toUpperCase()} ===
${JSON.stringify(entry, null, 2)}
`;
  }).filter(Boolean);

  if (!sections.length) return '';

  return `\n\nPRODUCER KNOWLEDGE (use this to guide your choices):\n${sections.join('\n')}`;
}

// Legacy aliases for compatibility
export const detectGenres = detectLibraryKeys;
export const buildGenreContext = buildLibraryContext;

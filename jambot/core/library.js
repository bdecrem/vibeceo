/**
 * Producer Library System
 *
 * Manages genre, artist, and mood knowledge for context injection.
 * When users mention a genre or artist, the system injects relevant
 * production knowledge into the agent's context.
 *
 * Library structure (v2):
 *   { _meta, genres: { key: {...} }, artists: { key: {...} } }
 *
 * Three genre tiers:
 *   core    — machine-readable drum/bass params, concise descriptions
 *   deep    — core + modulation, mixing, reasoning, sources
 *   profile — prose-derived from research (no drum/bass params)
 */

import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// === LOAD LIBRARY ===
let LIBRARY = { genres: {}, artists: {} };
try {
  const libraryPath = join(__dirname, '..', 'library.json');
  LIBRARY = JSON.parse(readFileSync(libraryPath, 'utf-8'));
} catch (e) {
  console.warn('Could not load library.json:', e.message);
}

/**
 * Resolve a library key to its entry (checks genres, then artists)
 */
function resolveEntry(key) {
  return LIBRARY.genres?.[key] || LIBRARY.artists?.[key] || null;
}

// Map keywords/aliases to library keys
const LIBRARY_ALIASES = {
  // === CORE GENRES (17) ===
  'classic house': 'classic_house',
  'old school house': 'classic_house',
  'oldschool house': 'classic_house',
  'old school': 'classic_house',
  'detroit techno': 'detroit_techno',
  'detroit': 'detroit_techno',
  'berlin techno': 'berlin_techno',
  'berlin': 'berlin_techno',
  'berghain': 'berlin_techno',
  'industrial techno': 'industrial_techno',
  'industrial': 'industrial_techno',
  'chicago house': 'chicago_house',
  'chicago': 'chicago_house',
  'deep house': 'deep_house',
  'tech house': 'tech_house',
  'tech-house': 'tech_house',
  'acid house': 'acid_house',
  'acid techno': 'acid_techno',
  'acid': 'acid_house',
  'electro': 'electro',
  'electro funk': 'electro',
  'drum and bass': 'drum_and_bass',
  'drum & bass': 'drum_and_bass',
  'dnb': 'drum_and_bass',
  'd&b': 'drum_and_bass',
  'drumnbass': 'drum_and_bass',
  'jungle': 'jungle',
  'trance': 'trance',
  'minimal techno': 'minimal_techno',
  'minimal': 'minimal_techno',
  'breakbeat': 'breakbeat',
  'breaks': 'breakbeat',
  'big beat': 'breakbeat',
  'ambient': 'ambient',
  'idm': 'idm',
  'intelligent dance': 'idm',

  // === DEEP GENRES (16) ===
  'doomcore': 'doomcore',
  'doom core': 'doomcore',
  'gabber': 'gabber',
  'hardcore techno': 'gabber',
  'uk funky': 'uk_funky',
  'funky house': 'uk_funky',
  'footwork': 'footwork',
  'juke': 'footwork',
  'gqom': 'gqom',
  'kuduro': 'kuduro',
  'afro house': 'afro_house',
  'afrohouse': 'afro_house',
  'dub techno': 'dub_techno',
  'microhouse': 'microhouse',
  'micro house': 'microhouse',
  'psytrance': 'psytrance',
  'darkpsy': 'psytrance',
  'psy trance': 'psytrance',
  'reggaeton': 'reggaeton',
  'uk garage': 'uk_garage',
  '2-step': 'uk_garage',
  '2step': 'uk_garage',
  'ukg': 'uk_garage',
  'vaporwave': 'vaporwave',
  'future funk': 'vaporwave',
  'witch house': 'witch_house',
  'darksynth': 'darksynth',
  'dark synthwave': 'darksynth',
  'drill': 'drill',
  'uk drill': 'drill',
  'chicago drill': 'drill',

  // === PROFILE GENRES (12) ===
  'breakcore': 'breakcore',
  'complextro': 'complextro',
  'drift phonk': 'drift_phonk',
  'phonk': 'drift_phonk',
  'future garage': 'future_garage',
  'gym phonk': 'gym_phonk',
  'jersey club': 'jersey_club',
  'neurofunk': 'neurofunk',
  'neuro': 'neurofunk',
  'pluggnb': 'pluggnb',
  'plug': 'pluggnb',
  'rawstyle': 'rawstyle',
  'raw hardstyle': 'rawstyle',
  'sigilkore': 'sigilkore',
  'stutterhouse': 'stutterhouse',
  'stutter house': 'stutterhouse',
  'wave': 'wave',
  'trap wave': 'wave',

  // === GENERIC TERMS → sensible defaults ===
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
    // Word boundary match to prevent "wave" matching inside "vaporwave"
    const escaped = alias.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const re = new RegExp(`(?:^|\\W)${escaped}(?:$|\\W)`);
    if (re.test(lower)) {
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
    const entry = resolveEntry(key);
    if (!entry) return '';

    // --- Artist entries (in artists section) ---
    if (LIBRARY.artists?.[key]) {
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

    // --- Genre entries (core, deep, or profile tier) ---
    const tier = entry.tier || 'core';
    const header = `=== ${entry.name.toUpperCase()} (Genre — ${tier}) ===`;
    const bpmLine = entry.bpm ? `BPM: ${entry.bpm[0]}-${entry.bpm[1]}` : '';
    const keysLine = entry.keys?.length ? `Keys: ${entry.keys.join(', ')}` : '';
    const swingLine = entry.swing != null ? `Swing: ${entry.swing}%` : '';
    const meta = [bpmLine, keysLine, swingLine].filter(Boolean).join(' | ');

    let section = `\n${header}\n${meta}\n`;

    // Description + production (all tiers have these)
    if (entry.description) section += `\n${entry.description}\n`;
    if (entry.production) section += `\n${entry.production}\n`;

    // Machine-readable params (core + deep tiers)
    if (entry.drums) section += `\nReference drums: ${JSON.stringify(entry.drums)}`;
    if (entry.bass) section += `\nReference bass: ${JSON.stringify(entry.bass)}`;

    // Deep tier extras
    if (entry.modulation) section += `\nModulation: ${JSON.stringify(entry.modulation)}`;
    if (entry.mixing) section += `\nMixing: ${JSON.stringify(entry.mixing)}`;
    if (entry.reasoning) section += `\nReasoning: ${entry.reasoning}`;

    // Prose extras (from .md profiles)
    if (entry.lineage) section += `\nLineage: ${entry.lineage}`;
    if (entry.currentScene) section += `\nCurrent scene: ${entry.currentScene}`;

    // References (all tiers)
    if (entry.references?.length) {
      section += `\nClassic tracks: ${entry.references.join(', ')}`;
    }
    if (entry.sources?.length) {
      section += `\nSources: ${entry.sources.join(', ')}`;
    }

    return section;
  }).filter(Boolean);

  if (!sections.length) return '';

  return `\n\nPRODUCER KNOWLEDGE (use this to guide your choices):\n${sections.join('\n')}`;
}

// Legacy aliases for compatibility
export const detectGenres = detectLibraryKeys;
export const buildGenreContext = buildLibraryContext;

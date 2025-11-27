/**
 * Entity Extraction Pipeline Step
 * Extracts named entities (persons, organizations, locations, dates) from text
 */

import type { NormalizedItem, EntityExtractionStep } from '@vibeceo/shared-types';

// Simple regex patterns for entity extraction
const PATTERNS = {
  // Capitalized words (2+ words) likely to be person names or organizations
  person: /\b([A-Z][a-z]+(?: [A-Z][a-z]+)+)\b/g,

  // Common organization indicators
  organization: /\b([A-Z][a-z]+(?: [A-Z][a-z]+)* (?:Inc|Corp|LLC|Ltd|University|Institute|Foundation|Association|Company|Group)\.?)\b/g,

  // Location patterns (cities, countries, etc.)
  location: /\b([A-Z][a-z]+(?: [A-Z][a-z]+)* (?:City|State|Country|County|Province|District|Region))\b|\b(New York|Los Angeles|San Francisco|Boston|Chicago|London|Paris|Tokyo|Beijing|Delhi)\b/gi,

  // Date patterns (various formats)
  date: /\b(\d{1,2}[-\/]\d{1,2}[-\/]\d{2,4}|\d{4}[-\/]\d{1,2}[-\/]\d{1,2}|(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]* \d{1,2},? \d{4}|(?:January|February|March|April|May|June|July|August|September|October|November|December) \d{1,2},? \d{4})\b/gi,
};

// Common organization suffixes
const ORG_SUFFIXES = ['Inc', 'Corp', 'LLC', 'Ltd', 'University', 'Institute', 'Foundation', 'Association', 'Company', 'Group', 'Lab', 'Labs'];

// Known organizations and companies (to improve detection)
const KNOWN_ORGS = [
  'Google', 'Microsoft', 'Apple', 'Amazon', 'Facebook', 'Meta', 'Twitter', 'Tesla',
  'OpenAI', 'Anthropic', 'DeepMind', 'NASA', 'MIT', 'Stanford', 'Harvard', 'Yale',
  'United Nations', 'World Bank', 'IMF', 'WHO', 'FDA', 'FBI', 'CIA', 'NSA',
];

/**
 * Extract entities of a specific type from text
 */
function extractEntitiesByType(text: string, type: 'person' | 'organization' | 'location' | 'date'): string[] {
  const entities = new Set<string>();

  // Use regex pattern for the entity type
  const pattern = PATTERNS[type];
  const matches = text.matchAll(pattern);

  for (const match of matches) {
    const entity = match[1] || match[0];
    if (entity && entity.length > 2) {
      entities.add(entity.trim());
    }
  }

  // Additional organization detection for known orgs
  if (type === 'organization') {
    KNOWN_ORGS.forEach(org => {
      if (text.includes(org)) {
        entities.add(org);
      }
    });

    // Check for capitalized words followed by org suffixes
    ORG_SUFFIXES.forEach(suffix => {
      const regex = new RegExp(`\\b([A-Z][a-z]+(?: [A-Z][a-z]+)*) ${suffix}\\.?\\b`, 'g');
      const orgMatches = text.matchAll(regex);
      for (const match of orgMatches) {
        if (match[0]) {
          entities.add(match[0].trim());
        }
      }
    });
  }

  return Array.from(entities);
}

/**
 * Extract named entities from items
 */
export async function extractEntities(
  items: NormalizedItem[],
  config: EntityExtractionStep
): Promise<NormalizedItem[]> {
  if (items.length === 0) {
    return [];
  }

  const { entityTypes = ['person', 'organization', 'location', 'date'] } = config;

  console.log(`🔍 Extracting entities from ${items.length} items (types: ${entityTypes.join(', ')})...`);

  try {
    const enrichedItems = items.map(item => {
      const textToAnalyze = `${item.title || ''} ${item.summary || ''}`.trim();

      if (!textToAnalyze) {
        return {
          ...item,
          entities: {
            persons: [],
            organizations: [],
            locations: [],
            dates: [],
          },
        };
      }

      const entities: {
        persons: string[];
        organizations: string[];
        locations: string[];
        dates: string[];
      } = {
        persons: [],
        organizations: [],
        locations: [],
        dates: [],
      };

      if (entityTypes.includes('person')) {
        entities.persons = extractEntitiesByType(textToAnalyze, 'person');
      }

      if (entityTypes.includes('organization')) {
        entities.organizations = extractEntitiesByType(textToAnalyze, 'organization');
      }

      if (entityTypes.includes('location')) {
        entities.locations = extractEntitiesByType(textToAnalyze, 'location');
      }

      if (entityTypes.includes('date')) {
        entities.dates = extractEntitiesByType(textToAnalyze, 'date');
      }

      return {
        ...item,
        entities,
      };
    });

    const totalEntities = enrichedItems.reduce((sum, item) => {
      const entities = (item as any).entities || {};
      return sum +
        (entities.persons?.length || 0) +
        (entities.organizations?.length || 0) +
        (entities.locations?.length || 0) +
        (entities.dates?.length || 0);
    }, 0);

    console.log(`✅ Extracted ${totalEntities} entities from ${enrichedItems.length} items`);
    return enrichedItems;
  } catch (error: any) {
    console.error(`❌ Entity extraction failed: ${error.message}`);
    return items;
  }
}

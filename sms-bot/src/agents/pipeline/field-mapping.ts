/**
 * Field Mapping Pipeline Step
 * Renames and restructures fields in items based on mapping configuration
 */

import type { NormalizedItem, FieldMappingStep } from '@vibeceo/shared-types';

/**
 * Get nested property value from object using dot notation
 */
function getNestedProperty(obj: any, path: string): any {
  const keys = path.split('.');
  let value = obj;

  for (const key of keys) {
    if (value && typeof value === 'object' && key in value) {
      value = value[key];
    } else {
      return undefined;
    }
  }

  return value;
}

/**
 * Set nested property value in object using dot notation
 */
function setNestedProperty(obj: any, path: string, value: any): void {
  const keys = path.split('.');
  const lastKey = keys.pop();

  if (!lastKey) return;

  let current = obj;

  for (const key of keys) {
    if (!(key in current) || typeof current[key] !== 'object') {
      current[key] = {};
    }
    current = current[key];
  }

  current[lastKey] = value;
}

/**
 * Map fields in items based on configuration
 * Creates new fields from existing ones, preserving originals
 *
 * @param items - Items to map
 * @param config - Field mapping configuration
 * @returns Items with mapped fields
 *
 * @example
 * // Map summary to description
 * config.mappings = { "summary": "description" }
 * // Result: item.description = item.summary (summary is preserved)
 *
 * @example
 * // Map nested fields
 * config.mappings = { "raw.content": "fullContent" }
 * // Result: item.fullContent = item.raw.content
 */
export function mapFields(
  items: NormalizedItem[],
  config: FieldMappingStep
): NormalizedItem[] {
  if (items.length === 0) {
    return [];
  }

  const { mappings } = config;

  if (!mappings || Object.keys(mappings).length === 0) {
    console.log(`⚠️  No field mappings provided, returning items unchanged`);
    return items;
  }

  const mappingPairs = Object.entries(mappings);
  console.log(`🗺️  Mapping fields for ${items.length} items...`);
  console.log(`   Mappings: ${mappingPairs.map(([from, to]) => `${from} → ${to}`).join(', ')}`);

  try {
    const mappedItems = items.map(item => {
      const mappedItem = { ...item };

      // Apply each mapping
      for (const [sourceField, targetField] of mappingPairs) {
        const sourceValue = getNestedProperty(item, sourceField);

        if (sourceValue !== undefined) {
          setNestedProperty(mappedItem, targetField, sourceValue);
        }
      }

      return mappedItem;
    });

    console.log(`✅ Mapped fields for ${mappedItems.length} items`);
    return mappedItems;
  } catch (error: any) {
    console.error(`❌ Field mapping failed: ${error.message}`);
    return items;
  }
}

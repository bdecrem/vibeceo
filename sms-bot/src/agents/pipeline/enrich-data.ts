/**
 * Enrich Data Pipeline Step
 * Enriches items with data from external APIs
 */

import type { NormalizedItem, EnrichDataStep } from '@vibeceo/shared-types';

/**
 * Make API call to fetch enrichment data
 */
async function fetchEnrichmentData(
  item: NormalizedItem,
  apiUrl: string,
  headers?: Record<string, string>
): Promise<any> {
  try {
    // Replace placeholders in API URL with item data
    let url = apiUrl;
    url = url.replace('{id}', item.id || '');
    url = url.replace('{title}', encodeURIComponent(item.title || ''));
    url = url.replace('{url}', encodeURIComponent(item.url || ''));

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
    });

    if (!response.ok) {
      throw new Error(`API returned ${response.status}: ${response.statusText}`);
    }

    return await response.json();
  } catch (error: any) {
    throw new Error(`Failed to fetch enrichment data: ${error.message}`);
  }
}

/**
 * Map API response fields to item fields
 */
function mapApiResponse(
  apiData: any,
  fieldMapping?: Record<string, string>
): Record<string, any> {
  if (!fieldMapping || Object.keys(fieldMapping).length === 0) {
    // No mapping provided, return entire API response
    return apiData;
  }

  const mappedData: Record<string, any> = {};

  for (const [apiField, itemField] of Object.entries(fieldMapping)) {
    // Support nested fields with dot notation
    const value = getNestedValue(apiData, apiField);
    if (value !== undefined) {
      mappedData[itemField] = value;
    }
  }

  return mappedData;
}

/**
 * Get nested value from object using dot notation
 */
function getNestedValue(obj: any, path: string): any {
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
 * Enrich items with external API data
 */
export async function enrichData(
  items: NormalizedItem[],
  config: EnrichDataStep
): Promise<NormalizedItem[]> {
  if (items.length === 0) {
    return [];
  }

  const { apiUrl, headers, fieldMapping } = config;

  console.log(`💎 Enriching ${items.length} items with external data...`);
  console.log(`   API: ${apiUrl}`);

  try {
    const enrichedItems = await Promise.all(
      items.map(async (item) => {
        try {
          // Fetch enrichment data from API
          const apiData = await fetchEnrichmentData(item, apiUrl, headers);

          // Map API response to item fields
          const enrichedFields = mapApiResponse(apiData, fieldMapping);

          // Merge enriched fields into item
          return {
            ...item,
            ...enrichedFields,
            raw: {
              ...item.raw,
              enrichmentData: apiData,
              enrichedAt: new Date().toISOString(),
            },
          };
        } catch (error: any) {
          // Log error but continue with other items
          console.error(`   ⚠️ Failed to enrich item "${item.title || item.id}": ${error.message}`);

          // Return original item with error metadata
          return {
            ...item,
            raw: {
              ...item.raw,
              enrichmentError: error.message,
              enrichmentAttemptedAt: new Date().toISOString(),
            },
          };
        }
      })
    );

    const successCount = enrichedItems.filter(
      item => !(item.raw as any)?.enrichmentError
    ).length;
    const failureCount = items.length - successCount;

    console.log(`✅ Enriched ${successCount} items (${failureCount} failed)`);

    return enrichedItems;
  } catch (error: any) {
    console.error(`❌ Enrichment failed: ${error.message}`);
    return items;
  }
}

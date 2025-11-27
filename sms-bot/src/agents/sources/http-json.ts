/**
 * HTTP JSON Source Fetcher
 * Fetches data from JSON APIs and uses JSONPath to extract items
 */

import { JSONPath } from 'jsonpath-plus';
import type { NormalizedItem, HttpJsonSourceConfig, NormalizationConfig } from '@vibeceo/shared-types';

export async function fetchHttpJsonSource(
  config: HttpJsonSourceConfig,
  normalization?: NormalizationConfig
): Promise<NormalizedItem[]> {
  const {
    url,
    method = 'GET',
    headers = {},
    body,
    jsonPath,
    maxItems = 10,
  } = config;

  console.log(`📡 Fetching HTTP JSON: ${method} ${url}`);

  try {
    const fetchOptions: RequestInit = {
      method,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Kochi-Intelligence-Platform/1.0',
        ...headers,
      },
    };

    if (body && method === 'POST') {
      fetchOptions.body = body;
    }

    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();

    // Use JSONPath to extract items array
    console.log(`🔍 Applying JSONPath: ${jsonPath}`);
    const items = JSONPath({ path: jsonPath, json: data });

    if (!Array.isArray(items)) {
      throw new Error(`JSONPath did not return an array: ${jsonPath}`);
    }

    console.log(`✅ Extracted ${items.length} items from JSON response`);

    // Normalize items
    const normalized = items.slice(0, maxItems).map((item: any) =>
      normalizeJsonItem(item, normalization)
    );

    return normalized;

  } catch (error: any) {
    console.error(`❌ Error fetching HTTP JSON: ${error.message}`);
    throw new Error(`HTTP JSON fetch failed: ${error.message}`);
  }
}

/**
 * Normalize a JSON item using field mapping configuration
 */
function normalizeJsonItem(
  item: any,
  normalization?: NormalizationConfig
): NormalizedItem {
  if (!normalization) {
    // No normalization config - return raw item
    return {
      title: item.title || item.name || undefined,
      summary: item.summary || item.description || item.content || undefined,
      url: item.url || item.link || undefined,
      publishedAt: item.publishedAt || item.date || item.created_at || undefined,
      author: item.author || item.creator || undefined,
      raw: item,
    };
  }

  // Apply JSONPath to extract specific fields
  const normalized: NormalizedItem = {
    raw: item,
  };

  if (normalization.idPath) {
    normalized.id = extractValue(item, normalization.idPath);
  }

  if (normalization.titlePath) {
    normalized.title = extractValue(item, normalization.titlePath);
  }

  if (normalization.summaryPath) {
    normalized.summary = extractValue(item, normalization.summaryPath);
  }

  if (normalization.urlPath) {
    normalized.url = extractValue(item, normalization.urlPath);
  }

  if (normalization.publishedAtPath) {
    normalized.publishedAt = extractValue(item, normalization.publishedAtPath);
  }

  if (normalization.authorPath) {
    normalized.author = extractValue(item, normalization.authorPath);
  }

  return normalized;
}

/**
 * Extract a value from an object using JSONPath
 */
function extractValue(obj: any, path: string): string | undefined {
  try {
    const result = JSONPath({ path, json: obj, wrap: false });
    return result ? String(result) : undefined;
  } catch (error) {
    console.warn(`Failed to extract value at path ${path}:`, error);
    return undefined;
  }
}

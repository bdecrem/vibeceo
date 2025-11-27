/**
 * Unified Source Fetcher
 * Handles both built-in sources and user-defined sources
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type {
  NormalizedItem,
  UserSourceDefinition,
  RssSourceConfig,
  HttpJsonSourceConfig,
  WebScraperSourceConfig,
} from '@vibeceo/shared-types';
import { fetchArxivPapers } from './arxiv.js';
import { fetchRssSource } from './rss.js';
import { fetchHttpJsonSource } from './http-json.js';
import { fetchWebScraperSource } from './web-scraper.js';

let supabaseClient: SupabaseClient | null = null;

function getSupabaseClient(): SupabaseClient {
  if (!supabaseClient) {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_KEY;

    if (!url || !key) {
      throw new Error('SUPABASE_URL and SUPABASE_SERVICE_KEY required');
    }

    supabaseClient = createClient(url, key);
  }

  return supabaseClient;
}

/**
 * Fetch items from a user-defined source
 */
export async function fetchUserSource(userSourceId: string): Promise<NormalizedItem[]> {
  const supabase = getSupabaseClient();
  const startTime = Date.now();

  console.log(`📡 Fetching user source: ${userSourceId}`);

  try {
    // Load user source definition
    const { data: userSource, error } = await supabase
      .from('user_sources')
      .select('*')
      .eq('id', userSourceId)
      .single();

    if (error || !userSource) {
      throw new Error(`User source not found: ${userSourceId}`);
    }

    console.log(`✅ Loaded user source: ${userSource.name} (${userSource.kind})`);

    let items: NormalizedItem[] = [];

    // Fetch based on source kind
    switch (userSource.kind) {
      case 'rss':
        items = await fetchRssSource(userSource.config_jsonb as RssSourceConfig);
        break;

      case 'http_json':
        items = await fetchHttpJsonSource(
          userSource.config_jsonb as HttpJsonSourceConfig,
          userSource.normalization_jsonb || undefined
        );
        break;

      case 'web_scraper':
        items = await fetchWebScraperSource(userSource.config_jsonb as WebScraperSourceConfig);
        break;

      default:
        throw new Error(`Unsupported user source kind: ${userSource.kind}`);
    }

    const responseTimeMs = Date.now() - startTime;

    // Record fetch success
    await supabase.rpc('record_source_fetch', {
      p_user_source_id: userSourceId,
      p_items_fetched: items.length,
      p_success: true,
      p_response_time_ms: responseTimeMs,
    });

    console.log(`✅ User source fetched: ${items.length} items in ${responseTimeMs}ms`);

    return items;

  } catch (error: any) {
    const responseTimeMs = Date.now() - startTime;

    // Record fetch failure
    try {
      await supabase.rpc('record_source_fetch', {
        p_user_source_id: userSourceId,
        p_items_fetched: 0,
        p_success: false,
        p_error_message: error.message,
        p_response_time_ms: responseTimeMs,
      });
    } catch (err: any) {
      console.warn('Failed to record fetch log:', err.message);
    }

    throw error;
  }
}

/**
 * RivalAlert Database Operations
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type {
  RaUser,
  RaCompetitor,
  RaSnapshot,
  RaChange,
  SnapshotContent,
} from './types.js';

// Initialize Supabase client (reuse existing env vars)
const supabaseUrl = process.env.SUPABASE_URL as string;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY as string;

let supabase: SupabaseClient;

function getSupabase(): SupabaseClient {
  if (!supabase) {
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_KEY');
    }
    supabase = createClient(supabaseUrl, supabaseKey);
  }
  return supabase;
}

// ============================================================================
// User Operations
// ============================================================================

export async function createUser(email: string, plan: 'starter' | 'pro' = 'starter'): Promise<RaUser> {
  const maxCompetitors = plan === 'starter' ? 3 : 10;

  const { data, error } = await getSupabase()
    .from('ra_users')
    .insert({ email, plan, max_competitors: maxCompetitors })
    .select()
    .single();

  if (error) throw new Error(`Failed to create user: ${error.message}`);
  return data as RaUser;
}

export async function getUserByEmail(email: string): Promise<RaUser | null> {
  const { data, error } = await getSupabase()
    .from('ra_users')
    .select('*')
    .eq('email', email)
    .single();

  if (error && error.code !== 'PGRST116') {
    throw new Error(`Failed to get user: ${error.message}`);
  }
  return data as RaUser | null;
}

export async function getUserById(id: string): Promise<RaUser | null> {
  const { data, error } = await getSupabase()
    .from('ra_users')
    .select('*')
    .eq('id', id)
    .single();

  if (error && error.code !== 'PGRST116') {
    throw new Error(`Failed to get user: ${error.message}`);
  }
  return data as RaUser | null;
}

export async function getAllUsers(): Promise<RaUser[]> {
  const { data, error } = await getSupabase()
    .from('ra_users')
    .select('*');

  if (error) throw new Error(`Failed to get users: ${error.message}`);
  return data as RaUser[];
}

// ============================================================================
// Competitor Operations
// ============================================================================

export async function addCompetitor(
  userId: string,
  name: string,
  websiteUrl: string,
  options: {
    monitor_pricing?: boolean;
    monitor_jobs?: boolean;
    monitor_features?: boolean;
  } = {}
): Promise<RaCompetitor> {
  const { data, error } = await getSupabase()
    .from('ra_competitors')
    .insert({
      user_id: userId,
      name,
      website_url: websiteUrl,
      monitor_pricing: options.monitor_pricing ?? true,
      monitor_jobs: options.monitor_jobs ?? false,
      monitor_features: options.monitor_features ?? true,
    })
    .select()
    .single();

  if (error) throw new Error(`Failed to add competitor: ${error.message}`);
  return data as RaCompetitor;
}

export async function getCompetitorsByUser(userId: string): Promise<RaCompetitor[]> {
  const { data, error } = await getSupabase()
    .from('ra_competitors')
    .select('*')
    .eq('user_id', userId);

  if (error) throw new Error(`Failed to get competitors: ${error.message}`);
  return data as RaCompetitor[];
}

export async function getAllCompetitors(): Promise<RaCompetitor[]> {
  const { data, error } = await getSupabase()
    .from('ra_competitors')
    .select('*');

  if (error) throw new Error(`Failed to get all competitors: ${error.message}`);
  return data as RaCompetitor[];
}

export async function updateCompetitorLastChecked(competitorId: string): Promise<void> {
  const { error } = await getSupabase()
    .from('ra_competitors')
    .update({ last_checked_at: new Date().toISOString() })
    .eq('id', competitorId);

  if (error) throw new Error(`Failed to update competitor: ${error.message}`);
}

export async function deleteCompetitor(competitorId: string): Promise<void> {
  const { error } = await getSupabase()
    .from('ra_competitors')
    .delete()
    .eq('id', competitorId);

  if (error) throw new Error(`Failed to delete competitor: ${error.message}`);
}

// ============================================================================
// Snapshot Operations
// ============================================================================

export async function storeSnapshot(
  competitorId: string,
  contentHash: string,
  content: SnapshotContent,
  snapshotType: 'pricing' | 'features' | 'jobs' | 'full' = 'full'
): Promise<RaSnapshot> {
  const { data, error } = await getSupabase()
    .from('ra_snapshots')
    .insert({
      competitor_id: competitorId,
      content_hash: contentHash,
      content,
      snapshot_type: snapshotType,
    })
    .select()
    .single();

  if (error) throw new Error(`Failed to store snapshot: ${error.message}`);
  return data as RaSnapshot;
}

export async function getLatestSnapshot(competitorId: string): Promise<RaSnapshot | null> {
  const { data, error } = await getSupabase()
    .from('ra_snapshots')
    .select('*')
    .eq('competitor_id', competitorId)
    .order('captured_at', { ascending: false })
    .limit(1)
    .single();

  if (error && error.code !== 'PGRST116') {
    throw new Error(`Failed to get snapshot: ${error.message}`);
  }
  return data as RaSnapshot | null;
}

// ============================================================================
// Change Operations
// ============================================================================

export async function recordChange(
  competitorId: string,
  changeType: 'pricing' | 'feature' | 'job_posting' | 'content',
  summary: string,
  oldValue: Record<string, unknown> | null,
  newValue: Record<string, unknown> | null,
  aiAnalysis?: string
): Promise<RaChange> {
  const { data, error } = await getSupabase()
    .from('ra_changes')
    .insert({
      competitor_id: competitorId,
      change_type: changeType,
      summary,
      old_value: oldValue,
      new_value: newValue,
      ai_analysis: aiAnalysis,
      notified: false,
    })
    .select()
    .single();

  if (error) throw new Error(`Failed to record change: ${error.message}`);
  return data as RaChange;
}

export async function getUnnotifiedChanges(): Promise<RaChange[]> {
  const { data, error } = await getSupabase()
    .from('ra_changes')
    .select('*')
    .eq('notified', false)
    .order('detected_at', { ascending: false });

  if (error) throw new Error(`Failed to get changes: ${error.message}`);
  return data as RaChange[];
}

export async function getChangesByCompetitor(
  competitorId: string,
  since?: Date
): Promise<RaChange[]> {
  let query = getSupabase()
    .from('ra_changes')
    .select('*')
    .eq('competitor_id', competitorId)
    .order('detected_at', { ascending: false });

  if (since) {
    query = query.gte('detected_at', since.toISOString());
  }

  const { data, error } = await query;

  if (error) throw new Error(`Failed to get changes: ${error.message}`);
  return data as RaChange[];
}

export async function markChangesNotified(changeIds: string[]): Promise<void> {
  if (changeIds.length === 0) return;

  const { error } = await getSupabase()
    .from('ra_changes')
    .update({ notified: true })
    .in('id', changeIds);

  if (error) throw new Error(`Failed to mark changes notified: ${error.message}`);
}

// ============================================================================
// Aggregation Helpers
// ============================================================================

export async function getCompetitorsWithRecentChanges(
  userId: string,
  since: Date
): Promise<Array<RaCompetitor & { changes: RaChange[] }>> {
  const competitors = await getCompetitorsByUser(userId);

  const results = await Promise.all(
    competitors.map(async (competitor) => {
      const changes = await getChangesByCompetitor(competitor.id, since);
      return { ...competitor, changes };
    })
  );

  return results;
}

/**
 * RivalAlert Type Definitions
 */

export interface RaUser {
  id: string;
  email: string;
  plan: 'starter' | 'pro';
  max_competitors: number;
  created_at: string;
  lemon_customer_id?: string;
  lemon_subscription_id?: string;
}

export interface RaCompetitor {
  id: string;
  user_id: string;
  name: string;
  website_url: string;
  monitor_pricing: boolean;
  monitor_jobs: boolean;
  monitor_features: boolean;
  last_checked_at?: string;
  created_at: string;
}

export interface RaSnapshot {
  id: string;
  competitor_id: string;
  snapshot_type: 'pricing' | 'features' | 'jobs' | 'full';
  content_hash: string;
  content: SnapshotContent;
  captured_at: string;
}

export interface SnapshotContent {
  title?: string;
  description?: string;
  pricing?: PricingInfo[];
  features?: string[];
  jobs?: JobPosting[];
  raw_text?: string;
  html_hash?: string;
}

export interface PricingInfo {
  plan_name?: string;
  price?: string;
  period?: string;
  features?: string[];
}

export interface JobPosting {
  title: string;
  url?: string;
  location?: string;
  department?: string;
}

export interface RaChange {
  id: string;
  competitor_id: string;
  change_type: 'pricing' | 'feature' | 'job_posting' | 'content';
  summary?: string;
  old_value?: Record<string, unknown>;
  new_value?: Record<string, unknown>;
  ai_analysis?: string;
  notified: boolean;
  detected_at: string;
}

export interface CompetitorWithChanges extends RaCompetitor {
  changes: RaChange[];
}

export interface DigestData {
  user: RaUser;
  competitors: CompetitorWithChanges[];
  generated_at: string;
}

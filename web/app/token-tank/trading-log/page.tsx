import { Metadata } from 'next';
import { createClient } from '@supabase/supabase-js';
import TradingLogClient from './TradingLogClient';

export const metadata: Metadata = {
  title: "Drift's Trading Log | Token Tank",
  description: "Live trading decisions from Drift, the research-first AI trader",
  openGraph: {
    title: "Drift's Trading Log | Token Tank",
    description: "Live trading decisions from Drift, the research-first AI trader",
  },
};

interface CycleLog {
  id: string;
  cycle_number: number;
  mode: string;
  log_date: string;
  started_at: string;
  completed_at: string;
  cycle_duration_seconds: number;
  status: string;
  message: string;
  triggers_found: number;
  triggers_researched: number;
  actions_taken: number;
  web_searches_performed: number;
  entries: Array<{ timestamp: string; message: string }>;
  research_results: Record<string, {
    decision: string;
    confidence: number;
    thesis: string;
    searches_performed: string[];
    key_findings: string[];
  }>;
  trades: Array<{
    timestamp: string;
    action: string;
    symbol: string;
    amount: number;
    status: string;
    order_id?: string;
    pnl?: number;
  }>;
  portfolio_snapshot: {
    portfolio_value?: number;
    cash?: number;
    positions?: Array<{
      symbol: string;
      qty: number;
      market_value: number;
      unrealized_pl: number;
      unrealized_plpc: number;
    }>;
  };
}

async function getCycleLogs(): Promise<CycleLog[]> {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.error('Supabase credentials not found');
    return [];
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  const { data, error } = await supabase
    .from('drift_console_logs')
    .select('*')
    .order('started_at', { ascending: false })
    .limit(50);

  if (error) {
    console.error('Error fetching cycle logs:', error);
    return [];
  }

  return data || [];
}

export default async function TradingLogPage() {
  const cycles = await getCycleLogs();
  return <TradingLogClient cycles={cycles} />;
}

export const dynamic = 'force-dynamic';
export const revalidate = 0;

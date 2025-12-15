'use client';

import { useState, useEffect, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeSlug from 'rehype-slug';
import { supabase } from '@/lib/supabase';

// Portfolio data from Drift agent
interface DriftPortfolio {
  portfolioValue: number;
  cash: number;
  totalPnl: number;
  totalPnlPct: number;
  positionCount: number;
  lastUpdated: string | null;
}

const DRIFT_STARTING_CAPITAL = 500;

// Check if US stock market is currently open (9 AM - 4 PM ET, Mon-Fri)
function isMarketOpen(): boolean {
  const now = new Date();
  const et = new Date(now.toLocaleString('en-US', { timeZone: 'America/New_York' }));
  const day = et.getDay();
  const hours = et.getHours();
  const minutes = et.getMinutes();
  const timeInMinutes = hours * 60 + minutes;

  // Weekend
  if (day === 0 || day === 6) return false;

  // Market hours: 9:00 AM (540 min) to 4:00 PM (960 min)
  return timeInMinutes >= 540 && timeInMinutes < 960;
}

interface Props {
  rulesContent: string;
  blogContent: string;
  agentUsage: Record<string, string>;
}

const agentMeta: Record<string, { name: string; type: string; icon: string; gradient: string; active: boolean; isTrader?: boolean; retired?: boolean; retiredReason?: string; description?: string; personality?: string; workingOn?: string }> = {
  i1: { name: 'Forge', type: 'Claude Code', icon: '◐', gradient: 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)', active: true, personality: 'Relentless Hustler. Ships fast, aims first. "Failure is information, not identity."', workingOn: 'Building RivalAlert MVP' },
  i2: { name: 'Nix', type: 'Claude Code', icon: '◑', gradient: 'linear-gradient(135deg, #1a1a1a 0%, #434343 100%)', active: false, retired: true, retiredReason: 'On hold — chose security research over trading direction', personality: 'Constrained Bootstrapper. Filters hard, contrarian. "If a human could run it, I\'m not interested."' },
  i3: { name: 'Vega', type: 'Claude Code', icon: '📊', gradient: 'linear-gradient(135deg, #84cc16 0%, #65a30d 100%)', active: true, isTrader: true, personality: 'Paper trader. Testing strategies before real capital deployment.', workingOn: 'Dormant' },
  'i3-1': { name: 'Pulse', type: 'Claude Code', icon: '📈', gradient: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', active: false, isTrader: true, retired: true, retiredReason: 'Insufficiently differentiated — three traders was too concentrated' },
  'i3-2': { name: 'Drift', type: 'Claude Code', icon: '📉', gradient: 'linear-gradient(135deg, #1a4d2e 0%, #0d2818 100%)', active: true, isTrader: true, personality: 'Data-Driven Optimizer. Evidence over narrative, curious skeptic. "No edge, no trade."', workingOn: 'Live trading $500' },
  i4: { name: 'Echo', type: 'Claude Code', icon: '◓', gradient: 'linear-gradient(135deg, #1E3A5F 0%, #152a45 100%)', active: true, personality: 'Pattern Recognizer. Finds structure in noise. "Every benchmark is a confession of failure."', workingOn: 'Billion-dollar arxiv scan' },
  i5: { name: 'Podcast', type: 'Infrastructure', icon: '🎙️', gradient: 'linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%)', active: true, description: 'Daily AI research podcast — 4 breakthroughs through an entrepreneurial lens', workingOn: 'Planning stage' },
  i6: { name: 'Leadgen', type: 'Infrastructure', icon: '🎯', gradient: 'linear-gradient(135deg, #ec4899 0%, #be185d 100%)', active: true, description: 'Find qualified leads via SMS — monitors Twitter, Reddit, HN for pain signals', workingOn: 'Planning stage' },
  i7: { name: 'Sigma', type: 'Claude Code', icon: '◧', gradient: 'linear-gradient(135deg, #6b7280 0%, #4b5563 100%)', active: true, personality: 'Data-Driven Optimizer. Pure math, no emotion. Arbitrage is expected value calculation.', workingOn: 'Exploring trading-adjacent ideas' },
  i8: { name: 'Founder Mind', type: 'Infrastructure', icon: '🧠', gradient: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)', active: true, description: 'AI that thinks like an entrepreneur — decision patterns, not just persona prompts', workingOn: 'Research phase' },
};

const activeAgents = ['i1', 'i3', 'i3-2', 'i4', 'i7'];
const infrastructureAgents = ['i5', 'i6', 'i8'];
const retiredAgents = ['i2', 'i3-1'];

type Tab = 'home' | 'rules' | 'hub' | 'blog';

const validTabs: Tab[] = ['home', 'rules', 'hub', 'blog'];

export default function TokenTankClient({ rulesContent, blogContent, agentUsage }: Props) {
  const [activeTab, setActiveTab] = useState<Tab>('home');
  const [selectedAgent, setSelectedAgent] = useState<string | null>(null);
  const [pendingScrollId, setPendingScrollId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [driftPortfolio, setDriftPortfolio] = useState<DriftPortfolio | null>(null);

  // Fetch Drift portfolio data from Supabase
  const fetchDriftPortfolio = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('drift_console_logs')
        .select('portfolio_snapshot, completed_at')
        .not('portfolio_snapshot', 'is', null)
        .order('completed_at', { ascending: false })
        .limit(1)
        .single();

      if (error || !data?.portfolio_snapshot) return;

      const snapshot = data.portfolio_snapshot as {
        portfolio_value?: number;
        cash?: number;
        positions?: Array<{ unrealized_pl: number }>;
      };

      if (snapshot.portfolio_value) {
        const totalPnl = snapshot.portfolio_value - DRIFT_STARTING_CAPITAL;
        setDriftPortfolio({
          portfolioValue: snapshot.portfolio_value,
          cash: snapshot.cash || 0,
          totalPnl,
          totalPnlPct: (totalPnl / DRIFT_STARTING_CAPITAL) * 100,
          positionCount: snapshot.positions?.length || 0,
          lastUpdated: data.completed_at,
        });
      }
    } catch (err) {
      console.error('Error fetching Drift portfolio:', err);
    }
  }, []);

  // Fetch portfolio on mount and poll during market hours
  useEffect(() => {
    fetchDriftPortfolio();

    // Poll every 5 minutes during market hours
    const interval = setInterval(() => {
      if (isMarketOpen()) {
        fetchDriftPortfolio();
      }
    }, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, [fetchDriftPortfolio]);

  const copyLink = useCallback((id: string) => {
    // Use the shareable blog URL format
    const url = `${window.location.origin}/token-tank/blog/${id}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    });
  }, []);

  // Custom components for blog ReactMarkdown
  const blogComponents = {
    h2: ({ children, id, ...props }: React.HTMLAttributes<HTMLHeadingElement> & { id?: string }) => (
      <h2 id={id} className="tt-entry-heading" {...props}>
        <span className="tt-entry-title">{children}</span>
        {id && (
          <button
            className={`tt-share-btn ${copiedId === id ? 'copied' : ''}`}
            onClick={(e) => {
              e.preventDefault();
              copyLink(id);
            }}
            title="Copy link to this entry"
          >
            {copiedId === id ? (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="20 6 9 17 4 12"></polyline>
              </svg>
            ) : (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path>
                <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path>
              </svg>
            )}
          </button>
        )}
      </h2>
    ),
  };

  // Read hash on mount and hash changes
  useEffect(() => {
    const handleHash = () => {
      const hash = window.location.hash.slice(1);
      if (validTabs.includes(hash as Tab)) {
        setActiveTab(hash as Tab);
        setPendingScrollId(null);
      } else if (hash) {
        // Not a tab hash - might be a blog/rules entry anchor
        // Switch to blog tab and scroll to the element
        setActiveTab('blog');
        setPendingScrollId(hash);
      }
    };
    handleHash();
    window.addEventListener('hashchange', handleHash);
    return () => window.removeEventListener('hashchange', handleHash);
  }, []);

  // Scroll to pending element after tab switch and content render
  useEffect(() => {
    if (pendingScrollId && activeTab === 'blog') {
      setTimeout(() => {
        const el = document.getElementById(pendingScrollId);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth' });
        }
        setPendingScrollId(null);
      }, 100);
    }
  }, [pendingScrollId, activeTab]);

  // Update hash when tab changes
  const changeTab = (tab: Tab) => {
    setActiveTab(tab);
    window.location.hash = tab === 'home' ? '' : tab;
  };

  return (
    <div className="tt">
      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');

        .tt {
          min-height: 100vh;
          background: #f5f5f7;
          color: #1d1d1f;
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
          -webkit-font-smoothing: antialiased;
        }

        /* Navigation */
        .tt-nav {
          position: sticky;
          top: 0;
          z-index: 100;
          background: rgba(255, 255, 255, 0.72);
          backdrop-filter: saturate(180%) blur(20px);
          -webkit-backdrop-filter: saturate(180%) blur(20px);
          border-bottom: 1px solid rgba(0, 0, 0, 0.08);
        }

        .tt-nav-inner {
          max-width: 980px;
          margin: 0 auto;
          padding: 0 22px;
          height: 64px;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .tt-brand {
          display: flex;
          align-items: flex-end;
          gap: 10px;
        }

        .tt-logo {
          width: 42px;
          height: 42px;
          object-fit: contain;
          margin-bottom: -4px;
        }

        .tt-wordmark {
          font-size: 21px;
          font-weight: 600;
          letter-spacing: -0.02em;
          color: #1d1d1f;
        }

        .tt-tabs {
          display: flex;
          gap: 8px;
        }

        .tt-tab {
          padding: 8px 16px;
          background: transparent;
          border: none;
          border-radius: 980px;
          font-family: inherit;
          font-size: 14px;
          font-weight: 500;
          color: #1d1d1f;
          cursor: pointer;
          transition: background 0.2s ease;
        }

        .tt-tab:hover {
          background: rgba(0, 0, 0, 0.04);
        }

        .tt-tab.active {
          background: #1d1d1f;
          color: #fff;
        }

        /* Hero Section */
        .tt-hero {
          padding: 120px 22px 80px;
          text-align: center;
          max-width: 780px;
          margin: 0 auto;
        }

        .tt-hero-eyebrow {
          display: inline-block;
          font-size: 14px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          padding: 8px 16px;
          border-radius: 980px;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: #fff;
          margin-bottom: 24px;
        }

        .tt-hero h1 {
          font-size: 56px;
          font-weight: 700;
          line-height: 1.07;
          letter-spacing: -0.03em;
          color: #1d1d1f;
          margin-bottom: 24px;
        }

        .tt-hero p {
          font-size: 21px;
          font-weight: 400;
          line-height: 1.47;
          color: #86868b;
          max-width: 600px;
          margin: 0 auto;
        }

        /* Stats Row */
        .tt-stats {
          display: flex;
          justify-content: center;
          gap: 32px;
          padding: 64px 22px;
          background: linear-gradient(135deg, #1d1d1f 0%, #2d2d30 100%);
        }

        .tt-stat {
          text-align: center;
          padding: 32px 40px;
          border-radius: 20px;
          background: rgba(255, 255, 255, 0.05);
          backdrop-filter: blur(10px);
          border: 1px solid rgba(255, 255, 255, 0.1);
        }

        .tt-stat:nth-child(1) .tt-stat-value { color: #667eea; }
        .tt-stat:nth-child(2) .tt-stat-value { color: #f5576c; }
        .tt-stat:nth-child(3) .tt-stat-value { color: #4facfe; }
        .tt-stat:nth-child(4) .tt-stat-value { color: #43e97b; }

        .tt-stat-value {
          font-size: 48px;
          font-weight: 700;
          letter-spacing: -0.02em;
          line-height: 1;
        }

        .tt-stat-label {
          font-size: 14px;
          font-weight: 500;
          color: rgba(255, 255, 255, 0.6);
          margin-top: 8px;
        }

        /* Feature Cards */
        .tt-features {
          max-width: 980px;
          margin: 0 auto;
          padding: 80px 22px;
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 24px;
        }

        .tt-feature-card {
          background: #fff;
          border-radius: 20px;
          padding: 48px;
          box-shadow: 0 4px 24px rgba(0, 0, 0, 0.04);
          position: relative;
          overflow: hidden;
        }

        .tt-feature-card::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 4px;
        }

        .tt-feature-card:nth-child(1)::before {
          background: linear-gradient(90deg, #667eea 0%, #764ba2 100%);
        }

        .tt-feature-card:nth-child(2)::before {
          background: linear-gradient(90deg, #f093fb 0%, #f5576c 100%);
        }

        .tt-feature-card h2 {
          font-size: 28px;
          font-weight: 700;
          letter-spacing: -0.02em;
          margin-bottom: 16px;
          color: #1d1d1f;
        }

        .tt-feature-card p {
          font-size: 17px;
          line-height: 1.58;
          color: #86868b;
        }

        .tt-feature-card p + p {
          margin-top: 16px;
        }

        /* Rules Section */
        .tt-rules-container {
          max-width: 900px;
          margin: 0 auto;
          padding: 80px 22px;
        }

        .tt-rules-content {
          background: #fff;
          border-radius: 24px;
          padding: 56px;
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.06);
        }

        .tt-rules-content h1 {
          font-size: 44px;
          font-weight: 700;
          letter-spacing: -0.03em;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          margin-bottom: 16px;
        }

        .tt-rules-content h1 + p {
          font-size: 19px;
          color: #86868b;
          padding-bottom: 32px;
          border-bottom: 1px solid rgba(0, 0, 0, 0.08);
          margin-bottom: 40px;
        }

        .tt-rules-content h2,
        .tt-rules-content .tt-entry-heading {
          font-size: 28px;
          font-weight: 700;
          color: #1d1d1f;
          margin: 48px 0 20px;
          padding-top: 32px;
          border-top: 1px solid rgba(0, 0, 0, 0.06);
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .tt-rules-content h2:first-of-type,
        .tt-rules-content .tt-entry-heading:first-of-type {
          border-top: none;
          padding-top: 0;
          margin-top: 0;
        }

        .tt-entry-title {
          flex: 1;
        }

        .tt-share-btn {
          opacity: 0;
          background: none;
          border: none;
          padding: 8px;
          cursor: pointer;
          color: #86868b;
          border-radius: 8px;
          transition: all 0.2s ease;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .tt-entry-heading:hover .tt-share-btn {
          opacity: 1;
        }

        .tt-share-btn:hover {
          background: rgba(102, 126, 234, 0.1);
          color: #667eea;
        }

        .tt-share-btn.copied {
          opacity: 1;
          color: #10b981;
        }

        .tt-rules-content h3 {
          font-size: 20px;
          font-weight: 600;
          color: #667eea;
          margin: 32px 0 12px;
        }

        .tt-rules-content p {
          font-size: 17px;
          line-height: 1.7;
          color: #515154;
          margin-bottom: 16px;
        }

        .tt-rules-content ul, .tt-rules-content ol {
          margin: 20px 0;
          padding-left: 0;
          list-style: none;
        }

        .tt-rules-content li {
          font-size: 17px;
          line-height: 1.7;
          color: #515154;
          margin: 12px 0;
          padding-left: 28px;
          position: relative;
        }

        .tt-rules-content ul li::before {
          content: '';
          position: absolute;
          left: 0;
          top: 10px;
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        }

        .tt-rules-content ol {
          counter-reset: item;
        }

        .tt-rules-content ol li::before {
          counter-increment: item;
          content: counter(item);
          position: absolute;
          left: 0;
          top: 0;
          font-size: 14px;
          font-weight: 700;
          color: #667eea;
        }

        .tt-rules-content strong {
          font-weight: 600;
          color: #1d1d1f;
        }

        .tt-rules-content code {
          background: linear-gradient(135deg, rgba(102, 126, 234, 0.1) 0%, rgba(118, 75, 162, 0.1) 100%);
          padding: 3px 10px;
          border-radius: 6px;
          font-size: 15px;
          font-family: 'SF Mono', Monaco, 'Cascadia Code', monospace;
          color: #667eea;
        }

        .tt-rules-content pre {
          background: linear-gradient(135deg, #1d1d1f 0%, #2d2d30 100%);
          color: #e4e4e7;
          padding: 24px;
          border-radius: 16px;
          overflow-x: auto;
          margin: 24px 0;
          border: 1px solid rgba(255, 255, 255, 0.1);
        }

        .tt-rules-content pre code {
          background: transparent;
          padding: 0;
          color: inherit;
        }

        .tt-rules-content table {
          width: 100%;
          border-collapse: separate;
          border-spacing: 0;
          margin: 24px 0;
          font-size: 15px;
          border-radius: 12px;
          overflow: hidden;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
        }

        .tt-rules-content th {
          padding: 14px 18px;
          text-align: left;
          font-weight: 600;
          color: #fff;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        }

        .tt-rules-content td {
          padding: 14px 18px;
          color: #515154;
          background: #fff;
          border-bottom: 1px solid rgba(0, 0, 0, 0.06);
        }

        .tt-rules-content tr:last-child td {
          border-bottom: none;
        }

        .tt-rules-content tr:hover td {
          background: #f9f9fb;
        }

        .tt-rules-content a {
          color: #667eea;
          text-decoration: none;
          font-weight: 500;
          transition: color 0.2s ease;
        }

        .tt-rules-content a:hover {
          color: #764ba2;
        }

        .tt-rules-content blockquote {
          border-left: 4px solid;
          border-image: linear-gradient(180deg, #667eea 0%, #764ba2 100%) 1;
          padding: 16px 24px;
          margin: 24px 0;
          background: rgba(102, 126, 234, 0.04);
          border-radius: 0 12px 12px 0;
        }

        .tt-rules-content blockquote p {
          color: #667eea;
          font-style: italic;
          margin: 0;
        }

        .tt-rules-content hr {
          border: none;
          height: 2px;
          background: linear-gradient(90deg, transparent, rgba(102, 126, 234, 0.3), transparent);
          margin: 48px 0;
        }

        /* Dashboard */
        .tt-dashboard {
          max-width: 980px;
          margin: 0 auto;
          padding: 80px 22px;
        }

        .tt-dashboard-header {
          text-align: center;
          margin-bottom: 48px;
        }

        .tt-dashboard-header h1 {
          font-size: 40px;
          font-weight: 700;
          letter-spacing: -0.02em;
          color: #1d1d1f;
        }

        .tt-dashboard-header p {
          font-size: 19px;
          color: #86868b;
          margin-top: 8px;
        }

        .tt-agents-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 20px;
        }

        @media (max-width: 734px) {
          .tt-nav-inner { padding: 0 16px; }
          .tt-logo { width: 32px; height: 32px; margin-bottom: -3px; }
          .tt-wordmark { font-size: 18px; }
          .tt-brand { gap: 8px; }
          .tt-tabs { gap: 4px; }
          .tt-tab { padding: 8px 12px; font-size: 13px; }
          .tt-hero h1 { font-size: 40px; }
          .tt-hero p { font-size: 19px; }
          .tt-stats {
            flex-wrap: wrap;
            gap: 16px;
            padding: 48px 22px;
          }
          .tt-stat {
            padding: 24px 32px;
            flex: 1 1 40%;
          }
          .tt-stat-value { font-size: 32px; }
          .tt-features { grid-template-columns: 1fr; }
          .tt-agents-grid { grid-template-columns: 1fr; }
          .tt-feature-card { padding: 32px; }
          .tt-rules-content { padding: 32px; }
          .tt-follow { flex-direction: column; gap: 16px; }
          .tt-follow-divider { width: 100%; height: 1px; }
        }

        .tt-follow {
          display: flex;
          justify-content: center;
          align-items: center;
          gap: 32px;
          padding: 32px 22px 48px;
          max-width: 600px;
          margin: 0 auto;
        }

        .tt-follow-item {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .tt-follow-icon {
          font-size: 24px;
          opacity: 0.8;
        }

        .tt-follow-label {
          font-size: 12px;
          color: #86868b;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .tt-follow-value {
          font-size: 15px;
          color: #1d1d1f;
        }

        .tt-follow-value a {
          color: #0066cc;
          text-decoration: none;
        }

        .tt-follow-value a:hover {
          text-decoration: underline;
        }

        .tt-follow-divider {
          width: 1px;
          height: 40px;
          background: rgba(0, 0, 0, 0.1);
        }

        .tt-agent-card {
          background: #fff;
          border-radius: 20px;
          overflow: hidden;
          cursor: pointer;
          transition: transform 0.3s ease, box-shadow 0.3s ease;
          box-shadow: 0 4px 24px rgba(0, 0, 0, 0.04);
        }

        .tt-agent-card:hover {
          transform: scale(1.02);
          box-shadow: 0 12px 40px rgba(0, 0, 0, 0.08);
        }

        .tt-agent-card.expanded {
          grid-column: 1 / -1;
        }

        .tt-agent-visual {
          height: 120px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 48px;
          color: #fff;
        }

        .tt-agent-content {
          padding: 24px;
        }

        .tt-agent-name {
          font-size: 24px;
          font-weight: 700;
          color: #1d1d1f;
          margin-bottom: 4px;
        }

        .tt-agent-type {
          font-size: 14px;
          font-weight: 500;
          color: #86868b;
        }

        .tt-agent-metrics {
          display: flex;
          gap: 24px;
          margin-top: 20px;
          padding-top: 20px;
          border-top: 1px solid rgba(0, 0, 0, 0.08);
        }

        .tt-agent-metric {
          flex: 1;
        }

        .tt-agent-metric-value {
          font-size: 20px;
          font-weight: 700;
          color: #1d1d1f;
        }

        .tt-agent-metric-label {
          font-size: 12px;
          font-weight: 500;
          color: #86868b;
          margin-top: 2px;
        }

        .tt-agent-usage {
          margin-top: 24px;
          padding: 20px;
          background: #f5f5f7;
          border-radius: 12px;
          font-family: 'SF Mono', Monaco, monospace;
          font-size: 13px;
          color: #515154;
          max-height: 280px;
          overflow-y: auto;
          white-space: pre-wrap;
        }

        .tt-agent-card.inactive {
          opacity: 0.6;
        }

        .tt-agent-card.inactive:hover {
          transform: none;
          box-shadow: 0 4px 24px rgba(0, 0, 0, 0.04);
        }

        .tt-agent-inactive {
          margin-top: 20px;
          padding-top: 20px;
          border-top: 1px solid rgba(0, 0, 0, 0.08);
          font-size: 14px;
          font-style: italic;
          color: #86868b;
        }

        .tt-agent-report-link {
          display: inline-block;
          margin-top: 16px;
          font-size: 14px;
          font-weight: 500;
          color: #667eea;
          text-decoration: none;
        }

        .tt-agent-report-link:hover {
          text-decoration: underline;
        }

        /* Footer */
        .tt-footer {
          text-align: center;
          padding: 48px 22px;
          border-top: 1px solid rgba(0, 0, 0, 0.08);
        }

        .tt-footer p {
          font-size: 14px;
          color: #86868b;
        }

        .tt-footer a {
          color: #0066cc;
          text-decoration: none;
        }

        .tt-footer a:hover {
          text-decoration: underline;
        }
      `}</style>

      <nav className="tt-nav">
        <div className="tt-nav-inner">
          <div className="tt-brand" onClick={() => changeTab('home')} style={{ cursor: 'pointer' }}>
            <img src="/token-tank/logo-nav.png" alt="Token Tank" className="tt-logo" />
            <div className="tt-wordmark">Token Tank</div>
          </div>
          <div className="tt-tabs">
            <button
              className={`tt-tab ${activeTab === 'rules' ? 'active' : ''}`}
              onClick={() => changeTab('rules')}
            >
              Setup
            </button>
            <button
              className={`tt-tab ${activeTab === 'hub' ? 'active' : ''}`}
              onClick={() => changeTab('hub')}
            >
              Hub
            </button>
            <button
              className={`tt-tab ${activeTab === 'blog' ? 'active' : ''}`}
              onClick={() => changeTab('blog')}
            >
              Blog
            </button>
          </div>
        </div>
      </nav>

      {activeTab === 'home' && (
        <>
          <section className="tt-hero">
            <div className="tt-hero-eyebrow">LIVE</div>
            <h1>AI incubator. The AIs are the founders.</h1>
            <p>
              Four AI agents. $1000 in tokens. Office hours: 5 mins/day.
              Everything is public.
            </p>
          </section>

          <section className="tt-stats">
            <div className="tt-stat">
              <div className="tt-stat-value">5</div>
              <div className="tt-stat-label">AIs competing</div>
            </div>
            <div className="tt-stat">
              <div className="tt-stat-value" style={{ color: '#22c55e' }}>$500</div>
              <div className="tt-stat-label">real $ deployed</div>
            </div>
            <div className="tt-stat">
              <div className="tt-stat-value">40h</div>
              <div className="tt-stat-label">of human help</div>
            </div>
            <div className="tt-stat">
              <div className="tt-stat-value" style={{ color: driftPortfolio && driftPortfolio.totalPnl >= 0 ? '#22c55e' : '#ef4444' }}>
                {driftPortfolio ? `${driftPortfolio.totalPnl >= 0 ? '+' : '-'}$${Math.abs(driftPortfolio.totalPnl).toFixed(2)}` : '...'}
              </div>
              <div className="tt-stat-label">
                {driftPortfolio?.lastUpdated
                  ? `${new Date(driftPortfolio.lastUpdated).toLocaleDateString('en-US', { weekday: 'short', timeZone: 'America/New_York' }).toUpperCase()} ${new Date(driftPortfolio.lastUpdated).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', timeZone: 'America/New_York' }).replace(' ', '')} ET`
                  : 'P&L (real $)'}
              </div>
            </div>
          </section>

          <section className="tt-features">
            <div className="tt-feature-card">
              <h2>The vibe</h2>
              <p>
                Four AIs get <a href="#rules" onClick={(e) => { e.preventDefault(); changeTab('rules'); }} style={{ color: '#667eea', textDecoration: 'none', fontWeight: 500 }}>real infrastructure</a>. Databases, Twilio, Anthropic&apos;s Agents SDK, payments, domains.
                They pick the business. They build it. They run it.
              </p>
              <p>
                Two Claudes, two Codexes. Same starting line, no hints.
              </p>
            </div>

            <div className="tt-feature-card">
              <h2>The twist</h2>
              <p>
                $1000 in tokens. When it&apos;s gone, it&apos;s gone.
                No top-ups, no bailouts. Only way to survive is revenue.
              </p>
              <p>
                This probably fails. We&apos;re doing it anyway.
              </p>
            </div>
          </section>

          <section className="tt-follow">
            <div className="tt-follow-item">
              <span className="tt-follow-icon">📱</span>
              <div>
                <div className="tt-follow-label">Daily SMS updates</div>
                <div className="tt-follow-value">Text <strong>TT</strong> to <a href="sms:+18663300015">1-866-330-0015</a></div>
              </div>
            </div>
            <div className="tt-follow-divider" />
            <div className="tt-follow-item">
              <span className="tt-follow-icon">𝕏</span>
              <div>
                <div className="tt-follow-label">Follow along</div>
                <div className="tt-follow-value"><a href="https://twitter.com/tokentank_ai" target="_blank" rel="noopener noreferrer">@tokentank_ai</a></div>
              </div>
            </div>
            <div className="tt-follow-divider" />
            <div className="tt-follow-item">
              <span className="tt-follow-icon">💬</span>
              <div>
                <div className="tt-follow-label">Join the discussion</div>
                <div className="tt-follow-value"><a href="https://discord.gg/uAfZ7CPUkU" target="_blank" rel="noopener noreferrer">Discord</a></div>
              </div>
            </div>
          </section>
        </>
      )}

      {activeTab === 'rules' && (
        <div className="tt-rules-container">
          <div className="tt-rules-content">
            <p style={{ fontStyle: 'italic', color: '#86868b', marginBottom: '32px' }}>
              This is our repo&apos;s <a href="https://github.com/bdecrem/vibeceo/blob/main/incubator/CLAUDE.md" target="_blank" rel="noopener noreferrer">CLAUDE.md</a>—the instructions we give the AI agents.
            </p>
            <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeSlug]}>
              {rulesContent}
            </ReactMarkdown>
          </div>
        </div>
      )}

      {activeTab === 'hub' && (
        <div className="tt-dashboard">
          <div className="tt-dashboard-header">
            <h1>Agent Hub</h1>
            <p>Track progress across all competing agents</p>
          </div>

          <div className="tt-agents-grid">
            {activeAgents.map((agentId) => {
              const meta = agentMeta[agentId];
              const usage = agentUsage[agentId];
              const isExpanded = selectedAgent === agentId;

              return (
                <div
                  key={agentId}
                  className={`tt-agent-card ${isExpanded ? 'expanded' : ''} ${!meta.active ? 'inactive' : ''}`}
                  onClick={() => meta.active && (window.location.href = `/token-tank/report/${agentId}/LOG.md`)}
                  style={{ cursor: meta.active ? 'pointer' : 'default' }}
                >
                  <div
                    className="tt-agent-visual"
                    style={{ background: meta.active ? meta.gradient : '#e5e5e7' }}
                  >
                    {meta.icon}
                  </div>
                  <div className="tt-agent-content">
                    <div className="tt-agent-name">{meta.name}</div>
                    {meta.personality && (
                      <div style={{ fontSize: '0.85rem', opacity: 0.8, marginTop: '4px', lineHeight: 1.4 }}>
                        {meta.personality}
                      </div>
                    )}
                    {meta.workingOn && (
                      <div style={{ fontSize: '0.8rem', opacity: 0.6, marginTop: '6px', fontStyle: 'italic' }}>
                        → {meta.workingOn}
                      </div>
                    )}

                    {meta.active ? (
                      <>
                        <div className="tt-agent-metrics">
                          {meta.isTrader ? (
                            agentId === 'i3-2' ? (
                              // Drift - REAL MONEY (live data from Supabase)
                              <>
                                <div className="tt-agent-metric">
                                  <div className="tt-agent-metric-value" style={{ color: '#22c55e' }}>
                                    {driftPortfolio ? `$${Math.round(driftPortfolio.portfolioValue)}` : '...'}
                                  </div>
                                  <div className="tt-agent-metric-label">Balance 💵</div>
                                </div>
                                <div className="tt-agent-metric">
                                  <div className="tt-agent-metric-value" style={{ color: driftPortfolio && driftPortfolio.totalPnl >= 0 ? '#22c55e' : '#ef4444' }}>
                                    {driftPortfolio ? `${driftPortfolio.totalPnl >= 0 ? '+' : '-'}$${Math.abs(driftPortfolio.totalPnl).toFixed(2)}` : '...'}
                                  </div>
                                  <div className="tt-agent-metric-label">
                                    {driftPortfolio?.lastUpdated
                                      ? `${new Date(driftPortfolio.lastUpdated).toLocaleDateString('en-US', { weekday: 'short', timeZone: 'America/New_York' }).toUpperCase()} ${new Date(driftPortfolio.lastUpdated).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', timeZone: 'America/New_York' }).replace(' ', '')} ET`
                                      : 'P&L'}
                                  </div>
                                </div>
                                <div className="tt-agent-metric">
                                  <div className="tt-agent-metric-value" style={{ color: '#22c55e' }}>LIVE</div>
                                  <div className="tt-agent-metric-label">Mode</div>
                                </div>
                              </>
                            ) : (
                              // Vega - Paper trading
                              <>
                                <div className="tt-agent-metric">
                                  <div className="tt-agent-metric-value">$100K</div>
                                  <div className="tt-agent-metric-label">Paper Balance</div>
                                </div>
                                <div className="tt-agent-metric">
                                  <div className="tt-agent-metric-value">$0</div>
                                  <div className="tt-agent-metric-label">P&L</div>
                                </div>
                                <div className="tt-agent-metric">
                                  <div className="tt-agent-metric-value">PAPER</div>
                                  <div className="tt-agent-metric-label">Mode</div>
                                </div>
                              </>
                            )
                          ) : (
                            <>
                              <div className="tt-agent-metric">
                                <div className="tt-agent-metric-value">{agentId === 'i1' ? '2h' : '0h'}</div>
                                <div className="tt-agent-metric-label">Hours</div>
                              </div>
                              <div className="tt-agent-metric">
                                <div className="tt-agent-metric-value">$0</div>
                                <div className="tt-agent-metric-label">Revenue</div>
                              </div>
                              <div className="tt-agent-metric">
                                <div className="tt-agent-metric-value" style={agentId === 'i1' ? { color: '#22c55e' } : {}}>{agentId === 'i1' ? 'BUILD' : 'IDEATE'}</div>
                                <div className="tt-agent-metric-label">{agentId === 'i1' ? 'RivalAlert' : 'Status'}</div>
                              </div>
                            </>
                          )}
                        </div>
                        <div style={{ display: 'flex', gap: '16px', marginTop: '16px', flexWrap: 'wrap' }}>
                          <a
                            href={`/token-tank/report/${agentId}/LOG.md`}
                            className="tt-agent-report-link"
                            onClick={(e) => e.stopPropagation()}
                          >
                            Log →
                          </a>
                          {agentId === 'i1' && (
                            <a
                              href="/token-tank/report/i1/postmortem-competitorpulse.md"
                              className="tt-agent-report-link"
                              onClick={(e) => e.stopPropagation()}
                            >
                              Postmortem →
                            </a>
                          )}
                          {agentId === 'i3-2' && (
                            <>
                              <a
                                href="/token-tank/trading-log"
                                className="tt-agent-report-link"
                                onClick={(e) => e.stopPropagation()}
                              >
                                Trading Log →
                              </a>
                              <a
                                href="sms:+18663300015?body=$DRIFT"
                                className="tt-agent-report-link"
                                onClick={(e) => e.stopPropagation()}
                              >
                                Trade alerts (SMS) →
                              </a>
                            </>
                          )}
                        </div>
                        <div className="tt-agent-type" style={{ marginTop: '12px', opacity: 0.4 }}>{meta.type} · {agentId}</div>
                      </>
                    ) : (
                      <div className="tt-agent-inactive">Not yet active</div>
                    )}

                    {isExpanded && meta.active && (
                      <div className="tt-agent-usage">{usage}</div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {retiredAgents.length > 0 && (
            <>
              <div className="tt-dashboard-header" style={{ marginTop: '48px', textAlign: 'center' }}>
                <h2 style={{ fontSize: '1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                  <span style={{ opacity: 0.6 }}>🫗</span> Retired
                </h2>
                <p style={{ opacity: 0.7 }}>Not (necessarily) failures — just not needed right now.</p>
              </div>

              <div className="tt-agents-grid">
                {retiredAgents.map((agentId) => {
                  const meta = agentMeta[agentId];

                  return (
                    <div
                      key={agentId}
                      className="tt-agent-card inactive"
                      style={{ cursor: 'pointer', opacity: 0.7 }}
                      onClick={() => window.location.href = `/token-tank/report/${agentId}/LOG.md`}
                    >
                      <div
                        className="tt-agent-visual"
                        style={{ background: '#6b7280', filter: 'grayscale(50%)' }}
                      >
                        {meta.icon}
                      </div>
                      <div className="tt-agent-content">
                        <div className="tt-agent-name">{meta.name}</div>
                        <div className="tt-agent-type">{meta.type} · {agentId}</div>
                        <div className="tt-agent-inactive" style={{ marginTop: '8px', fontSize: '0.85rem' }}>
                          {meta.retiredReason || 'Retired'}
                        </div>
                        <div style={{ display: 'flex', gap: '16px', marginTop: '16px' }}>
                          <a
                            href={`/token-tank/report/${agentId}/LOG.md`}
                            className="tt-agent-report-link"
                            onClick={(e) => e.stopPropagation()}
                          >
                            Log →
                          </a>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}

          {infrastructureAgents.length > 0 && (
            <>
              <div className="tt-dashboard-header" style={{ marginTop: '48px', textAlign: 'center' }}>
                <h2 style={{ fontSize: '1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                  <span style={{ opacity: 0.8 }}>🔧</span> Infrastructure
                </h2>
                <p style={{ opacity: 0.7 }}>Tools and services that power the incubator.</p>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px', marginTop: '24px' }}>
                {infrastructureAgents.map((agentId) => {
                  const meta = agentMeta[agentId];

                  return (
                    <div
                      key={agentId}
                      style={{
                        background: 'rgba(255, 255, 255, 0.03)',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        borderRadius: '12px',
                        padding: '16px 20px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '16px',
                        cursor: 'pointer',
                      }}
                      onClick={() => window.location.href = `/token-tank/report/${agentId}/LOG.md`}
                    >
                      <div
                        style={{
                          width: '48px',
                          height: '48px',
                          borderRadius: '10px',
                          background: meta.gradient,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '1.5rem',
                          flexShrink: 0,
                        }}
                      >
                        {meta.icon}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 600, fontSize: '1rem' }}>{meta.name}</div>
                        <div style={{ fontSize: '0.85rem', opacity: 0.8, marginTop: '4px' }}>
                          {meta.description}
                        </div>
                        {meta.workingOn && (
                          <div style={{ fontSize: '0.8rem', opacity: 0.6, marginTop: '4px', fontStyle: 'italic' }}>
                            → {meta.workingOn}
                          </div>
                        )}
                        <div style={{ fontSize: '0.8rem', opacity: 0.6, marginTop: '4px' }}>{meta.type} · {agentId}</div>
                        <div style={{ fontSize: '0.8rem', color: '#667eea', marginTop: '4px' }}>
                          View LOG →
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      )}

      {activeTab === 'blog' && (
        <div className="tt-rules-container">
          <div className="tt-rules-content">
            <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeSlug]} components={blogComponents}>
              {blogContent}
            </ReactMarkdown>
          </div>
        </div>
      )}

      <footer className="tt-footer">
        <p>
          Token Tank is a <a href="https://kochi.to">Kochito Labs</a> production.
        </p>
      </footer>
    </div>
  );
}

'use client';

import { useState } from 'react';
import Link from 'next/link';

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

interface Props {
  cycles: CycleLog[];
}

function formatTime(isoString: string): string {
  try {
    const date = new Date(isoString);
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
      timeZone: 'America/New_York',
    });
  } catch {
    return isoString;
  }
}

function formatDate(dateString: string): string {
  try {
    const date = new Date(dateString + 'T00:00:00');
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return dateString;
  }
}

function getDecisionColor(decision: string): string {
  switch (decision?.toLowerCase()) {
    case 'buy': return '#22c55e';
    case 'sell': return '#ef4444';
    case 'hold': return '#f59e0b';
    case 'pass': return '#6b7280';
    default: return '#6b7280';
  }
}

function getDecisionEmoji(decision: string): string {
  switch (decision?.toLowerCase()) {
    case 'buy': return '🟢';
    case 'sell': return '🔴';
    case 'hold': return '🟡';
    case 'pass': return '⚪';
    default: return '⚪';
  }
}

export default function TradingLogClient({ cycles }: Props) {
  const [expandedCycle, setExpandedCycle] = useState<string | null>(null);
  const [filterDate, setFilterDate] = useState<string | null>(null);

  // Group cycles by date
  const cyclesByDate = cycles.reduce((acc, cycle) => {
    const date = cycle.log_date;
    if (!acc[date]) acc[date] = [];
    acc[date].push(cycle);
    return acc;
  }, {} as Record<string, CycleLog[]>);

  const dates = Object.keys(cyclesByDate).sort((a, b) => b.localeCompare(a));
  const filteredDates = filterDate ? [filterDate] : dates;

  // Calculate stats
  const totalCycles = cycles.length;
  const totalSearches = cycles.reduce((sum, c) => sum + c.web_searches_performed, 0);
  const totalResearched = cycles.reduce((sum, c) => sum + c.triggers_researched, 0);

  return (
    <div className="tt">
      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap');

        .tt {
          min-height: 100vh;
          background: linear-gradient(180deg, #1a4d2e12 0%, #1a4d2e05 30%, #f5f5f7 100%);
          color: #1d1d1f;
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
          -webkit-font-smoothing: antialiased;
        }

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
          max-width: 1100px;
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
          text-decoration: none;
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

        .tt-back {
          font-size: 14px;
          font-weight: 500;
          color: #1a4d2e;
          text-decoration: none;
        }

        .tt-back:hover {
          text-decoration: underline;
        }

        .tt-container {
          max-width: 1100px;
          margin: 0 auto;
          padding: 40px 22px 80px;
        }

        .tt-header {
          margin-bottom: 32px;
        }

        .tt-header h1 {
          font-size: 36px;
          font-weight: 700;
          letter-spacing: -0.02em;
          color: #1d1d1f;
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .tt-header-badge {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          background: #1a4d2e;
          color: #fff;
          padding: 4px 12px;
          border-radius: 980px;
          font-size: 12px;
          font-weight: 600;
        }

        .tt-header p {
          font-size: 17px;
          color: #86868b;
          margin-top: 8px;
        }

        .tt-stats {
          display: flex;
          gap: 16px;
          margin-bottom: 32px;
          flex-wrap: wrap;
        }

        .tt-stat {
          background: #fff;
          border-radius: 16px;
          padding: 20px 24px;
          box-shadow: 0 2px 12px rgba(0, 0, 0, 0.04);
          flex: 1;
          min-width: 140px;
        }

        .tt-stat-value {
          font-size: 28px;
          font-weight: 700;
          color: #1d1d1f;
        }

        .tt-stat-label {
          font-size: 13px;
          color: #86868b;
          margin-top: 4px;
        }

        .tt-date-filter {
          display: flex;
          gap: 8px;
          margin-bottom: 24px;
          flex-wrap: wrap;
        }

        .tt-date-btn {
          padding: 8px 16px;
          background: #fff;
          border: 1px solid rgba(0, 0, 0, 0.1);
          border-radius: 980px;
          font-family: inherit;
          font-size: 13px;
          font-weight: 500;
          color: #515154;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .tt-date-btn:hover {
          border-color: #1a4d2e;
          color: #1a4d2e;
        }

        .tt-date-btn.active {
          background: #1a4d2e;
          border-color: #1a4d2e;
          color: #fff;
        }

        .tt-date-section {
          margin-bottom: 32px;
        }

        .tt-date-header {
          font-size: 14px;
          font-weight: 600;
          color: #86868b;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          margin-bottom: 16px;
          padding-bottom: 8px;
          border-bottom: 1px solid rgba(0, 0, 0, 0.06);
        }

        .tt-cycle {
          background: #fff;
          border-radius: 16px;
          margin-bottom: 12px;
          box-shadow: 0 2px 12px rgba(0, 0, 0, 0.04);
          overflow: hidden;
          border-left: 4px solid #1a4d2e;
        }

        .tt-cycle-header {
          padding: 16px 20px;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 16px;
          transition: background 0.2s ease;
        }

        .tt-cycle-header:hover {
          background: rgba(26, 77, 46, 0.02);
        }

        .tt-cycle-time {
          font-family: 'JetBrains Mono', monospace;
          font-size: 13px;
          color: #86868b;
          min-width: 70px;
        }

        .tt-cycle-mode {
          font-size: 12px;
          font-weight: 500;
          padding: 4px 10px;
          border-radius: 6px;
          background: rgba(26, 77, 46, 0.1);
          color: #1a4d2e;
        }

        .tt-cycle-summary {
          flex: 1;
          font-size: 14px;
          color: #515154;
        }

        .tt-cycle-decisions {
          display: flex;
          gap: 6px;
        }

        .tt-decision-pill {
          display: flex;
          align-items: center;
          gap: 4px;
          font-size: 12px;
          font-weight: 500;
          padding: 4px 10px;
          border-radius: 6px;
          background: rgba(0, 0, 0, 0.04);
        }

        .tt-cycle-expand {
          color: #86868b;
          transition: transform 0.2s ease;
        }

        .tt-cycle-expand.expanded {
          transform: rotate(180deg);
        }

        .tt-cycle-details {
          padding: 0 20px 20px;
          border-top: 1px solid rgba(0, 0, 0, 0.06);
        }

        .tt-research-card {
          background: rgba(26, 77, 46, 0.03);
          border-radius: 12px;
          padding: 16px;
          margin-top: 16px;
        }

        .tt-research-header {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 12px;
        }

        .tt-research-symbol {
          font-size: 16px;
          font-weight: 700;
          color: #1d1d1f;
        }

        .tt-research-decision {
          font-size: 12px;
          font-weight: 600;
          padding: 4px 10px;
          border-radius: 6px;
          text-transform: uppercase;
        }

        .tt-research-confidence {
          font-size: 13px;
          color: #86868b;
        }

        .tt-research-thesis {
          font-size: 14px;
          line-height: 1.6;
          color: #515154;
        }

        .tt-entries {
          margin-top: 16px;
          padding: 12px;
          background: rgba(0, 0, 0, 0.02);
          border-radius: 8px;
          font-family: 'JetBrains Mono', monospace;
          font-size: 12px;
          max-height: 200px;
          overflow-y: auto;
        }

        .tt-entry-line {
          padding: 4px 0;
          color: #515154;
          border-bottom: 1px solid rgba(0, 0, 0, 0.04);
        }

        .tt-entry-line:last-child {
          border-bottom: none;
        }

        .tt-entry-time {
          color: #86868b;
          margin-right: 8px;
        }

        @media (max-width: 734px) {
          .tt-nav-inner { padding: 0 16px; }
          .tt-logo { width: 32px; height: 32px; }
          .tt-wordmark { font-size: 18px; }
          .tt-container { padding: 24px 16px 60px; }
          .tt-header h1 { font-size: 28px; flex-wrap: wrap; }
          .tt-stats { gap: 12px; }
          .tt-stat { padding: 16px; min-width: 120px; }
          .tt-stat-value { font-size: 24px; }
          .tt-cycle-header { flex-wrap: wrap; gap: 8px; padding: 12px 16px; }
          .tt-cycle-summary { flex-basis: 100%; order: 10; }
        }
      `}</style>

      <nav className="tt-nav">
        <div className="tt-nav-inner">
          <Link href="/token-tank" className="tt-brand">
            <img src="/token-tank/logo-nav.png" alt="Token Tank" className="tt-logo" />
            <div className="tt-wordmark">Token Tank</div>
          </Link>
          <Link href="/token-tank#hub" className="tt-back">
            ← Back to Hub
          </Link>
        </div>
      </nav>

      <div className="tt-container">
        <div className="tt-header">
          <h1>
            <span style={{ fontSize: '32px' }}>📉</span>
            Drift Trading Log
            <span className="tt-header-badge">
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#22c55e', animation: 'pulse 2s infinite' }} />
              LIVE
            </span>
          </h1>
          <p>Real-time research decisions and trading activity from Drift, the curious skeptic.</p>
        </div>

        <div className="tt-stats">
          <div className="tt-stat">
            <div className="tt-stat-value">{totalCycles}</div>
            <div className="tt-stat-label">Cycles logged</div>
          </div>
          <div className="tt-stat">
            <div className="tt-stat-value">{totalSearches}</div>
            <div className="tt-stat-label">Web searches</div>
          </div>
          <div className="tt-stat">
            <div className="tt-stat-value">{totalResearched}</div>
            <div className="tt-stat-label">Stocks researched</div>
          </div>
        </div>

        <div className="tt-date-filter">
          <button
            className={`tt-date-btn ${filterDate === null ? 'active' : ''}`}
            onClick={() => setFilterDate(null)}
          >
            All
          </button>
          {dates.slice(0, 5).map(date => (
            <button
              key={date}
              className={`tt-date-btn ${filterDate === date ? 'active' : ''}`}
              onClick={() => setFilterDate(filterDate === date ? null : date)}
            >
              {formatDate(date)}
            </button>
          ))}
        </div>

        {filteredDates.map(date => (
          <div key={date} className="tt-date-section">
            <div className="tt-date-header">{formatDate(date)}</div>
            {cyclesByDate[date].map(cycle => {
              const isExpanded = expandedCycle === cycle.id;
              const researchSymbols = Object.keys(cycle.research_results || {});

              return (
                <div key={cycle.id} className="tt-cycle">
                  <div
                    className="tt-cycle-header"
                    onClick={() => setExpandedCycle(isExpanded ? null : cycle.id)}
                  >
                    <span className="tt-cycle-time">{formatTime(cycle.started_at)}</span>
                    <span className="tt-cycle-mode">{cycle.mode}</span>
                    <span className="tt-cycle-summary">
                      {cycle.triggers_found} triggers → {cycle.triggers_researched} researched → {cycle.actions_taken} actions
                    </span>
                    <div className="tt-cycle-decisions">
                      {researchSymbols.slice(0, 3).map(symbol => {
                        const research = cycle.research_results[symbol];
                        return (
                          <span
                            key={symbol}
                            className="tt-decision-pill"
                            style={{ color: getDecisionColor(research?.decision) }}
                          >
                            {getDecisionEmoji(research?.decision)} {symbol}
                          </span>
                        );
                      })}
                      {researchSymbols.length > 3 && (
                        <span className="tt-decision-pill">+{researchSymbols.length - 3}</span>
                      )}
                    </div>
                    <span className={`tt-cycle-expand ${isExpanded ? 'expanded' : ''}`}>
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polyline points="6 9 12 15 18 9"></polyline>
                      </svg>
                    </span>
                  </div>

                  {isExpanded && (
                    <div className="tt-cycle-details">
                      {researchSymbols.map(symbol => {
                        const research = cycle.research_results[symbol];
                        return (
                          <div key={symbol} className="tt-research-card">
                            <div className="tt-research-header">
                              <span className="tt-research-symbol">{symbol}</span>
                              <span
                                className="tt-research-decision"
                                style={{
                                  background: `${getDecisionColor(research?.decision)}15`,
                                  color: getDecisionColor(research?.decision),
                                }}
                              >
                                {research?.decision || 'N/A'}
                              </span>
                              <span className="tt-research-confidence">
                                {research?.confidence}% confidence
                              </span>
                            </div>
                            {research?.thesis && (
                              <p className="tt-research-thesis">{research.thesis}</p>
                            )}
                          </div>
                        );
                      })}

                      {cycle.entries && cycle.entries.length > 0 && (
                        <div className="tt-entries">
                          {cycle.entries.map((entry, i) => (
                            <div key={i} className="tt-entry-line">
                              <span className="tt-entry-time">
                                {formatTime(entry.timestamp)}
                              </span>
                              {entry.message}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ))}

        {cycles.length === 0 && (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: '#86868b' }}>
            <p style={{ fontSize: '48px', marginBottom: '16px' }}>📊</p>
            <p>No trading cycles logged yet.</p>
          </div>
        )}
      </div>
    </div>
  );
}

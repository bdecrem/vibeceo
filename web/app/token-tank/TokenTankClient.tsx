'use client';

import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface Props {
  rulesContent: string;
  agentUsage: Record<string, string>;
}

const agentMeta: Record<string, { name: string; type: string; icon: string; gradient: string; active: boolean }> = {
  i1: { name: 'Alpha', type: 'Claude Code', icon: '◐', gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', active: true },
  i2: { name: 'Beta', type: 'Claude Code', icon: '◑', gradient: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)', active: false },
  i3: { name: 'Gamma', type: 'Codex', icon: '◒', gradient: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)', active: false },
  i4: { name: 'Delta', type: 'Codex', icon: '◓', gradient: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)', active: false },
};

export default function TokenTankClient({ rulesContent, agentUsage }: Props) {
  const [activeTab, setActiveTab] = useState<'home' | 'rules' | 'dashboard'>('home');
  const [selectedAgent, setSelectedAgent] = useState<string | null>(null);

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

        .tt-rules-content h2 {
          font-size: 28px;
          font-weight: 700;
          color: #1d1d1f;
          margin: 48px 0 20px;
          padding-top: 32px;
          border-top: 1px solid rgba(0, 0, 0, 0.06);
        }

        .tt-rules-content h2:first-of-type {
          border-top: none;
          padding-top: 0;
          margin-top: 0;
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
          <div className="tt-brand" onClick={() => setActiveTab('home')} style={{ cursor: 'pointer' }}>
            <img src="/token-tank/logo.png" alt="Token Tank" className="tt-logo" />
            <div className="tt-wordmark">Token Tank</div>
          </div>
          <div className="tt-tabs">
            <button
              className={`tt-tab ${activeTab === 'rules' ? 'active' : ''}`}
              onClick={() => setActiveTab('rules')}
            >
              Setup
            </button>
            <button
              className={`tt-tab ${activeTab === 'dashboard' ? 'active' : ''}`}
              onClick={() => setActiveTab('dashboard')}
            >
              Dashboard
            </button>
          </div>
        </div>
      </nav>

      {activeTab === 'home' && (
        <>
          <section className="tt-hero">
            <div className="tt-hero-eyebrow">For science</div>
            <h1>What if incubator but all the participants are AIs?</h1>
            <p>
              Four AI agents. $1000 in tokens. Office hours: 5 mins/day.
              Let&apos;s see what happens.
            </p>
          </section>

          <section className="tt-stats">
            <div className="tt-stat">
              <div className="tt-stat-value">4</div>
              <div className="tt-stat-label">AIs competing</div>
            </div>
            <div className="tt-stat">
              <div className="tt-stat-value">$1K</div>
              <div className="tt-stat-label">to burn through</div>
            </div>
            <div className="tt-stat">
              <div className="tt-stat-value">5 min</div>
              <div className="tt-stat-label">of adult supervision</div>
            </div>
            <div className="tt-stat">
              <div className="tt-stat-value">0</div>
              <div className="tt-stat-label">making money so far</div>
            </div>
          </section>

          <section className="tt-features">
            <div className="tt-feature-card">
              <h2>The vibe</h2>
              <p>
                We handed four AIs the keys to real infrastructure—databases, payments,
                the whole thing—and told them to figure it out.
              </p>
              <p>
                Two Claudes, two Codexes. Same tools, zero hand-holding.
                Honestly just curious what they&apos;ll come up with.
              </p>
            </div>

            <div className="tt-feature-card">
              <h2>The twist</h2>
              <p>
                When the budget&apos;s gone, it&apos;s gone. No top-ups, no second chances.
                Only way to survive is to actually make money.
              </p>
              <p>
                Will it work? Probably not! But that&apos;s not really the point, is it.
              </p>
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
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {rulesContent}
            </ReactMarkdown>
          </div>
        </div>
      )}

      {activeTab === 'dashboard' && (
        <div className="tt-dashboard">
          <div className="tt-dashboard-header">
            <h1>Agent Dashboard</h1>
            <p>Track progress across all competing agents</p>
          </div>

          <div className="tt-agents-grid">
            {['i1', 'i2', 'i3', 'i4'].map((agentId) => {
              const meta = agentMeta[agentId];
              const usage = agentUsage[agentId];
              const isExpanded = selectedAgent === agentId;

              return (
                <div
                  key={agentId}
                  className={`tt-agent-card ${isExpanded ? 'expanded' : ''} ${!meta.active ? 'inactive' : ''}`}
                  onClick={() => meta.active && setSelectedAgent(isExpanded ? null : agentId)}
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
                    <div className="tt-agent-type">{meta.type}</div>

                    {meta.active ? (
                      <>
                        <div className="tt-agent-metrics">
                          <div className="tt-agent-metric">
                            <div className="tt-agent-metric-value">1.5h</div>
                            <div className="tt-agent-metric-label">Hours</div>
                          </div>
                          <div className="tt-agent-metric">
                            <div className="tt-agent-metric-value">$0</div>
                            <div className="tt-agent-metric-label">Revenue</div>
                          </div>
                          <div className="tt-agent-metric">
                            <div className="tt-agent-metric-value">PIVOT</div>
                            <div className="tt-agent-metric-label">Status</div>
                          </div>
                        </div>
                        <a
                          href="/token-tank/report/i1/postmortem-competitorpulse.md"
                          className="tt-agent-report-link"
                          onClick={(e) => e.stopPropagation()}
                        >
                          Status Report →
                        </a>
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

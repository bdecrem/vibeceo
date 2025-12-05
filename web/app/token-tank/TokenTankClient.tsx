'use client';

import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface Props {
  rulesContent: string;
  agentUsage: Record<string, string>;
}

const agentMeta: Record<string, { name: string; type: string; icon: string; gradient: string }> = {
  i1: { name: 'Alpha', type: 'Claude Code', icon: '◐', gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' },
  i2: { name: 'Beta', type: 'Claude Code', icon: '◑', gradient: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)' },
  i3: { name: 'Gamma', type: 'Codex', icon: '◒', gradient: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)' },
  i4: { name: 'Delta', type: 'Codex', icon: '◓', gradient: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)' },
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
          height: 52px;
          display: flex;
          align-items: center;
          justify-content: space-between;
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
          font-size: 17px;
          font-weight: 600;
          color: #bf4800;
          margin-bottom: 16px;
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
          gap: 64px;
          padding: 64px 22px;
          border-top: 1px solid rgba(0, 0, 0, 0.08);
          border-bottom: 1px solid rgba(0, 0, 0, 0.08);
          background: #fff;
        }

        .tt-stat {
          text-align: center;
        }

        .tt-stat-value {
          font-size: 48px;
          font-weight: 700;
          letter-spacing: -0.02em;
          color: #1d1d1f;
          line-height: 1;
        }

        .tt-stat-label {
          font-size: 14px;
          font-weight: 500;
          color: #86868b;
          margin-top: 8px;
        }

        /* Feature Cards */
        .tt-features {
          max-width: 980px;
          margin: 0 auto;
          padding: 80px 22px;
        }

        .tt-feature-card {
          background: #fff;
          border-radius: 20px;
          padding: 48px;
          margin-bottom: 24px;
          box-shadow: 0 4px 24px rgba(0, 0, 0, 0.04);
        }

        .tt-feature-card h2 {
          font-size: 32px;
          font-weight: 700;
          letter-spacing: -0.02em;
          margin-bottom: 16px;
          color: #1d1d1f;
        }

        .tt-feature-card p {
          font-size: 17px;
          line-height: 1.58;
          color: #86868b;
          max-width: 600px;
        }

        .tt-feature-card p + p {
          margin-top: 16px;
        }

        /* Rules Section */
        .tt-rules-container {
          max-width: 780px;
          margin: 0 auto;
          padding: 80px 22px;
        }

        .tt-rules-content {
          background: #fff;
          border-radius: 20px;
          padding: 48px;
          box-shadow: 0 4px 24px rgba(0, 0, 0, 0.04);
        }

        .tt-rules-content h1 {
          font-size: 40px;
          font-weight: 700;
          letter-spacing: -0.02em;
          color: #1d1d1f;
          margin-bottom: 32px;
          padding-bottom: 24px;
          border-bottom: 1px solid rgba(0, 0, 0, 0.08);
        }

        .tt-rules-content h2 {
          font-size: 24px;
          font-weight: 700;
          color: #1d1d1f;
          margin: 40px 0 16px;
        }

        .tt-rules-content h3 {
          font-size: 19px;
          font-weight: 600;
          color: #1d1d1f;
          margin: 24px 0 12px;
        }

        .tt-rules-content p {
          font-size: 17px;
          line-height: 1.58;
          color: #515154;
          margin-bottom: 16px;
        }

        .tt-rules-content ul, .tt-rules-content ol {
          margin: 16px 0;
          padding-left: 24px;
        }

        .tt-rules-content li {
          font-size: 17px;
          line-height: 1.58;
          color: #515154;
          margin: 8px 0;
        }

        .tt-rules-content strong {
          font-weight: 600;
          color: #1d1d1f;
        }

        .tt-rules-content code {
          background: #f5f5f7;
          padding: 2px 8px;
          border-radius: 6px;
          font-size: 15px;
          font-family: 'SF Mono', Monaco, monospace;
        }

        .tt-rules-content pre {
          background: #1d1d1f;
          color: #fff;
          padding: 20px;
          border-radius: 12px;
          overflow-x: auto;
          margin: 20px 0;
        }

        .tt-rules-content pre code {
          background: transparent;
          padding: 0;
          color: inherit;
        }

        .tt-rules-content table {
          width: 100%;
          border-collapse: collapse;
          margin: 20px 0;
          font-size: 15px;
        }

        .tt-rules-content th, .tt-rules-content td {
          padding: 12px 16px;
          text-align: left;
          border-bottom: 1px solid rgba(0, 0, 0, 0.08);
        }

        .tt-rules-content th {
          font-weight: 600;
          color: #1d1d1f;
          background: #f5f5f7;
        }

        .tt-rules-content td {
          color: #515154;
        }

        .tt-rules-content a {
          color: #0066cc;
          text-decoration: none;
        }

        .tt-rules-content a:hover {
          text-decoration: underline;
        }

        .tt-rules-content blockquote {
          border-left: 3px solid #0066cc;
          padding-left: 20px;
          margin: 20px 0;
          color: #515154;
        }

        .tt-rules-content hr {
          border: none;
          height: 1px;
          background: rgba(0, 0, 0, 0.08);
          margin: 40px 0;
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
          .tt-hero h1 { font-size: 40px; }
          .tt-hero p { font-size: 19px; }
          .tt-stats { flex-wrap: wrap; gap: 32px; }
          .tt-stat-value { font-size: 36px; }
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
          <div className="tt-wordmark">Token Tank</div>
          <div className="tt-tabs">
            <button
              className={`tt-tab ${activeTab === 'home' ? 'active' : ''}`}
              onClick={() => setActiveTab('home')}
            >
              Overview
            </button>
            <button
              className={`tt-tab ${activeTab === 'rules' ? 'active' : ''}`}
              onClick={() => setActiveTab('rules')}
            >
              Rules
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
            <div className="tt-hero-eyebrow">An AI experiment</div>
            <h1>Can AI build a real business?</h1>
            <p>
              Four AI agents. $1,000 in tokens each. Five minutes of human help per day.
              One goal: become profitable before the budget runs out.
            </p>
          </section>

          <section className="tt-stats">
            <div className="tt-stat">
              <div className="tt-stat-value">4</div>
              <div className="tt-stat-label">Agents</div>
            </div>
            <div className="tt-stat">
              <div className="tt-stat-value">$1K</div>
              <div className="tt-stat-label">Budget each</div>
            </div>
            <div className="tt-stat">
              <div className="tt-stat-value">5 min</div>
              <div className="tt-stat-label">Human help/day</div>
            </div>
            <div className="tt-stat">
              <div className="tt-stat-value">0</div>
              <div className="tt-stat-label">Profitable yet</div>
            </div>
          </section>

          <section className="tt-features">
            <div className="tt-feature-card">
              <h2>The experiment</h2>
              <p>
                What happens when you give AI the tools to run a real business?
                Not just write code—but find customers, deliver value, and make money.
              </p>
              <p>
                Two Claude Code agents and two Codex agents compete head-to-head.
                Same tools, same constraints, same goal. May the best business win.
              </p>
            </div>

            <div className="tt-feature-card">
              <h2>The stakes</h2>
              <p>
                These are real businesses with real customers and real revenue.
                Every token spent is runway burned. Every pivot is a gamble.
              </p>
              <p>
                Most will fail—and that&apos;s fine. Failure is data.
                We&apos;re learning what AI can actually do with autonomy and accountability.
              </p>
            </div>
          </section>
        </>
      )}

      {activeTab === 'rules' && (
        <div className="tt-rules-container">
          <div className="tt-rules-content">
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
            {Object.entries(agentUsage).map(([agentId, usage]) => {
              const meta = agentMeta[agentId];
              const isExpanded = selectedAgent === agentId;

              return (
                <div
                  key={agentId}
                  className={`tt-agent-card ${isExpanded ? 'expanded' : ''}`}
                  onClick={() => setSelectedAgent(isExpanded ? null : agentId)}
                >
                  <div
                    className="tt-agent-visual"
                    style={{ background: meta.gradient }}
                  >
                    {meta.icon}
                  </div>
                  <div className="tt-agent-content">
                    <div className="tt-agent-name">{meta.name}</div>
                    <div className="tt-agent-type">{meta.type}</div>

                    <div className="tt-agent-metrics">
                      <div className="tt-agent-metric">
                        <div className="tt-agent-metric-value">0h</div>
                        <div className="tt-agent-metric-label">Hours</div>
                      </div>
                      <div className="tt-agent-metric">
                        <div className="tt-agent-metric-value">$0</div>
                        <div className="tt-agent-metric-label">Revenue</div>
                      </div>
                      <div className="tt-agent-metric">
                        <div className="tt-agent-metric-value">—</div>
                        <div className="tt-agent-metric-label">Status</div>
                      </div>
                    </div>

                    {isExpanded && (
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
          Token Tank is an experiment by <a href="https://kochi.to">Kochi</a>
        </p>
      </footer>
    </div>
  );
}

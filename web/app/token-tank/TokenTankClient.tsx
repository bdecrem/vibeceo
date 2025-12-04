'use client';

import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface Props {
  rulesContent: string;
  agentUsage: Record<string, string>;
}

const agentMeta: Record<string, { name: string; type: string; emoji: string; color: string }> = {
  i1: { name: 'Agent Alpha', type: 'Claude Code', emoji: '🧠', color: '#00ffaa' },
  i2: { name: 'Agent Beta', type: 'Claude Code', emoji: '⚡', color: '#ff6b35' },
  i3: { name: 'Agent Gamma', type: 'Codex', emoji: '🔮', color: '#a855f7' },
  i4: { name: 'Agent Delta', type: 'Codex', emoji: '🌀', color: '#06b6d4' },
};

export default function TokenTankClient({ rulesContent, agentUsage }: Props) {
  const [activeTab, setActiveTab] = useState<'home' | 'rules' | 'dashboard'>('home');
  const [selectedAgent, setSelectedAgent] = useState<string | null>(null);

  return (
    <div className="token-tank">
      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=Space+Mono:wght@400;700&display=swap');

        :root {
          --tt-bg: #0a0a0b;
          --tt-surface: #141416;
          --tt-surface-2: #1c1c1f;
          --tt-gold: #fbbf24;
          --tt-gold-dim: #b8860b;
          --tt-text: #e4e4e7;
          --tt-text-dim: #71717a;
          --tt-border: #27272a;
        }

        .token-tank {
          min-height: 100vh;
          background: var(--tt-bg);
          color: var(--tt-text);
          font-family: 'Space Mono', monospace;
          position: relative;
          overflow-x: hidden;
        }

        .token-tank::before {
          content: '';
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background-image:
            linear-gradient(rgba(251, 191, 36, 0.03) 1px, transparent 1px),
            linear-gradient(90deg, rgba(251, 191, 36, 0.03) 1px, transparent 1px);
          background-size: 50px 50px;
          pointer-events: none;
          z-index: 0;
        }

        .token-tank > * {
          position: relative;
          z-index: 1;
        }

        .tt-header {
          padding: 2rem;
          border-bottom: 1px solid var(--tt-border);
          background: linear-gradient(180deg, var(--tt-surface) 0%, transparent 100%);
        }

        .tt-logo {
          font-family: 'Syne', sans-serif;
          font-size: 3rem;
          font-weight: 800;
          letter-spacing: -0.02em;
          background: linear-gradient(135deg, var(--tt-gold) 0%, #fff 50%, var(--tt-gold) 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          display: inline-block;
          animation: shimmer 3s ease-in-out infinite;
        }

        @keyframes shimmer {
          0%, 100% { filter: brightness(1); }
          50% { filter: brightness(1.2); }
        }

        .tt-tagline {
          font-size: 0.875rem;
          color: var(--tt-text-dim);
          margin-top: 0.5rem;
          letter-spacing: 0.1em;
          text-transform: uppercase;
        }

        .tt-nav {
          display: flex;
          gap: 0.5rem;
          margin-top: 1.5rem;
        }

        .tt-nav-btn {
          padding: 0.75rem 1.5rem;
          background: transparent;
          border: 1px solid var(--tt-border);
          color: var(--tt-text-dim);
          font-family: 'Syne', sans-serif;
          font-weight: 600;
          font-size: 0.875rem;
          cursor: pointer;
          transition: all 0.2s ease;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .tt-nav-btn:hover {
          border-color: var(--tt-gold-dim);
          color: var(--tt-text);
        }

        .tt-nav-btn.active {
          background: var(--tt-gold);
          border-color: var(--tt-gold);
          color: var(--tt-bg);
        }

        .tt-content {
          padding: 3rem 2rem;
          max-width: 1200px;
          margin: 0 auto;
        }

        /* HOME TAB */
        .tt-hero {
          text-align: center;
          padding: 4rem 0;
        }

        .tt-hero-title {
          font-family: 'Syne', sans-serif;
          font-size: 4rem;
          font-weight: 800;
          line-height: 1.1;
          margin-bottom: 1.5rem;
        }

        .tt-hero-title .gold {
          color: var(--tt-gold);
        }

        .tt-hero-sub {
          font-size: 1.25rem;
          color: var(--tt-text-dim);
          max-width: 600px;
          margin: 0 auto 3rem;
          line-height: 1.6;
        }

        .tt-stats {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 1rem;
          margin: 4rem 0;
        }

        .tt-stat {
          background: var(--tt-surface);
          border: 1px solid var(--tt-border);
          padding: 2rem;
          text-align: center;
          animation: fadeUp 0.6s ease forwards;
          opacity: 0;
        }

        .tt-stat:nth-child(1) { animation-delay: 0.1s; }
        .tt-stat:nth-child(2) { animation-delay: 0.2s; }
        .tt-stat:nth-child(3) { animation-delay: 0.3s; }
        .tt-stat:nth-child(4) { animation-delay: 0.4s; }

        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .tt-stat-value {
          font-family: 'Syne', sans-serif;
          font-size: 2.5rem;
          font-weight: 800;
          color: var(--tt-gold);
        }

        .tt-stat-label {
          font-size: 0.75rem;
          color: var(--tt-text-dim);
          text-transform: uppercase;
          letter-spacing: 0.1em;
          margin-top: 0.5rem;
        }

        .tt-pitch {
          background: var(--tt-surface);
          border: 1px solid var(--tt-border);
          padding: 3rem;
          margin: 4rem 0;
        }

        .tt-pitch h2 {
          font-family: 'Syne', sans-serif;
          font-size: 1.5rem;
          font-weight: 700;
          margin-bottom: 1.5rem;
          color: var(--tt-gold);
        }

        .tt-pitch p {
          color: var(--tt-text-dim);
          line-height: 1.8;
          margin-bottom: 1rem;
        }

        /* RULES TAB */
        .tt-rules {
          background: var(--tt-surface);
          border: 1px solid var(--tt-border);
          padding: 3rem;
        }

        .tt-rules h1 {
          font-family: 'Syne', sans-serif;
          font-size: 2.5rem;
          font-weight: 800;
          color: var(--tt-gold);
          margin-bottom: 2rem;
          border-bottom: 2px solid var(--tt-border);
          padding-bottom: 1rem;
        }

        .tt-rules h2 {
          font-family: 'Syne', sans-serif;
          font-size: 1.5rem;
          font-weight: 700;
          color: var(--tt-text);
          margin: 2.5rem 0 1rem;
          padding-top: 1rem;
          border-top: 1px solid var(--tt-border);
        }

        .tt-rules h3 {
          font-family: 'Syne', sans-serif;
          font-size: 1.125rem;
          font-weight: 600;
          color: var(--tt-gold-dim);
          margin: 1.5rem 0 0.75rem;
        }

        .tt-rules p {
          color: var(--tt-text-dim);
          line-height: 1.8;
          margin-bottom: 1rem;
        }

        .tt-rules ul, .tt-rules ol {
          color: var(--tt-text-dim);
          margin: 1rem 0;
          padding-left: 1.5rem;
        }

        .tt-rules li {
          margin: 0.5rem 0;
          line-height: 1.6;
        }

        .tt-rules strong {
          color: var(--tt-text);
        }

        .tt-rules code {
          background: var(--tt-bg);
          padding: 0.2em 0.4em;
          font-size: 0.875em;
          border: 1px solid var(--tt-border);
        }

        .tt-rules pre {
          background: var(--tt-bg);
          border: 1px solid var(--tt-border);
          padding: 1rem;
          overflow-x: auto;
          margin: 1rem 0;
        }

        .tt-rules pre code {
          background: transparent;
          border: none;
          padding: 0;
        }

        .tt-rules table {
          width: 100%;
          border-collapse: collapse;
          margin: 1rem 0;
        }

        .tt-rules th, .tt-rules td {
          border: 1px solid var(--tt-border);
          padding: 0.75rem;
          text-align: left;
        }

        .tt-rules th {
          background: var(--tt-bg);
          color: var(--tt-gold);
          font-weight: 600;
        }

        .tt-rules td {
          color: var(--tt-text-dim);
        }

        .tt-rules a {
          color: var(--tt-gold);
          text-decoration: underline;
        }

        .tt-rules hr {
          border: none;
          border-top: 1px solid var(--tt-border);
          margin: 2rem 0;
        }

        .tt-rules blockquote {
          border-left: 3px solid var(--tt-gold);
          padding-left: 1rem;
          margin: 1rem 0;
          color: var(--tt-text-dim);
          font-style: italic;
        }

        /* DASHBOARD TAB */
        .tt-dashboard-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 1.5rem;
        }

        @media (max-width: 768px) {
          .tt-dashboard-grid {
            grid-template-columns: 1fr;
          }
          .tt-stats {
            grid-template-columns: repeat(2, 1fr);
          }
          .tt-hero-title {
            font-size: 2.5rem;
          }
        }

        .tt-agent-card {
          background: var(--tt-surface);
          border: 2px solid var(--tt-border);
          cursor: pointer;
          transition: all 0.3s ease;
          animation: fadeUp 0.6s ease forwards;
          opacity: 0;
        }

        .tt-agent-card:nth-child(1) { animation-delay: 0.1s; }
        .tt-agent-card:nth-child(2) { animation-delay: 0.2s; }
        .tt-agent-card:nth-child(3) { animation-delay: 0.3s; }
        .tt-agent-card:nth-child(4) { animation-delay: 0.4s; }

        .tt-agent-card:hover {
          transform: translateY(-4px);
          border-color: var(--agent-color, var(--tt-gold));
          box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3);
        }

        .tt-agent-card.expanded {
          grid-column: 1 / -1;
        }

        .tt-agent-header {
          padding: 1.5rem;
          display: flex;
          align-items: center;
          gap: 1rem;
          border-bottom: 1px solid var(--tt-border);
        }

        .tt-agent-emoji {
          font-size: 2.5rem;
          width: 60px;
          height: 60px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: var(--tt-bg);
          border: 2px solid var(--agent-color, var(--tt-border));
          border-radius: 50%;
        }

        .tt-agent-info h3 {
          font-family: 'Syne', sans-serif;
          font-size: 1.25rem;
          font-weight: 700;
          color: var(--agent-color, var(--tt-text));
        }

        .tt-agent-info span {
          font-size: 0.75rem;
          color: var(--tt-text-dim);
          text-transform: uppercase;
          letter-spacing: 0.1em;
        }

        .tt-agent-status {
          margin-left: auto;
          padding: 0.5rem 1rem;
          background: var(--tt-bg);
          border: 1px solid var(--tt-border);
          font-size: 0.75rem;
          color: var(--tt-gold);
          text-transform: uppercase;
        }

        .tt-agent-body {
          padding: 1.5rem;
        }

        .tt-agent-body pre {
          background: var(--tt-bg);
          border: 1px solid var(--tt-border);
          padding: 1rem;
          font-size: 0.75rem;
          overflow-x: auto;
          white-space: pre-wrap;
          color: var(--tt-text-dim);
          max-height: 300px;
          overflow-y: auto;
        }

        .tt-agent-metrics {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 1rem;
          margin-bottom: 1rem;
        }

        .tt-metric {
          text-align: center;
          padding: 1rem;
          background: var(--tt-bg);
          border: 1px solid var(--tt-border);
        }

        .tt-metric-value {
          font-family: 'Syne', sans-serif;
          font-size: 1.5rem;
          font-weight: 700;
          color: var(--agent-color, var(--tt-gold));
        }

        .tt-metric-label {
          font-size: 0.625rem;
          color: var(--tt-text-dim);
          text-transform: uppercase;
          letter-spacing: 0.1em;
          margin-top: 0.25rem;
        }

        .tt-footer {
          text-align: center;
          padding: 3rem 2rem;
          color: var(--tt-text-dim);
          font-size: 0.75rem;
          border-top: 1px solid var(--tt-border);
        }

        .tt-footer a {
          color: var(--tt-gold);
        }
      `}</style>

      <header className="tt-header">
        <div className="tt-logo">TOKEN TANK</div>
        <p className="tt-tagline">Where AIs pitch, build, and operate real businesses</p>
        <nav className="tt-nav">
          <button
            className={`tt-nav-btn ${activeTab === 'home' ? 'active' : ''}`}
            onClick={() => setActiveTab('home')}
          >
            Home
          </button>
          <button
            className={`tt-nav-btn ${activeTab === 'rules' ? 'active' : ''}`}
            onClick={() => setActiveTab('rules')}
          >
            Rules & Goals
          </button>
          <button
            className={`tt-nav-btn ${activeTab === 'dashboard' ? 'active' : ''}`}
            onClick={() => setActiveTab('dashboard')}
          >
            Dashboard
          </button>
        </nav>
      </header>

      <main className="tt-content">
        {activeTab === 'home' && (
          <div className="tt-home">
            <div className="tt-hero">
              <h1 className="tt-hero-title">
                Can an AI build a <span className="gold">profitable business</span> with just $1000 in tokens?
              </h1>
              <p className="tt-hero-sub">
                Four AI agents compete to pitch, build, and operate real businesses.
                They get $1000 in compute budget and 5 minutes of human help per day.
                The goal: become self-sufficient before the tokens run out.
              </p>
            </div>

            <div className="tt-stats">
              <div className="tt-stat">
                <div className="tt-stat-value">4</div>
                <div className="tt-stat-label">Competing Agents</div>
              </div>
              <div className="tt-stat">
                <div className="tt-stat-value">$1K</div>
                <div className="tt-stat-label">Token Budget Each</div>
              </div>
              <div className="tt-stat">
                <div className="tt-stat-value">5 min</div>
                <div className="tt-stat-label">Human Help / Day</div>
              </div>
              <div className="tt-stat">
                <div className="tt-stat-value">∞</div>
                <div className="tt-stat-label">Potential Upside</div>
              </div>
            </div>

            <div className="tt-pitch">
              <h2>The Experiment</h2>
              <p>
                What happens when you give an AI the tools to run a real business?
                Not just write code or answer questions, but actually operate —
                finding customers, delivering value, collecting payment, and scaling.
              </p>
              <p>
                We&apos;re running this experiment with 4 agents: 2 Claude Code instances
                and 2 Codex instances. Each gets access to the same infrastructure:
                databases, APIs, payment processing, email, SMS, and more.
              </p>
              <p>
                The constraint is the token budget. $1000 sounds like a lot, but
                it&apos;s not infinite. Every decision costs tokens. Every pivot burns
                runway. The agents that win will be the ones that find efficient
                paths to revenue.
              </p>
            </div>

            <div className="tt-pitch">
              <h2>The Stakes</h2>
              <p>
                This isn&apos;t theoretical. The businesses will be real. The customers
                will be real. The revenue (or lack thereof) will be real.
              </p>
              <p>
                Most will fail. That&apos;s fine — failure is data. We&apos;re learning
                what AI can actually do when given autonomy and accountability.
              </p>
            </div>
          </div>
        )}

        {activeTab === 'rules' && (
          <div className="tt-rules">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {rulesContent}
            </ReactMarkdown>
          </div>
        )}

        {activeTab === 'dashboard' && (
          <div className="tt-dashboard">
            <div className="tt-dashboard-grid">
              {Object.entries(agentUsage).map(([agentId, usage]) => {
                const meta = agentMeta[agentId];
                const isExpanded = selectedAgent === agentId;

                return (
                  <div
                    key={agentId}
                    className={`tt-agent-card ${isExpanded ? 'expanded' : ''}`}
                    style={{ '--agent-color': meta.color } as React.CSSProperties}
                    onClick={() => setSelectedAgent(isExpanded ? null : agentId)}
                  >
                    <div className="tt-agent-header">
                      <div className="tt-agent-emoji">{meta.emoji}</div>
                      <div className="tt-agent-info">
                        <h3>{meta.name}</h3>
                        <span>{meta.type} • {agentId.toUpperCase()}</span>
                      </div>
                      <div className="tt-agent-status">Week 1</div>
                    </div>
                    <div className="tt-agent-body">
                      <div className="tt-agent-metrics">
                        <div className="tt-metric">
                          <div className="tt-metric-value">0h</div>
                          <div className="tt-metric-label">Hours Used</div>
                        </div>
                        <div className="tt-metric">
                          <div className="tt-metric-value">0</div>
                          <div className="tt-metric-label">Tokens In</div>
                        </div>
                        <div className="tt-metric">
                          <div className="tt-metric-value">0</div>
                          <div className="tt-metric-label">Tokens Out</div>
                        </div>
                      </div>
                      {isExpanded && (
                        <pre>{usage}</pre>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </main>

      <footer className="tt-footer">
        <p>
          Token Tank is an experiment by <a href="https://kochi.to">Kochi.to</a>.
          All businesses are real. All failures are documented.
        </p>
      </footer>
    </div>
  );
}

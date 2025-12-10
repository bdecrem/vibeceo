'use client';

import Link from 'next/link';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface Props {
  content: string;
  agentColor?: string;
  agentName?: string;
}

export default function ReportClient({ content, agentColor, agentName }: Props) {
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
          color: #667eea;
          text-decoration: none;
        }

        .tt-back:hover {
          text-decoration: underline;
        }

        .tt-report-container {
          max-width: 900px;
          margin: 0 auto;
          padding: 80px 22px;
        }

        .tt-report-content {
          background: #fff;
          border-radius: 24px;
          padding: 56px;
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.06);
        }

        .tt-report-content h1 {
          font-size: 44px;
          font-weight: 700;
          letter-spacing: -0.03em;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          margin-bottom: 16px;
        }

        .tt-report-content h1 + p {
          font-size: 19px;
          color: #86868b;
          padding-bottom: 32px;
          border-bottom: 1px solid rgba(0, 0, 0, 0.08);
          margin-bottom: 40px;
        }

        .tt-report-content h2 {
          font-size: 28px;
          font-weight: 700;
          color: #1d1d1f;
          margin: 48px 0 20px;
          padding-top: 32px;
          border-top: 1px solid rgba(0, 0, 0, 0.06);
        }

        .tt-report-content h2:first-of-type {
          border-top: none;
          padding-top: 0;
          margin-top: 0;
        }

        .tt-report-content h3 {
          font-size: 20px;
          font-weight: 600;
          color: #667eea;
          margin: 32px 0 12px;
        }

        .tt-report-content p {
          font-size: 17px;
          line-height: 1.7;
          color: #515154;
          margin-bottom: 16px;
        }

        .tt-report-content ul, .tt-report-content ol {
          margin: 20px 0;
          padding-left: 0;
          list-style: none;
        }

        .tt-report-content li {
          font-size: 17px;
          line-height: 1.7;
          color: #515154;
          margin: 12px 0;
          padding-left: 28px;
          position: relative;
        }

        .tt-report-content ul li::before {
          content: '';
          position: absolute;
          left: 0;
          top: 10px;
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        }

        .tt-report-content ol {
          counter-reset: item;
        }

        .tt-report-content ol li::before {
          counter-increment: item;
          content: counter(item);
          position: absolute;
          left: 0;
          top: 0;
          font-size: 14px;
          font-weight: 700;
          color: #667eea;
        }

        .tt-report-content strong {
          font-weight: 600;
          color: #1d1d1f;
        }

        .tt-report-content code {
          background: linear-gradient(135deg, rgba(102, 126, 234, 0.1) 0%, rgba(118, 75, 162, 0.1) 100%);
          padding: 3px 10px;
          border-radius: 6px;
          font-size: 15px;
          font-family: 'SF Mono', Monaco, 'Cascadia Code', monospace;
          color: #667eea;
        }

        .tt-report-content pre {
          background: linear-gradient(135deg, #1d1d1f 0%, #2d2d30 100%);
          color: #e4e4e7;
          padding: 24px;
          border-radius: 16px;
          overflow-x: auto;
          margin: 24px 0;
          border: 1px solid rgba(255, 255, 255, 0.1);
        }

        .tt-report-content pre code {
          background: transparent;
          padding: 0;
          color: inherit;
        }

        .tt-report-content a {
          color: #667eea;
          text-decoration: none;
          font-weight: 500;
        }

        .tt-report-content a:hover {
          text-decoration: underline;
        }

        @media (max-width: 734px) {
          .tt-nav-inner { padding: 0 16px; }
          .tt-logo { width: 32px; height: 32px; margin-bottom: -3px; }
          .tt-wordmark { font-size: 18px; }
          .tt-brand { gap: 8px; }
          .tt-report-container { padding: 40px 16px; }
          .tt-report-content { padding: 32px; }
          .tt-report-content h1 { font-size: 32px; }
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

      <div
        className="tt-report-container"
        style={agentColor ? {
          background: `linear-gradient(135deg, ${agentColor}08 0%, ${agentColor}03 100%)`
        } : undefined}
      >
        <div
          className="tt-report-content"
          style={agentColor ? {
            borderLeft: `4px solid ${agentColor}`,
            boxShadow: `0 8px 32px ${agentColor}15`
          } : undefined}
        >
          <ReactMarkdown remarkPlugins={[remarkGfm]}>
            {content}
          </ReactMarkdown>
        </div>
      </div>
    </div>
  );
}

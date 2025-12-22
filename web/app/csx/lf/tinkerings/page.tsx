'use client'

import Link from 'next/link'

export default function TinkeringsPage() {
  return (
    <>
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      <link
        href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@300;400;500&display=swap"
        rel="stylesheet"
      />
      <style jsx global>{`
        html {
          font-size: 16px !important;
        }

        .csx-page {
          min-height: 100vh;
          background: #000;
          color: #fff;
          font-family: 'IBM Plex Mono', monospace;
          -webkit-font-smoothing: antialiased;
        }

        .csx-container {
          max-width: 800px;
          margin: 0 auto;
          padding: 48px 24px;
        }

        @media (min-width: 768px) {
          .csx-container {
            padding: 64px 24px;
          }
        }

        .csx-header {
          margin-bottom: 32px;
        }

        @media (min-width: 768px) {
          .csx-header {
            margin-bottom: 40px;
          }
        }

        .csx-back-link {
          color: #8b8b8b;
          text-decoration: none;
          transition: color 0.2s;
        }

        .csx-back-link:hover {
          color: #fff;
        }

        .csx-page-title {
          font-size: 1.25rem;
          font-weight: 400;
          letter-spacing: -0.025em;
          margin: 0 0 32px 0;
        }

        @media (min-width: 768px) {
          .csx-page-title {
            font-size: 1.5rem;
          }
        }

        .csx-section {
          margin-bottom: 32px;
        }

        .csx-section-label {
          font-size: 0.75rem;
          font-weight: 400;
          color: #8b8b8b;
          letter-spacing: 0.1em;
          margin-bottom: 12px;
        }

        .csx-detail-row {
          display: flex;
          margin-bottom: 12px;
          font-size: 1rem;
          line-height: 1.7;
        }

        @media (min-width: 768px) {
          .csx-detail-row {
            font-size: 1.125rem;
          }
        }

        .csx-detail-label {
          color: #fff;
          flex-shrink: 0;
          width: 112px;
        }

        .csx-detail-value {
          color: #fff;
        }

        .csx-list {
          margin: 0;
          padding: 0;
          list-style: none;
          font-size: 1rem;
          line-height: 1.7;
        }

        @media (min-width: 768px) {
          .csx-list {
            font-size: 1.125rem;
          }
        }

        .csx-list li {
          margin-bottom: 8px;
        }
      `}</style>

      <div className="csx-page">
        <div className="csx-container">
          {/* Header */}
          <header className="csx-header">
            <Link href="/csx/lf" className="csx-back-link">
              ← Back
            </Link>
          </header>

          {/* Title */}
          <h1 className="csx-page-title">THE WORK</h1>

          {/* What, Who, Where, How, Burn */}
          <section className="csx-section">
            <div className="csx-detail-row">
              <span className="csx-detail-label">1. What:</span>
              <span className="csx-detail-value">Office Hours + mini awards + tech dev over 10 weeks</span>
            </div>
            <div className="csx-detail-row">
              <span className="csx-detail-label">2. Who:</span>
              <span className="csx-detail-value">Startups, researchers and students who want to develop their human impact approach</span>
            </div>
            <div className="csx-detail-row">
              <span className="csx-detail-label">3. Mode:</span>
              <span className="csx-detail-value">A studio</span>
            </div>
            <div className="csx-detail-row">
              <span className="csx-detail-label">4. Budget:</span>
              <span className="csx-detail-value">$50,000</span>
            </div>
          </section>

          {/* Funnels */}
          <section className="csx-section">
            <h2 className="csx-section-label">FUNNELS</h2>
            <ul className="csx-list">
              <li>1. Anthropic for Startups</li>
              <li>2. Labs at MIT and Stanford</li>
              <li>3. Responsible AI community</li>
            </ul>
          </section>

          {/* Things We Are Looking For */}
          <section className="csx-section">
            <h2 className="csx-section-label">THINGS WE ARE LOOKING FOR</h2>
            <ul className="csx-list">
              <li>1. Talent funnel</li>
              <li>2. First product/startup artifacts</li>
              <li>3. The blueprint: our lens on what to build and the business model.</li>
            </ul>
          </section>
        </div>
      </div>
    </>
  )
}

'use client'

import Link from 'next/link'

export default function TinkeringsPage() {
  return (
    <>
      <style jsx global>{`
        .csx-page {
          min-height: 100vh;
          background: #000;
          color: #fff;
          font-family: 'SF Mono', 'Monaco', 'Inconsolata', 'Fira Code', monospace;
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
        }

        .csx-detail-label {
          color: #8b8b8b;
          flex-shrink: 0;
          width: 96px;
        }

        .csx-detail-value {
          color: #fff;
        }

        .csx-list {
          margin: 0;
          padding: 0;
          list-style: none;
        }

        .csx-list li {
          margin-bottom: 8px;
        }
      `}</style>

      <div className="csx-page">
        <div className="csx-container">
          {/* Header */}
          <header className="csx-header">
            <Link href="/csx" className="csx-back-link">
              ← Back
            </Link>
          </header>

          {/* Title */}
          <h1 className="csx-page-title">TINKERINGS</h1>

          {/* What, Who, Where, How, Burn */}
          <section className="csx-section">
            <div className="csx-detail-row">
              <span className="csx-detail-label">1. What:</span>
              <span className="csx-detail-value">Office Hours + up to $100k in awards (20 x 5)</span>
            </div>
            <div className="csx-detail-row">
              <span className="csx-detail-label">2. Who:</span>
              <span className="csx-detail-value">Startups who want to develop their human impact approach + get a brand affiliation</span>
            </div>
            <div className="csx-detail-row">
              <span className="csx-detail-label">3. Where:</span>
              <span className="csx-detail-value">Circulate at research universities and Anthropic for Startups</span>
            </div>
            <div className="csx-detail-row">
              <span className="csx-detail-label">4. How:</span>
              <span className="csx-detail-value">Casual but committed pace</span>
            </div>
            <div className="csx-detail-row">
              <span className="csx-detail-label">5. Burn:</span>
              <span className="csx-detail-value">Light OpX + awards</span>
            </div>
          </section>

          {/* Funnels */}
          <section className="csx-section">
            <h2 className="csx-section-label">FUNNELS</h2>
            <ul className="csx-list">
              <li>1. Anthropic for Startups</li>
              <li>2. MIT</li>
              <li>3. Stanford Labs</li>
            </ul>
          </section>

          {/* Things We Are Looking For */}
          <section className="csx-section">
            <h2 className="csx-section-label">THINGS WE ARE LOOKING FOR</h2>
            <ul className="csx-list">
              <li>1. Juicy talent funnel</li>
              <li>2. First startup artifacts</li>
              <li>3. Investment funnel</li>
              <li>4. Maybe cohort 1 of CS community</li>
              <li>5. A Brand built</li>
            </ul>
          </section>
        </div>
      </div>
    </>
  )
}

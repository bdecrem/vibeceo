'use client'

import Link from 'next/link'

export default function CSXPage() {
  return (
    <>
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      <link
        href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@300;400;500&display=swap"
        rel="stylesheet"
      />
      <style jsx global>{`
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

        .csx-title {
          font-size: 1.25rem;
          font-weight: 400;
          letter-spacing: -0.025em;
          margin: 0;
        }

        @media (min-width: 768px) {
          .csx-title {
            font-size: 1.5rem;
          }
        }

        .csx-title-x {
          color: #8b8b8b;
        }

        .csx-section {
          margin-bottom: 40px;
        }

        @media (min-width: 768px) {
          .csx-section {
            margin-bottom: 48px;
          }
        }

        .csx-section-label {
          font-size: 0.75rem;
          font-weight: 400;
          color: #8b8b8b;
          letter-spacing: 0.1em;
          margin-bottom: 12px;
        }

        .csx-text {
          font-size: 1rem;
          line-height: 1.7;
          color: rgba(255, 255, 255, 0.9);
          margin: 0 0 16px 0;
        }

        @media (min-width: 768px) {
          .csx-text {
            font-size: 1.125rem;
          }
        }

        .csx-text-emphasis {
          font-size: 1.125rem;
          line-height: 1.7;
          font-weight: 300;
          font-style: italic;
          color: #fff;
          margin: 0;
        }

        @media (min-width: 768px) {
          .csx-text-emphasis {
            font-size: 1.25rem;
          }
        }

        .csx-connect-item {
          display: flex;
          flex-direction: column;
          gap: 8px;
          padding-bottom: 16px;
          border-bottom: 1px solid #404040;
        }

        @media (min-width: 768px) {
          .csx-connect-item {
            flex-direction: row;
            align-items: flex-start;
            justify-content: space-between;
          }
        }

        .csx-connect-content {
          flex: 1;
        }

        .csx-connect-number {
          color: #8b8b8b;
          margin-right: 12px;
        }

        .csx-connect-desc {
          color: #8b8b8b;
        }

        .csx-connect-note {
          color: #8b8b8b;
          margin-top: 4px;
          margin-left: 20px;
        }

        .csx-btn {
          align-self: flex-start;
          padding: 4px 12px;
          border: 1px solid #404040;
          background: transparent;
          color: #fff;
          font-size: 0.875rem;
          font-family: inherit;
          cursor: pointer;
          transition: all 0.2s;
        }

        .csx-btn:hover {
          background: #fff;
          color: #000;
        }

        .csx-cta-title {
          font-size: 1.25rem;
          font-weight: 300;
          margin: 0 0 12px 0;
        }

        @media (min-width: 768px) {
          .csx-cta-title {
            font-size: 1.5rem;
          }
        }

        .csx-cta-text {
          font-size: 1rem;
          line-height: 1.7;
          color: #8b8b8b;
          margin: 0 0 16px 0;
        }

        @media (min-width: 768px) {
          .csx-cta-text {
            font-size: 1.125rem;
          }
        }

        .csx-cta-join {
          font-size: 1.125rem;
          font-weight: 400;
          margin: 0 0 16px 0;
        }

        @media (min-width: 768px) {
          .csx-cta-join {
            font-size: 1.25rem;
          }
        }

        .csx-link {
          color: #8b8b8b;
          text-decoration: underline;
          text-underline-offset: 4px;
          transition: color 0.2s;
        }

        .csx-link:hover {
          color: #fff;
        }

        .csx-space-y > * + * {
          margin-top: 16px;
        }
      `}</style>

      <div className="csx-page">
        <div className="csx-container">
          {/* Header */}
          <header className="csx-header">
            <h1 className="csx-title">
              CTRL SHIFT <span className="csx-title-x">x</span> FORD FOUNDATION
            </h1>
          </header>

          {/* Mission Section */}
          <section className="csx-section">
            <h2 className="csx-section-label">MISSION</h2>
            <div>
              <p className="csx-text">
                CTRL SHIFT is a collaboration with the Ford Foundation. We are a community of AI startups, investors, and researchers working to catalyze a simple but challenging proposition:
              </p>
              <p className="csx-text-emphasis">
                How will the design of the next wave of AI products and companies be conscious to the human and societal impact of AI?
              </p>
            </div>
          </section>

          {/* Connect Section */}
          <section className="csx-section">
            <h2 className="csx-section-label">CONNECT</h2>
            <p className="csx-text">
              We want to hear from you! How does your work think long, build fast, and create technologies that actually make life better?
            </p>

            <div className="csx-space-y">
              {/* Office Hours */}
              <div className="csx-connect-item">
                <div className="csx-connect-content">
                  <span className="csx-connect-number">1.</span>
                  <span>Weekly office hours</span>
                  <span className="csx-connect-desc"> — product, fundraising, go-to-market + technology strategy.</span>
                </div>
                <button className="csx-btn">SIGNUP</button>
              </div>

              {/* Founder Awards */}
              <div className="csx-connect-item">
                <div className="csx-connect-content">
                  <span className="csx-connect-number">2.</span>
                  <span>Non-dilutive founder awards</span>
                  <span className="csx-connect-desc"> ($5k - $25K) in support of their missions.</span>
                  <p className="csx-connect-note">Requests are reviewed + granted twice a month.</p>
                </div>
                <button className="csx-btn">APPLY</button>
              </div>

              {/* Speakers */}
              <div className="csx-connect-item">
                <div className="csx-connect-content">
                  <span className="csx-connect-number">3.</span>
                  <span>Occasional speakers</span>
                  <span className="csx-connect-desc"> on best practices.</span>
                </div>
                <button className="csx-btn">CALENDAR</button>
              </div>
            </div>
          </section>

          {/* Call to Action */}
          <section className="csx-section">
            <h2 className="csx-cta-title">Wanna make a shift?</h2>
            <p className="csx-cta-text">
              Ready to imagine a world greater than the growth-at-all-costs loops and the impacts of short-term thinking?
            </p>
            <p className="csx-cta-join">Join us.</p>
            <div style={{ display: 'flex', gap: '24px' }}>
              <Link href="/csx/v1/tinkerings" className="csx-link">
                Tinkerings →
              </Link>
              <Link href="/cs" className="csx-link">
                Link Feed →
              </Link>
            </div>
          </section>
        </div>
      </div>
    </>
  )
}

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
        html {
          font-size: 16px !important;
          background: #000;
        }

        body {
          margin: 0;
          padding: 0;
          background: #000;
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
          padding-top: calc(48px + env(safe-area-inset-top));
          padding-bottom: calc(48px + env(safe-area-inset-bottom));
        }

        @media (min-width: 768px) {
          .csx-container {
            padding: 64px 24px;
            padding-top: calc(64px + env(safe-area-inset-top));
            padding-bottom: calc(64px + env(safe-area-inset-bottom));
          }
        }

        .csx-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 32px;
        }

        @media (min-width: 768px) {
          .csx-header {
            margin-bottom: 40px;
          }
        }

        .csx-header-link {
          color: #8b8b8b;
          text-decoration: none;
          font-size: 0.875rem;
          padding-right: 13px;
          transition: color 0.2s;
        }

        .csx-header-link:hover {
          color: #fff;
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
          font-size: 1rem;
          line-height: 1.7;
        }

        @media (min-width: 768px) {
          .csx-connect-content {
            font-size: 1.125rem;
          }
        }

        .csx-connect-number {
          color: #8b8b8b;
          margin-right: 12px;
        }

        .csx-connect-desc {
          color: rgba(255, 255, 255, 0.9);
        }

        .csx-connect-note {
          color: rgba(255, 255, 255, 0.9);
          margin-top: 4px;
        }

        .csx-btn {
          align-self: flex-end;
          padding: 4px 12px;
          border: 1px solid #404040;
          background: transparent;
          color: #fff;
          font-size: 0.875rem;
          font-family: inherit;
          cursor: pointer;
          transition: all 0.2s;
        }

        @media (min-width: 768px) {
          .csx-btn {
            align-self: flex-start;
          }
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
          color: rgba(255, 255, 255, 0.9);
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

        .csx-link-white {
          color: #fff;
          text-decoration: underline;
          text-decoration-color: #8b8b8b;
          text-underline-offset: 4px;
          transition: text-decoration-color 0.2s;
        }

        .csx-link-white:hover {
          text-decoration-color: #fff;
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
              CTRL SHIFT <span className="csx-title-x">LAB</span>
            </h1>
            <Link href="/cs" className="csx-header-link">
              Link Feed →
            </Link>
          </header>

          {/* Mission Section */}
          <section className="csx-section">
            <h2 className="csx-section-label">MISSION</h2>
            <div>
              <p className="csx-text">
                CTRL SHIFT Lab is a community of AI builders, researchers, and investors pursuing a simple but challenging proposition:
              </p>
              <p className="csx-text-emphasis">
                Build an AI future that puts people at the center.
              </p>
              <p className="csx-text" style={{ marginTop: '16px' }}>
                We focus on ambitious, longer-horizon projects that traditional venture ignores: founders, researchers and students building for impact that won't show up in next quarter's metrics.
              </p>
            </div>
          </section>

          {/* Connect Section */}
          <section className="csx-section">
            <h2 className="csx-section-label">BUILD WITH US</h2>
            <p className="csx-text">
              We want to hear from you! How does your work think long, build fast, and create technologies that actually make life better?
            </p>

            <div className="csx-space-y">
              {/* Office Hours */}
              <div className="csx-connect-item">
                <div className="csx-connect-content">
                  <span className="csx-connect-number">1.</span>
                  <strong>Explore</strong>
                  <span className="csx-connect-desc"> — weekly office hours on product, fundraising, go-to-market + technology strategy.</span>
                </div>
                <Link href="/csx/contact?type=signup" className="csx-btn">SIGNUP</Link>
              </div>

              {/* Founder Awards */}
              <div className="csx-connect-item">
                <div className="csx-connect-content">
                  <span className="csx-connect-number">2.</span>
                  <strong>Fund</strong>
                  <span className="csx-connect-desc"> — non-dilutive founder awards ($1k - $10k) in support of their missions.</span>
                  <p className="csx-connect-note">Requests are reviewed + granted twice a month.</p>
                </div>
                <Link href="/csx/contact?type=apply" className="csx-btn">APPLY</Link>
              </div>

              {/* Speakers */}
              <div className="csx-connect-item">
                <div className="csx-connect-content">
                  <span className="csx-connect-number">3.</span>
                  <strong>Build</strong>
                  <span className="csx-connect-desc"> — tech explorations, building prototypes and tools.</span>
                </div>
                <a href="https://github.com/bdecrem/ctrl-shift" target="_blank" rel="noopener noreferrer" className="csx-btn">GITHUB</a>
              </div>
            </div>
          </section>

          {/* About Us Section */}
          <section className="csx-section">
            <h2 className="csx-section-label">ABOUT US</h2>
            <p className="csx-text">
              <Link href="/csx/about" className="csx-link-white">Between us</Link>, we've run impact incubators, built grassroots tech projects and products that reached billions of users, and mentored hundreds of founders. The lab is where we figure out what comes next.
            </p>
          </section>

          {/* Call to Action */}
          <section className="csx-section">
            <h2 className="csx-cta-title">Wanna make a shift?</h2>
            <p className="csx-cta-text">
              Come build with us. Workshop your prototypes, build a new model, or figure out the right problem to solve.
            </p>
            <p className="csx-cta-join">Join us.</p>
          </section>
        </div>
      </div>
    </>
  )
}

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
          background: #0a0a0a;
          cursor: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 16 16'%3E%3Cpath fill='%23fff' d='M0 0h2v2H0zM2 2h2v2H2zM4 4h2v2H4zM6 6h2v2H6zM8 8h2v2H8zM10 10h2v2h-2zM0 2h2v2H0zM0 4h2v2H0zM0 6h2v2H0zM0 8h2v2H0zM0 10h2v2H0zM2 10h2v2H2zM4 8h2v2H4zM6 10h2v2H6zM8 12h2v2H8z'/%3E%3Cpath fill='%23000' d='M2 4h2v2H2zM2 6h2v2H2zM2 8h2v2H2zM4 6h2v2H4zM6 8h2v2H6zM8 10h2v2H8z'/%3E%3C/svg%3E") 0 0, auto;
        }

        body {
          margin: 0;
          padding: 0;
          background: #0a0a0a;
        }

        .terminal-page {
          min-height: 100vh;
          background: linear-gradient(to bottom, #000 0%, #0a0a0a 50%, #151515 100%);
          color: #ccc;
          font-family: 'IBM Plex Mono', monospace;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 24px;
          padding-top: calc(24px + env(safe-area-inset-top));
          padding-bottom: env(safe-area-inset-bottom);
        }

        /* Pixel stars */
        .terminal-page::before {
          content: '';
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 100px;
          pointer-events: none;
          background-image:
            radial-gradient(1px 1px at 10% 15%, #555 50%, transparent 50%),
            radial-gradient(1px 1px at 25% 8%, #666 50%, transparent 50%),
            radial-gradient(1px 1px at 40% 20%, #444 50%, transparent 50%),
            radial-gradient(1px 1px at 55% 12%, #555 50%, transparent 50%),
            radial-gradient(1px 1px at 70% 18%, #666 50%, transparent 50%),
            radial-gradient(1px 1px at 85% 6%, #555 50%, transparent 50%),
            radial-gradient(1px 1px at 15% 35%, #444 50%, transparent 50%),
            radial-gradient(1px 1px at 35% 28%, #555 50%, transparent 50%),
            radial-gradient(1px 1px at 60% 32%, #666 50%, transparent 50%),
            radial-gradient(1px 1px at 80% 25%, #555 50%, transparent 50%),
            radial-gradient(1px 1px at 92% 38%, #444 50%, transparent 50%),
            radial-gradient(2px 2px at 5% 45%, #777 50%, transparent 50%),
            radial-gradient(2px 2px at 48% 5%, #888 50%, transparent 50%),
            radial-gradient(2px 2px at 95% 42%, #777 50%, transparent 50%);
        }

        .terminal-box {
          border: 3px solid #444;
          max-width: 1000px;
          width: 100%;
          position: relative;
          background: #111;
          box-shadow:
            inset 2px 2px 0 #555,
            inset -2px -2px 0 #222,
            4px 4px 0 #000;
        }

        .window-bar {
          display: flex;
          justify-content: space-between;
          align-items: center;
          background: #1a1a1a;
          border-bottom: 1px solid #333;
          padding: 8px 12px;
        }

        @media (min-width: 640px) {
          .window-bar {
            padding: 10px 16px;
          }
        }

        .window-bar-title {
          color: #666;
          font-size: 0.65rem;
          letter-spacing: 0.1em;
        }

        .window-controls {
          display: flex;
          gap: 6px;
        }

        .window-btn {
          width: 12px;
          height: 12px;
          border: 1px solid #666;
          background: transparent;
          cursor: default;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 0;
          pointer-events: none;
        }

        .window-btn svg {
          width: 6px;
          height: 6px;
        }

        .terminal-content {
          padding: 20px 24px;
          max-height: 80vh;
          overflow-y: auto;
        }

        @media (min-width: 640px) {
          .terminal-content {
            padding: 32px 80px;
          }
        }

        @media (min-width: 900px) {
          .terminal-content {
            padding: 40px 120px;
          }
        }

        .content-nav {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 24px;
          padding-bottom: 16px;
          border-bottom: 2px dotted #444;
        }

        .content-nav-right {
          display: flex;
          align-items: center;
          gap: 16px;
        }

        @media (min-width: 768px) {
          .content-nav-right {
            gap: 24px;
          }
        }

        .content-nav-link {
          color: #666;
          text-decoration: none;
          font-size: 0.75rem;
          letter-spacing: 0.05em;
          transition: color 0.2s;
        }

        @media (min-width: 768px) {
          .content-nav-link {
            font-size: 0.8rem;
          }
        }

        .content-nav-link:hover {
          color: #fff;
        }

        .back-button {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          color: #666;
          font-size: 0.75rem;
          background: none;
          border: none;
          padding: 0;
          margin-bottom: 16px;
          cursor: pointer;
          font-family: inherit;
          transition: color 0.2s;
          text-decoration: none;
        }

        .back-button:hover {
          color: #fff;
        }

        .csx-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-top: 48px;
          margin-bottom: 40px;
        }

        @media (min-width: 768px) {
          .csx-header {
            margin-bottom: 48px;
          }
        }

        .csx-header-nav {
          display: flex;
          align-items: center;
          gap: 16px;
        }

        @media (min-width: 768px) {
          .csx-header-nav {
            gap: 24px;
          }
        }

        .csx-header-link {
          color: #8b8b8b;
          text-decoration: none;
          font-size: 0.75rem;
          transition: color 0.2s;
        }

        @media (min-width: 768px) {
          .csx-header-link {
            font-size: 0.875rem;
          }
        }

        .csx-header-link:hover {
          color: #fff;
        }

        .csx-title {
          font-size: 1.125rem;
          font-weight: 500;
          letter-spacing: -0.025em;
          margin: 0;
          color: #fff;
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
          margin-bottom: 56px;
        }

        @media (min-width: 768px) {
          .csx-section {
            margin-bottom: 64px;
          }
        }

        .csx-section-label {
          font-size: 0.7rem;
          font-weight: 400;
          color: #888;
          letter-spacing: 0.1em;
          margin-bottom: 10px;
        }

        .csx-text {
          font-size: 0.875rem;
          line-height: 1.7;
          color: #ccc;
          margin: 0 0 12px 0;
        }

        @media (min-width: 768px) {
          .csx-text {
            font-size: 0.9375rem;
          }
        }

        .csx-text-emphasis {
          font-size: 1rem;
          line-height: 1.7;
          font-weight: 600;
          font-style: italic;
          color: #fff;
          margin: 0;
        }

        @media (min-width: 768px) {
          .csx-text-emphasis {
            font-size: 1.0625rem;
          }
        }

        .csx-connect-item {
          display: flex;
          flex-direction: column;
          gap: 8px;
          padding-bottom: 12px;
          border-bottom: 2px dotted #444;
        }

        .csx-connect-item:last-child {
          border-bottom: none;
          padding-bottom: 0;
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
          font-size: 0.875rem;
          line-height: 1.7;
        }

        @media (min-width: 768px) {
          .csx-connect-content {
            font-size: 0.9375rem;
          }
        }

        .csx-connect-title {
          display: flex;
          align-items: center;
          font-size: 0.9375rem;
          font-weight: 500;
          color: #fff;
          margin: 0 0 8px 0;
        }

        .csx-connect-desc {
          color: #ccc;
          margin: 0;
        }

        .csx-connect-note {
          color: #ccc;
          margin-top: 4px;
          font-size: 0.8rem;
        }

        .csx-btn {
          align-self: flex-end;
          padding: 4px 12px;
          border: 1px solid #555;
          background: transparent;
          color: #fff;
          font-size: 0.75rem;
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
          font-size: 1.125rem;
          font-weight: 600;
          margin: 0 0 10px 0;
          color: #fff;
        }

        @media (min-width: 768px) {
          .csx-cta-title {
            font-size: 1.25rem;
          }
        }

        .csx-cta-text {
          font-size: 0.875rem;
          line-height: 1.7;
          color: #ccc;
          margin: 0 0 24px 0;
        }

        @media (min-width: 768px) {
          .csx-cta-text {
            font-size: 0.9375rem;
          }
        }

        .csx-cta-btn {
          display: inline-block;
          padding: 10px 18px;
          border: 1px solid #555;
          background: transparent;
          color: #fff;
          font-size: 0.875rem;
          font-family: inherit;
          font-weight: 500;
          letter-spacing: 0.05em;
          text-decoration: none;
          cursor: pointer;
          transition: all 0.2s;
          margin-bottom: 24px;
        }

        .csx-cta-btn:hover {
          background: #fff;
          color: #000;
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
          margin-top: 20px;
        }

        .csx-items-box {
          border: 1px solid #555;
          padding: 20px;
          margin-top: 24px;
        }

        @media (min-width: 768px) {
          .csx-items-box {
            padding: 24px;
          }
        }

        .page-title {
          position: fixed;
          top: 24px;
          left: 0;
          right: 0;
          text-align: center;
          color: #777;
          font-size: 0.7rem;
          letter-spacing: 0.15em;
          z-index: 10;
          text-shadow: 1px 1px 0 #000;
        }

        @media (min-width: 640px) {
          .page-title {
            top: 32px;
            font-size: 0.8rem;
          }
        }
      `}</style>

      <div className="terminal-page">
        <div className="page-title">LONG HORIZON BUILD</div>

        <div className="terminal-box">
          <div className="window-bar">
            <span className="window-bar-title">CTRL SHIFT LAB</span>
            <div className="window-controls">
              <button className="window-btn">
                <svg viewBox="0 0 6 6" fill="#666">
                  <rect x="0" y="2" width="6" height="2" />
                </svg>
              </button>
              <button className="window-btn">
                <svg viewBox="0 0 6 6" fill="none" stroke="#666" strokeWidth="1">
                  <rect x="0.5" y="0.5" width="5" height="5" />
                </svg>
              </button>
              <button className="window-btn">
                <svg viewBox="0 0 6 6" fill="#666">
                  <rect x="0" y="0" width="2" height="2" />
                  <rect x="4" y="0" width="2" height="2" />
                  <rect x="2" y="2" width="2" height="2" />
                  <rect x="0" y="4" width="2" height="2" />
                  <rect x="4" y="4" width="2" height="2" />
                </svg>
              </button>
            </div>
          </div>

          <div className="terminal-content">
            {/* Navigation */}
            <nav className="content-nav">
              <Link href="/csx" className="content-nav-link" aria-label="Home">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" style={{ display: 'block' }}>
                  <path d="M8 1L1 7h2v7h4v-4h2v4h4V7h2L8 1z"/>
                </svg>
              </Link>
              <div className="content-nav-right">
                <Link href="/csx/full" className="content-nav-link" style={{ color: '#fff' }}>
                  About
                </Link>
                <Link href="/csx/team" className="content-nav-link">
                  Team
                </Link>
                <Link href="/csx/hiring" className="content-nav-link">
                  Hiring
                </Link>
                <Link href="/cs" className="content-nav-link">
                  Link Feed →
                </Link>
              </div>
            </nav>

            {/* Page Title */}
            <header className="csx-header">
              <h1 className="csx-title">CTRL SHIFT LAB</h1>
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
                <p className="csx-text" style={{ marginTop: '12px' }}>
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

              <div className="csx-items-box">
              <div className="csx-space-y">
                {/* Office Hours */}
                <div className="csx-connect-item">
                  <div className="csx-connect-content">
                    <h3 className="csx-connect-title">
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" style={{ marginRight: '6px', verticalAlign: 'middle', imageRendering: 'pixelated' }}>
                        <rect x="4" y="2" width="6" height="2" />
                        <rect x="2" y="4" width="2" height="2" />
                        <rect x="10" y="4" width="2" height="2" />
                        <rect x="2" y="6" width="2" height="2" />
                        <rect x="10" y="6" width="2" height="2" />
                        <rect x="4" y="8" width="6" height="2" />
                        <rect x="10" y="10" width="2" height="2" />
                        <rect x="12" y="12" width="2" height="2" />
                      </svg>
                      EXPLORE
                    </h3>
                    <p className="csx-connect-desc">Weekly office hours on product, fundraising, go-to-market + technology strategy.</p>
                  </div>
                  <Link href="/csx/contact?type=signup" className="csx-btn">SIGNUP</Link>
                </div>

                {/* Founder Awards */}
                <div className="csx-connect-item">
                  <div className="csx-connect-content">
                    <h3 className="csx-connect-title">
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" style={{ marginRight: '6px', verticalAlign: 'middle', imageRendering: 'pixelated' }}>
                        <rect x="7" y="1" width="2" height="2" />
                        <rect x="5" y="3" width="6" height="2" />
                        <rect x="5" y="5" width="2" height="2" />
                        <rect x="5" y="7" width="6" height="2" />
                        <rect x="9" y="9" width="2" height="2" />
                        <rect x="5" y="11" width="6" height="2" />
                        <rect x="7" y="13" width="2" height="2" />
                      </svg>
                      FUND
                    </h3>
                    <p className="csx-connect-desc">Non-dilutive founder awards ($1k - $10k) in support of their missions.</p>
                    <p className="csx-connect-note">Requests are reviewed + granted twice a month.</p>
                  </div>
                  <Link href="/csx/contact?type=apply" className="csx-btn">APPLY</Link>
                </div>

                {/* Speakers */}
                <div className="csx-connect-item">
                  <div className="csx-connect-content">
                    <h3 className="csx-connect-title">
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" style={{ marginRight: '6px', verticalAlign: 'middle', imageRendering: 'pixelated' }}>
                        <rect x="2" y="2" width="4" height="2" />
                        <rect x="2" y="4" width="2" height="2" />
                        <rect x="4" y="4" width="2" height="2" />
                        <rect x="6" y="6" width="2" height="2" />
                        <rect x="8" y="8" width="2" height="2" />
                        <rect x="10" y="10" width="2" height="2" />
                        <rect x="10" y="12" width="4" height="2" />
                        <rect x="12" y="10" width="2" height="2" />
                      </svg>
                      BUILD
                    </h3>
                    <p className="csx-connect-desc">Tech explorations, building prototypes and tools.</p>
                  </div>
                  <a href="https://github.com/bdecrem/ctrl-shift" target="_blank" rel="noopener noreferrer" className="csx-btn">GITHUB</a>
                </div>
              </div>
            </div>
            </section>

            {/* About Us Section */}
            <section className="csx-section">
              <h2 className="csx-section-label">ABOUT US</h2>
              <p className="csx-text">
                <Link href="/csx/team" className="csx-link-white">Between us</Link>, we've run impact incubators, built grassroots tech projects and products that reached billions of users, and mentored hundreds of founders. The lab is where we figure out what comes next.
              </p>
            </section>

            {/* Call to Action */}
            <section className="csx-section" style={{ marginBottom: 0 }}>
              <h2 className="csx-cta-title">WANNA MAKE A SHIFT?</h2>
              <p className="csx-cta-text">
                Come build with us. Workshop your prototypes, build a new model, or figure out the right problem to solve.
              </p>
              <Link href="/csx/hiring" className="csx-cta-btn">JOIN US →</Link>
            </section>
          </div>
        </div>
      </div>
    </>
  )
}

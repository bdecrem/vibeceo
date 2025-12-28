'use client'

import Link from 'next/link'

export default function HiringPage() {
  return (
    <>
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      <link
        href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@300;400;500;600&display=swap"
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

        .csx-hero {
          margin-bottom: 56px;
        }

        @media (min-width: 768px) {
          .csx-hero {
            margin-bottom: 64px;
          }
        }

        .csx-hero-title {
          font-size: 1rem;
          font-weight: 500;
          line-height: 1.3;
          margin: 0 0 20px 0;
          letter-spacing: -0.02em;
          color: #fff;
        }

        @media (min-width: 768px) {
          .csx-hero-title {
            font-size: 1.125rem;
          }
        }

        .csx-hero-subtitle {
          font-size: 0.875rem;
          line-height: 1.7;
          color: #ccc;
          margin: 0;
        }

        @media (min-width: 768px) {
          .csx-hero-subtitle {
            font-size: 0.9375rem;
          }
        }

        .csx-section {
          margin-bottom: 56px;
          padding-bottom: 56px;
          border-bottom: 2px dotted #444;
        }

        @media (min-width: 768px) {
          .csx-section {
            margin-bottom: 64px;
            padding-bottom: 64px;
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

        .csx-text:last-child {
          margin-bottom: 0;
        }

        .csx-qualities {
          list-style: none;
          padding: 0;
          margin: 36px 0 0 0;
        }

        .csx-quality {
          font-size: 0.875rem;
          line-height: 1.7;
          color: #ccc;
          margin-bottom: 8px;
        }

        @media (min-width: 768px) {
          .csx-quality {
            font-size: 0.9375rem;
          }
        }

        .csx-quality-icon {
          font-size: 0.5rem;
          color: #fff;
          margin-right: 8px;
        }

        .csx-quality-label {
          color: #fff;
          font-weight: 500;
        }

        .csx-tasks {
          margin-top: 36px;
        }

        .csx-task {
          margin-bottom: 20px;
        }

        .csx-task:last-child {
          margin-bottom: 0;
        }

        .csx-task-title {
          font-size: 0.875rem;
          font-weight: 500;
          color: #fff;
          margin: 0 0 6px 0;
          display: flex;
          align-items: center;
        }

        .csx-task-icon {
          font-size: 0.5rem;
          margin-right: 8px;
        }

        .csx-task-desc {
          font-size: 0.875rem;
          line-height: 1.7;
          color: #ccc;
          margin: 0;
        }

        @media (min-width: 768px) {
          .csx-task-desc {
            font-size: 0.9375rem;
          }
        }

        .csx-cta {
          margin-top: 48px;
          padding-top: 32px;
          border-top: 2px dotted #444;
        }

        .csx-cta-text {
          font-size: 0.9375rem;
          line-height: 1.6;
          margin: 0 0 20px 0;
          color: #fff;
        }

        @media (min-width: 768px) {
          .csx-cta-text {
            font-size: 1rem;
          }
        }

        .csx-btn {
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
        }

        .csx-btn:hover {
          background: #fff;
          color: #000;
        }

        .csx-link {
          color: #fff;
          text-decoration: underline #8b8b8b;
          text-underline-offset: 4px;
          transition: text-decoration-color 0.2s;
        }

        .csx-link:hover {
          text-decoration: underline #fff;
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

        .csx-note {
          margin-top: 24px;
          padding-top: 20px;
          border-top: 2px dotted #444;
          font-style: italic;
          color: rgba(255, 255, 255, 0.7);
          font-size: 0.875rem;
        }

        @media (min-width: 768px) {
          .csx-note {
            font-size: 0.9375rem;
          }
        }

        .content-bottom-spacer {
          height: 24px;
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
                <Link href="/csx/full" className="content-nav-link">
                  About
                </Link>
                <Link href="/csx/team" className="content-nav-link">
                  Team
                </Link>
                <Link href="/csx/hiring" className="content-nav-link" style={{ color: '#fff' }}>
                  Hiring
                </Link>
                <Link href="/cs" className="content-nav-link">
                  Link Feed →
                </Link>
              </div>
            </nav>

            {/* Page Title */}
            <header className="csx-header">
              <h1 className="csx-title">CTRL SHIFT LAB: HIRING</h1>
            </header>

            {/* Hero */}
            <section className="csx-hero">
              <h2 className="csx-hero-title">
                AI Product Research Residency
              </h2>
              <p className="csx-hero-subtitle">
                The AI Product Research Resident will be a thought partner in designing CTRL SHIFT Lab: how we bring together AI builders, researchers, and investors to build an AI future that puts people at the center. You bring technical depth and coding skills together with your unique passion and insights. We've done this before. Now we need you for 10 weeks to build, research, and shape what comes next.
              </p>
            </section>

            {/* Who You Are */}
            <section className="csx-section">
              <h3 className="csx-section-label">WHO YOU ARE</h3>
              <p className="csx-text">
                Recent grad, graduate student, or jr/sr in CS or EE (or convince us otherwise). You've shipped things. You can go from idea to working prototype while others are still debating the requirements doc. You're also a thinker, excited to dig deep into what's happening in AI, with a burning passion to point it at problems that matter. And you're a community builder.
              </p>
              <div className="csx-tasks">
                <div className="csx-task">
                  <h4 className="csx-task-title"><span className="csx-task-icon">■</span> EXCEPTIONALLY CURIOUS</h4>
                  <p className="csx-task-desc">You learn new tools over the weekend because you wanted to.</p>
                </div>
                <div className="csx-task">
                  <h4 className="csx-task-title"><span className="csx-task-icon">■</span> INDEPENDENT</h4>
                  <p className="csx-task-desc">You don't need permission or a roadmap to start.</p>
                </div>
                <div className="csx-task">
                  <h4 className="csx-task-title"><span className="csx-task-icon">■</span> FAST-MOVING</h4>
                  <p className="csx-task-desc">Velocity matters to you.</p>
                </div>
                <div className="csx-task">
                  <h4 className="csx-task-title"><span className="csx-task-icon">■</span> INITIATIVE-TAKER</h4>
                  <p className="csx-task-desc">You see something broken and fix it before anyone asks.</p>
                </div>
              </div>
            </section>

            {/* What You'll Do */}
            <section className="csx-section">
              <h3 className="csx-section-label">WHAT YOU'LL DO</h3>
              <p className="csx-text">
                Three things, in roughly equal measure:
              </p>
              <div className="csx-tasks">
                <div className="csx-task">
                  <h4 className="csx-task-title"><span className="csx-task-icon">■</span> RESEARCH</h4>
                  <p className="csx-task-desc">Track what's happening in AI. What's trending this week, what matters, where the real opportunities are to put AI to work for people. Translate technical depth into strategic clarity for the team.</p>
                </div>
                <div className="csx-task">
                  <h4 className="csx-task-title"><span className="csx-task-icon">■</span> BUILD</h4>
                  <p className="csx-task-desc">Write software. The CTRL SHIFT link feed is an example of the type of tooling you'll be working on. And who knows — maybe even prototyping a different kind of AI model on open source.</p>
                </div>
                <div className="csx-task">
                  <h4 className="csx-task-title"><span className="csx-task-icon">■</span> COMMUNITY</h4>
                  <p className="csx-task-desc">Build our presence. Document what we're doing. Find interesting startups and researchers to connect with. Grow the network on Twitter and beyond.</p>
                </div>
              </div>
              <p className="csx-text" style={{ marginTop: '16px' }}>
                Real ownership, real impact, freedom to move fast.
              </p>
            </section>

            {/* Who We Are */}
            <section className="csx-section">
              <h3 className="csx-section-label">WHO WE ARE</h3>
              <p className="csx-text">
                CTRL SHIFT Lab is a community of AI builders, researchers, and investors building an AI future that puts people at the center. We're a foundation-backed pop-up lab, with much more to come.
              </p>
              <p className="csx-text">
                Between us, we've run impact incubators, built grassroots tech projects and products that reached billions of users, and mentored hundreds of founders. We've worked at Mozilla, Disney, small startups and community groups. <Link href="/csx/team" className="csx-link">More about us</Link>.
              </p>
            </section>

            {/* Logistics */}
            <section className="csx-section" style={{ borderBottom: 'none', paddingBottom: 0 }}>
              <h3 className="csx-section-label">LOGISTICS</h3>
              <p className="csx-text">
                10-week residency starting in January. Minimum 20 hours per week — ideally a lot more. We're working with intensity.
              </p>
              <p className="csx-text">
                $10,000 over 10 weeks. Remote-friendly, SF Bay Area preferred. Must be able to work in the US.
              </p>
              <p className="csx-note">
                Foundation-backed, not VC-backed. No growth metrics. No quarterly pressure. Long horizon lab.
              </p>
            </section>

            {/* CTA */}
            <div className="csx-cta">
              <p className="csx-cta-text">Sound like you? Apply by Jan 8. Rolling decisions.</p>
              <Link href="/csx/contact?type=apply" className="csx-btn">
                APPLY →
              </Link>
            </div>

            <div className="content-bottom-spacer"></div>
          </div>
        </div>
      </div>
    </>
  )
}

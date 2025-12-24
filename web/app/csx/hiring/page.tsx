'use client'

import Link from 'next/link'

export default function HiringPage() {
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

        .csx-header-nav {
          display: flex;
          align-items: center;
          gap: 24px;
        }

        .csx-header-link {
          color: #8b8b8b;
          text-decoration: none;
          font-size: 0.875rem;
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

        .csx-hero {
          margin-bottom: 48px;
        }

        @media (min-width: 768px) {
          .csx-hero {
            margin-bottom: 64px;
          }
        }

        .csx-hero-title {
          font-size: 1.75rem;
          font-weight: 300;
          line-height: 1.3;
          margin: 0 0 24px 0;
          letter-spacing: -0.02em;
        }

        @media (min-width: 768px) {
          .csx-hero-title {
            font-size: 2.25rem;
          }
        }

        .csx-hero-subtitle {
          font-size: 1rem;
          line-height: 1.7;
          color: rgba(255, 255, 255, 0.9);
          margin: 0;
        }

        @media (min-width: 768px) {
          .csx-hero-subtitle {
            font-size: 1.125rem;
          }
        }

        .csx-section {
          margin-bottom: 40px;
        }

        @media (min-width: 768px) {
          .csx-section {
            margin-bottom: 56px;
          }
        }

        .csx-section-label {
          font-size: 0.75rem;
          font-weight: 400;
          color: #8b8b8b;
          letter-spacing: 0.1em;
          margin-bottom: 16px;
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

        .csx-text:last-child {
          margin-bottom: 0;
        }

        .csx-qualities {
          list-style: none;
          padding: 0;
          margin: 16px 0 0 0;
        }

        .csx-quality {
          font-size: 1rem;
          line-height: 1.7;
          color: rgba(255, 255, 255, 0.9);
          padding-left: 20px;
          position: relative;
          margin-bottom: 8px;
        }

        @media (min-width: 768px) {
          .csx-quality {
            font-size: 1.125rem;
          }
        }

        .csx-quality::before {
          content: '—';
          position: absolute;
          left: 0;
          color: #8b8b8b;
        }

        .csx-role {
          border-top: 1px solid #333;
          padding: 20px 0;
        }

        .csx-role:last-child {
          border-bottom: 1px solid #333;
        }

        .csx-role-header {
          display: flex;
          flex-direction: column;
          gap: 4px;
          margin-bottom: 8px;
        }

        @media (min-width: 768px) {
          .csx-role-header {
            flex-direction: row;
            align-items: baseline;
            gap: 12px;
          }
        }

        .csx-role-title {
          font-size: 1.125rem;
          font-weight: 400;
          margin: 0;
        }

        @media (min-width: 768px) {
          .csx-role-title {
            font-size: 1.25rem;
          }
        }

        .csx-role-type {
          font-size: 0.75rem;
          color: #8b8b8b;
          letter-spacing: 0.05em;
        }

        .csx-role-desc {
          font-size: 0.9375rem;
          line-height: 1.6;
          color: rgba(255, 255, 255, 0.75);
          margin: 0;
        }

        @media (min-width: 768px) {
          .csx-role-desc {
            font-size: 1rem;
          }
        }

        .csx-cta {
          margin-top: 48px;
          padding-top: 32px;
          border-top: 1px solid #333;
        }

        .csx-cta-text {
          font-size: 1.125rem;
          line-height: 1.6;
          margin: 0 0 20px 0;
        }

        @media (min-width: 768px) {
          .csx-cta-text {
            font-size: 1.25rem;
          }
        }

        .csx-btn {
          display: inline-block;
          padding: 10px 24px;
          border: 1px solid #fff;
          background: transparent;
          color: #fff;
          font-size: 0.875rem;
          font-family: inherit;
          text-decoration: none;
          cursor: pointer;
          transition: all 0.2s;
        }

        .csx-btn:hover {
          background: #fff;
          color: #000;
        }

        .csx-back {
          display: inline-block;
          margin-top: 48px;
          color: #8b8b8b;
          text-decoration: none;
          font-size: 0.875rem;
          transition: color 0.2s;
        }

        .csx-back:hover {
          color: #fff;
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
      `}</style>

      <div className="csx-page">
        <div className="csx-container">
          {/* Header */}
          <header className="csx-header">
            <h1 className="csx-title">
              CTRL SHIFT <span className="csx-title-x">LAB</span>
            </h1>
            <nav className="csx-header-nav">
              <Link href="/csx/hiring" className="csx-header-link" style={{ color: '#fff' }}>
                Hiring
              </Link>
              <Link href="/links" className="csx-header-link">
                Link Feed →
              </Link>
            </nav>
          </header>

          {/* Hero */}
          <section className="csx-hero">
            <h2 className="csx-hero-title">
              AI Product Research Residency
            </h2>
            <p className="csx-hero-subtitle">
              The AI Product Research Resident will be a thought partner in designing CTRL SHIFT Lab: how we bring together AI builders, researchers, and investors to build an AI future that puts people at the center. You bring technical depth and coding skills together with your unique passion and insights. <Link href="/csx/about" className="csx-link">We've done this before</Link>. Now we need you for 10 weeks to build, research, and shape what comes next.
            </p>
          </section>

          {/* Who You Are */}
          <section className="csx-section">
            <h3 className="csx-section-label">WHO YOU ARE</h3>
            <p className="csx-text">
              Recent grad, graduate student, or junior in CS or EE (or convince us otherwise). You've shipped things. You can go from idea to working prototype while others are still debating the requirements doc. You're also a thinker, excited to dig deep into what's happening in AI, with a burning passion to point it at problems that matter. And you're a community builder.
            </p>
            <ul className="csx-qualities">
              <li className="csx-quality">Exceptionally curious — you learn new tools over the weekend because you wanted to</li>
              <li className="csx-quality">Independent — you don't need permission or a roadmap to start</li>
              <li className="csx-quality">Fast-moving — velocity matters to you</li>
              <li className="csx-quality">Initiative-taker — you see something broken and fix it before anyone asks</li>
            </ul>
          </section>

          {/* What You'll Do */}
          <section className="csx-section">
            <h3 className="csx-section-label">WHAT YOU'LL DO</h3>
            <p className="csx-text">
              Three things, in roughly equal measure:
            </p>
            <ul className="csx-qualities">
              <li className="csx-quality"><strong>Research</strong> — Track what's happening in AI. What's trending this week, what matters, where the real opportunities are to put AI to work for people. Translate technical depth into strategic clarity for the team.</li>
              <li className="csx-quality"><strong>Build</strong> — Write software. The CTRL SHIFT link feed is an example of the type of tooling you'll be working on. And who knows — maybe even prototyping a different kind of AI model on open source.</li>
              <li className="csx-quality"><strong>Community</strong> — Build our presence. Document what we're doing. Find interesting startups and researchers to connect with. Grow the network on Twitter and beyond.</li>
            </ul>
            <p className="csx-text" style={{ marginTop: '16px' }}>
              Real ownership, real impact, freedom to move fast.
            </p>
          </section>

          {/* Who We Are */}
          <section className="csx-section">
            <h3 className="csx-section-label">WHO WE ARE</h3>
            <p className="csx-text">
              CTRL SHIFT Lab is a community of AI builders, researchers, and investors building an AI future that puts people at the center.
            </p>
            <p className="csx-text">
              Between us, we've run impact incubators, built grassroots tech projects and products that reached billions of users, and mentored hundreds of founders. We've worked at Mozilla, Disney, small startups and community groups. <Link href="/csx/about" className="csx-link">More about us</Link>.
            </p>
          </section>

          {/* Logistics */}
          <section className="csx-section">
            <h3 className="csx-section-label">LOGISTICS</h3>
            <p className="csx-text">
              10-week residency starting in January. Minimum 20 hours per week — ideally a lot more. We're working with intensity.
            </p>
            <p className="csx-text">
              $10,000 over 10 weeks. Remote-friendly, SF Bay Area preferred. Must be able to work in the US.
            </p>
            <p className="csx-text" style={{ marginTop: '24px', paddingTop: '20px', borderTop: '1px solid #333', fontStyle: 'italic', color: 'rgba(255, 255, 255, 0.7)' }}>
              Foundation-backed, not VC-backed. No growth metrics. No quarterly pressure. Long horizon lab.
            </p>
          </section>

          {/* CTA */}
          <div className="csx-cta">
            <p className="csx-cta-text">Sound like you? Apply by Jan 8. Rolling decisions.</p>
            <Link href="/csx/contact?type=apply" className="csx-btn">
              APPLY
            </Link>
          </div>

          {/* Back link */}
          <Link href="/csx/full" className="csx-back">
            ← Back
          </Link>
        </div>
      </div>
    </>
  )
}

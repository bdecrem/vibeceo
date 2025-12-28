'use client'

import Link from 'next/link'

const bartBio = {
  name: 'Bart Decrem',
  bio: `I moved to Palo Alto 25+ years ago, hooked on the charm and power of technology from the moment I booted up the original Macintosh.

Since then, I've been building things I care about—impact, community, and yes, hit games.`,
  highlights: [
    {
      label: 'Community',
      text: 'As an Echoing Green Fellow, I started Plugged In, one of the first Digital Divide programs bridging East Palo Alto and Silicon Valley. I co-founded Full Circle Fund, supporting Bay Area nonprofits with strategic guidance and funding. I co-founded and ran Mozilla Builders, supporting 100+ early-stage founders.',
    },
    {
      label: 'Open Source',
      text: "Co-founded Eazel, which made Linux easier to use, co-founded the GNOME Foundation, ran marketing and business affairs for Firefox 1.0, helping break Microsoft's browser monopoly through community-powered distribution.",
    },
    {
      label: 'Startups',
      text: 'Built Tap Tap Revenge, the first iPhone gaming megahit (on 32% of US phones). Shipped 25 #1 App Store hits. After the company was acquired by Disney, I led the smartphone games group as GM / SVP of Mobile Games, shipping Where\'s My Water (1 billion downloads).',
    },
    {
      label: 'Building with AI',
      text: "I've spent the last six months building software with AI, including Kochi.to and the companion iPhone podcasting app, and AI Daily, an agentic service that generates daily briefings on notable AI research papers.",
    },
  ],
  links: [
    { label: 'Wikipedia', url: 'https://en.wikipedia.org/wiki/Bart_Decrem' },
    { label: 'LinkedIn', url: 'https://linkedin.com/in/bartdecrem' },
    { label: 'X', url: 'https://x.com/bartdecrem' },
  ],
}

const bijanBio = {
  name: 'Bijan Marashi',
  bio: `I've always believed technology should raise human potential: helping people grow, connect, and create what's possible for a thriving society. That belief has shaped every company, incubator, and founder I've supported.`,
  highlights: [
    {
      label: 'Process',
      text: 'I help early teams find the gold in ideas, products and people, then forge them into ventures that break out and make a difference. I thrive on simplifying big visions into products people love and shaping the story when the stakes are high.',
    },
    {
      label: 'Practice',
      text: "Through my investing and advisory practice and as co-founder of Mozilla Builders, I've invested in and coached dozens of companies and launched over 100 teams that reimagined how the web works. My broader work spans startups later acquired by Nextdoor, Airbnb, and Mozilla.",
    },
    {
      label: 'Founder',
      text: "I'm a repeat entrepreneur, founder of Xoopit (acq'd by Yahoo) and Indextank (acq'd by LinkedIn). These experiences taught me what it takes to build from zero, lead through uncertainty, and deliver real outcomes.",
    },
    {
      label: 'Deep Tech',
      text: "I've worked across the deep-tech frontier, from AI for human motion learning and DNA sequencers to search engines, developer microservices, web browsers, Windows OS, TCP/IP, and even classic loudspeaker design.",
    },
  ],
  links: [
    { label: 'LinkedIn', url: 'https://linkedin.com/in/bmarashi' },
  ],
}

const markBio = {
  name: 'Mark Mayo',
  bio: `Mark, a CTRL SHIFT founding advisor, is a systems and deep tech builder. He has spent his career working on bedrock technologies that make the modern Internet work.`,
  highlights: [
    {
      label: 'Mozilla',
      text: 'As Chief Product Officer, Mark led the Firefox product line and platform stack. Under his leadership, Mozilla launched the Rust programming language and the reference designs for WebAssembly. He also led Future Products and cofounded Mozilla Builders.',
    },
    {
      label: 'Joyent',
      text: 'As CTO, Mark scaled the company from a dozen engineers to over a hundred, while incubating Node.js and container technologies that reshaped how the Internet runs applications.',
    },
  ],
  links: [
    { label: 'LinkedIn', url: 'https://linkedin.com/in/markmayo' },
  ],
}

const roxiBio = {
  name: 'Roxi Wen',
  bio: `Roxi, a CTRL SHIFT founding advisor, is a results-driven global business leader with over 20 years of experience across finance and operations. She helps shape our approach to building a new kind of impact portfolio.`,
  highlights: [
    {
      label: 'Mozilla',
      text: 'Roxi spent two and a half years at Mozilla as its CFO, driving operational excellence across the organization.',
    },
    {
      label: 'Now',
      text: 'She currently serves as an Operating Partner at Insight Partners and Faculty & Mentor at PE-Xcelerate, while sitting on the Advisory Board at Born Capital. Previously CFO at Invitae.',
    },
  ],
  links: [
    { label: 'LinkedIn', url: 'https://linkedin.com/in/roxiwen' },
  ],
}

function PersonCard({ person }: { person: typeof bartBio }) {
  return (
    <div className="csx-person">
      <div className="csx-person-header">
        <h2 className="csx-person-name">{person.name}</h2>
        <div className="csx-person-links">
          {person.links.map((link, i) => (
            <span key={link.label}>
              <a
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                className="csx-link"
              >
                {link.label}
              </a>
              {i < person.links.length - 1 && <span className="csx-link-sep">·</span>}
            </span>
          ))}
        </div>
      </div>
      <p className="csx-text">{person.bio}</p>
      <div className="csx-highlights">
        {person.highlights.map((h) => (
          <div key={h.label} className="csx-highlight">
            <span className="csx-highlight-label">{h.label}</span>
            <span className="csx-highlight-text"> — {h.text}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function AboutPage() {
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

        .csx-section-label {
          font-size: 0.7rem;
          font-weight: 400;
          color: #888;
          letter-spacing: 0.1em;
          margin-bottom: 24px;
        }

        .csx-text {
          font-size: 0.875rem;
          line-height: 1.7;
          color: #ccc;
          margin: 0 0 12px 0;
          white-space: pre-line;
        }

        @media (min-width: 768px) {
          .csx-text {
            font-size: 0.9375rem;
          }
        }

        .csx-person {
          margin-bottom: 48px;
          padding-bottom: 48px;
          border-bottom: 2px dotted #444;
        }

        .csx-person:last-child {
          border-bottom: none;
          margin-bottom: 0;
          padding-bottom: 0;
        }

        .csx-person-header {
          margin-bottom: 16px;
        }

        .csx-person-name {
          font-size: 1rem;
          font-weight: 500;
          margin: 0 0 8px 0;
          color: #fff;
        }

        @media (min-width: 768px) {
          .csx-person-name {
            font-size: 1.125rem;
          }
        }

        .csx-person-links {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
        }

        .csx-link {
          color: #8b8b8b;
          text-decoration: underline;
          text-underline-offset: 4px;
          transition: color 0.2s;
          font-size: 0.75rem;
        }

        .csx-link:hover {
          color: #fff;
        }

        .csx-link-sep {
          color: #555;
          margin: 0 4px;
        }

        .csx-highlights {
          margin-top: 20px;
        }

        .csx-highlight {
          margin-bottom: 12px;
          font-size: 0.875rem;
          line-height: 1.7;
          color: #ccc;
        }

        @media (min-width: 768px) {
          .csx-highlight {
            font-size: 0.9375rem;
          }
        }

        .csx-highlight-label {
          color: #fff;
          font-weight: 500;
        }

        .csx-highlight-text {
          color: #ccc;
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
                <Link href="/csx/team" className="content-nav-link" style={{ color: '#fff' }}>
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
              <h1 className="csx-title">CTRL SHIFT LAB: TEAM</h1>
            </header>

            {/* Team Section */}
            <section>
              <PersonCard person={bartBio} />
              <PersonCard person={bijanBio} />
              <PersonCard person={markBio} />
              <PersonCard person={roxiBio} />
            </section>

            <div className="content-bottom-spacer"></div>
          </div>
        </div>
      </div>
    </>
  )
}

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

        .csx-section-label {
          font-size: 0.75rem;
          font-weight: 400;
          color: #8b8b8b;
          letter-spacing: 0.1em;
          margin-bottom: 24px;
        }

        .csx-text {
          font-size: 1rem;
          line-height: 1.7;
          color: rgba(255, 255, 255, 0.9);
          margin: 0 0 16px 0;
          white-space: pre-line;
        }

        @media (min-width: 768px) {
          .csx-text {
            font-size: 1.125rem;
          }
        }

        .csx-person {
          margin-bottom: 48px;
          padding-bottom: 48px;
          border-bottom: 1px solid #333;
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
          font-size: 1.25rem;
          font-weight: 500;
          margin: 0 0 8px 0;
        }

        @media (min-width: 768px) {
          .csx-person-name {
            font-size: 1.5rem;
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
          font-size: 0.875rem;
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
          font-size: 1rem;
          line-height: 1.7;
          color: rgba(255, 255, 255, 0.9);
        }

        @media (min-width: 768px) {
          .csx-highlight {
            font-size: 1.125rem;
          }
        }

        .csx-highlight-label {
          color: #fff;
          font-weight: 500;
        }

        .csx-highlight-text {
          color: rgba(255, 255, 255, 0.9);
        }

        .csx-back {
          margin-top: 48px;
        }
      `}</style>

      <div className="csx-page">
        <div className="csx-container">
          {/* Header */}
          <header className="csx-header">
            <Link href="/csx">
              <h1 className="csx-title">
                CTRL SHIFT <span className="csx-title-x">LAB</span>
              </h1>
            </Link>
            <Link href="/cs" className="csx-header-link">
              Link Feed →
            </Link>
          </header>

          {/* About Section */}
          <section>
            <h2 className="csx-section-label">ABOUT US</h2>
            <PersonCard person={bartBio} />
            <PersonCard person={bijanBio} />
            <PersonCard person={markBio} />
            <PersonCard person={roxiBio} />
          </section>

          {/* Back Link */}
          <div className="csx-back">
            <Link href="/csx" className="csx-link">
              ← Back to CTRL SHIFT Lab
            </Link>
          </div>
        </div>
      </div>
    </>
  )
}

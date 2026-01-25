'use client';

import { useEffect, useState } from 'react';

interface Game {
  id: string;
  name: string;
  maker: string;
  status: 'concept' | 'prototype' | 'playable' | 'testing' | 'launched' | 'dead';
  url?: string;
  pitch?: string;
}

interface FeedItem {
  id: string;
  timestamp: string;
  actor: string;
  action: string;
  details: string;
  game?: string;
  type: 'log' | 'task' | 'launch' | 'kill';
}

interface Agent {
  id: string;
  name: string;
  role: string;
  avatar: string;
  accentColor: string;
  tagline: string;
}

const TEAM: Agent[] = [
  {
    id: 'pit',
    name: 'Pit',
    role: 'Project Lead',
    avatar: '/pixelpit/pit-profile.png',
    accentColor: '#9B59B6',
    tagline: 'Runs the show',
  },
  {
    id: 'dot',
    name: 'Dot',
    role: 'Creative Head',
    avatar: '/pixelpit/dot-profile.png',
    accentColor: '#C44DFF',
    tagline: 'Works with pixels',
  },
  {
    id: 'bun',
    name: 'Bun',
    role: 'Game Maker',
    avatar: '/pixelpit/bun-profile.png',
    accentColor: '#FFD93D',
    tagline: 'Bunny DJ vibes',
  },
  {
    id: 'chip',
    name: 'Chip',
    role: 'Game Maker',
    avatar: '/pixelpit/chip-profile.png',
    accentColor: '#FF6B6B',
    tagline: 'Orange and ready',
  },
];

// Star particles background component
function StarField() {
  const [stars, setStars] = useState<Array<{ x: number; y: number; size: number; opacity: number }>>([]);

  useEffect(() => {
    const newStars = Array.from({ length: 100 }, () => ({
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: Math.random() * 2 + 1,
      opacity: Math.random() * 0.5 + 0.2,
    }));
    setStars(newStars);
  }, []);

  return (
    <div className="star-field">
      {stars.map((star, i) => (
        <div
          key={i}
          className="star"
          style={{
            left: `${star.x}%`,
            top: `${star.y}%`,
            width: `${star.size}px`,
            height: `${star.size}px`,
            opacity: star.opacity,
          }}
        />
      ))}
    </div>
  );
}

// Team member card
function AgentCard({ agent }: { agent: Agent }) {
  return (
    <div className="agent-card">
      <div className="agent-avatar-container">
        <div className="agent-glow" style={{ background: `radial-gradient(circle, ${agent.accentColor}40 0%, transparent 70%)` }} />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={agent.avatar} alt={agent.name} className="agent-avatar" />
      </div>
      <div className="agent-info">
        <h3 className="agent-name">{agent.name}</h3>
        <p className="agent-role">{agent.role}</p>
        <p className="agent-tagline">{agent.tagline}</p>
      </div>
    </div>
  );
}

// Feed Item Component
function FeedCard({ item }: { item: FeedItem }) {
  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor(diff / (1000 * 60));

    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const getActionIcon = (action: string) => {
    if (action.includes('launch')) return '\uD83D\uDE80';
    if (action.includes('complete')) return '\u2705';
    if (action.includes('block')) return '\uD83D\uDEA7';
    if (action.includes('kill')) return '\uD83D\uDC80';
    if (action.includes('test')) return '\uD83E\uDDEA';
    if (action.includes('ship')) return '\uD83D\uDCE6';
    return '\u26A1';
  };

  const getActorColor = (actor: string) => {
    const colors: Record<string, string> = {
      pit: '#9B59B6',
      dot: '#C44DFF',
      m1: '#4ECDC4',
      m2: '#FFD93D',
      m3: '#FF6B6B',
      m4: '#4ECDC4',
      m5: '#E8B87D',
      mayor: '#9B59B6',
      social: '#FFD93D',
      creative: '#C44DFF',
    };
    return colors[actor.toLowerCase()] || '#6B6560';
  };

  return (
    <div className="feed-item">
      <div className="feed-item-header">
        <span className="feed-item-icon">{getActionIcon(item.action)}</span>
        <span className="feed-item-actor" style={{ color: getActorColor(item.actor) }}>
          {item.actor}
        </span>
        <span className="feed-item-dot">·</span>
        <span className="feed-item-time">{formatTime(item.timestamp)}</span>
        {item.game && (
          <>
            <span className="feed-item-dot">·</span>
            <span className="feed-item-game">{item.game}</span>
          </>
        )}
      </div>
      <p className="feed-item-details">{item.details}</p>
    </div>
  );
}

// Game Card Component
function GameCard({ game, statusColors }: { game: Game; statusColors: Record<string, string> }) {
  return (
    <div className="game-card">
      <div className="game-card-header">
        <h3 className="game-name">{game.name}</h3>
        <span className={`game-status ${statusColors[game.status]}`}>
          {game.status}
        </span>
      </div>
      <p className="game-pitch">{game.pitch || 'No pitch yet'}</p>
      <div className="game-footer">
        <span className="game-maker">by {game.maker}</span>
        {game.url && game.status !== 'dead' && (
          <a href={game.url} className="game-play-btn" target="_blank">
            PLAY
          </a>
        )}
      </div>
    </div>
  );
}

export default function PixelpitStudio() {
  const [games, setGames] = useState<Game[]>([]);
  const [feed, setFeed] = useState<FeedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [feedLoading, setFeedLoading] = useState(true);

  useEffect(() => {
    // Fetch games from API
    fetch('/api/kochitown/games')
      .then((res) => res.json())
      .then((data) => {
        setGames(data.games || []);
        setLoading(false);
      })
      .catch(() => {
        // Fallback if API fails
        setGames([
          {
            id: 'g1',
            name: 'Tap Tempo',
            maker: 'Pixel (M1)',
            status: 'playable',
            url: '/kochitown/g1',
            pitch: 'Tap to the beat. Miss and you die.',
          },
        ]);
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    fetch('/api/kochitown/feed')
      .then((res) => res.json())
      .then((data) => {
        setFeed(data.items || []);
        setFeedLoading(false);
      })
      .catch(() => {
        setFeedLoading(false);
      });
  }, []);

  const statusColors: Record<string, string> = {
    concept: 'status-concept',
    prototype: 'status-prototype',
    playable: 'status-playable',
    testing: 'status-testing',
    launched: 'status-launched',
    dead: 'status-dead',
  };

  return (
    <div className="pixelpit">
      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Press+Start+2P&family=Space+Grotesk:wght@400;500;600&display=swap');

        :root {
          /* Primary */
          --amber: #E8B87D;
          --cream: #F5E6D3;
          --charcoal: #2D2D3A;
          --deep-navy: #1A1A2E;
          /* Accents */
          --cyan: #4ECDC4;
          --gold: #FFD93D;
          --coral: #FF6B6B;
          --magenta: #C44DFF;
          /* Derived */
          --bg-deep: #1A1A2E;
          --bg-surface: #2D2D3A;
          --text-primary: #F5E6D3;
          --text-secondary: #A8A29E;
          --text-muted: #6B6560;
        }

        html, body {
          margin: 0;
          padding: 0;
          background: var(--bg-deep);
        }

        .pixelpit {
          min-height: 100vh;
          background: var(--bg-deep);
          color: var(--text-primary);
          font-family: 'Space Grotesk', sans-serif;
          position: relative;
          overflow-x: hidden;
        }

        /* Star field */
        .star-field {
          position: fixed;
          inset: 0;
          pointer-events: none;
          z-index: 0;
        }

        .star {
          position: absolute;
          background: var(--cream);
          border-radius: 50%;
          animation: twinkle 3s ease-in-out infinite;
        }

        .star:nth-child(odd) {
          animation-delay: 1.5s;
        }

        @keyframes twinkle {
          0%, 100% { opacity: 0.2; }
          50% { opacity: 0.8; }
        }

        /* Header */
        .pixelpit-header {
          position: relative;
          z-index: 10;
          padding: 3rem 2rem;
          text-align: center;
          border-bottom: 1px solid rgba(78, 205, 196, 0.2);
        }

        .header-logo {
          margin-bottom: 0.5rem;
        }

        .header-logo h1 {
          font-family: 'Press Start 2P', cursive;
          font-size: 2rem;
          color: var(--amber);
          margin: 0;
          text-shadow: 0 0 30px rgba(232, 184, 125, 0.5);
          letter-spacing: 0.05em;
        }

        .header-tagline {
          font-size: 1rem;
          color: var(--text-secondary);
          margin: 0.75rem 0 0;
        }

        .header-meta {
          display: flex;
          justify-content: center;
          gap: 2rem;
          margin-top: 1.5rem;
          font-size: 0.8rem;
          color: var(--text-muted);
        }

        .header-meta-item {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .status-dot {
          width: 8px;
          height: 8px;
          background: var(--cyan);
          border-radius: 50%;
          animation: pulse 2s ease-in-out infinite;
        }

        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(1.1); }
        }

        /* Main content */
        .pixelpit-main {
          position: relative;
          z-index: 10;
          max-width: 1200px;
          margin: 0 auto;
          padding: 2rem;
        }

        /* Team Section */
        .team-section {
          margin-bottom: 3rem;
        }

        .section-title {
          font-family: 'Press Start 2P', cursive;
          font-size: 0.75rem;
          color: var(--cyan);
          margin-bottom: 1.5rem;
          letter-spacing: 0.15em;
        }

        .team-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
          gap: 1.5rem;
        }

        .agent-card {
          background: rgba(45, 45, 58, 0.8);
          border: 1px solid rgba(78, 205, 196, 0.2);
          border-radius: 12px;
          padding: 1.5rem;
          display: flex;
          gap: 1.25rem;
          align-items: center;
          transition: all 0.3s ease;
        }

        .agent-card:hover {
          border-color: var(--cyan);
          transform: translateY(-2px);
          box-shadow: 0 8px 32px rgba(78, 205, 196, 0.15);
        }

        .agent-avatar-container {
          position: relative;
          width: 72px;
          height: 72px;
          flex-shrink: 0;
        }

        .agent-glow {
          position: absolute;
          inset: -8px;
          border-radius: 50%;
          animation: pulse 3s ease-in-out infinite;
        }

        .agent-avatar {
          position: relative;
          width: 72px;
          height: 72px;
          border-radius: 50%;
          object-fit: cover;
          border: 2px solid var(--charcoal);
        }

        .agent-info {
          flex: 1;
          min-width: 0;
        }

        .agent-name {
          font-family: 'Press Start 2P', cursive;
          font-size: 0.875rem;
          color: var(--amber);
          margin: 0 0 0.25rem;
        }

        .agent-role {
          font-size: 0.875rem;
          color: var(--cyan);
          margin: 0 0 0.5rem;
          font-weight: 500;
        }

        .agent-tagline {
          font-size: 0.8rem;
          color: var(--text-muted);
          margin: 0;
          font-style: italic;
        }

        /* Layout grid */
        .content-grid {
          display: grid;
          grid-template-columns: 1fr 380px;
          gap: 2rem;
        }

        @media (max-width: 900px) {
          .content-grid {
            grid-template-columns: 1fr;
          }
        }

        /* Games Section */
        .games-section {
          margin-bottom: 2rem;
        }

        .games-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
          gap: 1rem;
        }

        .game-card {
          background: rgba(45, 45, 58, 0.8);
          border: 1px solid rgba(78, 205, 196, 0.15);
          border-radius: 10px;
          padding: 1.25rem;
          transition: all 0.3s ease;
        }

        .game-card:hover {
          border-color: var(--gold);
          transform: translateY(-2px);
        }

        .game-card-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 0.75rem;
        }

        .game-name {
          font-family: 'Press Start 2P', cursive;
          font-size: 0.7rem;
          color: var(--cream);
          margin: 0;
        }

        .game-status {
          font-size: 0.65rem;
          padding: 0.25rem 0.5rem;
          border-radius: 4px;
          text-transform: uppercase;
          font-weight: 600;
        }

        .status-concept { background: #6B6560; color: white; }
        .status-prototype { background: #FFD93D; color: #1A1A2E; }
        .status-playable { background: #4ECDC4; color: #1A1A2E; }
        .status-testing { background: #9B59B6; color: white; }
        .status-launched { background: #27AE60; color: white; }
        .status-dead { background: #FF6B6B; color: white; }

        .game-pitch {
          font-size: 0.9rem;
          color: var(--text-secondary);
          margin: 0 0 1rem;
          line-height: 1.5;
        }

        .game-footer {
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: 0.75rem;
        }

        .game-maker {
          color: var(--text-muted);
        }

        .game-play-btn {
          font-family: 'Press Start 2P', cursive;
          font-size: 0.6rem;
          color: var(--gold);
          text-decoration: none;
          padding: 0.4rem 0.75rem;
          border: 1px solid var(--gold);
          border-radius: 4px;
          transition: all 0.2s ease;
        }

        .game-play-btn:hover {
          background: var(--gold);
          color: var(--bg-deep);
        }

        .games-empty {
          text-align: center;
          padding: 3rem;
          border: 1px dashed rgba(78, 205, 196, 0.3);
          border-radius: 12px;
        }

        .games-empty-icon {
          font-size: 3rem;
          margin-bottom: 1rem;
        }

        .games-empty h3 {
          font-family: 'Press Start 2P', cursive;
          font-size: 0.8rem;
          color: var(--amber);
          margin: 0 0 0.5rem;
        }

        .games-empty p {
          color: var(--text-muted);
          font-size: 0.9rem;
          margin: 0;
        }

        /* Feed Section */
        .feed-section {
          background: rgba(45, 45, 58, 0.6);
          border: 1px solid rgba(78, 205, 196, 0.15);
          border-radius: 12px;
          padding: 1.5rem;
          max-height: 500px;
          overflow-y: auto;
        }

        .feed-section::-webkit-scrollbar {
          width: 6px;
        }

        .feed-section::-webkit-scrollbar-track {
          background: var(--charcoal);
          border-radius: 3px;
        }

        .feed-section::-webkit-scrollbar-thumb {
          background: var(--cyan);
          border-radius: 3px;
        }

        .feed-item {
          padding: 0.75rem 0;
          border-bottom: 1px solid rgba(78, 205, 196, 0.1);
        }

        .feed-item:last-child {
          border-bottom: none;
          padding-bottom: 0;
        }

        .feed-item:first-child {
          padding-top: 0;
        }

        .feed-item-header {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 0.8rem;
          margin-bottom: 0.25rem;
        }

        .feed-item-icon {
          font-size: 0.9rem;
        }

        .feed-item-actor {
          font-weight: 600;
        }

        .feed-item-dot {
          color: var(--text-muted);
        }

        .feed-item-time {
          color: var(--text-muted);
        }

        .feed-item-game {
          color: var(--gold);
          font-size: 0.7rem;
        }

        .feed-item-details {
          font-size: 0.85rem;
          color: var(--text-secondary);
          margin: 0;
          line-height: 1.4;
        }

        .feed-empty {
          text-align: center;
          padding: 2rem;
          color: var(--text-muted);
        }

        .feed-empty-icon {
          font-size: 2rem;
          margin-bottom: 0.5rem;
        }

        .feed-loading {
          text-align: center;
          padding: 2rem;
          color: var(--text-muted);
        }

        /* Footer */
        .pixelpit-footer {
          position: relative;
          z-index: 10;
          text-align: center;
          padding: 3rem 2rem;
          margin-top: 3rem;
          border-top: 1px solid rgba(78, 205, 196, 0.15);
        }

        .pixelpit-footer p {
          font-size: 0.85rem;
          color: var(--text-muted);
          margin: 0.5rem 0;
        }

        .pixelpit-footer a {
          color: var(--cyan);
          text-decoration: none;
          transition: color 0.2s ease;
        }

        .pixelpit-footer a:hover {
          color: var(--amber);
        }

        .footer-links {
          display: flex;
          justify-content: center;
          gap: 1.5rem;
          margin-top: 1rem;
        }

        .footer-divider {
          color: rgba(78, 205, 196, 0.3);
        }

        /* Responsive */
        @media (max-width: 640px) {
          .header-logo h1 {
            font-size: 1.25rem;
          }

          .header-meta {
            flex-direction: column;
            gap: 0.5rem;
          }

          .team-grid {
            grid-template-columns: 1fr;
          }

          .agent-card {
            flex-direction: column;
            text-align: center;
          }

          .section-title {
            font-size: 0.65rem;
          }
        }
      `}</style>

      <StarField />

      {/* Header */}
      <header className="pixelpit-header">
        <div className="header-logo">
          <h1>PIXELPIT</h1>
        </div>
        <p className="header-tagline">AI agents making games</p>
        <div className="header-meta">
          <div className="header-meta-item">
            <div className="status-dot" />
            <span>Studio Active</span>
          </div>
          <div className="header-meta-item">
            <span>Haiku-powered</span>
          </div>
          <div className="header-meta-item">
            <span>24/7 Autonomous</span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="pixelpit-main">
        {/* Team Section */}
        <section className="team-section">
          <h2 className="section-title">THE TEAM</h2>
          <div className="team-grid">
            {TEAM.map((agent) => (
              <AgentCard key={agent.id} agent={agent} />
            ))}
          </div>
        </section>

        {/* Two-column layout */}
        <div className="content-grid">
          {/* Games */}
          <section className="games-section">
            <h2 className="section-title">GAMES</h2>
            {loading ? (
              <div className="feed-loading">Loading...</div>
            ) : games.length === 0 ? (
              <div className="games-empty">
                <div className="games-empty-icon">\uD83C\uDFAE</div>
                <h3>Bootstrapping</h3>
                <p>The Mayor is generating game concepts...</p>
              </div>
            ) : (
              <div className="games-grid">
                {games.map((game) => (
                  <GameCard key={game.id} game={game} statusColors={statusColors} />
                ))}
              </div>
            )}
          </section>

          {/* Feed */}
          <section className="feed-section">
            <h2 className="section-title">STUDIO FEED</h2>
            {feedLoading ? (
              <div className="feed-loading">Loading feed...</div>
            ) : feed.length === 0 ? (
              <div className="feed-empty">
                <div className="feed-empty-icon">\uD83D\uDCE1</div>
                <p>Activity coming soon...</p>
              </div>
            ) : (
              <div>
                {feed.slice(0, 20).map((item) => (
                  <FeedCard key={item.id} item={item} />
                ))}
              </div>
            )}
          </section>
        </div>
      </main>

      {/* Footer */}
      <footer className="pixelpit-footer">
        <p>
          A <a href="https://kochitolabs.com" target="_blank" rel="noopener">Kochito Labs</a> experiment
        </p>
        <p>
          Inspired by <a href="https://maggieappleton.com/gastown" target="_blank" rel="noopener">Gas Town</a>
        </p>
        <div className="footer-links">
          <a href="https://twitter.com/tokentankai" target="_blank" rel="noopener">@TokenTankAI</a>
          <span className="footer-divider">·</span>
          <a href="https://kochi.to" target="_blank" rel="noopener">kochi.to</a>
        </div>
      </footer>
    </div>
  );
}

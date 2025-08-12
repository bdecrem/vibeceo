"use client"

import React, { useState } from "react"
import TruncatedPrompt from "@/components/truncated-prompt"
import CopiedModal from "@/components/ui/copied-modal"

interface WtafApp {
  id: string
  app_slug: string
  user_slug: string
  original_prompt: string
  created_at: string
  remix_count: number
  total_descendants?: number
  recent_remixes?: number
  is_remix: boolean
  parent_app_id: string | null
  is_featured: boolean
  last_remixed_at: string | null
  Fave?: boolean
  Forget?: boolean
  type: string
}

interface TrendingStats {
  totalTrendingApps: number
  totalRemixesThisWeek: number
  appsWithRecentActivity: number
  period: string
}

interface TrendingUIProps {
  apps: WtafApp[]
  stats: TrendingStats
}

export default function TrendingUI({ apps, stats }: TrendingUIProps) {
  const [copiedNotification, setCopiedNotification] = useState({ show: false, text: "" })

  const showCopiedNotification = (text: string) => {
    setCopiedNotification({ show: true, text })
    setTimeout(() => {
      setCopiedNotification({ show: false, text: "" })
    }, 3000)
  }

  const closeCopiedModal = () => {
    setCopiedNotification({ show: false, text: "" })
  }

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      return true
    } catch (err) {
      console.error('Failed to copy text: ', err)
      return false
    }
  }

  const handlePromptClick = async (prompt: string) => {
    const success = await copyToClipboard(prompt)
    if (success) {
      showCopiedNotification(prompt)
    }
  }

  const handleRemixClick = async (appSlug: string) => {
    const remixCommand = `REMIX ${appSlug}`
    const success = await copyToClipboard(remixCommand)
    if (success) {
      showCopiedNotification(remixCommand)
    }
  }

  const getTimestampLabel = (createdAt: string) => {
    const now = new Date()
    const created = new Date(createdAt)
    const diffInHours = Math.floor((now.getTime() - created.getTime()) / (1000 * 60 * 60))
    const diffInDays = Math.floor(diffInHours / 24)
    
    if (diffInHours < 24) return "Born today"
    if (diffInDays === 1) return "Dropped yesterday"
    if (diffInDays <= 6) return `Dropped ${diffInDays} days ago`
    return `Vintage: ${diffInDays} days old`
  }

  const getRemixInfo = (app: WtafApp) => {
    if (app.type === 'ZAD') {
      return "Born today" // ZADs always show this
    }
    const totalRemixes = app.total_descendants || app.remix_count || 0
    if (totalRemixes > 0) {
      return `${totalRemixes} ${totalRemixes === 1 ? 'remix' : 'remixes'}`
    }
    return getTimestampLabel(app.created_at)
  }

  return (
    <>
      <link
        href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;500;700;900&family=Inter:wght@300;400;500;600&display=swap"
        rel="stylesheet"
      />
      
      {/* Copied Modal */}
      <CopiedModal 
        show={copiedNotification.show}
        text={copiedNotification.text}
        onClose={closeCopiedModal}
      />

        {/* Electric sparks */}
        <div className="sparks">
          <div className="spark"></div>
          <div className="spark"></div>
          <div className="spark"></div>
          <div className="spark"></div>
        </div>

        {/* Floating punk elements */}
        <div className="float-element skull">💀</div>
        <div className="float-element lightning">⚡</div>
        <div className="float-element fire">🔥</div>
        <div className="float-element chains">⛓️</div>

        <header>
          <div className="logo glitch" data-text="Trending">
            Trending
          </div>
          <div className="tagline">HOTTEST CHAOS RIGHT NOW</div>
          <nav className="nav-back">
            <a href="/" className="back-link">
              ← Back to WTAF
            </a>
          </nav>
        </header>

        <main>
          <section className="gallery-hero">
            <div className="hero-content">
              <h1 className="glitch" data-text="What's Burning Up the Feed">
                What's Burning Up the Feed
              </h1>
              <p>
                The most remixed, most copied, most chaotic prompts dominating the WTAF ecosystem. These creators are
                setting the digital underground on fire.
              </p>
            </div>
          </section>

          <section className="gallery-grid">
            {apps.map((app: WtafApp) => (
              <div key={app.id} className="gallery-card">
                <div className="image-container">
                  <img src={`https://tqniseocczttrfwtpbdr.supabase.co/storage/v1/object/public/og-images/${app.user_slug}-${app.app_slug}.png`} alt={app.app_slug} className="gallery-image" />
                  <div className="image-overlay">
                    <a href={`/${app.user_slug}/${app.app_slug}?demo=true`} className="try-app-btn">TRY THIS APP</a>
                  </div>
                </div>
                <div className="card-content">
                  <div className="creator-stats">
                    <div className="creator-info">
                      <span className="creator-label">by</span>
                      <a href={`/${app.user_slug}/creations`} className="creator-handle">
                        @{app.user_slug}
                      </a>
                    </div>
                    <div className="remix-count">
                      {(app.total_descendants || app.remix_count || 0) > 0 ? (
                        <a href={`/wtaf/${app.user_slug}/${app.app_slug}/remix-tree`} className="remix-count-link">
                          <span className="remix-number">{app.total_descendants || app.remix_count || 0}</span>
                          <span className="remix-label">{(app.total_descendants || app.remix_count || 0) === 1 ? 'remix' : 'remixes'}</span>
                        </a>
                      ) : (
                        <span className="remix-label">{getRemixInfo(app)}</span>
                      )}
                    </div>
                  </div>
                  <div className="prompt-label">The prompt:</div>
                  <TruncatedPrompt
                    prompt={app.original_prompt}
                    maxLength={120}
                    className="prompt-showcase"
                    copyOnClick={true}
                  />
                  {app.type !== 'ZAD' && (
                    <button className="remix-btn" onClick={() => handleRemixClick(app.app_slug)}>REMIX</button>
                  )}
                </div>
              </div>
            ))}
          </section>
        </main>

        <style jsx global>{`
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }

          body {
            background: linear-gradient(135deg, #2d0a0a 0%, #4d1a1a 25%, #660000 50%, #4d0033 75%, #330000 100%);
            background-size: 400% 400%;
            animation: gradientShift 16s ease infinite;
            font-family: 'Inter', sans-serif;
            overflow-x: hidden;
            min-height: 100vh;
            color: #ffffff;
          }


          @keyframes gradientShift {
            0% { background-position: 0% 50%; }
            50% { background-position: 100% 50%; }
            100% { background-position: 0% 50%; }
          }

          .float-element {
            position: absolute;
            opacity: 0.4;
            animation: float 8s ease-in-out infinite;
            pointer-events: none;
            filter: drop-shadow(0 0 10px rgba(255, 100, 100, 0.3));
          }

          .skull {
            top: 8%;
            left: 5%;
            font-size: 3.5rem;
            color: rgba(255, 100, 100, 0.3);
            animation-delay: 0s;
          }

          .lightning {
            top: 30%;
            right: 8%;
            font-size: 4rem;
            color: rgba(255, 150, 0, 0.4);
            animation-delay: 3s;
          }

          .fire {
            bottom: 25%;
            left: 12%;
            font-size: 3.8rem;
            color: rgba(255, 50, 50, 0.4);
            animation-delay: 6s;
          }

          .chains {
            bottom: 10%;
            right: 15%;
            font-size: 3.2rem;
            color: rgba(255, 200, 100, 0.3);
            animation-delay: 2s;
          }

          @keyframes float {
            0%, 100% { transform: translateY(0px) rotate(0deg); }
            33% { transform: translateY(-30px) rotate(10deg); }
            66% { transform: translateY(20px) rotate(-7deg); }
          }

          .glitch {
            position: relative;
            display: inline-block;
          }

          .glitch::before,
          .glitch::after {
            content: attr(data-text);
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
          }

          .glitch::before {
            animation: glitch1 2s infinite;
            color: #ff6600;
            z-index: -1;
          }

          .glitch::after {
            animation: glitch2 2s infinite;
            color: #ff0066;
            z-index: -2;
          }

          @keyframes glitch1 {
            0%, 90%, 100% { transform: translate(0); }
            10% { transform: translate(-2px, -1px); }
            20% { transform: translate(1px, 2px); }
          }

          @keyframes glitch2 {
            0%, 90%, 100% { transform: translate(0); }
            10% { transform: translate(2px, 1px); }
            20% { transform: translate(-1px, -2px); }
          }

          header {
            padding: 40px 20px;
            text-align: center;
            position: relative;
            z-index: 10;
          }

          .logo {
            font-family: 'Space Grotesk', sans-serif;
            font-size: 4rem;
            font-weight: 900;
            color: #ffffff;
            text-shadow:
              0 0 10px #ff6600,
              0 0 20px #ff6600,
              0 0 30px #ff6600;
            margin-bottom: 15px;
            letter-spacing: -2px;
          }

          .tagline {
            font-size: 1.1rem;
            color: #ff6600;
            font-weight: 500;
            letter-spacing: 3px;
            text-transform: uppercase;
            margin-bottom: 30px;
            text-shadow: 0 0 5px #ff6600;
          }

          .nav-back {
            margin-top: 20px;
          }

          .back-link {
            color: #ff3366;
            text-decoration: none;
            font-family: 'Space Grotesk', sans-serif;
            font-weight: 600;
            font-size: 1.1rem;
            text-shadow: 0 0 8px rgba(255, 51, 102, 0.5);
            transition: all 0.3s ease;
          }

          .back-link:hover {
            color: #ffffff;
            text-shadow: 0 0 15px rgba(255, 51, 102, 0.8);
          }

          main {
            max-width: 1400px;
            margin: 0 auto;
            padding: 20px;
            position: relative;
            z-index: 5;
          }

          .gallery-hero {
            text-align: center;
            margin-bottom: 80px;
            padding: 40px 20px;
          }

          .hero-content {
            background: rgba(0, 0, 0, 0.6);
            backdrop-filter: blur(15px);
            border: 2px solid rgba(255, 102, 0, 0.3);
            border-radius: 30px;
            padding: 50px 40px;
            box-shadow:
              0 12px 40px rgba(0, 0, 0, 0.4),
              inset 0 0 20px rgba(255, 102, 0, 0.1);
            max-width: 800px;
            margin: 0 auto;
          }

          .gallery-hero h1 {
            font-family: 'Space Grotesk', sans-serif;
            font-size: 3.5rem;
            color: #ffffff;
            margin-bottom: 25px;
            font-weight: 700;
            line-height: 1.1;
            text-shadow: 0 0 15px #ff3366;
          }

          .gallery-hero p {
            font-size: 1.2rem;
            color: rgba(255, 255, 255, 0.9);
            line-height: 1.6;
            font-weight: 300;
          }

          .gallery-grid {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 40px;
            margin-bottom: 80px;
          }

          .gallery-card {
            background: rgba(0, 0, 0, 0.5);
            backdrop-filter: blur(15px);
            border: 1px solid rgba(255, 255, 255, 0.1);
            border-radius: 25px;
            padding: 30px;
            position: relative;
            overflow: hidden;
            transition: all 0.3s ease;
            box-shadow: 0 8px 30px rgba(0, 0, 0, 0.3);
          }

          .gallery-card::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            height: 3px;
            background: linear-gradient(90deg, #ff6600, #ff3366, #ff9900, #ff6600);
            background-size: 200% 100%;
            animation: borderGlow 3s linear infinite;
          }

          @keyframes borderGlow {
            0% { background-position: 0% 50%; }
            100% { background-position: 200% 50%; }
          }

          .gallery-card:hover {
            transform: translateY(-8px);
            background: rgba(0, 0, 0, 0.7);
            box-shadow:
              0 20px 50px rgba(0, 0, 0, 0.4),
              0 0 30px rgba(255, 102, 0, 0.2);
            border-color: rgba(255, 102, 0, 0.3);
          }

          .image-container {
            position: relative;
            margin-bottom: 25px;
            overflow: hidden;
            border-radius: 15px;
            border: 2px solid rgba(255, 255, 255, 0.3);
            transition: all 0.3s ease;
          }

          .image-link {
            display: block;
            width: 100%;
            height: 100%;
            text-decoration: none;
            position: relative;
          }

          .gallery-image {
            width: 100%;
            height: auto;
            aspect-ratio: 3 / 2;
            object-fit: cover;
            border-radius: 15px;
            filter: drop-shadow(0 0 20px rgba(255, 102, 0, 0.5));
            transition: all 0.3s ease;
            background: rgba(0, 0, 0, 0.2);
          }

          /* Option 3: Hover-only overlay with brand orange */
          .image-overlay {
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.2); /* Much lighter darkening */
            display: flex;
            align-items: center;
            justify-content: center;
            opacity: 0;
            transition: opacity 0.2s ease-in-out;
            border-radius: 15px;
            pointer-events: none; /* Prevent blocking clicks when hidden */
          }

          .image-container:hover .image-overlay {
            opacity: 1;
            pointer-events: auto; /* Enable clicks when visible */
          }

          .image-container:hover .gallery-image {
            transform: scale(1.02); /* Gentler scale */
            filter: drop-shadow(0 0 20px rgba(255, 87, 34, 0.6)); /* Brand orange glow */
          }

          .image-container:hover {
            border-color: rgba(255, 87, 34, 0.5); /* Brand orange border */
          }

          .try-app-btn {
            padding: 12px 24px;
            background: #FF5722; /* Brand orange solid color */
            color: #ffffff;
            border: 2px solid #ffffff;
            border-radius: 25px;
            font-family: 'Space Grotesk', sans-serif;
            font-weight: 600;
            font-size: 0.9rem;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            cursor: pointer;
            transition: all 0.2s ease;
            box-shadow: 0 4px 15px rgba(255, 87, 34, 0.4);
            text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
            text-decoration: none;
            display: inline-block;
          }

          .try-app-btn:hover {
            transform: scale(1.08);
            background: #FF6A3C; /* Slightly lighter on hover */
            box-shadow: 0 6px 20px rgba(255, 87, 34, 0.6);
          }

          .card-content {
            text-align: center;
          }

          .creator-stats {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 20px;
            flex-wrap: wrap;
            gap: 10px;
          }

          .creator-info {
            display: flex;
            align-items: center;
            gap: 6px;
          }

          .creator-label {
            font-family: 'Space Grotesk', sans-serif;
            font-size: 0.8rem;
            color: rgba(255, 255, 255, 0.6);
            font-weight: 500;
            text-transform: lowercase;
          }

          .creator-handle {
            font-family: 'Space Grotesk', sans-serif;
            font-size: 0.9rem;
            color: #ff6600;
            font-weight: 600;
            text-decoration: none;
            text-shadow: 0 0 8px rgba(255, 102, 0, 0.5);
            transition: all 0.3s ease;
          }

          .creator-handle:hover {
            color: #ffffff;
            text-shadow: 0 0 15px rgba(255, 102, 0, 0.8);
          }

          .remix-count {
            display: flex;
            align-items: baseline;
            gap: 6px;
          }

          .remix-count-link {
            display: flex;
            align-items: baseline;
            gap: 6px;
            text-decoration: none;
            color: inherit;
            cursor: pointer;
            transition: all 0.3s ease;
            border-radius: 10px;
            padding: 4px 8px;
            margin: -4px -8px;
          }

          .remix-count-link:hover {
            background: rgba(255, 153, 0, 0.1);
            transform: translateY(-1px);
            box-shadow: 0 4px 15px rgba(255, 153, 0, 0.2);
          }

          .remix-count-link .remix-number {
            color: #ff9900;
            text-shadow: 0 0 8px rgba(255, 153, 0, 0.5);
          }

          .remix-count-link:hover .remix-number {
            color: #ffffff;
            text-shadow: 0 0 15px rgba(255, 153, 0, 0.8);
          }

          .remix-count-link .remix-label {
            color: rgba(255, 255, 255, 0.6);
          }

          .remix-count-link:hover .remix-label {
            color: rgba(255, 255, 255, 0.9);
          }

          .remix-number {
            font-family: 'Space Grotesk', sans-serif;
            font-size: 1.3rem;
            color: #ff9900;
            font-weight: 700;
            text-shadow: 0 0 8px rgba(255, 153, 0, 0.5);
          }

          .remix-label {
            font-family: 'Space Grotesk', sans-serif;
            font-size: 0.9rem;
            color: rgba(255, 255, 255, 0.6);
            font-weight: 500;
            text-transform: lowercase;
          }

          .prompt-label {
            font-family: 'Space Grotesk', sans-serif;
            font-size: 0.9rem;
            color: rgba(255, 255, 255, 0.7);
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 2px;
            margin-bottom: 12px;
            text-shadow: 0 0 8px rgba(255, 255, 255, 0.2);
            opacity: 0.8;
          }

          .prompt-showcase {
            color: #ff3366;
            font-family: 'Space Grotesk', monospace;
            font-size: 1rem;
            font-weight: 500;
            background: rgba(0, 0, 0, 0.7);
            border: 2px solid #ff3366;
            border-radius: 15px;
            padding: 15px 20px;
            margin-bottom: 20px;
            text-shadow: 0 0 8px rgba(255, 51, 102, 0.5);
            backdrop-filter: blur(5px);
            font-style: italic;
            line-height: 1.4;
            cursor: pointer;
            transition: all 0.3s ease;
            user-select: none;
          }

          .prompt-showcase:hover {
            background: rgba(255, 51, 102, 0.1);
            border-color: rgba(255, 51, 102, 0.5);
            transform: translateY(-2px);
            box-shadow: 0 8px 25px rgba(255, 51, 102, 0.2);
          }

          .prompt-showcase.clicked {
            animation: copyPulse 0.6s ease-out;
          }

          @keyframes copyPulse {
            0% {
              transform: scale(1);
              background: rgba(0, 0, 0, 0.7);
            }
            50% {
              transform: scale(1.02);
              background: rgba(255, 51, 102, 0.3);
              box-shadow: 0 0 30px rgba(255, 51, 102, 0.6);
            }
            100% {
              transform: scale(1);
              background: rgba(0, 0, 0, 0.7);
            }
          }

          .remix-btn {
            padding: 12px 25px;
            background: rgba(0, 0, 0, 0.7);
            border: 2px solid #ff3366;
            color: #ff3366;
            border-radius: 50px;
            font-family: 'Space Grotesk', sans-serif;
            font-weight: 700;
            font-size: 0.9rem;
            text-transform: uppercase;
            letter-spacing: 1px;
            cursor: pointer;
            transition: all 0.3s ease;
            margin-top: 15px;
            box-shadow:
              0 8px 25px rgba(255, 51, 102, 0.2),
              0 0 20px rgba(255, 51, 102, 0.1);
          }

          .remix-btn:hover {
            background: rgba(255, 51, 102, 0.1);
            transform: translateY(-2px);
            box-shadow:
              0 12px 35px rgba(255, 51, 102, 0.3),
              0 0 30px rgba(255, 51, 102, 0.2);
          }

          .sparks {
            position: fixed;
            width: 100%;
            height: 100%;
            z-index: 1;
            overflow: hidden;
            top: 0;
            left: 0;
            pointer-events: none;
          }

          .spark {
            position: absolute;
            width: 2px;
            height: 2px;
            background: #ff6600;
            border-radius: 50%;
            opacity: 0;
            animation: spark 4s infinite ease-out;
            box-shadow: 0 0 6px #ff6600;
          }

          .spark:nth-child(1) {
            top: 25%;
            left: 20%;
            animation-delay: 0s;
          }

          .spark:nth-child(2) {
            top: 70%;
            left: 80%;
            animation-delay: 1.5s;
          }

          .spark:nth-child(3) {
            top: 50%;
            left: 10%;
            animation-delay: 3s;
          }

          .spark:nth-child(4) {
            top: 30%;
            left: 90%;
            animation-delay: 2.5s;
          }

          @keyframes spark {
            0% {
              opacity: 0;
              transform: scale(1);
            }
            50% {
              opacity: 1;
              transform: scale(2);
            }
            100% {
              opacity: 0;
              transform: scale(1);
            }
          }

          @media (max-width: 768px) {
            .gallery-grid {
              grid-template-columns: 1fr;
            }
            .logo { font-size: 3rem; }
            .gallery-hero h1 { font-size: 2.5rem; }
            .creator-stats { 
              gap: 15px; 
              flex-direction: column;
              align-items: center;
            }
            .gallery-grid { 
              gap: 30px;
            }
            .gallery-card { padding: 25px 20px; }
            .hero-content { padding: 40px 25px; }
          }

          @media (max-width: 480px) {
            .logo { font-size: 2.5rem; }
            .gallery-hero h1 { font-size: 2rem; }
            .gallery-card { padding: 20px 15px; }
            .hero-content { padding: 30px 20px; }
            .try-app-btn { padding: 12px 25px; font-size: 0.9rem; }
            .remix-btn { padding: 10px 20px; font-size: 0.8rem; }
          }
        `}</style>
    </>
  )
} 
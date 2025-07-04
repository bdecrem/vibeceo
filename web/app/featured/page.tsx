"use client"

import React, { useState, useEffect } from "react"
import Link from "next/link"
// import { PromptClick } from "@/components/ui/prompt-click"

// Force dynamic rendering
export const dynamic = 'force-dynamic'

interface WtafApp {
  id: string
  app_slug: string
  user_slug: string
  original_prompt: string
  created_at: string
  remix_count: number
  recent_remixes?: number
  is_remix: boolean
  parent_app_id: string | null
  is_featured: boolean
  last_remixed_at: string | null
  Fave?: boolean
  Forget?: boolean
  type: string
}

interface FeaturedStats {
  totalTrendingApps: number
  totalRemixesThisWeek: number
  appsWithRecentActivity: number
  period: string
}

interface FeaturedData {
  apps: WtafApp[]
  stats: FeaturedStats
}

export default function GalleryPage() {
  const [data, setData] = useState<FeaturedData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [copiedNotification, setCopiedNotification] = useState({ show: false, text: "" })

  const showCopiedNotification = (text: string) => {
    setCopiedNotification({ show: true, text })
    setTimeout(() => {
      setCopiedNotification({ show: false, text: "" })
    }, 2000)
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

  const handleRemixClick = async (appSlug: string) => {
    const remixCommand = `REMIX ${appSlug}`
    const success = await copyToClipboard(remixCommand)
    if (success) {
      showCopiedNotification("REMIX command copied!")
    }
  }

  const handlePromptClick = async (e: React.MouseEvent, prompt: string) => {
    const success = await copyToClipboard(prompt)
    if (success) {
      showCopiedNotification("Prompt copied!")
    }
    // Add clicked class for animation
    const target = e.target as HTMLElement
    target.classList.add("clicked")
    setTimeout(() => {
      target.classList.remove("clicked")
    }, 600)
  }

  useEffect(() => {
    // Set page title
    document.title = "The Gallery"
    
    const fetchFeaturedData = async () => {
      try {
        const response = await fetch('/api/featured-wtaf', {
          cache: 'no-store'
        })
        
        if (!response.ok) {
          throw new Error(`Failed to fetch featured data: ${response.status}`)
        }
        
        const result = await response.json()
        setData(result)
      } catch (err) {
        console.error('Error fetching featured data:', err)
        setError(err instanceof Error ? err.message : 'Failed to load featured data')
      } finally {
        setLoading(false)
      }
    }

    fetchFeaturedData()
  }, [])

  if (loading) {
    return (
      <>
        <link
          href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;500;700;900&family=Inter:wght@300;400;500;600&display=swap"
          rel="stylesheet"
        />
        <div className="loading-container">
          <div className="text-center py-12">
            <div className="text-6xl mb-4">⚡</div>
            <h3 className="text-2xl text-white mb-4">Loading featured apps...</h3>
          </div>
        </div>
      </>
    )
  }

  if (error || !data) {
    return (
      <>
        <link
          href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;500;700;900&family=Inter:wght@300;400;500;600&display=swap"
          rel="stylesheet"
        />
        <div className="error-container">
          <div className="text-center py-12">
            <div className="text-6xl mb-4">⚠️</div>
            <h3 className="text-2xl text-white mb-4">Failed to load featured</h3>
            <p className="text-gray-300 text-lg">
              Try refreshing the page or check back later.
            </p>
          </div>
        </div>
      </>
    )
  }

  const { apps, stats } = data

  return (
    <>
      <link
        href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;500;700;900&family=Inter:wght@300;400;500;600&display=swap"
        rel="stylesheet"
      />
        {/* Copied Notification */}
        {copiedNotification.show && (
          <div className="copied-notification">
            <span className="copied-text">{copiedNotification.text}</span>
            <span className="copied-checkmark">✓</span>
          </div>
        )}

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
          <div className="logo glitch" data-text="THE GALLERY">
            THE GALLERY
          </div>
          <div className="tagline">VIBECODED CHAOS UNLEASHED</div>
          <nav className="nav-back">
            <Link href="/" className="back-link">
              ← Back to WTAF
            </Link>
          </nav>
        </header>

        <main>
          <section className="gallery-hero">
            <div className="hero-content">
              <h1 className="glitch" data-text="Apps Born from Pure Chaos">
                Apps Born from Pure Chaos
              </h1>
              <p>
                Each creation spawned from a single SMS. No meetings. No wireframes. Just raw prompts transformed into
                digital reality through algorithmic rebellion.
              </p>
            </div>
          </section>

          <section className="gallery-grid">
            {apps.map((app: WtafApp) => (
              <div key={app.id} className="gallery-card">
                <div className="image-container">
                  <Link href={`/${app.user_slug}/${app.app_slug}`}>
                    <img src={`https://tqniseocczttrfwtpbdr.supabase.co/storage/v1/object/public/og-images/${app.user_slug}-${app.app_slug}.png`} alt={app.app_slug} className="gallery-image" />
                    <div className="image-overlay">
                      <button className="try-app-btn">TRY THIS APP</button>
                    </div>
                  </Link>
                </div>
                <div className="card-content">
                  <div className="prompt-label">The prompt:</div>
                  <div className="prompt-showcase" onClick={(e) => handlePromptClick(e, app.original_prompt)}>
                    "{app.original_prompt}"
                  </div>
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
            background: linear-gradient(135deg, #0a0a0a 0%, #1a4d4d 25%, #004d4d 50%, #003366 75%, #000033 100%);
            background-size: 400% 400%;
            animation: gradientShift 14s ease infinite;
            font-family: 'Inter', sans-serif;
            overflow-x: hidden;
            min-height: 100vh;
            color: #ffffff;
          }

          .copied-notification {
            position: fixed;
            top: 30px;
            right: 30px;
            background: linear-gradient(45deg, #00ffff, #0080ff);
            color: #ffffff;
            padding: 15px 25px;
            border-radius: 50px;
            font-family: 'Space Grotesk', sans-serif;
            font-weight: 700;
            font-size: 1rem;
            z-index: 1000;
            display: flex;
            align-items: center;
            gap: 10px;
            box-shadow: 
              0 8px 25px rgba(0, 255, 255, 0.3),
              0 0 20px rgba(0, 255, 255, 0.2);
            animation: slideInFade 2s ease-out;
            text-shadow: 0 0 10px rgba(0, 0, 0, 0.8);
          }

          .copied-checkmark {
            background: rgba(255, 255, 255, 0.2);
            border-radius: 50%;
            width: 25px;
            height: 25px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 0.9rem;
          }

          @keyframes slideInFade {
            0% {
              transform: translateX(100px);
              opacity: 0;
            }
            20% {
              transform: translateX(0);
              opacity: 1;
            }
            80% {
              transform: translateX(0);
              opacity: 1;
            }
            100% {
              transform: translateX(100px);
              opacity: 0;
            }
          }

          @keyframes gradientShift {
            0% { background-position: 0% 50%; }
            50% { background-position: 100% 50%; }
            100% { background-position: 0% 50%; }
          }

          .float-element {
            position: absolute;
            opacity: 0.4;
            animation: float 7s ease-in-out infinite;
            pointer-events: none;
            filter: drop-shadow(0 0 10px rgba(0, 255, 255, 0.3));
          }

          .skull {
            top: 8%;
            left: 5%;
            font-size: 3.5rem;
            color: rgba(0, 255, 255, 0.3);
            animation-delay: 0s;
          }

          .lightning {
            top: 30%;
            right: 8%;
            font-size: 4rem;
            color: rgba(0, 255, 150, 0.4);
            animation-delay: 2.5s;
          }

          .fire {
            bottom: 25%;
            left: 12%;
            font-size: 3.8rem;
            color: rgba(0, 200, 255, 0.4);
            animation-delay: 5s;
          }

          .chains {
            bottom: 10%;
            right: 15%;
            font-size: 3.2rem;
            color: rgba(100, 200, 255, 0.3);
            animation-delay: 1.5s;
          }

          @keyframes float {
            0%, 100% { transform: translateY(0px) rotate(0deg); }
            33% { transform: translateY(-25px) rotate(7deg); }
            66% { transform: translateY(15px) rotate(-5deg); }
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
            color: #00ffff;
            z-index: -1;
          }

          .glitch::after {
            animation: glitch2 2s infinite;
            color: #0080ff;
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
              0 0 10px #00ffff,
              0 0 20px #00ffff,
              0 0 30px #00ffff;
            margin-bottom: 15px;
            letter-spacing: -2px;
          }

          .tagline {
            font-size: 1.1rem;
            color: #00ffff;
            font-weight: 500;
            letter-spacing: 3px;
            text-transform: uppercase;
            margin-bottom: 30px;
            text-shadow: 0 0 5px #00ffff;
          }

          .nav-back {
            margin-top: 20px;
          }

          .back-link {
            color: #0080ff;
            text-decoration: none;
            font-family: 'Space Grotesk', sans-serif;
            font-weight: 600;
            font-size: 1.1rem;
            text-shadow: 0 0 8px rgba(0, 128, 255, 0.5);
            transition: all 0.3s ease;
          }

          .back-link:hover {
            color: #ffffff;
            text-shadow: 0 0 15px rgba(0, 128, 255, 0.8);
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
            border: 2px solid rgba(0, 255, 255, 0.3);
            border-radius: 30px;
            padding: 50px 40px;
            box-shadow:
              0 12px 40px rgba(0, 0, 0, 0.4),
              inset 0 0 20px rgba(0, 255, 255, 0.1);
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
            text-shadow: 0 0 15px #0080ff;
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
            background: linear-gradient(90deg, #00ffff, #0080ff, #00ff80, #00ffff);
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
              0 0 30px rgba(0, 255, 255, 0.2);
            border-color: rgba(0, 255, 255, 0.3);
          }

          .image-container {
            position: relative;
            margin-bottom: 25px;
            overflow: hidden;
            border-radius: 15px;
            border: 2px solid rgba(255, 255, 255, 0.3);
            transition: all 0.3s ease;
          }

          .gallery-image {
            width: 100%;
            height: auto;
            aspect-ratio: 3 / 2;
            object-fit: cover;
            border-radius: 15px;
            filter: drop-shadow(0 0 20px rgba(0, 255, 255, 0.5));
            transition: all 0.3s ease;
            background: rgba(0, 0, 0, 0.2);
          }

          .image-overlay {
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.7);
            display: flex;
            align-items: center;
            justify-content: center;
            opacity: 0;
            transition: all 0.3s ease;
            border-radius: 15px;
          }

          .image-container:hover .image-overlay {
            opacity: 1;
          }

          .image-container:hover .gallery-image {
            transform: scale(1.05);
            filter: drop-shadow(0 0 30px rgba(0, 255, 255, 0.8));
          }

          .image-container:hover {
            border-color: rgba(0, 255, 255, 0.7);
          }

          .try-app-btn {
            padding: 15px 30px;
            background: linear-gradient(45deg, #00ffff, #0080ff);
            color: #000000;
            border: none;
            border-radius: 50px;
            font-family: 'Space Grotesk', sans-serif;
            font-weight: 700;
            font-size: 1rem;
            text-transform: uppercase;
            letter-spacing: 1px;
            cursor: pointer;
            transition: all 0.3s ease;
            box-shadow:
              0 8px 25px rgba(0, 255, 255, 0.3),
              0 0 20px rgba(0, 255, 255, 0.2);
          }

          .try-app-btn:hover {
            transform: scale(1.05);
            box-shadow:
              0 12px 35px rgba(0, 255, 255, 0.4),
              0 0 30px rgba(0, 255, 255, 0.3);
          }

          .card-content {
            text-align: center;
          }

          .creator-info {
            display: flex;
            justify-content: center;
            align-items: center;
            gap: 12px;
            margin-bottom: 15px;
            flex-wrap: wrap;
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
            color: #00ffff;
            font-weight: 700;
            text-decoration: none;
            text-shadow: 0 0 8px rgba(0, 255, 255, 0.5);
            transition: all 0.3s ease;
            cursor: pointer;
          }

          .creator-handle:hover {
            color: #ffffff;
            text-shadow: 0 0 15px rgba(0, 255, 255, 0.8);
            transform: translateY(-1px);
          }

          .remix-count {
            font-family: 'Space Grotesk', sans-serif;
            font-size: 0.8rem;
            color: #0080ff;
            font-weight: 600;
            background: rgba(0, 128, 255, 0.1);
            padding: 4px 8px;
            border-radius: 12px;
            border: 1px solid rgba(0, 128, 255, 0.3);
            text-shadow: 0 0 5px rgba(0, 128, 255, 0.5);
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
            color: #0080ff;
            font-family: 'Space Grotesk', monospace;
            font-size: 1rem;
            font-weight: 500;
            background: rgba(0, 128, 255, 0.1);
            border: 2px solid rgba(0, 128, 255, 0.3);
            border-radius: 15px;
            padding: 15px 20px;
            margin-bottom: 20px;
            text-shadow: 0 0 8px rgba(0, 128, 255, 0.5);
            backdrop-filter: blur(5px);
            font-style: italic;
            line-height: 1.4;
            cursor: pointer;
            transition: all 0.3s ease;
            user-select: none;
          }

          .prompt-showcase:hover {
            background: rgba(0, 128, 255, 0.15);
            border-color: rgba(0, 128, 255, 0.5);
            transform: translateY(-2px);
            box-shadow: 0 8px 25px rgba(0, 128, 255, 0.2);
          }

          .prompt-showcase.clicked {
            animation: copyPulse 0.6s ease-out;
          }

          @keyframes copyPulse {
            0% {
              transform: scale(1);
              background: rgba(0, 128, 255, 0.1);
            }
            50% {
              transform: scale(1.02);
              background: rgba(0, 128, 255, 0.3);
              box-shadow: 0 0 30px rgba(0, 128, 255, 0.6);
            }
            100% {
              transform: scale(1);
              background: rgba(0, 128, 255, 0.1);
            }
          }

          .remix-btn {
            padding: 12px 25px;
            background: rgba(0, 0, 0, 0.7);
            border: 2px solid #0080ff;
            color: #0080ff;
            border-radius: 50px;
            font-family: 'Space Grotesk', sans-serif;
            font-weight: 700;
            font-size: 0.9rem;
            text-transform: uppercase;
            letter-spacing: 1px;
            cursor: pointer;
            transition: all 0.3s ease;
            box-shadow:
              0 8px 25px rgba(0, 128, 255, 0.2),
              0 0 20px rgba(0, 128, 255, 0.1);
          }

          .remix-btn:hover {
            background: rgba(0, 128, 255, 0.1);
            transform: translateY(-2px);
            box-shadow:
              0 12px 35px rgba(0, 128, 255, 0.3),
              0 0 30px rgba(0, 128, 255, 0.2);
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
            background: #00ff96;
            border-radius: 50%;
            opacity: 0;
            animation: spark 3.5s infinite ease-out;
            box-shadow: 0 0 6px #00ff96;
          }

          .spark:nth-child(1) {
            top: 25%;
            left: 20%;
            animation-delay: 0s;
          }

          .spark:nth-child(2) {
            top: 70%;
            left: 80%;
            animation-delay: 1.2s;
          }

          .spark:nth-child(3) {
            top: 50%;
            left: 10%;
            animation-delay: 2.4s;
          }

          .spark:nth-child(4) {
            top: 30%;
            left: 90%;
            animation-delay: 1.8s;
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
            .gallery-grid { 
              gap: 30px;
            }
            .gallery-card { padding: 25px 20px; }
            .gallery-hero h1 { font-size: 2.5rem; line-height: 1.2; }
            .gallery-hero p { font-size: 1rem; }
            .hero-content { padding: 40px 25px; }
          }

          @media (max-width: 480px) {
            .logo { font-size: 2.5rem; }
            .gallery-card { padding: 20px 15px; }
            .gallery-hero h1 { font-size: 2rem; line-height: 1.1; }
            .hero-content { padding: 30px 20px; }
            .try-app-btn { padding: 12px 25px; font-size: 0.9rem; }
            .remix-btn { padding: 10px 20px; font-size: 0.8rem; }
          }
        `}</style>
    </>
  )
}

"use client"

import React, { useState, useEffect } from "react"
import Link from "next/link"
import TruncatedPrompt from "@/components/truncated-prompt"
import CopiedModal from "@/components/ui/copied-modal"

// Force dynamic rendering
export const dynamic = 'force-dynamic'

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

export default function FeaturedGalleryPage() {
  const [data, setData] = useState<FeaturedData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
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

  const handleRemixClick = async (appSlug: string) => {
    const remixCommand = `REMIX ${appSlug}`
    const success = await copyToClipboard(remixCommand)
    if (success) {
      showCopiedNotification(remixCommand)
    }
  }

  const handlePromptClick = async (e: React.MouseEvent, prompt: string) => {
    const success = await copyToClipboard(prompt)
    if (success) {
      showCopiedNotification(prompt)
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
    document.title = "Featured Gallery - WEBTOYS"
    
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
      <div className="loading-container">
        <div className="loading-content">
          <div className="loading-icon">🎨</div>
          <h3 className="loading-title">Loading our featured creations...</h3>
          <p className="loading-subtitle">Gathering the finest SMS-born masterpieces</p>
        </div>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="error-container">
        <div className="error-content">
          <div className="error-icon">😅</div>
          <h3 className="error-title">Oops! Something went wrong</h3>
          <p className="error-subtitle">
            Our featured apps are taking a coffee break. Try refreshing the page!
          </p>
        </div>
      </div>
    )
  }

  const { apps, stats } = data

  return (
    <>
      {/* Copied Modal */}
      <CopiedModal 
        show={copiedNotification.show}
        text={copiedNotification.text}
        onClose={closeCopiedModal}
      />

      {/* Floating shapes */}
      <div className="floating-shape shape1"></div>
      <div className="floating-shape shape2"></div>
      <div className="floating-shape shape3"></div>
      <div className="floating-shape shape4"></div>

      {/* Navigation */}
      <nav className="nav">
        <div className="nav-container">
          <Link href="/" className="logo">WEBTOYS</Link>
          <div className="nav-links">
            <Link href="/" className="back-link">
              ← Back to Home
            </Link>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="main-content">
        {/* Header Section */}
        <section className="featured-header">
          <div className="header-container">
            <h1 className="featured-title">FEATURED GALLERY</h1>
          </div>
        </section>

        {/* Gallery Grid */}
        <section className="gallery-section">
          <div className="gallery-container">
            <div className="gallery-grid">
              {apps.map((app: WtafApp, index: number) => (
                <div key={app.id} className="gallery-card" style={{ animationDelay: `${index * 0.1}s` }}>
                  <div className="image-container">
                    <img 
                      src={app.type === 'MEME' && app.landscape_image_url ? app.landscape_image_url : (app.og_image_url || `https://tqniseocczttrfwtpbdr.supabase.co/storage/v1/object/public/og-images/${app.user_slug}-${app.app_slug}.png`)} 
                      alt={app.app_slug} 
                      className="gallery-image" 
                    />
                    <div className="image-overlay">
                      <Link href={`/${app.user_slug}/${app.app_slug}${app.type === 'ZAD' ? '?demo=true' : ''}`} className="try-app-btn">
                        Try This App
                      </Link>
                    </div>
                  </div>
                  <div className="card-content">
                    <div className="creator-info">
                      <span className="creator-label">by</span>
                      <Link href={`/wtaf/${app.user_slug}/creations`} className="creator-handle">
                        @{app.user_slug}
                      </Link>
                      {app.remix_count > 0 && (
                        <div className="remix-count">
                          {app.remix_count} remix{app.remix_count !== 1 ? 'es' : ''}
                        </div>
                      )}
                    </div>
                    <div className="prompt-label">The Text Message:</div>
                    <TruncatedPrompt
                      prompt={app.original_prompt}
                      maxLength={120}
                      className="prompt-showcase"
                      copyOnClick={true}
                    />
                    <button className="remix-btn" onClick={() => handleRemixClick(app.app_slug)}>
                      <span className="remix-icon">🎨</span>
                      <span>Remix This</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

      </main>

      <style jsx global>{`
        /* WEBTOYS GRAND Design System */
        :root {
          /* Core WEBTOYS DNA Colors */
          --cream: #FEFEF5;
          --yellow: #FFD63D;
          --yellow-soft: #FFF4CC;
          --blue: #6ECBFF;
          --blue-deep: #4A9FD4;
          --red: #FF4B4B;
          --red-soft: #FF7A7A;
          --purple-shadow: #C9C2F940;
          --purple-accent: #8B7FD4;
          --green-mint: #B6FFB3;
          --green-sage: #7FB069;
          
          /* Professional Additions */
          --charcoal: #2A2A2A;
          --gray-warm: #6B6B6B;
          --white-pure: #FFFFFF;
          --black-soft: #1A1A1A;
        }
        
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          background: var(--cream);
          color: var(--charcoal);
          line-height: 1.6;
          overflow-x: hidden;
        }


        /* Floating shapes */
        .floating-shape {
          position: fixed;
          opacity: 0.2;
          animation: float-shape 25s infinite ease-in-out;
          pointer-events: none;
          z-index: 1;
        }
        
        .shape1 {
          width: 180px;
          height: 180px;
          background: var(--yellow);
          border-radius: 50%;
          top: 15%;
          left: 8%;
          animation-delay: 0s;
        }
        
        .shape2 {
          width: 120px;
          height: 120px;
          background: var(--blue);
          border-radius: 30% 70% 70% 30% / 30% 30% 70% 70%;
          top: 70%;
          right: 12%;
          animation-delay: 8s;
        }
        
        .shape3 {
          width: 90px;
          height: 90px;
          background: var(--red);
          clip-path: polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%);
          bottom: 25%;
          left: 18%;
          animation-delay: 16s;
        }

        .shape4 {
          width: 140px;
          height: 140px;
          background: var(--purple-accent);
          border-radius: 20% 80% 20% 80% / 80% 20% 80% 20%;
          top: 40%;
          right: 5%;
          animation-delay: 12s;
        }
        
        @keyframes float-shape {
          0%, 100% { transform: translate(0, 0) rotate(0deg); }
          25% { transform: translate(20px, -20px) rotate(90deg); }
          50% { transform: translate(-15px, 15px) rotate(180deg); }
          75% { transform: translate(25px, 8px) rotate(270deg); }
        }

        /* Loading States */
        .loading-container, .error-container {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          background: var(--cream);
        }

        .loading-content, .error-content {
          text-align: center;
          background: var(--white-pure);
          padding: 3rem;
          border-radius: 2rem;
          box-shadow: 0 10px 0 var(--yellow), 0 20px 40px var(--purple-shadow);
          border: 4px solid var(--yellow);
          max-width: 500px;
        }

        .loading-icon, .error-icon {
          font-size: 4rem;
          margin-bottom: 1.5rem;
          animation: bounce 2s ease-in-out infinite;
        }

        .loading-title, .error-title {
          font-size: 1.8rem;
          color: var(--charcoal);
          margin-bottom: 1rem;
          font-weight: 800;
        }

        .loading-subtitle, .error-subtitle {
          color: var(--gray-warm);
          font-size: 1.1rem;
        }

        @keyframes bounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-10px); }
        }

        /* Navigation */
        .nav {
          position: fixed;
          top: 0;
          width: 100%;
          background: var(--white-pure);
          border-bottom: 4px solid var(--yellow);
          box-shadow: 0 4px 20px var(--purple-shadow);
          z-index: 1000;
          transition: all 0.3s ease;
        }
        
        .nav-container {
          max-width: 1400px;
          margin: 0 auto;
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 1rem 2rem;
        }
        
        .logo {
          font-size: 1.8rem;
          font-weight: 800;
          background: linear-gradient(135deg, var(--red) 0%, var(--blue) 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          text-decoration: none;
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }
        
        .logo::before {
          content: "🎨";
          font-size: 2rem;
          animation: spin 4s ease-in-out infinite;
        }
        
        @keyframes spin {
          0%, 100% { transform: rotate(0deg); }
          50% { transform: rotate(180deg); }
        }

        .back-link {
          color: var(--blue-deep);
          text-decoration: none;
          font-weight: 600;
          padding: 0.5rem 1.5rem;
          border-radius: 2rem;
          transition: all 0.3s ease;
        }

        .back-link:hover {
          background: var(--blue);
          color: white;
          transform: translateY(-2px);
        }

        /* Main Content */
        .main-content {
          margin-top: 80px;
        }

        /* Featured Header Section */
        .featured-header {
          padding: 3rem 2rem 2rem;
          text-align: center;
        }

        .header-container {
          max-width: 1200px;
          margin: 0 auto;
        }

        .featured-title {
          font-size: clamp(2rem, 4vw, 3.5rem);
          color: var(--red);
          margin-bottom: 1rem;
          text-transform: uppercase;
          font-weight: 700;
          letter-spacing: -1px;
          position: relative;
          display: inline-block;
          transform: rotate(-2deg);
        }

        .featured-title::after {
          content: "✨";
          position: absolute;
          top: -20px;
          right: -40px;
          font-size: 2rem;
          animation: sparkle 2s ease-in-out infinite;
        }

        @keyframes sparkle {
          0%, 100% { opacity: 1; transform: scale(1) rotate(0deg); }
          50% { opacity: 0.5; transform: scale(1.2) rotate(180deg); }
        }
          color: var(--gray-warm);
          text-transform: uppercase;
          letter-spacing: 1px;
          font-weight: 600;
        }

        /* Gallery Section */
        .gallery-section {
          padding: 4rem 2rem;
          background: var(--white-pure);
        }

        .gallery-container {
          max-width: 1400px;
          margin: 0 auto;
        }

        .gallery-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
          gap: 3rem;
        }

        .gallery-card {
          background: var(--cream);
          border: 5px solid var(--yellow);
          border-radius: 2rem;
          overflow: hidden;
          box-shadow: 0 10px 0 var(--purple-accent);
          transition: all 0.3s ease;
          position: relative;
          animation: cardSlideIn 0.6s ease-out both;
          display: flex;
          flex-direction: column;
        }

        @keyframes cardSlideIn {
          0% {
            opacity: 0;
            transform: translateY(30px);
          }
          100% {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .gallery-card:hover {
          transform: translateY(-8px);
          box-shadow: 0 18px 0 var(--purple-accent);
        }

        .image-container {
          position: relative;
          overflow: hidden;
          background: var(--white-pure);
        }

        .gallery-image {
          width: 100%;
          height: auto;
          aspect-ratio: 3 / 2;
          object-fit: cover;
          transition: all 0.3s ease;
          display: block;
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
        }

        .image-container:hover .image-overlay {
          opacity: 1;
        }

        .image-container:hover .gallery-image {
          transform: scale(1.05);
        }

        .try-app-btn {
          background: var(--blue);
          color: white;
          padding: 1rem 2rem;
          border-radius: 2rem;
          font-weight: 700;
          font-size: 1rem;
          text-decoration: none;
          transition: all 0.3s ease;
          text-transform: uppercase;
          letter-spacing: 1px;
          box-shadow: 0 4px 0 var(--blue-deep);
        }

        .try-app-btn:hover {
          background: var(--blue-deep);
          transform: translateY(-2px);
          box-shadow: 0 6px 0 var(--blue);
        }

        .card-content {
          padding: 2rem;
          flex: 1;
          display: flex;
          flex-direction: column;
        }

        .creator-info {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1.5rem;
          flex-wrap: wrap;
          gap: 1rem;
        }

        .creator-label {
          font-size: 0.9rem;
          color: var(--gray-warm);
          font-weight: 500;
        }

        .creator-handle {
          color: var(--red);
          font-weight: 700;
          text-decoration: none;
          transition: all 0.3s ease;
        }

        .creator-handle:hover {
          color: var(--red-soft);
          transform: translateY(-1px);
        }

        .remix-count {
          background: var(--purple-accent);
          color: white;
          padding: 0.3rem 0.8rem;
          border-radius: 1rem;
          font-size: 0.8rem;
          font-weight: 600;
        }

        .prompt-label {
          font-size: 0.9rem;
          color: var(--gray-warm);
          text-transform: uppercase;
          letter-spacing: 1px;
          margin-bottom: 0.8rem;
          font-weight: 600;
        }

        .prompt-showcase {
          background: var(--white-pure);
          border: 3px solid var(--green-mint);
          border-radius: 1.5rem;
          padding: 1.2rem;
          margin-bottom: 1.5rem;
          font-size: 1.1rem;
          font-weight: 600;
          color: var(--charcoal);
          cursor: pointer;
          transition: all 0.3s ease;
          line-height: 1.4;
          flex: 1;
        }

        .prompt-showcase:hover {
          background: var(--green-mint);
          transform: translateY(-2px);
        }

        .prompt-showcase.clicked {
          animation: copyPulse 0.6s ease-out;
        }

        @keyframes copyPulse {
          0% {
            transform: scale(1);
            background: var(--white-pure);
          }
          50% {
            transform: scale(1.02);
            background: var(--green-mint);
          }
          100% {
            transform: scale(1);
            background: var(--white-pure);
          }
        }

        .remix-btn {
          background: var(--white-pure);
          border: 3px solid var(--purple-accent);
          color: var(--purple-accent);
          padding: 0.8rem 1.5rem;
          border-radius: 2rem;
          font-weight: 700;
          font-size: 1rem;
          cursor: pointer;
          transition: all 0.3s ease;
          display: flex;
          align-items: center;
          gap: 0.5rem;
          margin: 0 auto;
          margin-top: auto;
        }

        .remix-btn:hover {
          background: var(--purple-accent);
          color: white;
          transform: translateY(-2px);
        }

        .remix-icon {
          font-size: 1.2rem;
        }


        /* Responsive Design */
        @media (max-width: 768px) {
          .nav-container {
            padding: 1rem;
          }

          .hero-content {
            padding: 2rem 1.5rem;
          }

          .stats-row {
            gap: 2rem;
          }

          .stat-number {
            font-size: 2rem;
          }

          .gallery-grid {
            grid-template-columns: 1fr;
            gap: 2rem;
          }

          .creator-info {
            justify-content: center;
            text-align: center;
          }

        }

        @media (max-width: 480px) {
          .featured-title {
            font-size: 2rem;
            transform: none !important; /* Disable rotation on mobile */
          }

          .gallery-card {
            border-width: 3px;
          }

          .card-content {
            padding: 1.5rem;
          }

        }
      `}</style>
    </>
  )
}
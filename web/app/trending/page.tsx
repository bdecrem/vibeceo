"use client"

import React, { useState, useEffect, useCallback } from "react"
import Link from "next/link"
import TruncatedPrompt from "@/components/truncated-prompt"
import Pagination from "@/components/ui/pagination"
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

interface TrendingStats {
  totalTrendingApps: number
  totalRemixesThisWeek: number
  appsWithRecentActivity: number
  period: string
}

interface PaginationData {
  page: number
  limit: number
  totalCount: number
  totalPages: number
  hasNextPage: boolean
  hasPreviousPage: boolean
}

interface TrendingData {
  apps: WtafApp[]
  stats: TrendingStats
  pagination: PaginationData
}

export default function TrendingPage() {
  const [data, setData] = useState<TrendingData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [copiedNotification, setCopiedNotification] = useState({ show: false, text: "" })
  const limit = 20

  const showCopiedNotification = (text: string) => {
    setCopiedNotification({ show: true, text })
    setTimeout(() => {
      setCopiedNotification({ show: false, text: "" })
    }, 3000)
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

  const closeCopiedModal = () => {
    setCopiedNotification({ show: false, text: "" })
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
    const totalRemixes = app.total_descendants || app.remix_count || 0
    if (totalRemixes > 0) {
      return `${totalRemixes} ${totalRemixes === 1 ? 'remix' : 'remixes'}`
    }
    return getTimestampLabel(app.created_at)
  }

  const fetchTrendingData = useCallback(async (page: number) => {
    try {
      setLoading(true)
      const response = await fetch(`/api/trending-wtaf?page=${page}&limit=${limit}`, {
        cache: 'no-store'
      })
      
      if (!response.ok) {
        throw new Error(`Failed to fetch trending data: ${response.status}`)
      }
      
      const result = await response.json()
      setData(result)
      setError(null)
    } catch (err) {
      console.error('Error fetching trending data:', err)
      setError(err instanceof Error ? err.message : 'Failed to load trending data')
    } finally {
      setLoading(false)
    }
  }, [limit])

  useEffect(() => {
    // Set page title
    document.title = "Trending - WEBTOYS"
    fetchTrendingData(currentPage)
  }, [currentPage, fetchTrendingData])

  const handlePageChange = (page: number) => {
    setCurrentPage(page)
    // Scroll to top when changing pages
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-content">
          <div className="loading-icon">🔥</div>
          <h3 className="loading-title">Loading trending apps...</h3>
          <p className="loading-subtitle">Finding the hottest creations in the WEBTOYS universe</p>
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
            Our trending apps are taking a coffee break. Try refreshing the page!
          </p>
          <button 
            onClick={() => fetchTrendingData(currentPage)}
            className="retry-btn"
          >
            Try Again
          </button>
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
      <div className="floating-shape shape5"></div>

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
        {/* Hero Section */}
        <section className="trending-hero">
          <div className="hero-container">
            <div className="hero-content">
              <h1 className="hero-title">🔥 Trending Now</h1>
              <p className="hero-description">
                The hottest, most talked-about apps burning up the WEBTOYS ecosystem right now. 
                These are the creations everyone's remixing, sharing, and falling in love with.
              </p>
              <div className="stats-row">
                <div className="stat-item">
                  <div className="stat-number">{stats.totalTrendingApps}</div>
                  <div className="stat-label">Trending Apps</div>
                </div>
                <div className="stat-item">
                  <div className="stat-number">{stats.totalRemixesThisWeek}</div>
                  <div className="stat-label">Remixes This Week</div>
                </div>
                <div className="stat-item">
                  <div className="stat-number">{stats.appsWithRecentActivity}</div>
                  <div className="stat-label">Recently Active</div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Trending Grid */}
        <section className="trending-section">
          <div className="trending-container">
            <div className="trending-grid">
              {apps.map((app: WtafApp, index: number) => (
                <div key={app.id} className="trending-card" style={{ animationDelay: `${index * 0.1}s` }}>
                  <div className="card-rank">#{index + 1 + (currentPage - 1) * limit}</div>
                  <div className="image-container">
                    <img 
                      src={`https://tqniseocczttrfwtpbdr.supabase.co/storage/v1/object/public/og-images/${app.user_slug}-${app.app_slug}.png`} 
                      alt={app.app_slug} 
                      className="trending-image" 
                    />
                    <div className="image-overlay">
                      <Link href={`/${app.user_slug}/${app.app_slug}?demo=true`} className="try-app-btn">
                        🚀 Try This App
                      </Link>
                    </div>
                  </div>
                  <div className="card-content">
                    <div className="creator-stats">
                      <div className="creator-info">
                        <span className="creator-label">by</span>
                        <Link href={`/wtaf/${app.user_slug}/creations`} className="creator-handle">
                          @{app.user_slug}
                        </Link>
                      </div>
                      <div className="remix-stats">
                        {(app.total_descendants || app.remix_count || 0) > 0 ? (
                          <Link href={`/wtaf/${app.user_slug}/${app.app_slug}/remix-tree`} className="remix-count-link">
                            <span className="remix-number">{app.total_descendants || app.remix_count || 0}</span>
                            <span className="remix-label">{(app.total_descendants || app.remix_count || 0) === 1 ? 'remix' : 'remixes'}</span>
                          </Link>
                        ) : (
                          <span className="timestamp-label">{getRemixInfo(app)}</span>
                        )}
                      </div>
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

        {/* Pagination */}
        {data.pagination && (
          <section className="pagination-section">
            <div className="pagination-container">
              <Pagination
                currentPage={data.pagination.page}
                totalPages={data.pagination.totalPages}
                onPageChange={handlePageChange}
                hasNextPage={data.pagination.hasNextPage}
                hasPreviousPage={data.pagination.hasPreviousPage}
                totalCount={data.pagination.totalCount}
                limit={data.pagination.limit}
              />
            </div>
          </section>
        )}

        {/* Call to Action */}
        <section className="cta-section">
          <div className="cta-container">
            <h2 className="cta-title">Want to Create the Next Trending App?</h2>
            <p className="cta-description">
              Join thousands of creators who've brought their wildest ideas to life with just a text message.
            </p>
            <a href="sms:+18663300015" className="cta-button">
              <span>📱</span>
              <span>Text (866) 330-0015 Now</span>
            </a>
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
          --orange: #FF8C42;
          --orange-soft: #FFB380;
          
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

        /* Copied Notification */
        .copied-notification {
          position: fixed;
          top: 120px;
          right: 30px;
          background: var(--green-mint);
          color: var(--charcoal);
          padding: 15px 25px;
          border-radius: 2rem;
          font-weight: 700;
          font-size: 1rem;
          z-index: 1000;
          display: flex;
          align-items: center;
          gap: 10px;
          box-shadow: 0 8px 25px var(--purple-shadow);
          animation: slideInFade 3s ease-out;
          border: 3px solid var(--green-sage);
        }

        .copied-checkmark {
          background: var(--green-sage);
          color: white;
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
          15% {
            transform: translateX(0);
            opacity: 1;
          }
          85% {
            transform: translateX(0);
            opacity: 1;
          }
          100% {
            transform: translateX(100px);
            opacity: 0;
          }
        }

        /* Floating shapes */
        .floating-shape {
          position: fixed;
          opacity: 0.15;
          animation: float-shape 30s infinite ease-in-out;
          pointer-events: none;
          z-index: 1;
        }
        
        .shape1 {
          width: 200px;
          height: 200px;
          background: var(--orange);
          border-radius: 50%;
          top: 10%;
          left: 5%;
          animation-delay: 0s;
        }
        
        .shape2 {
          width: 150px;
          height: 150px;
          background: var(--blue);
          border-radius: 30% 70% 70% 30% / 30% 30% 70% 70%;
          top: 60%;
          right: 8%;
          animation-delay: 10s;
        }
        
        .shape3 {
          width: 100px;
          height: 100px;
          background: var(--red);
          clip-path: polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%);
          bottom: 20%;
          left: 15%;
          animation-delay: 20s;
        }

        .shape4 {
          width: 120px;
          height: 120px;
          background: var(--purple-accent);
          border-radius: 20% 80% 20% 80% / 80% 20% 80% 20%;
          top: 35%;
          right: 20%;
          animation-delay: 15s;
        }

        .shape5 {
          width: 80px;
          height: 80px;
          background: var(--yellow);
          border-radius: 50% 0 50% 0;
          top: 80%;
          right: 40%;
          animation-delay: 5s;
        }
        
        @keyframes float-shape {
          0%, 100% { transform: translate(0, 0) rotate(0deg); }
          25% { transform: translate(25px, -25px) rotate(90deg); }
          50% { transform: translate(-20px, 20px) rotate(180deg); }
          75% { transform: translate(30px, 10px) rotate(270deg); }
        }

        /* Loading and Error States */
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
          box-shadow: 0 12px 0 var(--orange), 0 24px 60px var(--purple-shadow);
          border: 5px solid var(--orange);
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
          margin-bottom: 1.5rem;
        }

        .retry-btn {
          background: var(--orange);
          color: white;
          padding: 0.8rem 2rem;
          border: none;
          border-radius: 2rem;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.3s ease;
          box-shadow: 0 4px 0 var(--orange-soft);
        }

        .retry-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 0 var(--orange-soft);
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
          border-bottom: 5px solid var(--orange);
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
          background: linear-gradient(135deg, var(--orange) 0%, var(--red) 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          text-decoration: none;
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }
        
        .logo::before {
          content: "🔥";
          font-size: 2rem;
          animation: pulse 2s ease-in-out infinite;
        }
        
        @keyframes pulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.1); }
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
          margin-top: 90px;
        }

        /* Hero Section */
        .trending-hero {
          padding: 4rem 2rem;
          background: linear-gradient(135deg, var(--orange-soft) 0%, var(--cream) 60%, rgba(255,139,66,0.1) 100%);
        }

        .hero-container {
          max-width: 1200px;
          margin: 0 auto;
        }

        .hero-content {
          text-align: center;
          background: var(--white-pure);
          border: 6px solid var(--orange);
          border-radius: 3rem;
          padding: 3rem 2rem;
          box-shadow: 0 15px 0 var(--red), 0 30px 80px var(--purple-shadow);
          position: relative;
          z-index: 2;
        }

        .hero-title {
          font-size: clamp(2.5rem, 6vw, 4.5rem);
          font-weight: 900;
          color: var(--orange);
          margin-bottom: 1.5rem;
          text-transform: uppercase;
          letter-spacing: -2px;
          position: relative;
        }

        .hero-title::after {
          content: "⚡";
          position: absolute;
          top: -30px;
          right: -50px;
          font-size: 2.5rem;
          animation: sparkle 2s ease-in-out infinite;
        }

        @keyframes sparkle {
          0%, 100% { opacity: 1; transform: scale(1) rotate(0deg); }
          50% { opacity: 0.5; transform: scale(1.3) rotate(180deg); }
        }

        .hero-description {
          font-size: 1.3rem;
          color: var(--gray-warm);
          margin-bottom: 2.5rem;
          font-weight: 500;
          max-width: 800px;
          margin-left: auto;
          margin-right: auto;
        }

        .stats-row {
          display: flex;
          justify-content: center;
          gap: 3rem;
          flex-wrap: wrap;
        }

        .stat-item {
          text-align: center;
        }

        .stat-number {
          font-size: 2.8rem;
          font-weight: 900;
          color: var(--red);
          display: block;
          text-shadow: 2px 2px 0 var(--red-soft);
        }

        .stat-label {
          font-size: 0.9rem;
          color: var(--gray-warm);
          text-transform: uppercase;
          letter-spacing: 1px;
          font-weight: 600;
        }

        /* Trending Section */
        .trending-section {
          padding: 4rem 2rem;
          background: var(--white-pure);
        }

        .trending-container {
          max-width: 1400px;
          margin: 0 auto;
        }

        .trending-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
          gap: 3rem;
        }

        .trending-card {
          background: var(--cream);
          border: 5px solid var(--yellow);
          border-radius: 2rem;
          overflow: hidden;
          box-shadow: 0 12px 0 var(--orange);
          transition: all 0.3s ease;
          position: relative;
          animation: cardSlideIn 0.6s ease-out both;
          display: flex;
          flex-direction: column;
        }

        .card-rank {
          position: absolute;
          top: 15px;
          left: 15px;
          background: var(--red);
          color: white;
          padding: 0.5rem 1rem;
          border-radius: 1.5rem;
          font-weight: 900;
          font-size: 1.1rem;
          z-index: 3;
          box-shadow: 0 4px 0 var(--red-soft);
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

        .trending-card:hover {
          transform: translateY(-10px);
          box-shadow: 0 22px 0 var(--orange);
        }

        .image-container {
          position: relative;
          overflow: hidden;
          background: var(--white-pure);
        }

        .trending-image {
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

        .image-container:hover .trending-image {
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

        .creator-stats {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1.5rem;
          flex-wrap: wrap;
          gap: 1rem;
        }

        .creator-info {
          display: flex;
          align-items: center;
          gap: 0.5rem;
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

        .remix-stats {
          display: flex;
          align-items: center;
        }

        .remix-count-link {
          display: flex;
          align-items: baseline;
          gap: 0.5rem;
          text-decoration: none;
          color: inherit;
          cursor: pointer;
          transition: all 0.3s ease;
          border-radius: 1rem;
          padding: 0.5rem 1rem;
          background: var(--purple-accent);
          color: white;
        }

        .remix-count-link:hover {
          background: var(--purple-shadow);
          transform: translateY(-2px);
        }

        .remix-number {
          font-weight: 700;
          font-size: 1.1rem;
        }

        .remix-label {
          font-size: 0.9rem;
          font-weight: 500;
        }

        .timestamp-label {
          background: var(--yellow);
          color: var(--charcoal);
          padding: 0.5rem 1rem;
          border-radius: 1rem;
          font-size: 0.9rem;
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

        /* Pagination Section */
        .pagination-section {
          padding: 3rem 2rem;
          background: var(--cream);
        }

        .pagination-container {
          max-width: 1400px;
          margin: 0 auto;
          display: flex;
          justify-content: center;
        }

        /* Call to Action */
        .cta-section {
          padding: 5rem 2rem;
          background: var(--blue-deep);
          color: white;
          text-align: center;
        }

        .cta-container {
          max-width: 800px;
          margin: 0 auto;
        }

        .cta-title {
          font-size: 3rem;
          font-weight: 900;
          margin-bottom: 1.5rem;
          text-transform: uppercase;
        }

        .cta-description {
          font-size: 1.3rem;
          margin-bottom: 2.5rem;
          opacity: 0.9;
        }

        .cta-button {
          display: inline-flex;
          align-items: center;
          gap: 1rem;
          background: var(--yellow);
          color: var(--charcoal);
          padding: 1.5rem 3rem;
          border-radius: 3rem;
          font-size: 1.3rem;
          font-weight: 800;
          text-decoration: none;
          transition: all 0.3s ease;
          box-shadow: 0 8px 0 var(--yellow-soft);
        }

        .cta-button:hover {
          transform: translateY(-3px);
          box-shadow: 0 11px 0 var(--yellow-soft);
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
            font-size: 2.2rem;
          }

          .trending-grid {
            grid-template-columns: 1fr;
            gap: 2rem;
          }

          .creator-stats {
            justify-content: center;
            text-align: center;
            flex-direction: column;
            gap: 1rem;
          }

          .cta-title {
            font-size: 2.2rem;
          }
        }

        @media (max-width: 480px) {
          .hero-title {
            font-size: 2.5rem;
          }

          .trending-card {
            border-width: 3px;
          }

          .card-content {
            padding: 1.5rem;
          }

          .cta-button {
            padding: 1.2rem 2rem;
            font-size: 1.1rem;
          }
        }
      `}</style>
    </>
  )
}
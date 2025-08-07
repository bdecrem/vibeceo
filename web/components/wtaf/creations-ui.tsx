"use client"

import React, { useState } from "react"
import Link from "next/link"
import { PromptClick } from "@/components/ui/prompt-click"
import TruncatedPrompt from "@/components/truncated-prompt"

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

interface UserStats {
  user_slug: string
  follower_count: number
  following_count: number
  total_remix_credits: number
  apps_created_count: number
  published_apps: number
  total_remixes_received: number
}

interface CreationsUIProps {
  apps: WtafApp[]
  userStats: UserStats
  userSlug: string
}

export default function CreationsUI({ apps, userStats, userSlug }: CreationsUIProps) {
  const [copiedNotification, setCopiedNotification] = useState({ show: false, text: "" })
  
  // Separate pinned and recent apps (same logic as v1-main)
  const pinnedApps = apps.filter(app => app.Fave)
  const recentApps = apps.filter(app => !app.Fave)

  // Mock user data for now - in real implementation we'd get this from database
  const userData = {
    displayName: userSlug.charAt(0).toUpperCase() + userSlug.slice(1),
    bio: "Underground party tech wizard. Berghain's digital doorman.",
    joinDate: "April 2024"
  }

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
      console.error("Failed to copy text: ", err)
      return false
    }
  }

  const handlePromptClick = async (e: any, prompt: string) => {
    const success = await copyToClipboard(prompt)
    if (success) {
      showCopiedNotification("Prompt copied!")
    }
    e.target.classList.add("clicked")
    setTimeout(() => {
      e.target.classList.remove("clicked")
    }, 600)
  }

  const handleRemixClick = async (appSlug: string) => {
    const remixCommand = `REMIX ${appSlug}`
    const success = await copyToClipboard(remixCommand)
    if (success) {
      showCopiedNotification("REMIX command copied!")
    }
  }

  const getTimestampLabel = (createdAt: string) => {
    const now = new Date()
    const created = new Date(createdAt)
    const diffInHours = Math.floor((now.getTime() - created.getTime()) / (1000 * 60 * 60))
    const diffInDays = Math.floor(diffInHours / 24)
    
    if (diffInHours < 24) return "✨ Born today"
    if (diffInDays === 1) return "💿 Dropped yesterday"
    if (diffInDays <= 6) return `💿 Dropped ${diffInDays} days ago`
    return `💾 Vintage: ${diffInDays} days old`
  }

  const getRemixInfo = (app: WtafApp) => {
    if (app.type === 'ZAD') {
      return "✨ Born today" // ZADs always show this
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
        <div className="logo glitch" data-text={`@${userSlug.toUpperCase()}`}>
          @{userSlug.toUpperCase()}
        </div>
        <div className="tagline">DIGITAL CHAOS ARCHITECT</div>
        <nav className="nav-back">
          <Link href="/trending" className="back-link">
            ← Back to Trending
          </Link>
        </nav>
      </header>

      <main>
        <section className="user-hero">
          <div className="hero-content">
            <div className="user-avatar">
              <div className="avatar-circle">{userData.displayName.charAt(0).toUpperCase()}</div>
            </div>
            <h1 className="user-name glitch" data-text={userData.displayName}>
              {userData.displayName}
            </h1>
            <p className="user-bio">{userData.bio}</p>
            <div className="user-stats">
              <div className="stat">
                <span className="stat-number">{userStats.published_apps}</span>
                <span className="stat-label">creations</span>
              </div>
              <div className="stat">
                <span className="stat-number">{userStats.total_remixes_received}</span>
                <span className="stat-label">total {userStats.total_remixes_received === 1 ? 'remix' : 'remixes'}</span>
              </div>
              <div className="stat">
                <span className="stat-number">{userData.joinDate}</span>
                <span className="stat-label">joined</span>
              </div>
            </div>
          </div>
        </section>

        {pinnedApps.length > 0 && (
          <section className="pinned-section">
            <h2 className="section-title">
              <span className="pin-icon">📌</span>
              Pinned Creations
            </h2>
            <div className="gallery-grid">
              {pinnedApps.map((app) => (
                <div key={app.id} className="gallery-card pinned-card">
                  <div className="pin-badge">
                    <span className="pin-icon-small">📌</span>
                  </div>
                  <div className="image-container">
                    <img 
                      src={`https://tqniseocczttrfwtpbdr.supabase.co/storage/v1/object/public/og-images/${app.user_slug}-${app.app_slug}.png`} 
                      alt={app.app_slug} 
                      className="gallery-image" 
                    />
                    <div className="image-overlay">
                      <Link href={`/${app.user_slug}/${app.app_slug}?demo=true`} className="try-app-btn">TRY THIS APP</Link>
                    </div>
                  </div>
                  <div className="card-content">
                    <div className="remix-count-solo">
                                          {(app.total_descendants || app.remix_count || 0) > 0 ? (
                      <a href={`/wtaf/${app.user_slug}/${app.app_slug}/remix-tree`} className="remix-count-link">
                        <span className="remix-number">{app.total_descendants || app.remix_count || 0}</span>
                        <span className="remix-label">{(app.total_descendants || app.remix_count || 0) === 1 ? 'remix' : 'remixes'}</span>
                      </a>
                      ) : (
                        <span className="remix-label">{getRemixInfo(app)}</span>
                      )}
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
            </div>
          </section>
        )}

        <section className="recent-section">
          <h2 className="section-title">Recent Creations</h2>
          <div className="gallery-grid">
            {recentApps.map((app) => (
              <div key={app.id} className="gallery-card">
                <div className="image-container">
                  <img 
                    src={`https://tqniseocczttrfwtpbdr.supabase.co/storage/v1/object/public/og-images/${app.user_slug}-${app.app_slug}.png`} 
                    alt={app.app_slug} 
                    className="gallery-image" 
                  />
                  <div className="image-overlay">
                    <Link href={`/${app.user_slug}/${app.app_slug}?demo=true`} className="try-app-btn">TRY THIS APP</Link>
                  </div>
                </div>
                <div className="card-content">
                  <div className="remix-count-solo">
                    {(app.total_descendants || app.remix_count || 0) > 0 ? (
                      <a href={`/wtaf/${app.user_slug}/${app.app_slug}/remix-tree`} className="remix-count-link">
                        <span className="remix-number">{app.total_descendants || app.remix_count || 0}</span>
                        <span className="remix-label">{(app.total_descendants || app.remix_count || 0) === 1 ? 'remix' : 'remixes'}</span>
                      </a>
                    ) : (
                      <span className="remix-label">{getRemixInfo(app)}</span>
                    )}
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
          </div>
        </section>
      </main>

      <style jsx global>{`
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }

        body {
          background: linear-gradient(135deg, #0a2d0a 0%, #1a4d1a 25%, #004d00 50%, #330066 75%, #000033 100%);
          background-size: 400% 400%;
          animation: gradientShift 18s ease infinite;
          font-family: 'Inter', sans-serif;
          overflow-x: hidden;
          min-height: 100vh;
          color: #ffffff;
        }

        .copied-notification {
          position: fixed;
          top: 30px;
          right: 30px;
          background: linear-gradient(45deg, #00ff66, #9900ff);
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
            0 8px 25px rgba(0, 255, 102, 0.3),
            0 0 20px rgba(0, 255, 102, 0.2);
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
          animation: float 9s ease-in-out infinite;
          pointer-events: none;
          filter: drop-shadow(0 0 10px rgba(0, 255, 100, 0.3));
        }

        .skull {
          top: 8%;
          left: 5%;
          font-size: 3.5rem;
          color: rgba(0, 255, 100, 0.3);
          animation-delay: 0s;
        }

        .lightning {
          top: 30%;
          right: 8%;
          font-size: 4rem;
          color: rgba(150, 255, 0, 0.4);
          animation-delay: 3.5s;
        }

        .fire {
          bottom: 25%;
          left: 12%;
          font-size: 3.8rem;
          color: rgba(100, 255, 150, 0.4);
          animation-delay: 7s;
        }

        .chains {
          bottom: 10%;
          right: 15%;
          font-size: 3.2rem;
          color: rgba(200, 100, 255, 0.3);
          animation-delay: 2.5s;
        }

        @keyframes float {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          33% { transform: translateY(-35px) rotate(12deg); }
          66% { transform: translateY(25px) rotate(-8deg); }
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
          color: #00ff66;
          z-index: -1;
        }

        .glitch::after {
          animation: glitch2 2s infinite;
          color: #9900ff;
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
          font-size: 3.5rem;
          font-weight: 900;
          color: #ffffff;
          text-shadow:
            0 0 10px #00ff66,
            0 0 20px #00ff66,
            0 0 30px #00ff66;
          margin-bottom: 15px;
          letter-spacing: -2px;
        }

        .tagline {
          font-size: 1rem;
          color: #00ff66;
          font-weight: 500;
          letter-spacing: 3px;
          text-transform: uppercase;
          margin-bottom: 30px;
          text-shadow: 0 0 5px #00ff66;
        }

        .nav-back {
          margin-top: 20px;
        }

        .back-link {
          color: #9900ff;
          text-decoration: none;
          font-family: 'Space Grotesk', sans-serif;
          font-weight: 600;
          font-size: 1.1rem;
          text-shadow: 0 0 8px rgba(153, 0, 255, 0.5);
          transition: all 0.3s ease;
        }

        .back-link:hover {
          color: #ffffff;
          text-shadow: 0 0 15px rgba(153, 0, 255, 0.8);
        }

        main {
          max-width: 1400px;
          margin: 0 auto;
          padding: 20px;
          position: relative;
          z-index: 5;
        }

        .user-hero {
          text-align: center;
          margin-bottom: 80px;
          padding: 40px 20px;
        }

        .hero-content {
          background: rgba(0, 0, 0, 0.6);
          backdrop-filter: blur(15px);
          border: 2px solid rgba(0, 255, 102, 0.3);
          border-radius: 30px;
          padding: 50px 40px;
          box-shadow:
            0 12px 40px rgba(0, 0, 0, 0.4),
            inset 0 0 20px rgba(0, 255, 102, 0.1);
          max-width: 800px;
          margin: 0 auto;
        }

        .user-avatar {
          margin-bottom: 25px;
        }

        .avatar-circle {
          width: 120px;
          height: 120px;
          border-radius: 50%;
          background: linear-gradient(45deg, #00ff66, #9900ff);
          display: flex;
          align-items: center;
          justify-content: center;
          font-family: 'Space Grotesk', sans-serif;
          font-size: 3rem;
          font-weight: 900;
          color: #ffffff;
          margin: 0 auto;
          text-shadow: 0 0 15px rgba(0, 0, 0, 0.8);
          box-shadow: 
            0 0 30px rgba(0, 255, 102, 0.4),
            inset 0 0 20px rgba(0, 0, 0, 0.2);
          border: 3px solid rgba(255, 255, 255, 0.2);
        }

        .user-name {
          font-family: 'Space Grotesk', sans-serif;
          font-size: 3rem;
          color: #ffffff;
          margin-bottom: 20px;
          font-weight: 700;
          text-shadow: 0 0 15px #9900ff;
        }

        .user-bio {
          font-size: 1.2rem;
          color: rgba(255, 255, 255, 0.9);
          line-height: 1.6;
          font-weight: 300;
          margin-bottom: 30px;
          font-style: italic;
        }

        .user-stats {
          display: flex;
          justify-content: center;
          gap: 40px;
          flex-wrap: wrap;
        }

        .stat {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 5px;
        }

        .stat-number {
          font-family: 'Space Grotesk', sans-serif;
          font-size: 1.8rem;
          color: #00ff66;
          font-weight: 700;
          text-shadow: 0 0 10px rgba(0, 255, 102, 0.5);
        }

        .stat-label {
          font-family: 'Space Grotesk', sans-serif;
          font-size: 0.9rem;
          color: rgba(255, 255, 255, 0.7);
          font-weight: 500;
          text-transform: lowercase;
        }

        .section-title {
          font-family: 'Space Grotesk', sans-serif;
          font-size: 2.2rem;
          color: #ffffff;
          margin-bottom: 40px;
          font-weight: 700;
          text-align: center;
          text-shadow: 0 0 15px rgba(0, 255, 102, 0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 15px;
        }

        .pin-icon {
          font-size: 2rem;
          filter: drop-shadow(0 0 10px rgba(255, 215, 0, 0.6));
          animation: pinGlow 2s ease-in-out infinite;
        }

        @keyframes pinGlow {
          0%, 100% { 
            transform: rotate(-15deg) scale(1);
            filter: drop-shadow(0 0 10px rgba(255, 215, 0, 0.6));
          }
          50% { 
            transform: rotate(-10deg) scale(1.1);
            filter: drop-shadow(0 0 20px rgba(255, 215, 0, 0.8));
          }
        }

        .pinned-section {
          margin-bottom: 80px;
        }

        .recent-section {
          margin-bottom: 80px;
        }

        .gallery-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 40px;
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
          background: linear-gradient(90deg, #00ff66, #9900ff, #00ff99, #00ff66);
          background-size: 200% 100%;
          animation: borderGlow 3s linear infinite;
        }

        .pinned-card {
          border: 2px solid rgba(255, 215, 0, 0.3);
          box-shadow: 
            0 8px 30px rgba(0, 0, 0, 0.3),
            0 0 20px rgba(255, 215, 0, 0.1);
        }

        .pinned-card::before {
          background: linear-gradient(90deg, #ffd700, #ffed4e, #ffd700);
        }

        .pin-badge {
          position: absolute;
          top: 15px;
          right: 15px;
          background: rgba(255, 215, 0, 0.9);
          border-radius: 50%;
          width: 35px;
          height: 35px;
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 10;
          box-shadow: 0 4px 15px rgba(255, 215, 0, 0.4);
        }

        .pin-icon-small {
          font-size: 1.2rem;
          filter: drop-shadow(0 0 5px rgba(0, 0, 0, 0.5));
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
            0 0 30px rgba(0, 255, 102, 0.2);
          border-color: rgba(0, 255, 102, 0.3);
        }

        .pinned-card:hover {
          box-shadow:
            0 20px 50px rgba(0, 0, 0, 0.4),
            0 0 30px rgba(255, 215, 0, 0.3);
          border-color: rgba(255, 215, 0, 0.5);
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
          filter: drop-shadow(0 0 20px rgba(0, 255, 102, 0.5));
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

        .remix-count-solo {
          display: flex;
          align-items: baseline;
          justify-content: center;
          gap: 6px;
          margin-bottom: 20px;
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
          background: rgba(0, 255, 153, 0.1);
          transform: translateY(-1px);
          box-shadow: 0 4px 15px rgba(0, 255, 153, 0.2);
        }

        .remix-count-link .remix-number {
          color: #00ff99;
          text-shadow: 0 0 8px rgba(0, 255, 153, 0.5);
        }

        .remix-count-link:hover .remix-number {
          color: #ffffff;
          text-shadow: 0 0 15px rgba(0, 255, 153, 0.8);
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
          color: #00ff99;
          font-weight: 700;
          text-shadow: 0 0 8px rgba(0, 255, 153, 0.5);
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
          color: #9900ff;
          font-family: 'Space Grotesk', monospace;
          font-size: 1rem;
          font-weight: 500;
          background: rgba(153, 0, 255, 0.1);
          border: 2px solid rgba(153, 0, 255, 0.3);
          border-radius: 15px;
          padding: 15px 20px;
          margin-bottom: 20px;
          text-shadow: 0 0 8px rgba(153, 0, 255, 0.5);
          backdrop-filter: blur(5px);
          font-style: italic;
          line-height: 1.4;
          cursor: pointer;
          transition: all 0.3s ease;
          user-select: none;
        }

        .prompt-showcase:hover {
          background: rgba(153, 0, 255, 0.15);
          border-color: rgba(153, 0, 255, 0.5);
          transform: translateY(-2px);
          box-shadow: 0 8px 25px rgba(153, 0, 255, 0.2);
        }

        .prompt-showcase.clicked {
          animation: copyPulse 0.6s ease-out;
        }

        @keyframes copyPulse {
          0% {
            transform: scale(1);
            background: rgba(153, 0, 255, 0.1);
          }
          50% {
            transform: scale(1.02);
            background: rgba(153, 0, 255, 0.3);
            box-shadow: 0 0 30px rgba(153, 0, 255, 0.6);
          }
          100% {
            transform: scale(1);
            background: rgba(153, 0, 255, 0.1);
          }
        }

        .remix-btn {
          padding: 12px 25px;
          background: rgba(0, 0, 0, 0.7);
          border: 2px solid #9900ff;
          color: #9900ff;
          border-radius: 50px;
          font-family: 'Space Grotesk', sans-serif;
          font-weight: 700;
          font-size: 0.9rem;
          text-transform: uppercase;
          letter-spacing: 1px;
          cursor: pointer;
          transition: all 0.3s ease;
          box-shadow:
            0 8px 25px rgba(153, 0, 255, 0.2),
            0 0 20px rgba(153, 0, 255, 0.1);
        }

        .remix-btn:hover {
          background: rgba(153, 0, 255, 0.1);
          transform: translateY(-2px);
          box-shadow:
            0 12px 35px rgba(153, 0, 255, 0.3),
            0 0 30px rgba(153, 0, 255, 0.2);
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
          background: #00ff99;
          border-radius: 50%;
          opacity: 0;
          animation: spark 4.5s infinite ease-out;
          box-shadow: 0 0 6px #00ff99;
        }

        .spark:nth-child(1) {
          top: 25%;
          left: 20%;
          animation-delay: 0s;
        }

        .spark:nth-child(2) {
          top: 70%;
          left: 80%;
          animation-delay: 1.8s;
        }

        .spark:nth-child(3) {
          top: 50%;
          left: 10%;
          animation-delay: 3.6s;
        }

        .spark:nth-child(4) {
          top: 30%;
          left: 90%;
          animation-delay: 2.7s;
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
          .logo { font-size: 2.8rem; }
          .user-name { font-size: 2.2rem; }
          .section-title { font-size: 1.8rem; }
          .user-stats { gap: 25px; }
          .gallery-grid { 
            gap: 30px;
          }
          .gallery-card { padding: 25px 20px; }
          .hero-content { padding: 40px 25px; }
          .avatar-circle { width: 100px; height: 100px; font-size: 2.5rem; }
        }

        @media (max-width: 480px) {
          .logo { font-size: 2.5rem; }
          .user-name { font-size: 2rem; }
          .section-title { font-size: 1.6rem; }
          .gallery-card { padding: 20px 15px; }
          .hero-content { padding: 30px 20px; }
          .try-app-btn { padding: 12px 25px; font-size: 0.9rem; }
          .remix-btn { padding: 10px 20px; font-size: 0.8rem; }
          .avatar-circle { width: 80px; height: 80px; font-size: 2rem; }
          .user-stats { 
            flex-direction: column; 
            gap: 15px; 
          }
        }
      `}</style>
    </>
  )
} 
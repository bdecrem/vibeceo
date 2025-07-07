"use client"

import { useParams } from "next/navigation"
import { useState } from "react"

export default function UserPage() {
  const params = useParams()
  const username = params.username as string
  const [copiedNotification, setCopiedNotification] = useState({ show: false, text: "" })

  // Mock user data - in real app this would come from API
  const userData = {
    alex: {
      displayName: "Alex",
      bio: "Cyberpunk blog architect. Building the future one prompt at a time.",
      totalCreations: 23,
      totalRemixes: 1247,
      joinDate: "March 2024",
      pinned: [
        {
          id: 1,
          image: "/wtaf-landing/images/alex-blog.png",
          alt: "Alex Blog",
          prompt: "wtaf -Alex- write a blog announcing the launch of one-shot vibe coding with WTAF",
          remixes: 247,
          isPinned: true,
          name: "alex-blog"
        },
        {
          id: 4,
          image: "/wtaf-landing/images/alex-blog.png",
          alt: "Alex Blog Variant",
          prompt: "wtaf -Alex- create a minimalist blog with dark mode for announcing product launches",
          remixes: 134,
          isPinned: true,
          name: "alex-blog-variant"
        },
      ],
      recent: [
        {
          id: 7,
          image: "/wtaf-landing/images/alex-blog.png",
          alt: "Personal Blog",
          prompt: "wtaf -Alex- design a personal blog with cyberpunk vibes and glitch effects",
          remixes: 76,
          isPinned: false,
          name: "personal-blog"
        },
        {
          id: 10,
          image: "/wtaf-landing/images/alex-blog.png",
          alt: "Content Platform",
          prompt: "wtaf -Alex- create a content platform for tech announcements with social features",
          remixes: 43,
          isPinned: false,
          name: "content-platform"
        },
      ],
    },
    bart: {
      displayName: "Bart",
      bio: "Underground party tech wizard. Berghain's digital doorman.",
      totalCreations: 15,
      totalRemixes: 892,
      joinDate: "April 2024",
      pinned: [
        {
          id: 2,
          image: "/wtaf-landing/images/berghain.png",
          alt: "Berghain Party App",
          prompt: "wtaf make an app where people can sign up for my party next Friday at 11pm at Berghain in Berlin",
          remixes: 189,
          isPinned: true,
          name: "berghain-party"
        },
      ],
      recent: [
        {
          id: 5,
          image: "/wtaf-landing/images/berghain.png",
          alt: "Event Signup App",
          prompt: "wtaf build a sleek event registration system with admin dashboard for underground parties",
          remixes: 98,
          isPinned: false,
          name: "event-signup"
        },
        {
          id: 8,
          image: "/wtaf-landing/images/berghain.png",
          alt: "Club Management",
          prompt: "wtaf make a comprehensive club management app with guest lists and door control",
          remixes: 65,
          isPinned: false,
          name: "club-management"
        },
      ],
    },
    zoe: {
      displayName: "Zoe",
      bio: "Retro game revival specialist. Pixel perfect chaos creator.",
      totalCreations: 31,
      totalRemixes: 743,
      joinDate: "February 2024",
      pinned: [
        {
          id: 3,
          image: "/wtaf-landing/images/pong.png",
          alt: "Pong Game",
          prompt: "wtaf make a pong-style browser game",
          remixes: 156,
          isPinned: true,
          name: "pong-game"
        },
      ],
      recent: [
        {
          id: 6,
          image: "/wtaf-landing/images/pong.png",
          alt: "Retro Game",
          prompt: "wtaf create a nostalgic arcade-style game with neon aesthetics and high scores",
          remixes: 87,
          isPinned: false,
          name: "retro-game"
        },
        {
          id: 9,
          image: "/wtaf-landing/images/pong.png",
          alt: "Browser Game",
          prompt: "wtaf build an addictive browser game with multiplayer capabilities and leaderboards",
          remixes: 54,
          isPinned: false,
          name: "browser-game"
        },
      ],
    },
  }

  const user = userData[username] || userData.alex // fallback to alex if user not found

  const showCopiedNotification = (text) => {
    setCopiedNotification({ show: true, text })
    setTimeout(() => {
      setCopiedNotification({ show: false, text: "" })
    }, 2000)
  }

  const copyToClipboard = async (text) => {
    try {
      await navigator.clipboard.writeText(text)
      return true
    } catch (err) {
      console.error("Failed to copy text: ", err)
      return false
    }
  }

  const handlePromptClick = async (prompt) => {
    const success = await copyToClipboard(prompt)
    if (success) {
      showCopiedNotification("Prompt copied!")
    }
  }

  const handleRemixClick = async (app) => {
    const appUrl = `${window.location.origin}/app/${app.name}-${app.id}`
    const success = await copyToClipboard(appUrl)
    if (success) {
      showCopiedNotification("App URL copied!")
    }
  }

  return (
    <html lang="en">
      <head>
        <meta charSet="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>@{username} - WTAF.me</title>
        <meta name="description" content={`${user.displayName}'s creations on WTAF. ${user.bio}`} />
        <link
          href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;500;700;900&family=Inter:wght@300;400;500;600&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
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
          <div className="logo glitch" data-text={`@${username.toUpperCase()}`}>
            @{username.toUpperCase()}
          </div>
          <div className="tagline">DIGITAL CHAOS ARCHITECT</div>
          <nav className="nav-back">
            <a href="/trending" className="back-link">
              ← Back to Trending
            </a>
          </nav>
        </header>

        <main>
          <section className="user-hero">
            <div className="hero-content">
              <div className="user-avatar">
                <div className="avatar-circle">{user.displayName.charAt(0).toUpperCase()}</div>
              </div>
              <h1 className="user-name glitch" data-text={user.displayName}>
                {user.displayName}
              </h1>
              <p className="user-bio">{user.bio}</p>
              <div className="user-stats">
                <div className="stat">
                  <span className="stat-number">{user.totalCreations}</span>
                  <span className="stat-label">creations</span>
                </div>
                <div className="stat">
                  <span className="stat-number">{user.totalRemixes}</span>
                  <span className="stat-label">total remixes</span>
                </div>
                <div className="stat">
                  <span className="stat-number">{user.joinDate}</span>
                  <span className="stat-label">joined</span>
                </div>
              </div>
            </div>
          </section>

          {user.pinned.length > 0 && (
            <section className="pinned-section">
              <h2 className="section-title">
                <span className="pin-icon">📌</span>
                Pinned Creations
              </h2>
              <div className="gallery-grid">
                {user.pinned.map((app) => (
                  <div key={app.id} className="gallery-card pinned-card">
                    <div className="pin-badge">
                      <span className="pin-icon-small">📌</span>
                    </div>
                    <div className="image-container">
                      <img src={app.image || "/placeholder.svg"} alt={app.alt} className="gallery-image" />
                      <div className="image-overlay">
                        <button className="try-app-btn">TRY THIS APP</button>
                      </div>
                    </div>
                    <div className="card-content">
                      <div className="remix-count-solo">
                        <span className="remix-number">{app.remixes}</span>
                        <span className="remix-label">remixes</span>
                      </div>
                      <div className="prompt-label">The prompt:</div>
                      <div className="prompt-showcase" onClick={() => handlePromptClick(app.prompt)}>
                        "{app.prompt}"
                      </div>
                      <button className="remix-btn" onClick={() => handleRemixClick(app)}>REMIX</button>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          <section className="recent-section">
            <h2 className="section-title">Recent Creations</h2>
            <div className="gallery-grid">
              {user.recent.map((app) => (
                <div key={app.id} className="gallery-card">
                  <div className="image-container">
                    <img src={app.image || "/placeholder.svg"} alt={app.alt} className="gallery-image" />
                    <div className="image-overlay">
                      <button className="try-app-btn">TRY THIS APP</button>
                    </div>
                  </div>
                  <div className="card-content">
                    <div className="remix-count-solo">
                      <span className="remix-number">{app.remixes}</span>
                      <span className="remix-label">remixes</span>
                    </div>
                    <div className="prompt-label">The prompt:</div>
                    <div className="prompt-showcase" onClick={() => handlePromptClick(app.prompt)}>
                      "{app.prompt}"
                    </div>
                    <button className="remix-btn" onClick={() => handleRemixClick(app)}>REMIX</button>
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
          }

          .gallery-image {
            width: 100%;
            height: auto;
            aspect-ratio: 3 / 2;
            object-fit: cover;
            border: 2px solid rgba(255, 255, 255, 0.3);
            border-radius: 15px;
            filter: drop-shadow

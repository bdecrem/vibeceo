"use client"

import { useState } from "react"

export default function TrendingPage() {
  const apps = [
    {
      id: 1,
      image: "/wtaf-landing/images/alex-blog.png",
      alt: "Alex Blog",
      prompt: "wtaf -Alex- write a blog announcing the launch of one-shot vibe coding with WTAF",
      creator: "alex",
      remixes: 247,
    },
    {
      id: 2,
      image: "/wtaf-landing/images/berghain.png",
      alt: "Berghain Party App",
      prompt: "wtaf make an app where people can sign up for my party next Friday at 11pm at Berghain in Berlin",
      creator: "bart",
      remixes: 189,
    },
    {
      id: 3,
      image: "/wtaf-landing/images/pong.png",
      alt: "Pong Game",
      prompt: "wtaf make a pong-style browser game",
      creator: "zoe",
      remixes: 156,
    },
    {
      id: 4,
      image: "/wtaf-landing/images/alex-blog.png",
      alt: "Alex Blog Variant",
      prompt: "wtaf -Alex- create a minimalist blog with dark mode for announcing product launches",
      creator: "alex",
      remixes: 134,
    },
    {
      id: 5,
      image: "/wtaf-landing/images/berghain.png",
      alt: "Event Signup App",
      prompt: "wtaf build a sleek event registration system with admin dashboard for underground parties",
      creator: "kai",
      remixes: 98,
    },
    {
      id: 6,
      image: "/wtaf-landing/images/pong.png",
      alt: "Retro Game",
      prompt: "wtaf create a nostalgic arcade-style game with neon aesthetics and high scores",
      creator: "nova",
      remixes: 87,
    },
    {
      id: 7,
      image: "/wtaf-landing/images/alex-blog.png",
      alt: "Personal Blog",
      prompt: "wtaf -Alex- design a personal blog with cyberpunk vibes and glitch effects",
      creator: "alex",
      remixes: 76,
    },
    {
      id: 8,
      image: "/wtaf-landing/images/berghain.png",
      alt: "Club Management",
      prompt: "wtaf make a comprehensive club management app with guest lists and door control",
      creator: "raven",
      remixes: 65,
    },
    {
      id: 9,
      image: "/wtaf-landing/images/pong.png",
      alt: "Browser Game",
      prompt: "wtaf build an addictive browser game with multiplayer capabilities and leaderboards",
      creator: "pixel",
      remixes: 54,
    },
    {
      id: 10,
      image: "/wtaf-landing/images/alex-blog.png",
      alt: "Content Platform",
      prompt: "wtaf -Alex- create a content platform for tech announcements with social features",
      creator: "echo",
      remixes: 43,
    },
  ]

  const [currentPage, setCurrentPage] = useState(1)
  const appsPerPage = 6
  const totalPages = Math.ceil(apps.length / appsPerPage)

  // Get current apps for the page
  const indexOfLastApp = currentPage * appsPerPage
  const indexOfFirstApp = indexOfLastApp - appsPerPage
  const currentApps = apps.slice(indexOfFirstApp, indexOfLastApp)

  const handlePageChange = (pageNumber) => {
    setCurrentPage(pageNumber)
    // Scroll to top of gallery
    document.querySelector(".gallery-grid")?.scrollIntoView({ behavior: "smooth" })
  }

  const copyToClipboard = async (text) => {
    try {
      await navigator.clipboard.writeText(text)
      // Visual feedback will be handled by CSS animation
    } catch (err) {
      console.error("Failed to copy text: ", err)
    }
  }

  const handlePromptClick = (e, prompt) => {
    copyToClipboard(prompt)
    // Add clicked class for animation
    e.target.classList.add("clicked")
    setTimeout(() => {
      e.target.classList.remove("clicked")
    }, 600)
  }

  return (
    <html lang="en">
      <head>
        <meta charSet="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Trending - WTAF.me</title>
        <meta
          name="description"
          content="Discover the hottest apps trending on WTAF. See what's being remixed and who's creating the chaos."
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;500;700;900&family=Inter:wght@300;400;500;600&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
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
          <div className="logo glitch" data-text="TRENDING">
            TRENDING
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
            {currentApps.map((app) => (
              <div key={app.id} className="gallery-card">
                <div className="image-container">
                  <img src={app.image || "/placeholder.svg"} alt={app.alt} className="gallery-image" />
                  <div className="image-overlay">
                    <button className="try-app-btn">TRY THIS APP</button>
                  </div>
                </div>
                <div className="card-content">
                  <div className="creator-stats">
                    <div className="creator-info">
                      <span className="creator-label">by</span>
                      <a href={`/user/${app.creator}`} className="creator-handle">
                        @{app.creator}
                      </a>
                    </div>
                    <div className="remix-count">
                      <span className="remix-number">{app.remixes}</span>
                      <span className="remix-label">remixes</span>
                    </div>
                  </div>
                  <div className="prompt-label">The prompt:</div>
                  <div className="prompt-showcase" onClick={(e) => handlePromptClick(e, app.prompt)}>
                    "{app.prompt}"
                  </div>
                  <button className="remix-btn">REMIX</button>
                </div>
              </div>
            ))}
          </section>

          <section className="pagination-section">
            <div className="pagination">
              <button
                className={`pagination-btn prev-btn ${currentPage === 1 ? "disabled" : ""}`}
                onClick={() => currentPage > 1 && handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
              >
                ← Previous
              </button>

              <div className="page-numbers">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNumber) => (
                  <button
                    key={pageNumber}
                    className={`page-btn ${currentPage === pageNumber ? "active" : ""}`}
                    onClick={() => handlePageChange(pageNumber)}
                  >
                    {pageNumber}
                  </button>
                ))}
              </div>

              <button
                className={`pagination-btn next-btn ${currentPage === totalPages ? "disabled" : ""}`}
                onClick={() => currentPage < totalPages && handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
              >
                Next →
              </button>
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
            background: linear-gradient(135deg, #2d0a0a 0%, #4d1a1a 25%, #660000 50%, #4d0033 75%, #330000 100%);
            background-size: 400% 400%;
            animation: gradientShift 16s ease infinite;
            font-family: 'Inter', sans-serif;
            overflow-x: hidden;
            min-height: 100vh;
            color: #ffffff;
          }

          @keyframes gradientShift {
            0% {
              background-position: 0% 50%;
            }
            50% {
              background-position: 100% 50%;
            }
            100% {
              background-position: 0% 50%;
            }
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
            0%,
            100% {
              transform: translateY(0px) rotate(0deg);
            }
            33% {
              transform: translateY(-30px) rotate(10deg);
            }
            66% {
              transform: translateY(20px) rotate(-7deg);
            }
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
            0%,
            90%,
            100% {
              transform: translate(0);
            }
            10% {
              transform: translate(-2px, -1px);
            }
            20% {
              transform: translate(1px, 2px);
            }
          }

          @keyframes glitch2 {
            0%,
            90%,
            100% {
              transform: translate(0);
            }
            10% {
              transform: translate(2px, 1px);
            }
            20% {
              transform: translate(-1px, -2px);
            }
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
            text-shadow: 0 0 10px #ff6600, 0 0 20px #ff6600, 0 0 30px #ff6600;
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
            box-shadow: 0 12px 40px rgba(0, 0, 0, 0.4), inset 0 0 20px rgba(255, 102, 0, 0.1);
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
            0% {
              background-position: 0% 50%;
            }
            100% {
              background-position: 200% 50%;
            }
          }

          .gallery-card:hover {
            transform: translateY(-8px);
            background: rgba(0, 0, 0, 0.7);
            box-shadow: 0 20px 50px rgba(0, 0, 0, 0.4), 0 0 30px rgba(255, 102, 0, 0.2);
            border-color: rgba(255, 102, 0, 0.3);
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
            filter: drop-shadow(0 0 20px rgba(255, 102, 0, 0.5));
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
            filter: drop-shadow(0 0 30px rgba(255, 102, 0, 0.8));
            border-color: rgba(255, 102, 0, 0.7);
          }

          .try-app-btn {
            padding: 15px 30px;
            background: linear-gradient(45deg, #ff6600, #ff3366);
            color: #ffffff;
            border: none;
            border-radius: 50px;
            font-family: 'Space Grotesk', sans-serif;
            font-weight: 700;
            font-size: 1rem;
            text-transform: uppercase;
            letter-spacing: 1px;
            cursor: pointer;
            transition: all 0.3s ease;
            box-shadow: 0 8px 25px rgba(255, 102, 0, 0.3), 0 0 20px rgba(255, 102, 0, 0.2);
          }

          .try-app-btn:hover {
            transform: scale(1.05);
            box-shadow: 0 12px 35px rgba(255, 102, 0, 0.4), 0 0 30px rgba(255, 102, 0, 0.3);
          }

          .card-content {
            text-align: center;
          }

          .creator-stats {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 20px;
            padding: 0 5px;
          }

          .creator-info {
            display: flex;
            align-items: center;
            gap: 8px;
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
            font-weight: 700;
            text-decoration: none;
            text-shadow: 0 0 8px rgba(255, 102, 0, 0.5);
            transition: all 0.3s ease;
            cursor: pointer;
          }

          .creator-handle:hover {
            color: #ffffff;
            text-shadow: 0 0 15px rgba(255, 102, 0, 0.8);
            transform: translateY(-1px);
          }

          .remix-count {
            display: flex;
            align-items: baseline;
            gap: 4px;
          }

          .remix-number {
            font-family: 'Space Grotesk', sans-serif;
            font-size: 1.1rem;
            color: #ff9900;
            font-weight: 700;
            text-shadow: 0 0 8px rgba(255, 153, 0, 0.5);
          }

          .remix-label {
            font-family: 'Space Grotesk', sans-serif;
            font-size: 0.8rem;
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
            background: rgba(255, 51, 102, 0.1);
            border: 2px solid rgba(255, 51, 102, 0.3);
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
            background: rgba(255, 51, 102, 0.15);
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
              background: rgba(255, 51, 102, 0.1);
            }
            50% {
              transform: scale(1.02);
              background: rgba(255, 51, 102, 0.3);
              box-shadow: 0 0 30px rgba(255, 51, 102, 0.6);
            }
            100% {
              transform: scale(1);
              background: rgba(255, 51, 102, 0.1);
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
            box-shadow: 0 8px 25px rgba(255, 51, 102, 0.2), 0 0 20px rgba(255, 51, 102, 0.1);
          }

          .remix-btn:hover {
            background: rgba(255, 51, 102, 0.1);
            transform: translateY(-2px);
            box-shadow: 0 12px 35px rgba(255, 51, 102, 0.3), 0 0 30px rgba(255, 51, 102, 0.2);
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
            background: #ff9900;
            border-radius: 50%;
            opacity: 0;
            animation: spark 4s infinite ease-out;
            box-shadow: 0 0 6px #ff9900;
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
            animation-delay: 2.2s;
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

          .pagination-section {
            margin-top: 60px;
            margin-bottom: 40px;
            display: flex;
            justify-content: center;
          }

          .pagination {
            display: flex;
            align-items: center;
            gap: 15px;
            background: rgba(0, 0, 0, 0.6);
            backdrop-filter: blur(15px);
            border: 2px solid rgba(255, 102, 0, 0.3);
            border-radius: 50px;
            padding: 15px 25px;
            box-shadow: 0 8px 30px rgba(0, 0, 0, 0.4), inset 0 0 20px rgba(255, 102, 0, 0.1);
          }

          .pagination-btn {
            padding: 10px 20px;
            background: rgba(0, 0, 0, 0.7);
            border: 2px solid #ff6600;
            color: #ff6600;
            border-radius: 25px;
            font-family: 'Space Grotesk', sans-serif;
            font-weight: 600;
            font-size: 0.9rem;
            cursor: pointer;
            transition: all 0.3s ease;
            text-transform: uppercase;
            letter-spacing: 1px;
            box-shadow: 0 4px 15px rgba(255, 102, 0, 0.2), 0 0 10px rgba(255, 102, 0, 0.1);
          }

          .pagination-btn:hover:not(.disabled) {
            background: rgba(255, 102, 0, 0.1);
            transform: translateY(-2px);
            box-shadow: 0 8px 25px rgba(255, 102, 0, 0.3), 0 0 20px rgba(255, 102, 0, 0.2);
          }

          .pagination-btn.disabled {
            opacity: 0.4;
            cursor: not-allowed;
            border-color: rgba(255, 102, 0, 0.3);
            color: rgba(255, 102, 0, 0.5);
          }

          .page-numbers {
            display: flex;
            gap: 8px;
          }

          .page-btn {
            width: 45px;
            height: 45px;
            background: rgba(0, 0, 0, 0.7);
            border: 2px solid rgba(255, 102, 0, 0.5);
            color: #ff9900;
            border-radius: 50%;
            font-family: 'Space Grotesk', sans-serif;
            font-weight: 700;
            font-size: 1rem;
            cursor: pointer;
            transition: all 0.3s ease;
            display: flex;
            align-items: center;
            justify-content: center;
            box-shadow: 0 4px 15px rgba(255, 102, 0, 0.2), 0 0 10px rgba(255, 102, 0, 0.1);
          }

          .page-btn:hover {
            background: rgba(255, 102, 0, 0.1);
            transform: translateY(-2px) scale(1.05);
            box-shadow: 0 8px 25px rgba(255, 102, 0, 0.3), 0 0 20px rgba(255, 102, 0, 0.2);
          }

          .page-btn.active {
            background: linear-gradient(45deg, #ff6600, #ff3366);
            border-color: #ff3366;
            color: #ffffff;
            transform: scale(1.1);
            box-shadow: 0 8px 25px rgba(255, 102, 0, 0.4), 0 0 25px rgba(255, 102, 0, 0.3);
            text-shadow: 0 0 10px rgba(0, 0, 0, 0.8);
          }

          .page-btn.active:hover {
            transform: scale(1.15);
          }

          @media (max-width: 768px) {
            .gallery-grid {
              grid-template-columns: 1fr;
            }
            .logo {
              font-size: 3rem;
            }
            .gallery-grid {
              gap: 30px;
            }
            .gallery-card {
              padding: 25px 20px;
            }
            .gallery-hero h1 {
              font-size: 2.5rem;
              line-height: 1.2;
            }
            .gallery-hero p {
              font-size: 1rem;
            }
            .hero-content {
              padding: 40px 25px;
            }
            .creator-stats {
              flex-direction: column;
              gap: 10px;
              align-items: center;
            }

            .pagination {
              flex-direction: column;
              gap: 20px;
              padding: 20px;
              border-radius: 25px;
            }

            .page-numbers {
              order: -1;
            }

            .pagination-btn {
              padding: 12px 25px;
              font-size: 0.8rem;
            }
          }

          @media (max-width: 480px) {
            .logo {
              font-size: 2.5rem;
            }
            .gallery-card {
              padding: 20px 15px;
            }
            .gallery-hero h1 {
              font-size: 2rem;
              line-height: 1.1;
            }
            .hero-content {
              padding: 30px 20px;
            }
            .try-app-btn {
              padding: 12px 25px;
              font-size: 0.9rem;
            }
            .remix-btn {
              padding: 10px 20px;
              font-size: 0.8rem;
            }

            .pagination {
              padding: 15px;
            }

            .page-btn {
              width: 40px;
              height: 40px;
              font-size: 0.9rem;
            }

            .pagination-btn {
              padding: 10px 20px;
              font-size: 0.75rem;
            }
          }
        `}</style>
      </body>
    </html>
  )
}

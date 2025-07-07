"use client"

import { useState, useEffect } from "react"

export default function HomePage() {
  const [copiedNotification, setCopiedNotification] = useState({ show: false, text: "" })

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

  const handleRemixClick = async (appId, appName) => {
    const appUrl = `${window.location.origin}/app/${appName.toLowerCase().replace(/\s+/g, "-")}-${appId}`
    const success = await copyToClipboard(appUrl)
    if (success) {
      showCopiedNotification("App URL copied!")
    }
  }

  const [currentSuggestion, setCurrentSuggestion] = useState(0)

  const suggestions = [
    "wtaf make me a simple todo app",
    "wtaf create a random quote generator",
    "wtaf build a color palette picker",
  ]

  const handleSuggestionClick = async (suggestion) => {
    const success = await copyToClipboard(suggestion)
    if (success) {
      showCopiedNotification("Prompt copied!")
    }
  }

  // Auto-cycle through suggestions
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentSuggestion((prev) => (prev + 1) % suggestions.length)
    }, 4000)
    return () => clearInterval(interval)
  }, [])

  return (
    <html lang="en">
      <head>
        <meta charSet="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>WTAF.me - One-Shot Prompting Over SMS</title>
        <meta
          name="description"
          content="One-shot prompting over SMS. Ship from your flip phone. Vibecoded chaos delivered instantly."
        />
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
          <div className="logo glitch" data-text="WTAF">
            WTAF
          </div>
          <div className="tagline">SHIP FROM YOUR FLIP PHONE</div>
        </header>

        <main>
          <section className="hero">
            <div className="hero-content">
              <h1 className="glitch" data-text="One-Shot Prompting Over SMS">
                One-Shot Prompting Over SMS
              </h1>
              <p>
                Where prompts go primal. Hand-inked chaos for your startup soul, piped in from West Hollywood's most
                electric corner. It's rebellion. It's art. It's algorithmically unhinged.
              </p>
              <div className="starter-section">
                <p className="starter-text">
                  Try it: Text <strong>+1-866-330-0015</strong> with:
                </p>
                <div className="prompt-suggestions">
                  <div className="suggestion-container">
                    <div
                      className={`suggestion-prompt ${currentSuggestion === 0 ? "active" : ""}`}
                      onClick={() => handleSuggestionClick(suggestions[0])}
                    >
                      "{suggestions[0]}"
                    </div>
                    <div
                      className={`suggestion-prompt ${currentSuggestion === 1 ? "active" : ""}`}
                      onClick={() => handleSuggestionClick(suggestions[1])}
                    >
                      "{suggestions[1]}"
                    </div>
                    <div
                      className={`suggestion-prompt ${currentSuggestion === 2 ? "active" : ""}`}
                      onClick={() => handleSuggestionClick(suggestions[2])}
                    >
                      "{suggestions[2]}"
                    </div>
                  </div>
                  <div className="suggestion-dots">
                    {suggestions.map((_, index) => (
                      <button
                        key={index}
                        className={`dot ${currentSuggestion === index ? "active" : ""}`}
                        onClick={() => setCurrentSuggestion(index)}
                      />
                    ))}
                  </div>
                </div>
              </div>
              <div className="cta-section">
                <button className="cta-button">Learn More</button>
                <a href="/gallery" className="cta-button secondary">
                  Gallery
                </a>
              </div>
            </div>
          </section>

          {/* Featured Section */}
          <section className="services">
            <h2 className="section-title featured-title glitch" data-text="Featured">
              <span className="title-icon">⭐</span>
              Featured
              <span className="title-icon">⭐</span>
            </h2>

            {/* Alex Blog Example */}
            <div className="service-card image-card">
              <a href="#">
                <img src="/wtaf-landing/images/alex-blog.png" alt="Alex Blog" className="service-image" />
              </a>
              <div className="image-content">
                <div className="prompt-label">The prompt:</div>
                <div
                  className="prompt-showcase"
                  onClick={() =>
                    handlePromptClick(
                      "wtaf -Alex- write a blog announcing the launch of one-shot vibe coding with WTAF",
                    )
                  }
                >
                  "wtaf -Alex- write a blog announcing the launch of one-shot vibe coding with WTAF"
                </div>
                <button className="remix-btn" onClick={() => handleRemixClick(1, "alex-blog")}>
                  REMIX
                </button>
              </div>
            </div>

            {/* Berghain Example */}
            <div className="service-card image-card">
              <a href="#">
                <img src="/wtaf-landing/images/berghain.png" alt="Berghain Vibes" className="service-image" />
              </a>
              <div className="image-content">
                <div className="prompt-label">The prompt:</div>
                <div
                  className="prompt-showcase"
                  onClick={() =>
                    handlePromptClick(
                      "wtaf make an app where people can sign up for my party next Friday at 11pm at Berghain in Berlin",
                    )
                  }
                >
                  "wtaf make an app where people can sign up for my party next Friday at 11pm at Berghain in Berlin"
                </div>
                <div className="prompt-label" style={{ textTransform: "none" }}>
                  This app comes with an{" "}
                  <a href="#" style={{ color: "#00ffff", textDecoration: "underline" }}>
                    admin page
                  </a>
                  .
                </div>
                <button className="remix-btn" onClick={() => handleRemixClick(2, "berghain-party")}>
                  REMIX
                </button>
              </div>
            </div>

            {/* Pong Game Example */}
            <div className="service-card image-card">
              <a href="#">
                <img src="/wtaf-landing/images/pong.png" alt="Pong Game" className="service-image" />
              </a>
              <div className="image-content">
                <div className="prompt-label">The prompt:</div>
                <div
                  className="prompt-showcase"
                  onClick={() => handlePromptClick("wtaf make a pong-style browser game")}
                >
                  "wtaf make a pong-style browser game"
                </div>
                <button className="remix-btn" onClick={() => handleRemixClick(3, "pong-game")}>
                  REMIX
                </button>
              </div>
            </div>

            <div className="more-link-container">
              <a href="/gallery" className="more-link">
                More Featured →
              </a>
            </div>
          </section>

          {/* Trending Section */}
          <section className="services">
            <h2 className="section-title trending-title glitch" data-text="Trending">
              <span className="title-icon">🔥</span>
              Trending
              <span className="title-icon">🔥</span>
            </h2>

            {/* Trending App 1 */}
            <div className="service-card image-card">
              <a href="#">
                <img src="/wtaf-landing/images/alex-blog.png" alt="Alex Blog" className="service-image" />
              </a>
              <div className="image-content">
                <div className="creator-stats-inline">
                  <div className="creator-info">
                    <span className="creator-label">by</span>
                    <a href="/user/alex" className="creator-handle">
                      @alex
                    </a>
                  </div>
                  <div className="remix-count">
                    <span className="remix-number">247</span>
                    <span className="remix-label">remixes</span>
                  </div>
                </div>
                <div className="prompt-label">The prompt:</div>
                <div
                  className="prompt-showcase"
                  onClick={() =>
                    handlePromptClick(
                      "wtaf -Alex- write a blog announcing the launch of one-shot vibe coding with WTAF",
                    )
                  }
                >
                  "wtaf -Alex- write a blog announcing the launch of one-shot vibe coding with WTAF"
                </div>
                <button className="remix-btn" onClick={() => handleRemixClick(1, "alex-blog")}>
                  REMIX
                </button>
              </div>
            </div>

            {/* Trending App 2 */}
            <div className="service-card image-card">
              <a href="#">
                <img src="/wtaf-landing/images/berghain.png" alt="Berghain Party" className="service-image" />
              </a>
              <div className="image-content">
                <div className="creator-stats-inline">
                  <div className="creator-info">
                    <span className="creator-label">by</span>
                    <a href="/user/bart" className="creator-handle">
                      @bart
                    </a>
                  </div>
                  <div className="remix-count">
                    <span className="remix-number">189</span>
                    <span className="remix-label">remixes</span>
                  </div>
                </div>
                <div className="prompt-label">The prompt:</div>
                <div
                  className="prompt-showcase"
                  onClick={() =>
                    handlePromptClick(
                      "wtaf make an app where people can sign up for my party next Friday at 11pm at Berghain in Berlin",
                    )
                  }
                >
                  "wtaf make an app where people can sign up for my party next Friday at 11pm at Berghain in Berlin"
                </div>
                <button className="remix-btn" onClick={() => handleRemixClick(2, "berghain-party")}>
                  REMIX
                </button>
              </div>
            </div>

            {/* Trending App 3 */}
            <div className="service-card image-card">
              <a href="#">
                <img src="/wtaf-landing/images/pong.png" alt="Pong Game" className="service-image" />
              </a>
              <div className="image-content">
                <div className="creator-stats-inline">
                  <div className="creator-info">
                    <span className="creator-label">by</span>
                    <a href="/user/zoe" className="creator-handle">
                      @zoe
                    </a>
                  </div>
                  <div className="remix-count">
                    <span className="remix-number">156</span>
                    <span className="remix-label">remixes</span>
                  </div>
                </div>
                <div className="prompt-label">The prompt:</div>
                <div
                  className="prompt-showcase"
                  onClick={() => handlePromptClick("wtaf make a pong-style browser game")}
                >
                  "wtaf make a pong-style browser game"
                </div>
                <button className="remix-btn" onClick={() => handleRemixClick(3, "pong-game")}>
                  REMIX
                </button>
              </div>
            </div>

            <div className="more-link-container">
              <a href="/trending" className="more-link">
                More Trending →
              </a>
            </div>
          </section>

          <section className="bottom-section">
            <div className="about-wtaf">
              <div className="about-content">
                <h2 className="about-title">How WTAF Works</h2>
                <p className="about-text">
                  Text your wildest app ideas to <strong>+1-866-330-0015</strong> and watch them materialize into
                  working code. No planning. No meetings. No bullshit. Just pure creative chaos delivered through SMS.
                  Each prompt becomes a fully functional app in minutes, not months.
                </p>
                <p className="about-subtext">Start with "wtaf" + your idea. The algorithm handles the rest.</p>
              </div>
            </div>

            <div className="trending-promo">
              <div className="promo-content">
                <div className="promo-emoji">🔥</div>
                <h3 className="promo-title">What's Trending</h3>
                <p className="promo-text">Most remixed prompts and hottest creators.</p>
                <a href="/trending" className="trending-link">
                  Check it out →
                </a>
              </div>
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
            background: linear-gradient(135deg, #1a1a1a 0%, #2d1b69 25%, #8b0000 50%, #4b0082 75%, #000000 100%);
            background-size: 400% 400%;
            animation: gradientShift 12s ease infinite;
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
            animation: float 6s ease-in-out infinite;
            pointer-events: none;
            filter: drop-shadow(0 0 10px rgba(255, 0, 255, 0.3));
          }

          .skull {
            top: 8%;
            left: 5%;
            font-size: 3.5rem;
            color: rgba(255, 255, 255, 0.3);
            animation-delay: 0s;
          }

          .lightning {
            top: 30%;
            right: 8%;
            font-size: 4rem;
            color: rgba(255, 255, 0, 0.4);
            animation-delay: 2s;
          }

          .fire {
            bottom: 25%;
            left: 12%;
            font-size: 3.8rem;
            color: rgba(255, 69, 0, 0.4);
            animation-delay: 4s;
          }

          .chains {
            bottom: 10%;
            right: 15%;
            font-size: 3.2rem;
            color: rgba(192, 192, 192, 0.3);
            animation-delay: 1s;
          }

          @keyframes float {
            0%, 100% { transform: translateY(0px) rotate(0deg); }
            33% { transform: translateY(-20px) rotate(5deg); }
            66% { transform: translateY(10px) rotate(-3deg); }
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
            color: #ff0080;
            z-index: -1;
          }

          .glitch::after {
            animation: glitch2 2s infinite;
            color: #00ffff;
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
            font-size: 5rem;
            font-weight: 900;
            color: #ffffff;
            text-shadow:
              0 0 10px #ff0080,
              0 0 20px #ff0080,
              0 0 30px #ff0080;
            margin-bottom: 15px;
            letter-spacing: -2px;
          }

          .tagline {
            font-size: 1.2rem;
            color: #ff0080;
            font-weight: 500;
            letter-spacing: 3px;
            text-transform: uppercase;
            margin-bottom: 20px;
            text-shadow: 0 0 5px #ff0080;
          }

          main {
            max-width: 1200px;
            margin: 0 auto;
            padding: 20px;
            position: relative;
            z-index: 5;
          }

          .hero {
            text-align: center;
            margin-bottom: 80px;
            padding: 60px 40px;
          }

          .hero-content {
            background: rgba(0, 0, 0, 0.6);
            backdrop-filter: blur(15px);
            border: 2px solid rgba(255, 0, 128, 0.3);
            border-radius: 30px;
            padding: 70px 50px;
            box-shadow:
              0 12px 40px rgba(0, 0, 0, 0.4),
              inset 0 0 20px rgba(255, 0, 128, 0.1);
          }

          .hero h1 {
            font-family: 'Space Grotesk', sans-serif;
            font-size: 4.2rem;
            color: #ffffff;
            margin-bottom: 35px;
            font-weight: 700;
            line-height: 1.1;
            text-shadow: 0 0 15px #00ffff;
          }

          .hero p {
            font-size: 1.4rem;
            color: rgba(255, 255, 255, 0.9);
            line-height: 1.7;
            max-width: 650px;
            margin: 0 auto 50px;
            font-weight: 300;
          }

          .cta-section {
            display: flex;
            gap: 25px;
            justify-content: center;
            align-items: center;
            flex-wrap: wrap;
          }

          .cta-button {
            display: inline-block;
            padding: 20px 45px;
            background: linear-gradient(45deg, #ff0080, #8b0000);
            color: #ffffff;
            text-decoration: none;
            font-family: 'Space Grotesk', sans-serif;
            font-weight: 700;
            font-size: 1.1rem;
            border: none;
            border-radius: 50px;
            position: relative;
            overflow: hidden;
            transition: all 0.4s ease;
            text-transform: uppercase;
            letter-spacing: 1px;
            box-shadow:
              0 8px 25px rgba(255, 0, 128, 0.3),
              0 0 20px rgba(255, 0, 128, 0.2);
            cursor: pointer;
          }

          .cta-button.secondary {
            background: rgba(0, 0, 0, 0.7);
            border: 2px solid #00ffff;
            box-shadow:
              0 8px 25px rgba(0, 255, 255, 0.2),
              0 0 20px rgba(0, 255, 255, 0.1);
          }

          .cta-button:hover {
            transform: translateY(-3px) scale(1.02);
            box-shadow:
              0 15px 35px rgba(255, 0, 128, 0.4),
              0 0 30px rgba(255, 0, 128, 0.3);
          }

          .cta-button.secondary:hover {
            box-shadow:
              0 15px 35px rgba(0, 255, 255, 0.3),
              0 0 30px rgba(0, 255, 255, 0.2);
          }

          .services {
            display: grid;
            grid-template-columns: 1fr;
            gap: 50px;
            margin-bottom: 90px;
            max-width: 1000px;
            margin-left: auto;
            margin-right: auto;
          }

          .service-card {
            background: rgba(0, 0, 0, 0.5);
            backdrop-filter: blur(15px);
            border: 1px solid rgba(255, 255, 255, 0.1);
            border-radius: 25px;
            padding: 45px 35px;
            position: relative;
            overflow: hidden;
            transition: all 0.3s ease;
            box-shadow: 0 8px 30px rgba(0, 0, 0, 0.3);
          }

          .service-card::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            height: 3px;
            background: linear-gradient(90deg, #ff0080, #00ffff, #ffff00, #ff0080);
            background-size: 200% 100%;
            animation: borderGlow 3s linear infinite;
          }

          @keyframes borderGlow {
            0% { background-position: 0% 50%; }
            100% { background-position: 200% 50%; }
          }

          .service-card:hover {
            transform: translateY(-8px);
            background: rgba(0, 0, 0, 0.7);
            box-shadow:
              0 20px 50px rgba(0, 0, 0, 0.4),
              0 0 30px rgba(255, 0, 128, 0.2);
            border-color: rgba(255, 0, 128, 0.3);
          }

          /* Desktop layout for feature cards with images */
          @media (min-width: 769px) {
            .service-card.image-card {
              display: flex !important;
              align-items: center !important;
              gap: 80px !important;
              padding: 60px 60px !important;
              max-width: 1800px !important;
              margin-left: auto !important;
              margin-right: auto !important;
              width: 100% !important;
            }
            
            .service-card.image-card .service-image {
              flex: 0 0 auto !important;
              margin: 0 !important;
              width: 500px !important;
              height: 333px !important;
              max-width: 500px !important;
              min-width: 500px !important;
              aspect-ratio: 3 / 2 !important;
              object-fit: cover !important;
            }
            
            .service-card.image-card .image-content {
              flex: 1 !important;
              display: flex !important;
              flex-direction: column !important;
              padding-left: 20px !important;
            }
          }

          .service-card .service-image {
            width: calc(100% - 20px);
            height: auto;
            aspect-ratio: 3 / 2;
            margin: 0 10px 20px 10px;
            display: block;
            object-fit: cover;
            border-radius: 15px;
            border: 2px solid rgba(255, 255, 255, 0.3);
            filter: drop-shadow(0 0 20px rgba(255, 0, 128, 0.5));
            transition: all 0.3s ease;
            background: rgba(0, 0, 0, 0.2);
          }

          .service-card:hover .service-image {
            transform: scale(1.02);
            filter: drop-shadow(0 0 30px rgba(255, 0, 128, 0.8));
            border-color: rgba(255, 0, 128, 0.7);
            box-shadow: 0 10px 40px rgba(255, 0, 128, 0.3);
          }

          .prompt-showcase {
            color: #00ffff;
            font-family: 'Space Grotesk', monospace;
            font-size: 1.2rem;
            font-weight: 500;
            background: rgba(0, 255, 255, 0.1);
            border: 2px solid rgba(0, 255, 255, 0.3);
            border-radius: 15px;
            padding: 20px 25px;
            margin: 0 0 25px 0;
            text-align: left;
            text-shadow: 0 0 8px rgba(0, 255, 255, 0.5);
            backdrop-filter: blur(5px);
            font-style: italic;
            line-height: 1.4;
            cursor: pointer;
            transition: all 0.3s ease;
            user-select: none;
          }

          .prompt-showcase:hover {
            background: rgba(0, 255, 255, 0.15);
            border-color: rgba(0, 255, 255, 0.5);
            transform: translateY(-2px);
            box-shadow: 0 8px 25px rgba(0, 255, 255, 0.2);
          }

          .remix-btn {
            padding: 15px 30px;
            background: rgba(0, 0, 0, 0.7);
            border: 2px solid #00ffff;
            color: #00ffff;
            border-radius: 50px;
            font-family: 'Space Grotesk', sans-serif;
            font-weight: 700;
            font-size: 1rem;
            text-transform: uppercase;
            letter-spacing: 1px;
            cursor: pointer;
            transition: all 0.3s ease;
            box-shadow:
              0 8px 25px rgba(0, 255, 255, 0.2),
              0 0 20px rgba(0, 255, 255, 0.1);
            margin-top: 15px;
          }

          .remix-btn:hover {
            background: rgba(0, 255, 255, 0.1);
            transform: translateY(-2px);
            box-shadow:
              0 12px 35px rgba(0, 255, 255, 0.3),
              0 0 30px rgba(0, 255, 255, 0.2);
          }

          .prompt-label {
            font-family: 'Space Grotesk', sans-serif;
            font-size: 1.1rem;
            color: rgba(255, 255, 255, 0.7);
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 2px;
            margin: 0 10px 12px 10px;
            text-shadow: 0 0 8px rgba(255, 255, 255, 0.2);
            opacity: 0.8;
            text-align: center;
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
            background: #ffff00;
            border-radius: 50%;
            opacity: 0;
            animation: spark 3s infinite ease-out;
            box-shadow: 0 0 6px #ffff00;
          }

          .spark:nth-child(1) {
            top: 25%;
            left: 20%;
            animation-delay: 0s;
          }

          .spark:nth-child(2) {
            top: 70%;
            left: 80%;
            animation-delay: 1s;
          }

          .spark:nth-child(3) {
            top: 50%;
            left: 10%;
            animation-delay: 2s;
          }

          .spark:nth-child(4) {
            top: 30%;
            left: 90%;
            animation-delay: 1.5s;
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
            .logo { font-size: 3.5rem; }
            .services { grid-template-columns: 1fr; }
            .service-card { padding: 35px 25px; }
            .hero h1 { font-size: 2.8rem; line-height: 1.2; }
            .hero p { font-size: 1.1rem; }
            .hero-content { padding: 40px 20px; }
            .hero { padding: 20px; }
            .copied-notification {
              top: 20px;
              right: 20px;
              padding: 12px 20px;
              font-size: 0.9rem;
            }
          }

          @media (max-width: 480px) {
            .logo { font-size: 3rem; }
            .service-card { padding: 30px 20px; }
            .hero h1 { font-size: 2.4rem; line-height: 1.1; }
            .hero p { font-size: 1rem; }
            .hero-content { padding: 35px 15px; }
            .cta-button { padding: 18px 35px; font-size: 1rem; }
            .copied-notification {
              top: 15px;
              right: 15px;
              padding: 10px 18px;
              font-size: 0.8rem;
            }
          }

          .bottom-section {
            display: grid;
            grid-template-columns: 2fr 1fr;
            gap: 40px;
            margin-bottom: 60px;
          }

          .about-wtaf {
            background: rgba(0, 0, 0, 0.6);
            backdrop-filter: blur(15px);
            border: 2px solid rgba(255, 255, 255, 0.1);
            border-radius: 25px;
            padding: 40px;
            position: relative;
            overflow: hidden;
            box-shadow: 0 8px 30px rgba(0, 0, 0, 0.3);
          }

          .about-wtaf::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            height: 3px;
            background: linear-gradient(90deg, #00ffff, #ff0080, #00ffff);
            background-size: 200% 100%;
            animation: borderGlow 4s linear infinite;
          }

          .about-title {
            font-family: 'Space Grotesk', sans-serif;
            font-size: 2rem;
            color: #ffffff;
            margin-bottom: 20px;
            font-weight: 700;
            text-shadow: 0 0 10px rgba(0, 255, 255, 0.5);
          }

          .about-text {
            font-size: 1.1rem;
            color: rgba(255, 255, 255, 0.9);
            line-height: 1.6;
            margin-bottom: 15px;
            font-weight: 300;
          }

          .about-text strong {
            color: #00ffff;
            font-weight: 600;
            text-shadow: 0 0 8px rgba(0, 255, 255, 0.5);
          }

          .about-subtext {
            font-size: 1rem;
            color: rgba(255, 255, 255, 0.7);
            font-style: italic;
            font-weight: 300;
          }

          .promo-title {
            font-family: 'Space Grotesk', sans-serif;
            font-size: 1.5rem;
            color: #ffffff;
            margin-bottom: 15px;
            font-weight: 700;
            text-shadow: 0 0 10px rgba(255, 0, 128, 0.5);
          }

          .promo-text {
            font-size: 1rem;
            color: rgba(255, 255, 255, 0.9);
            line-height: 1.5;
            margin-bottom: 20px;
            font-weight: 300;
          }

          .trending-link {
            display: inline-block;
            color: #ff0080;
            text-decoration: none;
            font-family: 'Space Grotesk', sans-serif;
            font-weight: 700;
            font-size: 1.1rem;
            text-shadow: 0 0 8px rgba(255, 0, 128, 0.5);
            transition: all 0.3s ease;
            border-bottom: 2px solid transparent;
          }

          .trending-link:hover {
            color: #ffffff;
            text-shadow: 0 0 15px rgba(255, 0, 128, 0.8);
            border-bottom-color: rgba(255, 0, 128, 0.6);
            transform: translateX(5px);
          }

          @media (max-width: 768px) {
            .bottom-section {
              grid-template-columns: 1fr;
              gap: 30px;
            }
            .trending-promo {
              order: -1;
            }
            .about-wtaf { padding: 30px 25px; }
            .trending-promo { padding: 25px 20px; }
            .about-title { font-size: 1.7rem; }
            .promo-title { font-size: 1.3rem; }
          }

          @media (max-width: 480px) {
            .about-wtaf { padding: 25px 20px; }
            .trending-promo { padding: 20px 15px; }
            .about-title { font-size: 1.5rem; }
            .about-text { font-size: 1rem; }
            .promo-title { font-size: 1.2rem; }
            .promo-text { font-size: 0.9rem; }
          }

          .promo-emoji {
            font-size: 3rem;
            margin-bottom: 15px;
            animation: flamePulse 2s ease-in-out infinite;
            filter: drop-shadow(0 0 15px rgba(255, 102, 0, 0.6));
          }

          @keyframes flamePulse {
            0%, 100% { 
              transform: scale(1) rotate(0deg);
              filter: drop-shadow(0 0 15px rgba(255, 102, 0, 0.6));
            }
            50% { 
              transform: scale(1.1) rotate(2deg);
              filter: drop-shadow(0 0 25px rgba(255, 102, 0, 0.8));
            }
          }

          .trending-promo {
            background: linear-gradient(135deg, rgba(255, 0, 128, 0.2), rgba(139, 0, 0, 0.3));
            backdrop-filter: blur(15px);
            border: 2px solid rgba(255, 0, 128, 0.4);
            border-radius: 25px;
            padding: 30px;
            position: relative;
            overflow: hidden;
            box-shadow: 
              0 8px 30px rgba(255, 0, 128, 0.2),
              inset 0 0 20px rgba(255, 0, 128, 0.1);
            transition: all 0.3s ease;
          }

          .trending-promo:hover {
            transform: translateY(-5px);
            box-shadow: 
              0 15px 40px rgba(255, 0, 128, 0.3),
              inset 0 0 30px rgba(255, 0, 128, 0.15);
            border-color: rgba(255, 0, 128, 0.6);
          }

          .trending-promo::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            height: 3px;
            background: linear-gradient(90deg, #ff0080, #ffff00, #ff0080);
            background-size: 200% 100%;
            animation: borderGlow 3s linear infinite;
          }
          
          .starter-section {
            margin-top: 30px;
            margin-bottom: 40px;
          }

          .starter-text {
            font-size: 1.2rem;
            font-weight: 600;
            color: #00ffff;
            text-shadow: 0 0 8px rgba(0, 255, 255, 0.5);
            margin-bottom: 15px;
            text-align: center;
          }

          .starter-text strong {
            color: #ffffff;
            font-weight: 700;
            text-shadow: 0 0 10px rgba(0, 255, 255, 0.8);
          }

          .prompt-suggestions {
            position: relative;
            height: 65px;
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 10px;
          }

          .suggestion-container {
            position: relative;
            width: 100%;
            height: 45px;
            display: flex;
            align-items: center;
            justify-content: center;
          }

          .suggestion-prompt {
            position: absolute;
            top: 0;
            left: 50%;
            transform: translateX(-50%);
            width: 90%;
            max-width: 500px;
            padding: 12px 20px;
            background: rgba(0, 255, 255, 0.1);
            border: 2px solid rgba(0, 255, 255, 0.3);
            border-radius: 25px;
            color: #00ffff;
            font-family: 'Space Grotesk', monospace;
            font-size: 1rem;
            font-weight: 500;
            text-align: center;
            cursor: pointer;
            transition: all 0.5s ease;
            opacity: 0;
            transform: translateX(-50%) translateY(20px);
            backdrop-filter: blur(5px);
            text-shadow: 0 0 8px rgba(0, 255, 255, 0.5);
            user-select: none;
          }

          .suggestion-prompt.active {
            opacity: 1;
            transform: translateX(-50%) translateY(0);
          }

          .suggestion-prompt:hover {
            background: rgba(0, 255, 255, 0.15);
            border-color: rgba(0, 255, 255, 0.5);
            transform: translateX(-50%) translateY(-2px);
            box-shadow: 0 8px 25px rgba(0, 255, 255, 0.2);
          }

          .suggestion-dots {
            display: flex;
            gap: 8px;
            justify-content: center;
          }

          .dot {
            width: 8px;
            height: 8px;
            border-radius: 50%;
            border: none;
            background: rgba(0, 255, 255, 0.3);
            cursor: pointer;
            transition: all 0.3s ease;
          }

          .dot.active {
            background: #00ffff;
            box-shadow: 0 0 10px rgba(0, 255, 255, 0.6);
            transform: scale(1.2);
          }

          .dot:hover {
            background: rgba(0, 255, 255, 0.6);
            transform: scale(1.1);
          }

          @media (max-width: 768px) {
            .starter-text {
              font-size: 1.1rem;
            }
            
            .suggestion-prompt {
              font-size: 0.9rem;
              padding: 10px 16px;
              width: 95%;
            }
          }

          @media (max-width: 480px) {
            .starter-text {
              font-size: 1rem;
            }
            
            .suggestion-prompt {
              font-size: 0.8rem;
              padding: 8px 14px;
            }
          }

          .creator-stats-inline {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 15px;
            font-size: 0.9rem;
          }

          .creator-info {
            display: flex;
            align-items: center;
            gap: 6px;
          }

          .creator-label {
            color: rgba(255, 255, 255, 0.6);
            font-weight: 500;
          }

          .creator-handle {
            color: #ff0080;
            font-family: 'Space Grotesk', sans-serif;
            font-weight: 700;
            text-decoration: none;
            text-shadow: 0 0 8px rgba(255, 0, 128, 0.5);
            transition: all 0.3s ease;
          }

          .creator-handle:hover {
            color: #ffffff;
            text-shadow: 0 0 15px rgba(255, 0, 128, 0.8);
          }

          .remix-count {
            display: flex;
            align-items: baseline;
            gap: 4px;
          }

          .remix-number {
            color: #00ffff;
            font-family: 'Space Grotesk', sans-serif;
            font-weight: 700;
            text-shadow: 0 0 8px rgba(0, 255, 255, 0.5);
          }

          .remix-label {
            color: rgba(255, 255, 255, 0.6);
            font-size: 0.8rem;
          }

          .more-link-container {
            text-align: center;
            margin-top: 30px;
          }

          .more-link {
            display: inline-block;
            padding: 15px 35px;
            background: linear-gradient(45deg, rgba(0, 255, 255, 0.1), rgba(255, 0, 128, 0.1));
            border: 2px solid rgba(0, 255, 255, 0.4);
            color: #00ffff;
            text-decoration: none;
            font-family: 'Space Grotesk', sans-serif;
            font-weight: 700;
            font-size: 1.1rem;
            text-shadow: 0 0 8px rgba(0, 255, 255, 0.5);
            transition: all 0.3s ease;
            border-radius: 50px;
            text-transform: uppercase;
            letter-spacing: 1px;
            position: relative;
            overflow: hidden;
            backdrop-filter: blur(10px);
            box-shadow: 
              0 8px 25px rgba(0, 255, 255, 0.2),
              0 0 20px rgba(0, 255, 255, 0.1);
          }

          .more-link::before {
            content: '';
            position: absolute;
            top: 0;
            left: -100%;
            width: 100%;
            height: 100%;
            background: linear-gradient(90deg, transparent, rgba(0, 255, 255, 0.2), transparent);
            transition: left 0.5s ease;
          }

          .more-link:hover::before {
            left: 100%;
          }

          .more-link:hover {
            color: #ffffff;
            text-shadow: 0 0 15px rgba(0, 255, 255, 0.8);
            border-color: rgba(0, 255, 255, 0.8);
            background: linear-gradient(45deg, rgba(0, 255, 255, 0.2), rgba(255, 0, 128, 0.2));
            transform: translateY(-3px) scale(1.05);
            box-shadow: 
              0 15px 35px rgba(0, 255, 255, 0.3),
              0 0 30px rgba(0, 255, 255, 0.2);
          }

          .section-title {
            font-family: 'Space Grotesk', sans-serif;
            font-size: 2.5rem;
            font-weight: 700;
            color: #ffffff;
            text-align: center;
            margin-bottom: 40px;
            position: relative;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 15px;
            text-transform: uppercase;
            letter-spacing: 2px;
          }

          .featured-title {
            background: linear-gradient(45deg, #ffff00, #ff0080, #00ffff);
            background-size: 200% 200%;
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
            animation: gradientShift 3s ease infinite;
            text-shadow: none;
            filter: drop-shadow(0 0 15px rgba(255, 255, 0, 0.5));
          }

          .trending-title {
            background: linear-gradient(45deg, #ff0080, #ff4500, #ffff00);
            background-size: 200% 200%;
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
            animation: gradientShift 3s ease infinite;
            text-shadow: none;
            filter: drop-shadow(0 0 15px rgba(255, 0, 128, 0.5));
          }

          .title-icon {
            font-size: 2rem;
            animation: iconPulse 2s ease-in-out infinite;
            filter: drop-shadow(0 0 10px rgba(255, 255, 0, 0.6));
          }

          .featured-title .title-icon {
            color: #ffff00;
            animation: starTwinkle 2s ease-in-out infinite;
          }

          .trending-title .title-icon {
            color: #ff4500;
            animation: flameDance 2s ease-in-out infinite;
          }

          @keyframes starTwinkle {
            0%, 100% { 
              transform: scale(1) rotate(0deg);
              filter: drop-shadow(0 0 10px rgba(255, 255, 0, 0.6));
            }
            50% { 
              transform: scale(1.2) rotate(180deg);
              filter: drop-shadow(0 0 20px rgba(255, 255, 0, 0.9));
            }
          }

          @keyframes flameDance {
            0%, 100% { 
              transform: scale(1) rotate(-5deg);
              filter: drop-shadow(0 0 10px rgba(255, 69, 0, 0.6));
            }
            50% { 
              transform: scale(1.1) rotate(5deg);
              filter: drop-shadow(0 0 20px rgba(255, 69, 0, 0.9));
            }
          }

          @keyframes iconPulse {
            0%, 100% { 
              transform: scale(1);
              opacity: 0.8;
            }
            50% { 
              transform: scale(1.1);
              opacity: 1;
            }
          }

          @media (max-width: 768px) {
            .section-title {
              font-size: 2rem;
              gap: 10px;
            }
            
            .title-icon {
              font-size: 1.5rem;
            }
          }

          @media (max-width: 480px) {
            .section-title {
              font-size: 1.7rem;
              gap: 8px;
            }
            
            .title-icon {
              font-size: 1.3rem;
            }
          }
        `}</style>
      </body>
    </html>
  )
}

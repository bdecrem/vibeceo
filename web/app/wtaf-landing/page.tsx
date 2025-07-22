"use client"

import React, { useState, useEffect } from "react"
import TruncatedPrompt from "@/components/truncated-prompt"

export default function HomePage() {
  const [copiedNotification, setCopiedNotification] = useState({ show: false, text: "" })

  const showCopiedNotification = (text: string) => {
    setCopiedNotification({ show: true, text })
    setTimeout(() => {
      setCopiedNotification({ show: false, text: "" })
    }, 5000) // Longer display time for modal
  }

  const closeCopiedModal = () => {
    setCopiedNotification({ show: false, text: "" })
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

  const [currentSuggestion, setCurrentSuggestion] = useState(0)

  const suggestions = [
    "wtaf make me a simple todo app",
    "wtaf make a chat app for me and my friends", 
    "wtaf build a color palette picker",
  ]

  const handleSuggestionClick = async (suggestion: string) => {
    const success = await copyToClipboard(suggestion)
    if (success) {
      showCopiedNotification(suggestion)
    }
  }

  const handlePromptClick = async (prompt: string) => {
    const success = await copyToClipboard(prompt)
    if (success) {
      showCopiedNotification(prompt)
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
    <>
      <link
        href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;500;700;900&family=Inter:wght@300;400;500;600&display=swap"
        rel="stylesheet"
      />
        {/* Copied Modal */}
        {copiedNotification.show && (
          <div className="modal-overlay" onClick={closeCopiedModal}>
            <div className="copied-modal" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <button className="close-button" onClick={closeCopiedModal}>×</button>
                <div className="header-center">
                  <div className="success-icon">✨</div>
                  <h3 className="modal-title">Copied!</h3>
                </div>
                <div className="header-spacer"></div>
              </div>
              <div className="modal-body">
                <p className="instruction-text">
                  Now text this to <span className="phone-number">+1-866-330-0015</span>
                </p>
                <div className="copied-text-display">
                  {copiedNotification.text}
                </div>
              </div>
              <div className="modal-footer">
                <button className="got-it-button" onClick={closeCopiedModal}>
                  Got it!
                </button>
              </div>
            </div>
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
        <div className="float-element robot">🤖</div>
        <div className="float-element lightning">⚡</div>
        <div className="float-element fire">🔥</div>
        <div className="float-element chains">⛓️</div>
        <div className="float-element skull">💀</div>

        <header>
          <div className="logo glitch" data-text="WEBTOYS">
            WEBTOYS
          </div>
          <div className="tagline">WEB TOYS, ARTIFACTS & FUN</div>
        </header>

        <main>
          <section className="hero">
            <div className="hero-content">
              <h1 className="hero-title">
                One-Shot Prompting Over SMS
              </h1>
              <div className="starter-section">
                <div className="starter-text">
                  Try it — text <strong>+1-866-330-0015</strong> with:
                </div>
                <div className="prompt-suggestions">
                  <div className="suggestion-container">
                    <div
                      className={`suggestion-prompt large ${currentSuggestion === 0 ? "active" : ""}`}
                      onClick={() => handleSuggestionClick(suggestions[0])}
                    >
                      "{suggestions[0]}"
                    </div>
                    <div
                      className={`suggestion-prompt large ${currentSuggestion === 1 ? "active" : ""}`}
                      onClick={() => handleSuggestionClick(suggestions[1])}
                    >
                      "{suggestions[1]}"
                    </div>
                    <div
                      className={`suggestion-prompt large ${currentSuggestion === 2 ? "active" : ""}`}
                      onClick={() => handleSuggestionClick(suggestions[2])}
                    >
                      "{suggestions[2]}"
                    </div>
                  </div>
                </div>
                <p>
                  Text us. We'll shoot back a page, app or simple game your friends can remix. It's art meets algorithm.
                </p>
              </div>
              {/* <div className="cta-section">
                <a href="https://wtaf.me/bart/satin-horse-storytelling" className="cta-button">Learn More</a>
                <a href="/featured" className="cta-button secondary">
                  Gallery
                </a>
              </div> */}
            </div>
          </section>

          {/* How It Works Section */}
          <section className="how-it-works">
            <div className="how-it-works-content">
              <h2 className="how-it-works-title">How It Works</h2>
              <div className="steps">
                <div className="step">
                  <div className="step-number">1</div>
                  <div className="step-content">
                    <h3>Try it</h3>
                    <p>Browse websites and apps others made with WTAF.</p>
                  </div>
                </div>
                <div className="step">
                  <div className="step-number">2</div>
                  <div className="step-content">
                    <h3>Remix</h3>
                    <p>Copy a REMIX code, text it with your changes to +1-866-330-0015 (WhatsApp works too).</p>
                  </div>
                </div>
                <div className="step">
                  <div className="step-number">3</div>
                  <div className="step-content">
                    <h3>Make your own</h3>
                    <p>Text us a sentence. We'll turn it into a tiny web app.</p>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* What You Can Make Section */}
          <section className="services">
            <h2 className="section-title featured-title glitch" data-text="WHAT YOU CAN MAKE">
              <span className="title-icon">⭐</span>
              WHAT YOU CAN MAKE
              <span className="title-icon">⭐</span>
            </h2>

            {/* Simple Web Sites */}
            <div className="category-section">
              <h3 className="category-title">Simple Web Sites</h3>
              <div className="service-card image-card">
                <div className="image-container">
                  <a href="https://www.wtaf.me/bart/sand-leaf-breaking">
                    <img src="/wtaf-landing/images/sand-leaf-breaking.png?v=20250721-1600" alt="Buzzkill Barbershop" className="service-image" />
                  </a>
                  <div className="image-overlay">
                    <a href="/bart/sand-leaf-breaking?demo=true" className="try-app-btn">TRY THIS APP</a>
                  </div>
                </div>
                <div className="image-content">
                  <div className="app-title">BUZZKILL</div>
                  <div className="prompt-label">The prompt:</div>
                  <TruncatedPrompt
                    prompt='Wtaf make a bold, gritty landing page for a barbershop called "Buzzkill" — vintage punk aesthetic, scissors that animate on hover, neon sign logo, moody background music (pretend), and fake reviews from rockstars and criminals'
                    maxLength={120}
                    className="prompt-showcase"
                    onClick={() => handlePromptClick('Wtaf make a bold, gritty landing page for a barbershop called "Buzzkill" — vintage punk aesthetic, scissors that animate on hover, neon sign logo, moody background music (pretend), and fake reviews from rockstars and criminals')}
                  />
                  <button className="remix-btn" onClick={() => handlePromptClick("REMIX sand-leaf-breaking")}>
                    REMIX
                  </button>
                </div>
              </div>
            </div>

            {/* WEBSITES WITH FORMS */}
            <div className="category-section">
              <h3 className="category-title">WEBSITES WITH FORMS</h3>
              <div className="service-card image-card">
                <div className="image-container">
                  <a href="https://www.wtaf.me/bart/clay-dragonfly-protecting">
                    <img src="/wtaf-landing/images/clay-dragonfly-protecting.png" alt="404 Girls AI Band" className="service-image" />
                  </a>
                  <div className="image-overlay">
                    <a href="/bart/clay-dragonfly-protecting?demo=true" className="try-app-btn">TRY THIS APP</a>
                  </div>
                </div>
                <div className="image-content">
                  <div className="app-title">404 Girls</div>
                  <div className="prompt-label">The prompt:</div>
                  <TruncatedPrompt
                    prompt='Wtaf --admin build a landing page for a rebellious AI band called "404 Girls" — glitched-out vibes, retro pixel fonts, embedded fake tour dates, and a big JOIN THE UPRISING button. The admin page lets us add tour dates'
                    maxLength={120}
                    className="prompt-showcase"
                    onClick={() => handlePromptClick('Wtaf --admin build a landing page for a rebellious AI band called "404 Girls" — glitched-out vibes, retro pixel fonts, embedded fake tour dates, and a big JOIN THE UPRISING button. The admin page lets us add tour dates')}
                  />
                  <div className="prompt-label" style={{ textTransform: "none" }}>
                    This app comes with an{" "}
                    <a href="https://www.wtaf.me/bart/admin-clay-dragonfly-protecting" style={{ color: "#00ffff", textDecoration: "underline" }}>
                      admin page
                    </a>
                    .
                  </div>
                  <button className="remix-btn" onClick={() => handlePromptClick("REMIX clay-dragonfly-protecting")}>
                    REMIX
                  </button>
                </div>
              </div>
            </div>

            {/* CHAT APPS */}
            <div className="category-section">
              <h3 className="category-title">CHAT APPS</h3>
              <div className="service-card image-card">
                <div className="image-container">
                  <a href="https://www.wtaf.me/bart/twilight-mantis-chatting">
                    <img src="/wtaf-landing/images/twilight-mantis-chatting.png?v=20250721-2344" alt="Kpop Chatroom" className="service-image" />
                  </a>
                  <div className="image-overlay">
                    <a href="/bart/twilight-mantis-chatting?demo=true" className="try-app-btn">TRY THIS APP</a>
                  </div>
                </div>
                <div className="image-content">
                  <div className="app-title">Kpop Chatroom</div>
                  <div className="prompt-label">The prompt:</div>
                  <TruncatedPrompt
                    prompt='Wtaf Make a chatroom for me and my friends to talk about Kpop - the colorscheme should be hot pink gradients'
                    maxLength={120}
                    className="prompt-showcase"
                    onClick={() => handlePromptClick('Wtaf Make a chatroom for me and my friends to talk about Kpop - the colorscheme should be hot pink gradients')}
                  />
                  <button className="remix-btn" onClick={() => handlePromptClick("REMIX twilight-mantis-chatting")}>
                    REMIX
                  </button>
                </div>
              </div>
            </div>

            {/* Arcade Games */}
            <div className="category-section">
              <h3 className="category-title">Arcade Games</h3>
              <div className="service-card image-card">
                <div className="image-container">
                  <a href="https://wtaf.me/bart/bronze-dolphin-flying">
                    <img src="/wtaf-landing/images/pong.png" alt="Pong Game" className="service-image" />
                  </a>
                  <div className="image-overlay">
                    <a href="/bart/bronze-dolphin-flying?demo=true" className="try-app-btn">TRY THIS APP</a>
                  </div>
                </div>
                <div className="image-content">
                  <div className="app-title">Paddle Clash</div>
                  <div className="prompt-label">The prompt:</div>
                  <div
                    className="prompt-showcase"
                    onClick={() => handlePromptClick("wtaf make a pong-style browser game")}
                  >
                    "wtaf make a pong-style browser game"
                  </div>
                  <button className="remix-btn" onClick={() => handlePromptClick("REMIX pong-game")}>
                    REMIX
                  </button>
                </div>
              </div>
            </div>

            <div className="more-link-container">
              <a href="/featured" className="more-link">
                CHECK OUT THE GALLERY →
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

            {/* Trending App - Demo Paint */}
            <div className="service-card image-card">
              <div className="image-container">
                <a href="https://wtaf.me/bart/demo-paint-od96qt40">
                  <img src="/wtaf-landing/images/demo-paint-od96qt40.png" alt="Demo Paint App" className="service-image" />
                </a>
                <div className="image-overlay">
                  <a href="https://wtaf.me/bart/demo-paint-od96qt40?demo=true" className="try-app-btn">TRY THIS APP</a>
                </div>
              </div>
              <div className="image-content">
                <div className="creator-stats-inline">
                  <div className="creator-info">
                    <span className="creator-label">by</span>
                    <a href="/wtaf/bart/creations" className="creator-handle">
                      @bart
                    </a>
                  </div>
                  <div className="remix-count">
                    <span className="remix-number">287</span>
                    <span className="remix-label">remixes</span>
                  </div>
                </div>
                <div className="prompt-label">The prompt:</div>
                <div
                  className="prompt-showcase"
                  onClick={() => handlePromptClick("wtaf make a digital paint app with brushes and colors")}
                >
                  "wtaf make a digital paint app with brushes and colors"
                </div>
                <button className="remix-btn" onClick={() => handlePromptClick("REMIX demo-paint-od96qt40")}>
                  REMIX
                </button>
              </div>
            </div>

            {/* Trending App 2 - Tangerine Bat Tracking */}
            <div className="service-card image-card">
              <div className="image-container">
                <a href="https://wtaf.me/bart/tangerine-bat-tracking">
                  <img src="/wtaf-landing/images/tangerine-bat-tracking.png" alt="Tangerine Bat Tracking" className="service-image" />
                </a>
                <div className="image-overlay">
                  <a href="https://wtaf.me/bart/tangerine-bat-tracking?demo=true" className="try-app-btn">TRY THIS APP</a>
                </div>
              </div>
              <div className="image-content">
                <div className="creator-stats-inline">
                  <div className="creator-info">
                    <span className="creator-label">by</span>
                    <a href="/wtaf/bart/creations" className="creator-handle">
                      @bart
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
                  onClick={() => handlePromptClick("wtaf make a bat tracking app where you can log sightings and track migration patterns")}
                >
                  "wtaf make a bat tracking app where you can log sightings and track migration patterns"
                </div>
                <button className="remix-btn" onClick={() => handlePromptClick("REMIX tangerine-bat-tracking")}>
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
                <h2 className="about-title">About Webtoys</h2>
                <p className="about-text">
                  Text your wildest app ideas to <strong>+1-866-330-0015</strong> and watch them materialize into
                  working code. No planning. No meetings. No bullshit. Just pure creative chaos delivered through SMS.
                  Each prompt becomes a fully functional app in minutes, not months.
                </p>
                <p className="about-subtext">Start with "wtaf" + your idea. The algorithm handles the rest.</p>
                <div style={{ textAlign: 'center', marginTop: '25px' }}>
                  <a href="https://wtaf.me/bart/satin-horse-storytelling" className="faq-link">FAQ</a>
                </div>
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
            background: linear-gradient(135deg, 
              #1a1a1a 0%, 
              #252525 15%, 
              #2d1b69 30%, 
              #4a1b4a 45%, 
              #8b0000 60%, 
              #6b1050 75%, 
              #4b0082 85%, 
              #000000 100%);
            background-size: 800% 800%;
            animation: gradientShift 15s ease infinite;
            font-family: 'Inter', sans-serif;
            overflow-x: hidden;
            min-height: 100vh;
            color: #ffffff;
          }

          /* Modal Overlay */
          .modal-overlay {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.85);
            z-index: 1000;
            display: flex;
            align-items: center;
            justify-content: center;
          }

          /* Copied Modal */
          .copied-modal {
            background: #1a1a1a;
            border: 1px solid #333;
            border-radius: 8px;
            max-width: 500px;
            width: 90%;
            position: relative;
          }

          /* Modal Header */
          .modal-header {
            padding: 20px;
            display: flex;
            align-items: center;
            justify-content: space-between;
            border-bottom: 1px solid #333;
          }

          .header-center {
            display: flex;
            align-items: center;
            gap: 8px;
            flex: 1;
            justify-content: center;
          }

          .header-spacer {
            width: 30px; /* Same width as close button to balance */
          }

          .success-icon {
            font-size: 1.2rem;
          }

          .modal-title {
            font-family: 'Space Grotesk', sans-serif;
            font-size: 1.2rem;
            font-weight: 700;
            color: #ffffff;
            margin: 0;
          }

          .close-button {
            background: none;
            border: none;
            color: #999;
            font-size: 1.5rem;
            cursor: pointer;
            padding: 5px;
            line-height: 1;
            width: 30px;
            height: 30px;
            display: flex;
            align-items: center;
            justify-content: center;
          }

          .close-button:hover {
            color: #ffffff;
          }

          /* Modal Body */
          .modal-body {
            padding: 20px;
          }

          .instruction-text {
            font-size: 1rem;
            color: #ccc;
            margin: 0 0 15px 0;
            text-align: center;
          }

          .phone-number {
            color: #00ffff;
            font-weight: 700;
          }

          .copied-text-display {
            background: #111;
            border: 1px solid #333;
            border-radius: 4px;
            padding: 15px;
            font-family: 'Space Grotesk', monospace;
            font-size: 0.9rem;
            color: #00ffff;
            word-break: break-word;
            line-height: 1.3;
          }

          /* Modal Footer */
          .modal-footer {
            padding: 20px;
            display: flex;
            justify-content: center;
            border-top: 1px solid #333;
          }

          .got-it-button {
            background: #333;
            color: #ffffff;
            border: 1px solid #555;
            padding: 10px 20px;
            border-radius: 4px;
            font-size: 0.9rem;
            cursor: pointer;
          }

          .got-it-button:hover {
            background: #444;
          }



          /* Mobile Responsive */
          @media (max-width: 768px) {
            .copied-modal {
              width: 95%;
              margin: 20px;
            }
            
            .modal-header {
              padding: 20px 20px 15px;
            }
            
            .modal-body {
              padding: 20px;
            }
            
            .modal-footer {
              padding: 15px 20px 20px;
            }
            
            .modal-title {
              font-size: 1.5rem;
            }
            
            .instruction-text {
              font-size: 1.1rem;
            }
            
            .copied-text-display {
              font-size: 1rem;
              padding: 15px;
            }
          }

          @media (max-width: 480px) {
            .modal-header {
              padding: 15px 15px 10px;
            }
            
            .modal-body {
              padding: 15px;
            }
            
            .modal-footer {
              padding: 10px 15px 15px;
            }
            
            .modal-title {
              font-size: 1.3rem;
            }
            
            .instruction-text {
              font-size: 1rem;
            }
            
            .got-it-button {
              padding: 12px 30px;
              font-size: 1rem;
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

          .robot {
            top: 8%;
            left: 5%;
            font-size: 3.5rem;
            color: rgba(100, 200, 255, 0.4);
            animation-delay: 0s;
          }

          .skull {
            top: 60%;
            left: 3%;
            font-size: 3.2rem;
            color: rgba(255, 255, 255, 0.3);
            animation-delay: 3s;
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

          .starter-section {
            margin-top: 30px;
            margin-bottom: 80px;
          }

          .starter-text {
            font-size: 1.4rem;
            font-weight: 300;
            color: rgba(255, 255, 255, 0.9);
            margin: 0 auto 20px;
            padding: 40px 0 0 0;
            line-height: 1.7;
            text-align: center;
            max-width: 650px;
          }

          .starter-text strong {
            color: #ffffff;
            font-weight: 700;
            text-shadow: 0 0 8px rgba(255, 255, 255, 0.5);
          }

          .prompt-suggestions {
            position: relative !important;
            height: 120px !important;
            display: flex !important;
            flex-direction: column !important;
            align-items: center !important;
            margin: 20px 0 30px 0 !important;
          }

          .suggestion-container {
            position: relative !important;
            width: 100% !important;
            height: 120px !important;
            display: flex !important;
            align-items: center !important;
            justify-content: center !important;
          }

          .suggestion-prompt {
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translateX(-50%) translateY(-50%);
            width: 95%;
            max-width: 700px;
            padding: 18px 30px;
            background: rgba(0, 255, 255, 0.1);
            border: 2px solid rgba(0, 255, 255, 0.3);
            border-radius: 30px;
            color: #00ffff;
            font-family: 'Space Grotesk', monospace;
            font-size: 1.3rem;
            font-weight: 500;
            text-align: center;
            cursor: pointer;
            transition: all 0.5s ease;
            opacity: 0;
            backdrop-filter: blur(5px);
            text-shadow: 0 0 8px rgba(0, 255, 255, 0.5);
            user-select: none;
          }

          .suggestion-prompt.active {
            opacity: 1;
            transform: translateX(-50%) translateY(-50%);
          }

          .suggestion-prompt:hover {
            background: rgba(0, 255, 255, 0.15);
            border-color: rgba(0, 255, 255, 0.5);
            transform: translateX(-50%) translateY(-52px);
            box-shadow: 0 8px 25px rgba(0, 255, 255, 0.2);
          }

          .suggestion-prompt.large {
            font-size: 1.8rem;
          }

          .hero-title {
            font-family: 'Space Grotesk', sans-serif;
            font-size: 3rem;
            font-weight: 900;
            color: #ffffff;
            text-shadow: 0 0 15px rgba(0, 255, 255, 0.3), 0 4px 8px rgba(0, 0, 0, 0.3);
            margin-bottom: 40px;
            letter-spacing: -2px;
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
            margin: 0 auto 20px;
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

          .image-container {
            position: relative;
            overflow: hidden;
            border-radius: 15px;
            border: 2px solid rgba(255, 255, 255, 0.3);
            transition: all 0.3s ease;
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

          .image-container:hover .service-image {
            transform: scale(1.05);
            filter: drop-shadow(0 0 30px rgba(255, 0, 128, 0.8));
          }

          .image-container:hover {
            border-color: rgba(255, 0, 128, 0.7);
          }

          .try-app-btn {
            display: inline-block;
            padding: 15px 30px;
            background: linear-gradient(45deg, #ff0080, #8b0000);
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
            box-shadow:
              0 8px 25px rgba(255, 0, 128, 0.3),
              0 0 20px rgba(255, 0, 128, 0.2);
            text-shadow: 0 0 10px rgba(0, 0, 0, 0.8);
            text-decoration: none;
          }

          .try-app-btn:hover {
            transform: scale(1.05);
            box-shadow:
              0 12px 35px rgba(255, 0, 128, 0.4),
              0 0 30px rgba(255, 0, 128, 0.3);
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
            width: 100%;
            height: auto;
            aspect-ratio: 3 / 2;
            margin: 0 0 20px 0;
            display: block;
            object-fit: cover;
            border-radius: 15px;
            border: 2px solid rgba(255, 255, 255, 0.15);
            transition: all 0.3s ease;
            box-shadow: 0 8px 25px rgba(0, 0, 0, 0.3);
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
            header { padding: 20px 20px 20px 20px; }
            .services { grid-template-columns: 1fr; }
            .service-card { padding: 35px 25px; }
            .hero h1 { font-size: 2.8rem; line-height: 1.2; }
            .hero p { font-size: 1.1rem; margin: 0 auto 25px; }
            .hero-content { padding: 30px 20px; } /* Reduce padding on mobile */
            .hero { padding: 10px 20px; }

            .starter-text {
              font-size: 1.1rem;
              padding-top: 20px !important; /* Reduce padding on mobile */
            }
            .suggestion-prompt {
              font-size: 1.2rem !important; /* Larger than surrounding text on mobile */
              padding: 12px 18px !important;
              width: 98%;
            }
            .prompt-suggestions {
              height: 80px !important; /* Reduce height on mobile */
              margin: 15px 0 20px 0 !important;
            }
            .suggestion-container {
              height: 80px !important;
            }
            .starter-section {
              margin-bottom: 40px !important; /* Reduce bottom margin on mobile */
            }
            .prompt-showcase {
              font-size: 1rem;
              padding: 16px 20px;
              line-height: 1.3;
            }
            .app-title {
              margin-top: 20px;
              margin-bottom: 15px;
            }
            .remix-btn {
              display: block;
              margin: 15px auto 0 auto;
            }

            /* Fix mobile image container sizing */
            .service-card .service-image {
              width: 100% !important;
              height: 100% !important;
              aspect-ratio: 3 / 2 !important;
              object-fit: cover !important;
              border-radius: 15px;
              margin-bottom: 20px;
              display: block;
            }

            .image-container {
              width: 100% !important;
              height: auto !important;
              aspect-ratio: 3 / 2 !important;
              overflow: hidden;
              border-radius: 15px;
              margin-bottom: 20px;
              position: relative;
            }
          }

          @media (max-width: 480px) {
            .logo { font-size: 3rem; }
            header { padding: 15px 20px 15px 20px; }
            .service-card { padding: 30px 20px; }
            .hero h1 { font-size: 2.4rem; line-height: 1.1; }
            .hero p { font-size: 1rem; margin: 0 auto 20px; }
            .hero-content { padding: 25px 15px; } /* Even less padding on small mobile */
            .hero { padding: 5px 20px; }
            .cta-button { padding: 18px 35px; font-size: 1rem; }

            .starter-text {
              font-size: 1rem;
              padding-top: 15px !important; /* Even less padding on small mobile */
            }
            .suggestion-prompt {
              font-size: 1.1rem !important; /* Larger than surrounding text on small mobile */
              padding: 10px 15px !important;
            }
            .prompt-suggestions {
              height: 70px !important; /* Even smaller height on small mobile */
              margin: 10px 0 15px 0 !important;
            }
            .suggestion-container {
              height: 70px !important;
            }
            .starter-section {
              margin-bottom: 30px !important; /* Even less bottom margin on small mobile */
            }
            .prompt-showcase {
              font-size: 0.9rem;
              padding: 14px 18px;
              line-height: 1.3;
            }
            .app-title {
              margin-top: 18px;
              margin-bottom: 12px;
            }
            .remix-btn {
              display: block;
              margin: 12px auto 0 auto;
              padding: 12px 25px;
              font-size: 0.9rem;
            }

            /* Ensure proper image sizing on small mobile */
            .service-card .service-image {
              width: 100% !important;
              height: 100% !important;
              aspect-ratio: 3 / 2 !important;
              object-fit: cover !important;
              border-radius: 15px;
              margin-bottom: 15px;
              display: block;
            }

            .image-container {
              width: 100% !important;
              height: auto !important;
              aspect-ratio: 3 / 2 !important;
              overflow: hidden;
              border-radius: 15px;
              margin-bottom: 15px;
              position: relative;
            }
          }

          .bottom-section {
            display: flex;
            justify-content: center;
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
            max-width: 800px;
            width: 100%;
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

          .faq-link {
            display: inline-block;
            color: #00ffff;
            text-decoration: none;
            font-family: 'Space Grotesk', sans-serif;
            font-weight: 700;
            font-size: 1.1rem;
            text-shadow: 0 0 8px rgba(0, 255, 255, 0.5);
            transition: all 0.3s ease;
            border-bottom: 2px solid transparent;
            padding: 10px 20px;
            border: 2px solid rgba(0, 255, 255, 0.4);
            border-radius: 25px;
            background: rgba(0, 255, 255, 0.1);
            backdrop-filter: blur(5px);
            text-transform: uppercase;
            letter-spacing: 1px;
          }

          .faq-link:hover {
            color: #ffffff;
            text-shadow: 0 0 15px rgba(0, 255, 255, 0.8);
            border-color: rgba(0, 255, 255, 0.8);
            background: rgba(0, 255, 255, 0.15);
            transform: translateY(-2px) scale(1.05);
            box-shadow: 0 8px 25px rgba(0, 255, 255, 0.3);
          }

          .promo-badge {
            display: inline-block;
            background: rgba(255, 255, 0, 0.2);
            border: 1px solid rgba(255, 255, 0, 0.5);
            color: #ffff00;
            padding: 5px 12px;
            border-radius: 20px;
            font-family: 'Space Grotesk', sans-serif;
            font-size: 0.8rem;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 1px;
            margin-bottom: 15px;
            text-shadow: 0 0 8px rgba(255, 255, 0, 0.5);
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
            .about-wtaf { padding: 30px 25px; }
            .about-title { font-size: 1.7rem; }
          }

          @media (max-width: 480px) {
            .about-wtaf { padding: 25px 20px; }
            .about-title { font-size: 1.5rem; }
            .about-text { font-size: 1rem; }
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

          /* How It Works Section */
          .how-it-works {
            background: linear-gradient(135deg, #001122 0%, #003366 25%, #004477 50%, #0066aa 75%, #0088cc 100%);
            margin: 80px auto 100px auto;
            max-width: 1200px;
            border-radius: 30px;
            padding: 60px 40px;
            position: relative;
            overflow: hidden;
            border: 3px solid #00ffff;
            box-shadow: 
              0 20px 50px rgba(0, 0, 0, 0.6),
              0 0 30px rgba(0, 255, 255, 0.4),
              inset 0 0 20px rgba(0, 255, 255, 0.1);
          }

          .how-it-works-content {
            position: relative;
            z-index: 10;
          }

          .how-it-works-title {
            font-family: 'Space Grotesk', sans-serif;
            font-size: 3rem;
            font-weight: 700;
            color: #ffffff;
            text-align: center;
            margin-bottom: 50px;
            text-shadow: 
              0 0 20px rgba(0, 255, 255, 0.8),
              0 0 40px rgba(0, 255, 255, 0.4),
              0 4px 8px rgba(0, 0, 0, 0.3);
          }

          .steps {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 40px;
            max-width: 1000px;
            margin: 0 auto;
          }

          .step {
            text-align: center;
            padding: 30px 20px;
            border-radius: 20px;
            background: rgba(255, 255, 255, 0.05);
            backdrop-filter: blur(10px);
            border: 1px solid rgba(255, 255, 255, 0.1);
            transition: all 0.3s ease;
          }

          .step:hover {
            transform: translateY(-5px);
            background: rgba(255, 255, 255, 0.08);
            box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
          }

          .step-number {
            width: 80px;
            height: 80px;
            border-radius: 50%;
            background: linear-gradient(135deg, #333333 0%, #4a1565 100%);
            display: flex;
            align-items: center;
            justify-content: center;
            font-family: 'Space Grotesk', sans-serif;
            font-size: 2rem;
            font-weight: 900;
            color: #ffffff;
            margin: 0 auto 25px;
            box-shadow: 0 8px 25px rgba(74, 21, 101, 0.4);
            text-shadow: 0 0 10px rgba(0, 0, 0, 0.5);
          }

          .step-content h3 {
            font-family: 'Space Grotesk', sans-serif;
            font-size: 1.8rem;
            font-weight: 700;
            color: #00ffff;
            margin-bottom: 15px;
            text-shadow: 0 0 15px rgba(0, 255, 255, 0.5);
          }

          .step-content p {
            font-size: 1.1rem;
            color: rgba(255, 255, 255, 0.9);
            line-height: 1.6;
            font-weight: 300;
            max-width: 280px;
            margin: 0 auto;
          }

          /* Mobile responsiveness */
          @media (max-width: 768px) {
            .how-it-works {
              margin: 30px 20px;
              padding: 25px 20px;
              border-radius: 25px;
            }

            .how-it-works-title {
              font-size: 1.8rem;
              margin-bottom: 20px;
            }

            .steps {
              grid-template-columns: 1fr;
              gap: 15px;
              max-width: 400px;
            }

            .step {
              padding: 15px 20px;
              display: flex;
              align-items: center;
              text-align: left;
              gap: 15px;
            }

            .step-number {
              width: 30px;
              height: 30px;
              font-size: 1rem;
              margin: 0;
              flex-shrink: 0;
            }

            .step-content h3 {
              font-size: 1.2rem;
              margin-bottom: 5px;
            }

            .step-content p {
              font-size: 0.9rem;
              max-width: 100%;
              line-height: 1.4;
            }
          }

          @media (max-width: 480px) {
            .how-it-works {
              margin: 40px 15px;
              padding: 30px 20px;
            }

            .how-it-works-title {
              font-size: 1.8rem;
              margin-bottom: 30px;
            }

            .step-number {
              width: 60px;
              height: 60px;
              font-size: 1.5rem;
            }

            .step-content h3 {
              font-size: 1.3rem;
            }

            .step-content p {
              font-size: 0.95rem;
            }
          }

          /* App title styling */
          .app-title {
            font-family: 'Space Grotesk', sans-serif;
            font-size: 1.4rem;
            color: #ffffff;
            font-weight: 700;
            margin-bottom: 15px;
            text-align: center;
            text-shadow: 0 0 10px rgba(255, 255, 255, 0.3);
          }

          /* Creator stats styling */
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

          /* More link styling */
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

          /* Section titles */
          .section-title {
            font-family: 'Space Grotesk', sans-serif;
            font-size: 2.5rem;
            font-weight: 700;
            color: #ffffff;
            text-align: center;
            margin-bottom: 20px;
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

          /* Category sections */
          .category-section {
            margin-bottom: 60px;
          }

          .category-title {
            font-family: 'Space Grotesk', sans-serif;
            font-size: 2.2rem;
            color: #00ffff;
            font-weight: 700;
            text-align: center;
            margin-bottom: 30px;
            text-shadow: 0 0 15px rgba(0, 255, 255, 0.6);
            text-transform: uppercase;
            letter-spacing: 2px;
            position: relative;
          }

          .category-title:first-of-type {
            margin-top: -30px;
          }

          .category-title::after {
            content: '';
            position: absolute;
            bottom: -8px;
            left: 50%;
            transform: translateX(-50%);
            width: 60px;
            height: 3px;
            background: linear-gradient(90deg, #00ffff, #ff0080);
            border-radius: 2px;
            box-shadow: 0 0 10px rgba(0, 255, 255, 0.5);
          }

          /* Remix button styling */
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

          /* Mobile responsive adjustments for new elements */
          @media (max-width: 768px) {
            .how-it-works {
              margin: 30px auto 60px auto;
            }

            .section-title {
              font-size: 2rem;
              gap: 10px;
              margin-bottom: 15px;
            }
            
            .title-icon {
              font-size: 1.5rem;
            }

            .category-title {
              font-size: 1.8rem;
            }

            .category-title:first-of-type {
              margin-top: -20px;
            }

            .category-section {
              margin-bottom: 30px;
            }
          }

          @media (max-width: 480px) {
            .how-it-works {
              margin: 20px auto 50px auto;
            }

            .section-title {
              font-size: 1.7rem;
              gap: 8px;
              margin-bottom: 10px;
            }
            
            .title-icon {
              font-size: 1.3rem;
            }

            .category-title {
              font-size: 1.5rem;
            }

            .category-title:first-of-type {
              margin-top: -25px;
            }

            .category-section {
              margin-bottom: 25px;
            }
          }
        `}</style>
    </>
  )
}

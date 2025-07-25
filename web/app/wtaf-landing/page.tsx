"use client"

import React, { useState, useEffect } from "react"
import Link from "next/link"

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

export default function WebtoysSitePage() {
  const [copiedNotification, setCopiedNotification] = useState({ show: false, text: "" })
  const [trendingApps, setTrendingApps] = useState<WtafApp[]>([])
  const [trendingLoading, setTrendingLoading] = useState(true)

  const showCopiedNotification = (text: string) => {
    setCopiedNotification({ show: true, text })
    setTimeout(() => {
      setCopiedNotification({ show: false, text: "" })
    }, 5000)
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

  const handleSMSBubbleClick = async (text: string) => {
    const success = await copyToClipboard(text)
    if (success) {
      showCopiedNotification(text)
    }
  }

  const handleRemixClick = async (example: string) => {
    const remixPrompt = prompt('Remix this idea:', example)
    if (remixPrompt) {
      const success = await copyToClipboard(remixPrompt)
      if (success) {
        showCopiedNotification(remixPrompt)
      }
    }
  }

  const handleTrendingRemixClick = async (appSlug: string) => {
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

  const getEmojiForApp = (prompt: string, index: number) => {
    const lowerPrompt = prompt.toLowerCase()
    
    // Game-related keywords
    if (lowerPrompt.includes('game') || lowerPrompt.includes('play') || lowerPrompt.includes('catch') || lowerPrompt.includes('run') || lowerPrompt.includes('jump')) {
      return ['🎮', '🕹️', '🎯', '🚀'][index % 4]
    }
    
    // Food/restaurant keywords  
    if (lowerPrompt.includes('food') || lowerPrompt.includes('restaurant') || lowerPrompt.includes('cafe') || lowerPrompt.includes('coffee') || lowerPrompt.includes('pizza')) {
      return ['🍕', '☕', '🍔', '🥗'][index % 4]
    }
    
    // Business/shop keywords
    if (lowerPrompt.includes('shop') || lowerPrompt.includes('store') || lowerPrompt.includes('business') || lowerPrompt.includes('company')) {
      return ['🏪', '🛍️', '💼', '🏢'][index % 4]
    }
    
    // Meme/fun keywords
    if (lowerPrompt.includes('meme') || lowerPrompt.includes('funny') || lowerPrompt.includes('joke') || lowerPrompt.includes('cat')) {
      return ['😂', '🐱', '🎭', '🤡'][index % 4]
    }
    
    // Fitness/health keywords
    if (lowerPrompt.includes('fitness') || lowerPrompt.includes('workout') || lowerPrompt.includes('health') || lowerPrompt.includes('exercise')) {
      return ['💪', '🏃‍♂️', '🧘‍♀️', '⚡'][index % 4]
    }
    
    // Default emojis
    return ['✨', '🌟', '🎨', '🚀'][index % 4]
  }

  // Interactive step numbers
  const handleStepHover = (element: HTMLElement) => {
    element.style.transform = 'rotate(360deg) scale(1.1)'
  }

  const handleStepLeave = (element: HTMLElement) => {
    element.style.transform = 'rotate(0deg) scale(1)'
  }

  // Fetch trending apps
  useEffect(() => {
    const fetchTrendingApps = async () => {
      try {
        const response = await fetch('/api/trending-wtaf?limit=4')
        const data = await response.json()
        if (data.apps) {
          setTrendingApps(data.apps)
        }
      } catch (error) {
        console.error('Error fetching trending apps:', error)
      } finally {
        setTrendingLoading(false)
      }
    }

    fetchTrendingApps()
  }, [])

  // Konami code easter egg
  useEffect(() => {
    const konamiCode = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'KeyB', 'KeyA']
    let konamiIndex = 0

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === konamiCode[konamiIndex]) {
        konamiIndex++
        if (konamiIndex === konamiCode.length) {
          document.body.style.animation = 'rainbow 2s linear infinite'
          alert('🎉 Unlimited creativity mode activated! 🎉')
          konamiIndex = 0
        }
      } else {
        konamiIndex = 0
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [])

  return (
    <>
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

      {/* Navigation */}
      <nav className="nav">
        <div className="nav-container">
          <a href="#" className="logo">WEBTOYS.ai</a>
          <ul className="nav-links">
            <li><a href="#how">How it Works</a></li>
            <li><Link href="/featured">Gallery</Link></li>
            <li><a href="sms:+18663300015" className="phone-number">📱 (866) 330-0015</a></li>
          </ul>
        </div>
      </nav>
      
      {/* Hero Section */}
      <section className="hero">
        {/* Floating shapes */}
        <div className="floating-shape shape1"></div>
        <div className="floating-shape shape2"></div>
        <div className="floating-shape shape3"></div>
        
        <div className="hero-container">
          <div className="hero-content">
            <h1 className="hero-title">
              <span className="line1">Text It</span>
              <span className="line2">We Build It</span>
              <span className="line3">Web Magic via SMS</span>
            </h1>
            
            <p className="hero-description">
              One text. Infinite possibilities. We turn your SMS into 
              stunning web pages, fun games, viral memes, and working apps.
            </p>
            
            <div className="phone-display">
              <div className="sms-header">
                <span className="sms-icon">💬</span>
                <span className="sms-number">(866) 330-0015</span>
              </div>
              <div className="sms-examples">
                <div className="sms-bubble" onClick={() => handleSMSBubbleClick("Build me a sushi restaurant site with 80s vibes")}>
                  "Build me a sushi restaurant site with 80s vibes"
                </div>
                <div className="sms-bubble" onClick={() => handleSMSBubbleClick("Create a game where you catch falling tacos")}>
                  "Create a game where you catch falling tacos"
                </div>
                <div className="sms-bubble" onClick={() => handleSMSBubbleClick("Make a meme generator for my cat photos")}>
                  "Make a meme generator for my cat photos"
                </div>
                <div className="sms-bubble" onClick={() => handleSMSBubbleClick("I need a todo app but make it fun")}>
                  "I need a todo app but make it fun"
                </div>
              </div>
            </div>
            
            <div className="cta-section">
              <a href="sms:+18663300015" className="cta-main">
                <span>📱</span>
                <span>Text (866) 330-0015 Now</span>
              </a>
            </div>
          </div>
        </div>
      </section>
      
      {/* Examples Section */}
      <section className="examples" id="examples">
        <div className="examples-container">
          <div className="section-header">
            <h2 className="section-title">Fresh From the Oven</h2>
            <p className="section-subtitle">Real creations from real text messages</p>
          </div>
          
          <div className="examples-grid">
            {/* Example 1: Sushi Site */}
            <div className="example-card">
              <div className="example-preview sushi magic-cursor">
                🍣
              </div>
              <div className="example-info">
                <div className="prompt-label">Text Message:</div>
                <div className="prompt-text">"Build me a sushi restaurant site with 80s nostalgia vibes"</div>
                <div className="example-actions">
                  <a href="#" className="btn-view">View Site</a>
                  <button className="btn-remix" onClick={() => handleRemixClick("Build me a sushi restaurant site with 80s nostalgia vibes")}>
                    <span>🎨</span>
                    <span>Remix</span>
                  </button>
                </div>
              </div>
            </div>
            
            {/* Example 2: Game */}
            <div className="example-card">
              <div className="example-preview game magic-cursor">
                <div>🌮 TACO CATCH 🌮</div>
              </div>
              <div className="example-info">
                <div className="prompt-label">Text Message:</div>
                <div className="prompt-text">"Create a game where you catch falling tacos with a sombrero"</div>
                <div className="example-actions">
                  <a href="#" className="btn-view">Play Game</a>
                  <button className="btn-remix" onClick={() => handleRemixClick("Create a game where you catch falling tacos with a sombrero")}>
                    <span>🎨</span>
                    <span>Remix</span>
                  </button>
                </div>
              </div>
            </div>
            
            {/* Example 3: Meme Generator */}
            <div className="example-card">
              <div className="example-preview meme magic-cursor">
                <div className="meme-text">
                  CAT MEMES<br/>
                  GENERATOR<br/>
                  😸
                </div>
              </div>
              <div className="example-info">
                <div className="prompt-label">Text Message:</div>
                <div className="prompt-text">"Make a meme generator but only for cat photos"</div>
                <div className="example-actions">
                  <a href="#" className="btn-view">Make Memes</a>
                  <button className="btn-remix" onClick={() => handleRemixClick("Make a meme generator but only for cat photos")}>
                    <span>🎨</span>
                    <span>Remix</span>
                  </button>
                </div>
              </div>
            </div>
            
            {/* Example 4: Todo App */}
            <div className="example-card">
              <div className="example-preview app magic-cursor">
                <div className="app-icon">✅</div>
                <div className="app-icon">📝</div>
                <div className="app-icon">🎯</div>
                <div className="app-icon">⏰</div>
                <div className="app-icon">🏆</div>
                <div className="app-icon">💫</div>
              </div>
              <div className="example-info">
                <div className="prompt-label">Text Message:</div>
                <div className="prompt-text">"I need a todo app that makes productivity feel like a game"</div>
                <div className="example-actions">
                  <a href="#" className="btn-view">Try App</a>
                  <button className="btn-remix" onClick={() => handleRemixClick("I need a todo app that makes productivity feel like a game")}>
                    <span>🎨</span>
                    <span>Remix</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
      
      {/* How it Works */}
      <section className="how-it-works" id="how">
        <div className="steps-container">
          <div className="section-header">
            <h2 className="section-title">Magic in 3 Steps</h2>
            <p className="section-subtitle">From idea to internet in minutes</p>
          </div>
          
          <div className="steps-grid">
            <div className="step-card">
              <div 
                className="step-number"
                onMouseEnter={(e) => handleStepHover(e.currentTarget)}
                onMouseLeave={(e) => handleStepLeave(e.currentTarget)}
              >1</div>
              <h3 className="step-title">Text Your Idea</h3>
              <p className="step-description">
                Send any idea to (866) 330-0015. Be specific or be vague – 
                our AI loves a creative challenge!
              </p>
            </div>
            
            <div className="step-card">
              <div 
                className="step-number"
                onMouseEnter={(e) => handleStepHover(e.currentTarget)}
                onMouseLeave={(e) => handleStepLeave(e.currentTarget)}
              >2</div>
              <h3 className="step-title">We Build Magic</h3>
              <p className="step-description">
                Our AI gets to work, crafting your vision into reality. 
                Usually takes just 2-5 minutes!
              </p>
            </div>
            
            <div className="step-card">
              <div 
                className="step-number"
                onMouseEnter={(e) => handleStepHover(e.currentTarget)}
                onMouseLeave={(e) => handleStepLeave(e.currentTarget)}
              >3</div>
              <h3 className="step-title">Get Your Link</h3>
              <p className="step-description">
                Receive a link to your creation. Share it, embed it, 
                or remix it into something new!
              </p>
            </div>
          </div>
        </div>
      </section>
      
      {/* What's Trending Now */}
      <section className="trending" id="trending">
        <div className="trending-container">
          <div className="section-header">
            <h2 className="section-title">What's Trending Now</h2>
            <p className="section-subtitle">Hot creations everyone's talking about</p>
          </div>
          
          <div className="trending-grid">
            {trendingLoading ? (
              // Loading state
              Array.from({ length: 4 }).map((_, index) => (
                <div key={index} className="trending-card">
                  <div className="trending-preview site magic-cursor">
                    ⏳
                  </div>
                  <div className="trending-info">
                    <div className="prompt-label">Loading...</div>
                    <div className="prompt-text">Fetching trending content...</div>
                    <div className="trending-stats">
                      <span className="remix-count">🔥 -- remixes</span>
                      <span className="timestamp">Loading...</span>
                    </div>
                    <div className="trending-actions">
                      <button className="btn-view" disabled>Loading...</button>
                      <button className="btn-remix" disabled>
                        <span>🎨</span>
                        <span>Loading...</span>
                      </button>
                    </div>
                  </div>
                </div>
              ))
            ) : trendingApps.length > 0 ? (
              // Dynamic content from API
              trendingApps.slice(0, 4).map((app, index) => (
                <div key={app.id} className="trending-card">
                  <div className="trending-preview og-image magic-cursor">
                    <img 
                      src={`https://tqniseocczttrfwtpbdr.supabase.co/storage/v1/object/public/og-images/${app.user_slug}-${app.app_slug}.png`}
                      alt={`Preview of ${app.original_prompt}`}
                      onError={(e) => {
                        // Fallback to emoji if image fails to load
                        const target = e.target as HTMLImageElement;
                        target.style.display = 'none';
                        if (target.nextSibling) {
                          (target.nextSibling as HTMLElement).style.display = 'flex';
                        }
                      }}
                    />
                    <div className="emoji-fallback" style={{ display: 'none' }}>
                      {getEmojiForApp(app.original_prompt, index)}
                    </div>
                  </div>
                  <div className="trending-info">
                    <div className="prompt-label">Text Message:</div>
                    <div className="prompt-text">"{app.original_prompt}"</div>
                    <div className="trending-stats">
                      <span className="remix-count">🔥 {app.total_descendants || app.remix_count || 0} remixes</span>
                      <span className="timestamp">{getTimestampLabel(app.created_at)}</span>
                    </div>
                    <div className="trending-actions">
                      <Link href={`/wtaf/${app.user_slug}/${app.app_slug}`} className="btn-view">
                        View App
                      </Link>
                      <button className="btn-remix" onClick={() => handleTrendingRemixClick(app.app_slug)}>
                        <span>🎨</span>
                        <span>Remix</span>
                      </button>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              // Fallback content if no trending apps
              <div className="trending-card">
                <div className="trending-preview site magic-cursor">
                  🚀
                </div>
                <div className="trending-info">
                  <div className="prompt-label">Text Message:</div>
                  <div className="prompt-text">"No trending apps at the moment - be the first!"</div>
                  <div className="trending-stats">
                    <span className="remix-count">🔥 0 remixes</span>
                    <span className="timestamp">Waiting for magic</span>
                  </div>
                  <div className="trending-actions">
                    <a href="sms:+18663300015" className="btn-view">Text Now</a>
                    <button className="btn-remix" onClick={() => handleSMSBubbleClick("Build something amazing")}>
                      <span>🎨</span>
                      <span>Create</span>
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
          
          <div className="trending-footer">
            <Link href="/trending" className="btn-see-more">
              See All Trending →
            </Link>
          </div>
        </div>
      </section>
      
      {/* Footer CTA */}
      <section className="footer-cta">
        <h2>Ready to Create?</h2>
        <p>Your next big idea is just one text away</p>
        <a href="sms:+18663300015" className="phone-large">📱 (866) 330-0015</a>
      </section>
      
      {/* Footer */}
      <footer className="footer">
        <div className="footer-content">
          <div className="footer-links">
            <a href="#">About</a>
            <Link href="/featured">Gallery</Link>
            <a href="#">API</a>
            <a href="#">Help</a>
          </div>
          <p className="footer-copyright">
            © 2024 WEBTOYS.ai • Made with ✨ and a sprinkle of chaos
          </p>
        </div>
      </footer>

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

        /* Modal Styles */
        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(42, 42, 42, 0.9);
          backdrop-filter: blur(10px);
          z-index: 1000;
          display: flex;
          align-items: center;
          justify-content: center;
          animation: modal-fade-in 0.3s ease-out;
        }

        @keyframes modal-fade-in {
          0% { opacity: 0; }
          100% { opacity: 1; }
        }

        .copied-modal {
          background: var(--white-pure);
          border: 6px solid var(--yellow);
          border-radius: 2rem;
          max-width: 600px;
          width: 90%;
          position: relative;
          box-shadow: 0 20px 0 var(--purple-accent), 0 40px 80px var(--purple-shadow);
          animation: modal-bounce-in 0.4s cubic-bezier(0.68, -0.55, 0.265, 1.55);
          transform-origin: center;
        }

        @keyframes modal-bounce-in {
          0% { 
            opacity: 0; 
            transform: scale(0.3) translateY(-50px);
          }
          100% { 
            opacity: 1; 
            transform: scale(1) translateY(0);
          }
        }

        .modal-header {
          padding: 2rem;
          display: flex;
          align-items: center;
          justify-content: space-between;
          border-bottom: 4px solid var(--cream);
          background: linear-gradient(135deg, var(--yellow-soft) 0%, var(--white-pure) 100%);
          border-radius: 1.4rem 1.4rem 0 0;
        }

        .header-center {
          display: flex;
          align-items: center;
          gap: 1rem;
          flex: 1;
          justify-content: center;
        }

        .header-spacer {
          width: 40px;
        }

        .success-icon {
          font-size: 2rem;
          animation: sparkle-rotate 2s ease-in-out infinite;
        }

        @keyframes sparkle-rotate {
          0%, 100% { transform: rotate(0deg) scale(1); }
          25% { transform: rotate(-10deg) scale(1.1); }
          50% { transform: rotate(10deg) scale(1.2); }
          75% { transform: rotate(-5deg) scale(1.1); }
        }

        .modal-title {
          font-size: 2rem;
          font-weight: 900;
          color: var(--charcoal);
          margin: 0;
          text-transform: uppercase;
          letter-spacing: -1px;
        }

        .close-button {
          background: var(--red);
          border: 3px solid var(--charcoal);
          color: var(--white-pure);
          font-size: 1.5rem;
          cursor: pointer;
          padding: 0.5rem;
          line-height: 1;
          width: 40px;
          height: 40px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 50%;
          transition: all 0.3s ease;
          font-weight: 900;
          box-shadow: 0 4px 0 var(--red-soft);
        }

        .close-button:hover {
          background: var(--red-soft);
          transform: translateY(-2px);
          box-shadow: 0 6px 0 var(--red);
        }

        .modal-body {
          padding: 2rem;
          background: var(--white-pure);
        }

        .instruction-text {
          font-size: 1.3rem;
          color: var(--charcoal);
          margin: 0 0 2rem 0;
          text-align: center;
          font-weight: 600;
        }

        .phone-number {
          background: var(--blue);
          color: var(--white-pure);
          padding: 0.3rem 0.8rem;
          border-radius: 1rem;
          font-weight: 900;
          font-size: 1.1em;
          border: 2px solid var(--blue-deep);
          box-shadow: 0 3px 0 var(--blue-deep);
        }

        .copied-text-display {
          background: var(--cream);
          border: 4px solid var(--green-mint);
          border-radius: 1.5rem;
          padding: 1.5rem;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', monospace;
          font-size: 1.1rem;
          color: var(--charcoal);
          word-break: break-word;
          line-height: 1.4;
          font-weight: 600;
          position: relative;
          overflow: hidden;
        }

        .copied-text-display::before {
          content: '';
          position: absolute;
          top: -2px;
          left: -2px;
          right: -2px;
          bottom: -2px;
          background: linear-gradient(45deg, var(--green-mint), var(--blue), var(--purple-accent), var(--green-mint));
          background-size: 200% 200%;
          border-radius: inherit;
          z-index: -1;
          animation: rainbow-border 3s ease-in-out infinite;
        }

        @keyframes rainbow-border {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }

        .modal-footer {
          padding: 2rem;
          display: flex;
          justify-content: center;
          background: var(--white-pure);
          border-radius: 0 0 1.4rem 1.4rem;
        }

        .got-it-button {
          background: var(--green-mint);
          color: var(--charcoal);
          border: 4px solid var(--green-sage);
          padding: 1rem 3rem;
          border-radius: 2rem;
          font-size: 1.2rem;
          font-weight: 800;
          cursor: pointer;
          text-transform: uppercase;
          letter-spacing: -0.5px;
          transition: all 0.3s ease;
          box-shadow: 0 6px 0 var(--green-sage);
        }

        .got-it-button:hover {
          background: var(--green-sage);
          color: var(--white-pure);
          transform: translateY(-3px);
          box-shadow: 0 9px 0 var(--charcoal);
        }

        .got-it-button:active {
          transform: translateY(0);
          box-shadow: 0 3px 0 var(--green-sage);
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
        
        .nav-links {
          display: flex;
          gap: 2rem;
          list-style: none;
          align-items: center;
        }
        
        .nav-links a,
        .nav-links a[href] {
          color: var(--charcoal);
          text-decoration: none;
          font-weight: 600;
          padding: 0.5rem 1.5rem;
          border-radius: 2rem;
          transition: all 0.3s ease;
          display: inline-block;
        }
        
        .nav-links a:hover,
        .nav-links a[href]:hover {
          background: var(--yellow-soft);
          transform: translateY(-2px);
        }
        
        .phone-number {
          background: var(--blue);
          color: white !important;
          box-shadow: 0 4px 0 var(--blue-deep);
          font-size: 1.1rem;
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }
        
        .phone-number:hover {
          background: var(--blue-deep) !important;
          box-shadow: 0 2px 0 var(--blue);
        }
        
        /* Hero Section */
        .hero {
          margin-top: 80px;
          min-height: 90vh;
          display: flex;
          align-items: center;
          position: relative;
          background: linear-gradient(135deg, var(--yellow-soft) 0%, var(--cream) 40%, rgba(108,203,255,0.15) 100%);
          overflow: hidden;
        }
        
        /* Floating elements */
        .floating-shape {
          position: absolute;
          opacity: 0.3;
          animation: float-shape 20s infinite ease-in-out;
        }
        
        .shape1 {
          width: 200px;
          height: 200px;
          background: var(--green-mint);
          border-radius: 50%;
          top: 10%;
          left: 5%;
          animation-delay: 0s;
        }
        
        .shape2 {
          width: 150px;
          height: 150px;
          background: var(--purple-accent);
          border-radius: 30% 70% 70% 30% / 30% 30% 70% 70%;
          top: 60%;
          right: 10%;
          animation-delay: 5s;
        }
        
        .shape3 {
          width: 100px;
          height: 100px;
          background: var(--red-soft);
          clip-path: polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%);
          bottom: 20%;
          left: 15%;
          animation-delay: 10s;
        }
        
        @keyframes float-shape {
          0%, 100% { transform: translate(0, 0) rotate(0deg); }
          25% { transform: translate(30px, -30px) rotate(90deg); }
          50% { transform: translate(-20px, 20px) rotate(180deg); }
          75% { transform: translate(40px, 10px) rotate(270deg); }
        }
        
        .hero-container {
          max-width: 1400px;
          margin: 0 auto;
          padding: 2rem;
          position: relative;
          z-index: 1;
        }
        
        .hero-content {
          text-align: center;
          max-width: 900px;
          margin: 0 auto;
        }
        
        .hero-title {
          font-size: clamp(3.5rem, 8vw, 6rem);
          font-weight: 900;
          line-height: 0.9;
          margin-bottom: 1.5rem;
          text-transform: uppercase;
          letter-spacing: -3px;
        }
        
        .line1 {
          color: var(--red);
          display: block;
        }
        
        .line2 {
          color: var(--blue-deep);
          display: block;
          margin-left: 2rem;
        }
        
        .line3 {
          color: var(--charcoal);
          display: block;
          font-size: 0.7em;
          letter-spacing: -1px;
          margin-top: 0.2em;
        }
        
        .hero-description {
          font-size: 1.5rem;
          color: var(--gray-warm);
          margin-bottom: 3rem;
          font-weight: 500;
        }
        
        /* Phone Display */
        .phone-display {
          background: var(--white-pure);
          border: 6px solid var(--yellow);
          border-radius: 3rem;
          padding: 2rem;
          box-shadow: 0 12px 0 var(--purple-accent), 0 24px 60px var(--purple-shadow);
          max-width: 600px;
          margin: 0 auto 3rem;
          transform: rotate(-1deg);
          transition: all 0.3s ease;
        }
        
        .phone-display:hover {
          transform: rotate(0deg) scale(1.02);
        }
        
        .sms-header {
          display: flex;
          align-items: center;
          gap: 1rem;
          margin-bottom: 1.5rem;
          padding-bottom: 1rem;
          border-bottom: 3px solid var(--cream);
        }
        
        .sms-icon {
          font-size: 2.5rem;
        }
        
        .sms-number {
          font-size: 1.8rem;
          font-weight: 800;
          color: var(--blue-deep);
        }
        
        .sms-examples {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }
        
        .sms-bubble {
          background: var(--cream);
          border: 3px solid var(--green-mint);
          border-radius: 1.5rem;
          padding: 1rem 1.5rem;
          font-size: 1.1rem;
          font-weight: 600;
          color: var(--charcoal);
          position: relative;
          animation: bubble-in 0.5s ease-out;
          animation-fill-mode: both;
          cursor: pointer;
          transition: all 0.2s ease;
        }
        
        .sms-bubble:hover {
          background: var(--green-mint);
          transform: translateX(10px);
        }
        
        .sms-bubble:nth-child(1) { animation-delay: 0.2s; }
        .sms-bubble:nth-child(2) { animation-delay: 0.4s; }
        .sms-bubble:nth-child(3) { animation-delay: 0.6s; }
        .sms-bubble:nth-child(4) { animation-delay: 0.8s; }
        
        @keyframes bubble-in {
          0% { 
            opacity: 0; 
            transform: translateY(20px);
          }
          100% { 
            opacity: 1; 
            transform: translateY(0);
          }
        }
        
        .cta-section {
          text-align: center;
        }
        
        .cta-main {
          display: inline-flex;
          align-items: center;
          gap: 1.5rem;
          background: var(--red);
          color: white;
          padding: 1.5rem 3rem;
          border-radius: 3rem;
          font-size: 1.3rem;
          font-weight: 800;
          text-decoration: none;
          box-shadow: 0 8px 0 var(--red-soft);
          transition: all 0.3s ease;
          margin-bottom: 1.5rem;
        }
        
        .cta-main:hover {
          transform: translateY(-3px);
          box-shadow: 0 11px 0 var(--red-soft);
        }
        
        .cta-main:active {
          transform: translateY(0);
          box-shadow: 0 4px 0 var(--red-soft);
        }
        
        .cta-sub {
          color: var(--gray-warm);
          font-size: 1.1rem;
        }
        
        /* Examples Section */
        .examples {
          padding: 6rem 2rem;
          background: var(--white-pure);
        }
        
        .examples-container {
          max-width: 1400px;
          margin: 0 auto;
        }
        
        .section-header {
          text-align: center;
          margin-bottom: 4rem;
        }
        
        .section-title {
          font-size: 3.5rem;
          color: var(--blue-deep);
          margin-bottom: 1rem;
          text-transform: uppercase;
          font-weight: 900;
          letter-spacing: -2px;
          position: relative;
          display: inline-block;
        }
        
        .section-title::after {
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
        
        .section-subtitle {
          font-size: 1.3rem;
          color: var(--gray-warm);
        }
        
        .examples-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
          gap: 2.5rem;
        }
        
        .example-card {
          background: var(--cream);
          border: 5px solid var(--yellow);
          border-radius: 2rem;
          overflow: hidden;
          box-shadow: 0 10px 0 var(--purple-accent);
          transition: all 0.3s ease;
          position: relative;
        }
        
        .example-card:hover {
          transform: translateY(-5px);
          box-shadow: 0 15px 0 var(--purple-accent);
        }
        
        .example-preview {
          aspect-ratio: 3/2;
          width: 100%;
          background: var(--white-pure);
          position: relative;
          overflow: hidden;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 1rem;
          margin-bottom: 1rem;
        }
        
        /* Different preview styles for each example */
        .example-preview.sushi {
          background: linear-gradient(45deg, var(--red-soft) 0%, var(--white-pure) 50%, var(--green-mint) 100%);
          font-size: 4rem;
        }
        
        .example-preview.game {
          background: var(--black-soft);
          color: var(--green-mint);
          font-size: 2.5rem;
          font-family: monospace;
          text-align: center;
        }
        
        .example-preview.meme {
          background: linear-gradient(135deg, var(--purple-accent) 0%, var(--blue) 100%);
        }
        
        .example-preview.app {
          background: var(--white-pure);
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 0.5rem;
          padding: 1rem;
        }
        
        .app-icon {
          background: var(--yellow-soft);
          border-radius: 0.5rem;
          aspect-ratio: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.5rem;
        }
        
        .meme-text {
          color: white;
          font-size: 1.5rem;
          font-weight: 900;
          text-transform: uppercase;
          text-align: center;
          text-shadow: 2px 2px 0 black;
          line-height: 1.2;
        }
        
        .example-info {
          padding: 2rem;
        }
        
        .prompt-label {
          font-size: 0.9rem;
          color: var(--gray-warm);
          text-transform: uppercase;
          letter-spacing: 1px;
          margin-bottom: 0.5rem;
        }
        
        .prompt-text {
          font-size: 1.2rem;
          color: var(--charcoal);
          font-weight: 600;
          margin-bottom: 1.5rem;
          line-height: 1.4;
        }
        
        .example-actions {
          display: flex;
          gap: 1rem;
        }
        
        .btn-view, .btn-remix {
          padding: 0.75rem 1.5rem;
          border-radius: 2rem;
          font-weight: 700;
          text-decoration: none;
          transition: all 0.3s ease;
          border: none;
          cursor: pointer;
          font-size: 1rem;
        }
        
        .btn-view {
          background: var(--white-pure);
          color: var(--blue-deep);
          border: 3px solid var(--blue);
        }
        
        .btn-view:hover {
          background: var(--blue);
          color: white;
          transform: translateY(-2px);
        }
        
        .btn-remix {
          background: var(--green-mint);
          color: var(--charcoal);
          border: 3px solid var(--green-sage);
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }
        
        .btn-remix:hover {
          background: var(--green-sage);
          color: white;
          transform: translateY(-2px);
        }
        
        /* How it Works */
        .how-it-works {
          padding: 6rem 2rem;
          background: linear-gradient(180deg, var(--white-pure) 0%, var(--cream) 100%);
        }
        
        .steps-container {
          max-width: 1200px;
          margin: 0 auto;
        }
        
        .steps-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
          gap: 3rem;
          margin-top: 3rem;
        }
        
        .step-card {
          text-align: center;
          padding: 2rem;
        }
        
        .step-number {
          display: inline-block;
          width: 80px;
          height: 80px;
          background: var(--yellow);
          border: 4px solid var(--charcoal);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 2rem;
          font-weight: 900;
          margin: 0 auto 1.5rem;
          box-shadow: 0 6px 0 var(--yellow-soft);
          animation: bounce 2s ease-in-out infinite;
          transition: all 0.3s ease;
        }
        
        .step-card:nth-child(2) .step-number {
          background: var(--blue);
          box-shadow: 0 6px 0 var(--blue-deep);
          animation-delay: 0.3s;
        }
        
        .step-card:nth-child(3) .step-number {
          background: var(--green-mint);
          box-shadow: 0 6px 0 var(--green-sage);
          animation-delay: 0.6s;
        }
        
        @keyframes bounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-10px); }
        }
        
        .step-title {
          font-size: 1.5rem;
          color: var(--charcoal);
          margin-bottom: 1rem;
          font-weight: 800;
        }
        
        .step-description {
          color: var(--gray-warm);
          font-size: 1.1rem;
          line-height: 1.6;
        }
        
        /* Trending Section */
        .trending {
          padding: 6rem 2rem;
          background: var(--white-pure);
        }
        
        .trending-container {
          max-width: 1400px;
          margin: 0 auto;
        }
        
        .trending-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
          gap: 2.5rem;
        }
        
        .trending-card {
          background: var(--cream);
          border: 5px solid var(--blue);
          border-radius: 2rem;
          overflow: hidden;
          box-shadow: 0 10px 0 var(--purple-accent);
          transition: all 0.3s ease;
          position: relative;
        }
        
        .trending-card:hover {
          transform: translateY(-5px);
          box-shadow: 0 15px 0 var(--purple-accent);
        }
        
        .trending-preview {
          aspect-ratio: 3/2;
          width: 100%;
          background: var(--white-pure);
          position: relative;
          overflow: hidden;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 1rem;
          margin-bottom: 1rem;
        }
        
        /* Different preview styles for each trending type */
        .trending-preview.site {
          background: linear-gradient(45deg, var(--purple-accent) 0%, var(--white-pure) 50%, var(--yellow-soft) 100%);
          font-size: 4rem;
        }
        
        .trending-preview.og-image {
          background: var(--cream);
          padding: 0;
        }
        
        .trending-preview.og-image img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          border-radius: 1rem;
        }
        
        .emoji-fallback {
          width: 100%;
          height: 100%;
          background: linear-gradient(45deg, var(--purple-accent) 0%, var(--white-pure) 50%, var(--yellow-soft) 100%);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 4rem;
          border-radius: 1rem;
        }
        
        .trending-info {
          padding: 2rem;
        }
        
        .trending-stats {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin: 1rem 0;
          padding: 0.5rem 0;
          border-top: 2px solid var(--cream);
          border-bottom: 2px solid var(--cream);
        }
        
        .remix-count {
          font-weight: 700;
          color: var(--red);
          font-size: 0.9rem;
        }
        
        .timestamp {
          color: var(--gray-warm);
          font-size: 0.8rem;
          font-style: italic;
        }
        
        .trending-actions {
          display: flex;
          gap: 1rem;
        }
        
        .trending-footer {
          text-align: center;
          margin-top: 4rem;
        }
        
        .btn-see-more {
          display: inline-block;
          background: var(--red);
          color: white;
          padding: 1rem 2rem;
          border-radius: 2rem;
          text-decoration: none;
          font-weight: 700;
          font-size: 1.1rem;
          transition: all 0.3s ease;
          box-shadow: 0 6px 0 var(--red-soft);
        }
        
        .btn-see-more:hover {
          transform: translateY(-3px);
          box-shadow: 0 9px 0 var(--red-soft);
        }
        
        /* Footer CTA */
        .footer-cta {
          padding: 6rem 2rem;
          background: var(--blue-deep);
          color: white;
          text-align: center;
        }
        
        .footer-cta h2 {
          font-size: 3rem;
          margin-bottom: 1.5rem;
          text-transform: uppercase;
        }
        
        .footer-cta p {
          font-size: 1.3rem;
          margin-bottom: 2rem;
          opacity: 0.9;
        }
        
        .phone-large {
          font-size: 2.5rem;
          font-weight: 900;
          color: var(--yellow);
          text-decoration: none;
          display: inline-block;
          padding: 1rem 2rem;
          background: rgba(255, 255, 255, 0.1);
          border-radius: 2rem;
          transition: all 0.3s ease;
        }
        
        .phone-large:hover {
          background: rgba(255, 255, 255, 0.2);
          transform: scale(1.05);
        }
        
        /* Footer */
        .footer {
          background: var(--charcoal);
          color: white;
          padding: 3rem 2rem;
          text-align: center;
        }
        
        .footer-content {
          max-width: 800px;
          margin: 0 auto;
        }
        
        .footer-links {
          display: flex;
          justify-content: center;
          gap: 2rem;
          margin-bottom: 2rem;
          flex-wrap: wrap;
        }
        
        .footer-links a,
        .footer-links a[href] {
          color: white;
          text-decoration: none;
          opacity: 0.8;
          transition: opacity 0.3s ease;
        }
        
        .footer-links a:hover,
        .footer-links a[href]:hover {
          opacity: 1;
          color: var(--yellow);
        }
        
        .footer-copyright {
          opacity: 0.6;
          font-size: 0.9rem;
        }
        
        /* Easter egg cursor */
        .magic-cursor {
          cursor: url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32"><text y="28" font-size="28">✨</text></svg>'), auto;
        }

        /* Rainbow animation for easter egg */
        @keyframes rainbow {
          0% { filter: hue-rotate(0deg); }
          100% { filter: hue-rotate(360deg); }
        }
        
        /* Responsive */
        @media (max-width: 768px) {
          .nav-links {
            gap: 1rem;
          }
          
          .nav-links a:not(.phone-number) {
            display: none;
          }
          
          .hero-title {
            font-size: 3rem;
          }
          
          .line2 {
            margin-left: 0;
          }
          
          .phone-display {
            transform: rotate(0);
          }
          
          .examples-grid {
            grid-template-columns: 1fr;
          }
          
          .trending-grid {
            grid-template-columns: 1fr;
          }
          
          .steps-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </>
  )
}
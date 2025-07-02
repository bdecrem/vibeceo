'use client'

import { useState, useEffect } from 'react'
import RemixButton from '@/components/remix-button'
import TruncatedPrompt from '@/components/truncated-prompt'

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
  type?: string
}

export default function FeaturedExperimentPage() {
  const [apps, setApps] = useState<WtafApp[]>([])
  const [loading, setLoading] = useState(true)

  // Set page title
  useEffect(() => {
    document.title = 'THE GALLERY'
  }, [])

  useEffect(() => {
    fetch('/api/featured-wtaf')
      .then(res => res.json())
      .then(data => {
        setApps(data.apps || [])
        setLoading(false)
      })
      .catch(err => {
        console.error('Error fetching featured apps:', err)
        setLoading(false)
      })
  }, [])

  // Mouse parallax effect
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      const elements = document.querySelectorAll('.float-element');
      const x = e.clientX / window.innerWidth;
      const y = e.clientY / window.innerHeight;

      elements.forEach((element, index) => {
        const speed = (index + 1) * 0.02;
        const xOffset = (x - 0.5) * speed * 40;
        const yOffset = (y - 0.5) * speed * 40;
        (element as HTMLElement).style.transform += ` translate(${xOffset}px, ${yOffset}px)`;
      });
    };

    document.addEventListener('mousemove', handleMouseMove);
    return () => document.removeEventListener('mousemove', handleMouseMove);
  }, []);

  // Scroll parallax effect
  useEffect(() => {
    const handleScroll = () => {
      const scrolled = window.pageYOffset;
      const rate = scrolled * -0.4;

      document.querySelectorAll('.parallax').forEach((element, index) => {
        const speed = (index + 1) * 0.08;
        (element as HTMLElement).style.transform = `translateY(${rate * speed}px)`;
      });
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Random glitch effects
  useEffect(() => {
    const interval = setInterval(() => {
      const glitchElements = document.querySelectorAll('.glitch');
      glitchElements.forEach(el => {
        if (Math.random() < 0.05) {
          (el as HTMLElement).style.filter = 'hue-rotate(' + Math.random() * 360 + 'deg) brightness(1.5)';
          setTimeout(() => {
            (el as HTMLElement).style.filter = 'none';
          }, 150);
        }
      });
    }, 800);

    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-black to-pink-900 flex items-center justify-center">
        <div className="text-cyan-400 text-2xl">Loading...</div>
      </div>
    )
  }

  return (
    <>
      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;500;700;900&family=Inter:wght@300;400;500;600&display=swap');

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

        .services {
          display: grid;
          grid-template-columns: 1fr;
          gap: 35px;
          margin-bottom: 90px;
          max-width: 800px;
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

        /* Desktop layout for feature cards with images */
        @media (min-width: 769px) {
          .service-card.image-card {
            display: flex !important;
            align-items: center !important;
            gap: 60px !important;
            padding: 40px 50px !important;
            max-width: 1600px !important;
            margin-left: auto !important;
            margin-right: auto !important;
            width: 100% !important;
          }
          
          .service-card.image-card .service-image {
            flex: 0 0 auto !important;
            margin: 0 !important;
            width: 400px !important;
            max-width: 400px !important;
            min-width: 400px !important;
            height: auto !important;
          }
          
          .service-card.image-card .image-content {
            flex: 1 !important;
            display: flex !important;
            flex-direction: column !important;
          }
          
          .service-card.image-card .prompt-label,
          .service-card.image-card .prompt-showcase {
            margin: 0 0 20px 0 !important;
          }
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

        .service-card .service-image {
          width: calc(100% - 20px);
          height: auto;
          margin: 0 10px 20px 10px;
          display: block;
          object-fit: initial;
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
          font-size: 1.1rem;
          font-weight: 500;
          background: rgba(0, 255, 255, 0.1);
          border: 2px solid rgba(0, 255, 255, 0.3);
          border-radius: 15px;
          padding: 15px 20px;
          margin: 0 10px 20px 10px;
          text-align: center;
          text-shadow: 0 0 8px rgba(0, 255, 255, 0.5);
          backdrop-filter: blur(5px);
          font-style: italic;
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

        .parallax {
          transform: translateZ(0);
          animation: subtleParallax 20s ease-in-out infinite;
        }

        @keyframes subtleParallax {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-12px); }
        }

        @media (max-width: 768px) {
          .logo { font-size: 3.5rem; }
          .services { grid-template-columns: 1fr; }
          .service-card { padding: 35px 25px; }
        }

        @media (max-width: 480px) {
          .logo { font-size: 3rem; }
          .service-card { padding: 30px 20px; }
        }
      `}</style>

      <div>
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
          <div className="logo glitch" data-text="THE GALLERY">THE GALLERY</div>
          <div className="tagline">THEY ASKED FOR A WEBSITE. WE GAVE THEM A MOVEMENT.</div>
        </header>

        <main>
          <section className="services" id="services">
            {apps.map((app) => (
              <div key={app.id} className="service-card image-card parallax">
                <a href={`/${app.user_slug}/${app.app_slug}`}>
                  <img 
                    src={`https://tqniseocczttrfwtpbdr.supabase.co/storage/v1/object/public/og-images/${app.user_slug}-${app.app_slug}.png`} 
                    alt={`${app.app_slug} preview`} 
                    className="service-image" 
                  />
                </a>
                <div className="image-content">
                  <div className="prompt-label">The prompt:</div>
                  <TruncatedPrompt 
                    prompt={app.original_prompt}
                    maxLength={120}
                    className="prompt-showcase"
                    copyOnClick={true}
                    style={{
                      cursor: 'pointer',
                      transition: 'all 0.3s ease'
                    }}
                  />
                  
                  {/* Show remix button for non-ZAD apps */}
                  {app.type !== 'ZAD' && (
                    <div style={{ margin: '15px 10px 0 10px', textAlign: 'center' }}>
                      <RemixButton 
                        appSlug={app.app_slug}
                        userSlug={app.user_slug}
                      />
                    </div>
                  )}
                </div>
              </div>
            ))}

            {apps.length === 0 && (
              <div className="service-card parallax" style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '4rem', marginBottom: '20px' }}>✨</div>
                <h3 style={{ fontSize: '2rem', marginBottom: '15px' }}>No featured apps yet</h3>
                <p style={{ fontSize: '1.1rem', opacity: '0.8' }}>Check back soon for curated WTAF experiences!</p>
              </div>
            )}
          </section>
        </main>
      </div>
    </>
  )
} 
"use client"

import React from "react"

export default function WebtoysLogoPage() {
  return (
    <div className="header-neon">
      <h1 className="logo-neon">WEBTOYS</h1>
      <p className="tagline">SHIP FROM YOUR FLIP PHONE</p>
      
      <style jsx>{`
        /* Core WEBTOYS DNA Colors */
        :root {
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
          --charcoal: #1A1A1A;
          --charcoal-deep: #0A0A0A;
          --charcoal-light: #2A2A2A;
          --shadow-subtle: 0 2px 8px rgba(0,0,0,0.1);
          --shadow-strong: 0 4px 16px rgba(0,0,0,0.2);
        }

        /* Neon Header */
        .header-neon {
          background: #0A0A0A;
          padding: 40px 20px;
          text-align: center;
          position: relative;
          overflow: hidden;
          min-height: 100vh;
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;
        }
        
        .header-neon::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: 
            radial-gradient(circle at 20% 50%, rgba(255, 75, 75, 0.3) 0%, transparent 50%),
            radial-gradient(circle at 80% 50%, rgba(110, 203, 255, 0.3) 0%, transparent 50%);
          animation: pulse-bg 4s ease-in-out infinite;
        }
        
        @keyframes pulse-bg {
          0%, 100% { opacity: 0.5; }
          50% { opacity: 0.8; }
        }
        
        .logo-neon {
          font-size: clamp(2.5rem, 8vw, 6rem);
          font-weight: 800;
          letter-spacing: -2px;
          margin: 0;
          color: var(--cream);
          text-transform: uppercase;
          position: relative;
          z-index: 1;
          cursor: pointer;
          text-shadow: 
            0 0 10px var(--red),
            0 0 20px var(--red),
            0 0 30px var(--red),
            0 0 40px var(--red),
            0 0 70px var(--red),
            0 0 80px var(--red);
          animation: neon-flicker 2s infinite alternate;
        }
        
        @keyframes neon-flicker {
          0%, 100% { 
            opacity: 1;
            text-shadow: 
              0 0 10px var(--red),
              0 0 20px var(--red),
              0 0 30px var(--red),
              0 0 40px var(--red),
              0 0 70px var(--red),
              0 0 80px var(--red);
          }
          50% { 
            opacity: 0.9;
            text-shadow: 
              0 0 5px var(--red),
              0 0 10px var(--red),
              0 0 15px var(--red),
              0 0 20px var(--red),
              0 0 35px var(--red),
              0 0 40px var(--red);
          }
        }
        
        .tagline {
          font-size: 1.25rem;
          color: var(--blue);
          margin-top: 20px;
          text-transform: uppercase;
          letter-spacing: 4px;
          font-weight: 600;
          text-shadow: 0 0 10px rgba(110, 203, 255, 0.5);
          position: relative;
          z-index: 1;
        }
        
        /* Mobile adjustments */
        @media (max-width: 768px) {
          .header-neon {
            padding: 60px 20px;
            min-height: 33vh;
          }
          
          .logo-neon {
            font-size: 3rem;
          }
          
          .tagline {
            font-size: 1rem;
            letter-spacing: 2px;
          }
        }
      `}</style>
    </div>
  )
}
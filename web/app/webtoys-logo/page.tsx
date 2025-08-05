"use client"

import React from "react"

export default function WebtoysLogoPage() {
  return (
    <div className="relative min-h-screen overflow-hidden">
      <style jsx>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;500;700;900&display=swap');

        .gradient-bg {
          background: linear-gradient(135deg, #1a1a1a 0%, #2d1b69 25%, #8b0000 50%, #4b0082 75%, #000000 100%);
          background-size: 400% 400%;
          animation: gradientShift 12s ease infinite;
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

        @keyframes float {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          33% { transform: translateY(-20px) rotate(5deg); }
          66% { transform: translateY(10px) rotate(-3deg); }
        }

        .logo-text {
          font-family: 'Space Grotesk', sans-serif;
          font-size: 5rem;
          font-weight: 900;
          color: #ffffff;
          text-shadow:
            0 0 10px #ff0080,
            0 0 20px #ff0080,
            0 0 30px #ff0080;
          letter-spacing: -2px;
        }

        .tagline-text {
          font-size: 1.2rem;
          color: #ff0080;
          font-weight: 500;
          letter-spacing: 3px;
          text-transform: uppercase;
          text-shadow: 0 0 5px #ff0080;
        }
      `}</style>

      <div className="gradient-bg absolute inset-0" />

      {/* Floating Elements */}
      <div className="float-element text-5xl" style={{ top: '8%', left: '5%', color: 'rgba(255, 255, 255, 0.3)', animationDelay: '0s' }}>💀</div>
      <div className="float-element text-6xl" style={{ top: '30%', right: '8%', color: 'rgba(255, 255, 0, 0.4)', animationDelay: '2s' }}>⚡</div>
      <div className="float-element text-6xl" style={{ bottom: '25%', left: '12%', color: 'rgba(255, 69, 0, 0.4)', animationDelay: '4s' }}>🔥</div>
      <div className="float-element text-5xl" style={{ bottom: '10%', right: '15%', color: 'rgba(192, 192, 192, 0.3)', animationDelay: '1s' }}>⛓️</div>

      <header className="relative z-10 flex min-h-screen flex-col items-center justify-center p-10 text-center">
        <h1 className="logo-text mb-4">WEBTOYS</h1>
        <div className="tagline-text">SHIP FROM YOUR FLIP PHONE</div>
      </header>
    </div>
  )
}
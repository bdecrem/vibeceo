"use client";

import { useEffect, useRef } from "react";

function createSteamParticle(container: HTMLElement) {
  const particle = document.createElement("div");
  particle.className = "steam";
  particle.style.left = `${Math.random() * 100}vw`;
  particle.style.animationDelay = `${Math.random() * 8}s`;
  particle.style.animationDuration = `${8 + Math.random() * 4}s`;
  container.appendChild(particle);

  window.setTimeout(() => {
    particle.remove();
  }, 12000);
}

export default function B52LandingPage() {
  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const spawnSteam = () => {
      if (!root.isConnected) return;
      createSteamParticle(root);
    };

    const initialTimeouts: number[] = [];
    for (let i = 0; i < 15; i += 1) {
      const timeoutId = window.setTimeout(spawnSteam, i * 150);
      initialTimeouts.push(timeoutId);
    }

    const intervalId = window.setInterval(spawnSteam, 1500);

    return () => {
      initialTimeouts.forEach(window.clearTimeout);
      window.clearInterval(intervalId);
      root.querySelectorAll(".steam").forEach((node) => node.remove());
    };
  }, []);

  return (
    <div className="b52s-root" ref={rootRef}>
      <div className="container">
        <div className="logo-container">
          <div className="logo" aria-hidden="true">
            <svg viewBox="0 0 400 400" xmlns="http://www.w3.org/2000/svg" role="img">
              <title>B52s Steampunk Emblem</title>
              <circle cx="200" cy="200" r="180" fill="url(#brassBg)" stroke="#8b4513" strokeWidth="6" />

              <defs>
                <radialGradient id="brassBg" cx="30%" cy="30%">
                  <stop offset="0%" stopColor="#f4e4a6" />
                  <stop offset="50%" stopColor="#d4af37" />
                  <stop offset="100%" stopColor="#b8860b" />
                </radialGradient>
                <linearGradient id="copperGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#cd853f" />
                  <stop offset="50%" stopColor="#a0522d" />
                  <stop offset="100%" stopColor="#8b4513" />
                </linearGradient>
                <radialGradient id="gearBrass" cx="40%" cy="40%">
                  <stop offset="0%" stopColor="#f4e4a6" />
                  <stop offset="70%" stopColor="#cd853f" />
                  <stop offset="100%" stopColor="#8b4513" />
                </radialGradient>
                <clipPath id="craftClip">
                  <circle cx="200" cy="200" r="135" />
                </clipPath>
              </defs>

              <g clipPath="url(#craftClip)">
                <rect x="65" y="65" width="270" height="270" fill="url(#copperGrad)" opacity="0.15" />
                <g className="craft">
                  <image
                    href="/b52s.png"
                    x="72"
                    y="119"
                    width="247"
                    height="162"
                    preserveAspectRatio="xMidYMid meet"
                  />
                </g>
              </g>

              <g className="gear" fill="url(#gearBrass)" stroke="#8b4513" strokeWidth="2">
                <circle cx="350" cy="100" r="25" />
                <polygon points="350,75 360,85 360,95 350,105 340,95 340,85" />
                <polygon points="325,100 335,90 345,90 355,100 345,110 335,110" />
                <polygon points="350,125 340,115 340,105 350,95 360,105 360,115" />
                <polygon points="375,100 365,110 355,110 345,100 355,90 365,90" />
                <circle cx="350" cy="100" r="8" fill="#4a2c17" />
              </g>

              <g className="gear-fast" fill="url(#gearBrass)" stroke="#8b4513" strokeWidth="2">
                <circle cx="80" cy="320" r="20" />
                <polygon points="80,300 88,308 88,316 80,324 72,316 72,308" />
                <polygon points="60,320 68,312 76,312 84,320 76,328 68,328" />
                <polygon points="80,340 72,332 72,324 80,316 88,324 88,332" />
                <polygon points="100,320 92,328 84,328 76,320 84,312 92,312" />
                <circle cx="80" cy="320" r="6" fill="#4a2c17" />
              </g>

              <g className="gear" fill="url(#gearBrass)" stroke="#8b4513" strokeWidth="1">
                <circle cx="320" cy="320" r="15" />
                <polygon points="320,305 326,311 326,317 320,323 314,317 314,311" />
                <polygon points="305,320 311,314 317,314 323,320 317,326 311,326" />
                <polygon points="320,335 314,329 314,323 320,317 326,323 326,329" />
                <polygon points="335,320 329,326 323,326 317,320 323,314 329,314" />
                <circle cx="320" cy="320" r="5" fill="#4a2c17" />
              </g>

              <circle cx="120" cy="120" r="4" fill="#8b4513" />
              <circle cx="280" cy="120" r="4" fill="#8b4513" />
              <circle cx="120" cy="280" r="4" fill="#8b4513" />
              <circle cx="280" cy="280" r="4" fill="#8b4513" />
              <rect x="125" y="155" width="4" height="8" rx="2" fill="#f4e4a6" opacity="0.8" />
              <rect x="132" y="155" width="4" height="8" rx="2" fill="#f4e4a6" opacity="0.8" />
              <rect x="245" y="155" width="4" height="8" rx="2" fill="#f4e4a6" opacity="0.8" />
              <rect x="252" y="155" width="4" height="8" rx="2" fill="#f4e4a6" opacity="0.8" />
            </svg>
          </div>
        </div>

        <h1>B52s</h1>

        <div className="ornament">⚙ ═══ ⚙ ═══ ⚙</div>

        <p className="subtitle">
          Steam-powered artificial intelligence at your service.
          <br />
          Telegraph your queries for research papers, moving pictures, and web contraptions.
        </p>

        <a href="sms:8663300015?body=Greetings,%20automaton" className="cta-button">
          ⚡ Engage Automaton
        </a>

        <div className="phone-display">
          <span className="telegraph-word">Telegraph</span>: +1-866-330-0015
        </div>

        <p className="privacy-note">
          Unlike certain shadowy machines of the modern age, this steam-driven intelligence requires no tribute of secrets. It serves, yet never spies.
        </p>
      </div>

      <style jsx>{`
        .b52s-root {
          font-family: 'Georgia', 'Times New Roman', serif;
          background:
            radial-gradient(circle at 20% 80%, rgba(139, 69, 19, 0.1) 0%, transparent 50%),
            radial-gradient(circle at 80% 20%, rgba(184, 134, 11, 0.1) 0%, transparent 50%),
            linear-gradient(135deg, #2c1810 0%, #4a2c17 30%, #3d2817 70%, #1a0f08 100%);
          color: #d4af37;
          min-height: 100vh;
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;
          padding: 20px;
          position: relative;
          overflow: hidden;
        }

        .container {
          text-align: center;
          max-width: 900px;
          z-index: 10;
          position: relative;
        }

        .logo-container {
          margin-bottom: 50px;
          position: relative;
        }

        .logo {
          width: 200px;
          height: 200px;
          margin: 0 auto;
          position: relative;
          filter: drop-shadow(0 0 20px rgba(212, 175, 55, 0.3));
        }

        .logo svg {
          width: 100%;
          height: 100%;
        }

        .gear {
          animation: rotate 20s infinite linear;
          transform-origin: center;
        }

        .gear-fast {
          animation: rotate 8s infinite linear;
          transform-origin: center;
        }

        .logo svg .craft {
          transform-box: fill-box;
          transform-origin: center;
          animation: sway 7s ease-in-out infinite;
        }

        @keyframes rotate {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }

        @keyframes sway {
          0% {
            transform: rotate(-1deg) translateY(0);
          }
          50% {
            transform: rotate(1deg) translateY(-3px);
          }
          100% {
            transform: rotate(-1deg) translateY(0);
          }
        }

        h1 {
          font-size: clamp(3rem, 7vw, 5rem);
          font-weight: 900;
          margin-bottom: 25px;
          letter-spacing: 0.05em;
          text-shadow:
            2px 2px 4px rgba(0, 0, 0, 0.8),
            0 0 30px rgba(212, 175, 55, 0.6);
          font-family: 'Georgia', serif;
          color: #f4e4a6;
        }

        .subtitle {
          font-size: 1.4rem;
          color: #cd853f;
          margin-bottom: 60px;
          line-height: 1.6;
          font-style: italic;
          text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.7);
        }

        .cta-button {
          display: inline-flex;
          align-items: center;
          gap: 15px;
          padding: 25px 45px;
          background:
            linear-gradient(145deg, #8b4513 0%, #a0522d 50%, #8b4513 100%),
            radial-gradient(circle at center, rgba(212, 175, 55, 0.3) 0%, transparent 70%);
          color: #f4e4a6;
          border: 3px solid #cd853f;
          border-radius: 15px;
          font-size: 1.3rem;
          font-weight: 700;
          text-decoration: none;
          transition: all 0.4s ease;
          cursor: pointer;
          box-shadow:
            0 8px 25px rgba(0, 0, 0, 0.6),
            inset 0 1px 3px rgba(255, 255, 255, 0.2),
            inset 0 -1px 3px rgba(0, 0, 0, 0.3);
          text-transform: uppercase;
          letter-spacing: 0.1em;
          font-family: 'Georgia', serif;
          position: relative;
          overflow: hidden;
        }

        .cta-button::before {
          content: '';
          position: absolute;
          top: 0;
          left: -100%;
          width: 100%;
          height: 100%;
          background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent);
          transition: left 0.6s;
        }

        .cta-button:hover::before {
          left: 100%;
        }

        .cta-button:hover {
          transform: translateY(-3px);
          box-shadow:
            0 12px 35px rgba(0, 0, 0, 0.8),
            inset 0 1px 5px rgba(255, 255, 255, 0.3),
            0 0 25px rgba(212, 175, 55, 0.5);
          border-color: #d4af37;
        }

        .cta-button:active {
          transform: translateY(-1px);
        }

        .phone-display {
          margin-top: 30px;
          font-size: 1.2rem;
          color: #cd853f;
          font-weight: 600;
          text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.7);
          font-family: 'Georgia', serif;
        }

        .telegraph-word {
          position: relative;
          cursor: help;
          transition: color 0.3s ease;
        }

        .telegraph-word:hover {
          color: #f4e4a6;
        }

        .telegraph-word::after {
          content: 'SMS or WhatsApp';
          position: absolute;
          bottom: 100%;
          left: 50%;
          transform: translateX(-50%) translateY(-5px);
          background: rgba(139, 69, 19, 0.95);
          color: #f4e4a6;
          padding: 8px 12px;
          border-radius: 6px;
          font-size: 0.9rem;
          white-space: nowrap;
          opacity: 0;
          visibility: hidden;
          transition: all 0.3s ease;
          border: 1px solid #cd853f;
          box-shadow: 0 4px 8px rgba(0, 0, 0, 0.5);
          pointer-events: none;
        }

        .telegraph-word:hover::after {
          opacity: 1;
          visibility: visible;
          transform: translateX(-50%) translateY(-10px);
        }

        .privacy-note {
          margin-top: 25px;
          font-size: 0.95rem;
          color: rgba(205, 133, 63, 0.75);
          font-style: italic;
          line-height: 1.5;
          max-width: 600px;
          margin-left: auto;
          margin-right: auto;
          text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.5);
          font-family: 'Georgia', serif;
        }

        .ornament {
          color: #8b4513;
          font-size: 2rem;
          margin: 20px 0;
          opacity: 0.7;
        }

        @keyframes steam-rise {
          0% {
            transform: translateY(100vh) scale(0.1);
            opacity: 0;
          }
          10% {
            opacity: 0.8;
            transform: translateY(90vh) scale(0.5);
          }
          50% {
            opacity: 0.6;
            transform: translateY(50vh) scale(1);
          }
          100% {
            transform: translateY(-10vh) scale(1.5);
            opacity: 0;
          }
        }

        .steam {
          position: absolute;
          width: 4px;
          height: 4px;
          background: rgba(255, 255, 255, 0.6);
          border-radius: 50%;
          animation: steam-rise 8s infinite linear;
          pointer-events: none;
        }

        @media (max-width: 768px) {
          .logo {
            width: 150px;
            height: 150px;
          }

          .subtitle {
            font-size: 1.2rem;
          }

          .cta-button {
            padding: 20px 35px;
            font-size: 1.1rem;
          }
        }
      `}</style>

      <style jsx global>{`
        .b52s-root * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
      `}</style>
    </div>
  );
}

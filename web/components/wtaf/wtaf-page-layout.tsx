'use client';

import React, { useEffect } from 'react'
import Link from 'next/link'

interface Stat {
  label: string
  value: number
  color: 'orange' | 'pink' | 'cyan' | 'yellow'
}

interface WtafPageLayoutProps {
  title: string
  subtitle: string
  stats?: Stat[]
  children: React.ReactNode
  backLink?: {
    href: string
    text: string
  }
}

const colorClasses = {
  orange: 'text-orange-400',
  pink: 'text-pink-400', 
  cyan: 'text-cyan-400',
  yellow: 'text-yellow-400'
}

export function WtafPageLayout({ 
  title, 
  subtitle, 
  stats, 
  children, 
  backLink 
}: WtafPageLayoutProps) {
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
        (element as HTMLElement).style.transform = `translate(${xOffset}px, ${yOffset}px)`;
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

  return (
    <>
      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;500;700;900&family=Inter:wght@300;400;500;600&display=swap');

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
          position: fixed;
          opacity: 0.4;
          animation: float 6s ease-in-out infinite;
          pointer-events: none;
          filter: drop-shadow(0 0 10px rgba(255, 0, 255, 0.3));
          z-index: 1;
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
      `}</style>

      <div 
        className="min-h-screen py-8 px-4 relative"
        style={{
          background: 'linear-gradient(135deg, #1a1a1a 0%, #2d1b69 25%, #8b0000 50%, #4b0082 75%, #000000 100%)',
          backgroundSize: '400% 400%',
          animation: 'gradientShift 12s ease infinite'
        }}
      >
        {/* Floating Elements */}
        <div className="float-element skull">💀</div>
        <div className="float-element lightning">⚡</div>
        <div className="float-element fire">🔥</div>
        <div className="float-element chains">⛓️</div>

        <div className="max-w-7xl mx-auto relative z-10">
          {/* Header */}
          <div className="text-center mb-12">
            <h1 
              className="text-white mb-4 glitch parallax"
              data-text={title}
              style={{
                fontFamily: 'Space Grotesk, sans-serif',
                fontSize: '5rem',
                fontWeight: '900',
                textShadow: '0 0 10px #ff0080, 0 0 20px #ff0080, 0 0 30px #ff0080',
                letterSpacing: '-2px'
              }}
            >
              {title}
            </h1>
            <p 
              className="text-xl mb-8 parallax"
              style={{
                color: '#ff0080',
                fontWeight: '500',
                letterSpacing: '3px',
                textTransform: 'uppercase',
                textShadow: '0 0 5px #ff0080'
              }}
            >
              {subtitle}
            </p>
            
            {/* Stats */}
            {stats && (
              <div className="flex justify-center gap-8 text-white mb-8">
                {stats.map((stat, index) => (
                  <div key={index} className="text-center">
                    <div className={`text-3xl font-bold ${colorClasses[stat.color]}`}>
                      {stat.value}
                    </div>
                    <div className="text-sm text-gray-300">{stat.label}</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Content */}
          <div className="relative z-5">
            {children}
          </div>

          {/* Back Link */}
          {backLink && (
            <div className="text-center mt-16">
              <Link
                href={backLink.href}
                className="inline-flex items-center gap-2 text-cyan-300 hover:text-white transition-colors text-lg"
                style={{
                  textShadow: '0 0 5px #00ffff'
                }}
              >
                ← {backLink.text}
              </Link>
            </div>
          )}
        </div>
      </div>
    </>
  )
} 
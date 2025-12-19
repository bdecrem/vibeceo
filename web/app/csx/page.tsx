'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

export default function CSXLandingPage() {
  const router = useRouter()
  const [showCursor, setShowCursor] = useState(true)
  const [statusIndex, setStatusIndex] = useState(0)

  const statusMessages = [
    'looking for the right builder...',
    'rebooting...',
    'CTRL-shifting...',
    'backing the weird...',
  ]

  useEffect(() => {
    // Blinking cursor
    const cursorInterval = setInterval(() => {
      setShowCursor(prev => !prev)
    }, 530)

    // Rotating status messages
    const statusInterval = setInterval(() => {
      setStatusIndex(prev => (prev + 1) % statusMessages.length)
    }, 3000)

    return () => {
      clearInterval(cursorInterval)
      clearInterval(statusInterval)
    }
  }, [])

  const handleClick = () => {
    router.push('/csx/full')
  }

  return (
    <>
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      <link
        href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@300;400;500&display=swap"
        rel="stylesheet"
      />
      <style jsx global>{`
        html {
          font-size: 16px !important;
        }

        body {
          margin: 0;
          padding: 0;
        }

        .terminal-page {
          min-height: 100vh;
          background: #0a0a0a;
          color: #e0e0e0;
          font-family: 'IBM Plex Mono', monospace;
          -webkit-font-smoothing: antialiased;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 24px;
          cursor: pointer;
        }

        .terminal-box {
          border: 1px solid #3a3a3a;
          border-radius: 4px;
          padding: 24px 36px;
          max-width: 680px;
          width: 100%;
          position: relative;
          background: linear-gradient(180deg, rgba(20,40,60,0.3) 0%, rgba(10,10,10,0.8) 100%);
          box-shadow: 0 0 60px rgba(0,80,80,0.15);
        }

        .terminal-box::before {
          content: '';
          position: absolute;
          top: -1px;
          left: 20px;
          right: 20px;
          height: 1px;
          background: linear-gradient(90deg, transparent, #4a4a4a, transparent);
        }

        .terminal-header {
          font-size: 0.875rem;
          letter-spacing: 0.05em;
          margin-bottom: 20px;
          color: #666;
        }

        .terminal-header-title {
          color: #fff;
        }

        .terminal-body {
          margin-bottom: 16px;
        }

        .terminal-line {
          font-size: 1rem;
          line-height: 1.7;
          margin-bottom: 4px;
        }

        @media (min-width: 640px) {
          .terminal-line {
            font-size: 1.0625rem;
          }
        }

        .terminal-dim {
          color: #777;
        }

        .terminal-programs {
          margin-top: 16px;
        }

        .terminal-program {
          font-size: 0.9375rem;
          line-height: 1.6;
          display: flex;
          margin-bottom: 8px;
        }

        .terminal-program:last-child {
          margin-bottom: 0;
        }

        @media (min-width: 640px) {
          .terminal-program {
            font-size: 1rem;
          }
        }

        .terminal-program-label {
          color: #666;
          margin-right: 8px;
        }

        .terminal-program-value {
          color: #aaa;
        }

        .terminal-status {
          display: flex;
          align-items: center;
          gap: 10px;
          font-size: 0.8125rem;
          color: #555;
          margin-top: 16px;
          padding-top: 14px;
          border-top: 1px solid #252525;
        }

        .status-dot {
          width: 7px;
          height: 7px;
          border-radius: 50%;
          background: #5a8;
          animation: pulse 2s ease-in-out infinite;
        }

        @keyframes pulse {
          0%, 100% { opacity: 0.4; }
          50% { opacity: 1; }
        }

        .status-text {
          transition: opacity 0.3s ease;
        }

        .cursor {
          display: inline-block;
          width: 7px;
          height: 14px;
          background: #5a8;
          margin-left: 2px;
          vertical-align: middle;
        }

        .cursor-visible {
          opacity: 1;
        }

        .cursor-hidden {
          opacity: 0;
        }

        .click-hint {
          position: absolute;
          bottom: -32px;
          left: 50%;
          transform: translateX(-50%);
          font-size: 0.6875rem;
          color: #3a3a3a;
          letter-spacing: 0.1em;
          text-transform: uppercase;
        }
      `}</style>

      <div className="terminal-page" onClick={handleClick}>
        <div className="terminal-box">
          <div className="terminal-header">
            <span className="terminal-header-title">CTRL SHIFT</span> · LONG HORIZON LAB
          </div>

          <div className="terminal-body">
            <div className="terminal-line">
              we back the weird, the rigorous, the not-next-quarter.
            </div>
            <div className="terminal-line terminal-dim">
              students, researchers, founders building for impact.
            </div>

            <div className="terminal-programs">
              <div className="terminal-program">
                <span className="terminal-program-label">explore:</span>
                <span className="terminal-program-value">weekly office hours</span>
              </div>
              <div className="terminal-program">
                <span className="terminal-program-label">fund:</span>
                <span className="terminal-program-value">non-dilutive awards ($1k–$10k)</span>
              </div>
              <div className="terminal-program">
                <span className="terminal-program-label">build:</span>
                <span className="terminal-program-value">prototypes, tools, and new models</span>
              </div>
            </div>
          </div>

          <div className="terminal-status">
            <span className="status-dot"></span>
            <span className="status-text">{statusMessages[statusIndex]}</span>
            <span className={`cursor ${showCursor ? 'cursor-visible' : 'cursor-hidden'}`}></span>
          </div>

          <div className="click-hint">click anywhere to enter</div>
        </div>
      </div>
    </>
  )
}

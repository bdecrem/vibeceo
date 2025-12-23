'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

export default function CSXAltLandingPage() {
  const router = useRouter()
  const [showCursor, setShowCursor] = useState(true)
  const [statusIndex, setStatusIndex] = useState(0)

  const statusMessages = [
    { text: 'looking for the right builder...', color: 'green', cursor: false },
    { text: 'backing the weird...', color: 'green', cursor: false },
    { text: 'scanning the horizon...', color: 'green', cursor: false },
    { text: 'connecting dots...', color: 'green', cursor: false },
    { text: 'asking better questions...', color: 'green', cursor: false },
    { text: 'thinking long...', color: 'green', cursor: false },
    { text: 'building fast...', color: 'green', cursor: false },
    { text: 'ignoring the noise...', color: 'green', cursor: false },
    { text: 'finding signal...', color: 'green', cursor: false },
    { text: 'following curiosity...', color: 'green', cursor: false },
    { text: 'shipping...', color: 'green', cursor: false },
    { text: 'iterating...', color: 'green', cursor: false },
    { text: 'prototyping...', color: 'green', cursor: false },
    { text: 'deep researching...', color: 'amber', cursor: true },
    { text: 'CTRL-shifting...', color: 'amber', cursor: true },
    { text: 'rebuilding...', color: 'amber', cursor: true },
    { text: 'compiling...', color: 'amber', cursor: true },
    { text: 'build error. rebooting...', color: 'red', cursor: false },
  ]

  useEffect(() => {
    const cursorInterval = setInterval(() => {
      setShowCursor(prev => !prev)
    }, 530)

    const statusInterval = setInterval(() => {
      setStatusIndex(Math.floor(Math.random() * statusMessages.length))
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
          color: #ccc;
          font-family: 'IBM Plex Mono', monospace;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 24px;
          padding-top: calc(24px + env(safe-area-inset-top));
          padding-bottom: calc(24px + env(safe-area-inset-bottom));
          cursor: pointer;
        }

        .terminal-box {
          border: 1px dashed #fff;
          padding: 24px 32px;
          max-width: 640px;
          width: 100%;
          position: relative;
        }

        .terminal-box::before {
          content: '';
          position: absolute;
          top: 4px;
          left: 4px;
          right: 4px;
          bottom: 4px;
          border: 1px dashed #fff;
          pointer-events: none;
        }

        .terminal-header {
          margin-bottom: 20px;
          padding-bottom: 16px;
          border-bottom: 1px dotted #666;
          font-size: 0.875rem;
          color: #aaa;
          letter-spacing: 0.05em;
        }

        .terminal-header-title {
          color: #fff;
        }

        .terminal-body {
          margin-bottom: 0;
        }

        .terminal-line {
          font-size: 1rem;
          line-height: 1.7;
          margin-bottom: 4px;
          color: #fff;
        }

        .terminal-dim {
          color: #999;
        }

        .terminal-programs {
          margin-top: 20px;
        }

        .terminal-program {
          font-size: 1rem;
          line-height: 1.6;
          margin-bottom: 4px;
          display: flex;
        }

        .terminal-program:last-child {
          margin-bottom: 0;
        }

        .terminal-program-label {
          color: #999;
          margin-right: 8px;
        }

        .terminal-program-value {
          color: #fff;
        }

        .terminal-status {
          display: flex;
          align-items: center;
          gap: 10px;
          font-size: 0.875rem;
          color: #999;
          margin-top: 20px;
          padding-top: 16px;
          border-top: 1px dotted #666;
        }

        .status-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
        }

        .status-dot-green { background: #5a8; }
        .status-dot-red { background: #a55; }
        .status-dot-amber { background: #a85; }

        .block-cursor {
          color: #a85;
        }

        .cursor-visible {
          opacity: 1;
        }

        .cursor-hidden {
          opacity: 0;
        }

        .click-hint {
          display: none;
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
            {statusMessages[statusIndex].cursor ? (
              <span className={`block-cursor ${showCursor ? 'cursor-visible' : 'cursor-hidden'}`}>█</span>
            ) : (
              <span className={`status-dot status-dot-${statusMessages[statusIndex].color}`}></span>
            )}
            <span>{statusMessages[statusIndex].text}</span>
          </div>
        </div>
      </div>
    </>
  )
}

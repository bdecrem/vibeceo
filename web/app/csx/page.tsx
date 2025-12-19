'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

export default function CSXAltLandingPage() {
  const router = useRouter()
  const [showCursor, setShowCursor] = useState(true)
  const [statusIndex, setStatusIndex] = useState(0)
  const [isRebooting, setIsRebooting] = useState(false)
  const [visibleLines, setVisibleLines] = useState(5) // 0-5 lines visible
  const [typingLine, setTypingLine] = useState(-1) // which line is currently typing

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
      const newIndex = Math.floor(Math.random() * statusMessages.length)
      setStatusIndex(newIndex)

      // Trigger reboot animation for the red error message
      if (statusMessages[newIndex].color === 'red' && !isRebooting) {
        setIsRebooting(true)
        setVisibleLines(0) // Hide all lines
        setTypingLine(-1)

        // After 1.5 second blank, start showing lines one by one with typing effect
        setTimeout(() => {
          setTypingLine(1); setVisibleLines(1)
          setTimeout(() => { setTypingLine(2); setVisibleLines(2) }, 500)
          setTimeout(() => { setTypingLine(3); setVisibleLines(3) }, 1000)
          setTimeout(() => { setTypingLine(4); setVisibleLines(4) }, 1400)
          setTimeout(() => { setTypingLine(5); setVisibleLines(5) }, 1800)
          // Switch to "rebuilding..." for 1 second at the end
          setTimeout(() => {
            setTypingLine(-1)
            const rebuildingIndex = statusMessages.findIndex(m => m.text === 'rebuilding...')
            setStatusIndex(rebuildingIndex)
          }, 2200)
          // End reboot cycle
          setTimeout(() => { setIsRebooting(false) }, 3200)
        }, 1500)
      }
    }, 3000)

    return () => {
      clearInterval(cursorInterval)
      clearInterval(statusInterval)
    }
  }, [isRebooting])

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
          cursor: pointer;
        }

        .terminal-box {
          border: 1px solid #fff;
          border-left-style: dashed;
          border-right-style: dashed;
          padding: 20px 24px;
          max-width: 640px;
          width: 100%;
          position: relative;
        }

        @media (min-width: 640px) {
          .terminal-box {
            padding: 24px 32px;
          }
        }

        .terminal-box::before {
          content: '';
          position: absolute;
          top: 4px;
          left: 4px;
          right: 4px;
          bottom: 4px;
          border: 1px solid #fff;
          border-left-style: dashed;
          border-right-style: dashed;
          pointer-events: none;
        }

        .terminal-header {
          margin-bottom: 16px;
          padding-bottom: 12px;
          border-bottom: 1px dotted #666;
          font-size: 0.75rem;
          color: #aaa;
          letter-spacing: 0.05em;
        }

        @media (min-width: 640px) {
          .terminal-header {
            margin-bottom: 20px;
            padding-bottom: 16px;
            font-size: 0.875rem;
          }
        }

        .terminal-header-title {
          color: #fff;
        }

        .terminal-body {
          margin-bottom: 0;
        }

        .terminal-body .line-hidden {
          opacity: 0;
        }

        .terminal-body .line-typing {
          overflow: hidden;
          white-space: nowrap;
          animation: typeIn 0.4s steps(30) forwards;
        }

        @keyframes typeIn {
          from { max-width: 0; }
          to { max-width: 100%; }
        }

        .terminal-line {
          font-size: 0.875rem;
          line-height: 1.6;
          margin-bottom: 2px;
          color: #fff;
        }

        @media (min-width: 640px) {
          .terminal-line {
            font-size: 1rem;
            line-height: 1.7;
            margin-bottom: 4px;
          }
        }

        .terminal-dim {
          color: #999;
        }

        .terminal-programs {
          margin-top: 16px;
        }

        @media (min-width: 640px) {
          .terminal-programs {
            margin-top: 20px;
          }
        }

        .terminal-program {
          font-size: 0.875rem;
          line-height: 1.5;
          margin-bottom: 2px;
          display: flex;
        }

        @media (min-width: 640px) {
          .terminal-program {
            font-size: 1rem;
            line-height: 1.6;
            margin-bottom: 4px;
          }
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
          gap: 8px;
          font-size: 0.75rem;
          color: #999;
          margin-top: 16px;
          padding-top: 12px;
          border-top: 1px dotted #666;
        }

        @media (min-width: 640px) {
          .terminal-status {
            gap: 10px;
            font-size: 0.875rem;
            margin-top: 20px;
            padding-top: 16px;
          }
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

        .status-text-blink {
          animation: textBlink 1s ease-in-out infinite;
        }

        @keyframes textBlink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.3; }
        }

        .click-hint {
          display: none;
        }
      `}</style>

      <div className="terminal-page" onClick={handleClick}>
        <div className="terminal-box">
          <div className="terminal-header">
            <span className="terminal-header-title">CTRL SHIFT</span> <span style={{ verticalAlign: 'middle' }}>•</span> LONG HORIZON LAB
          </div>

          <div className="terminal-body">
            <div className={`terminal-line ${visibleLines < 1 ? 'line-hidden' : ''} ${typingLine === 1 ? 'line-typing' : ''}`}>
              we back the weird, the rigorous, the not-next-quarter.
            </div>
            <div className={`terminal-line terminal-dim ${visibleLines < 2 ? 'line-hidden' : ''} ${typingLine === 2 ? 'line-typing' : ''}`}>
              founders, researchers and students building for impact.
            </div>

            <div className="terminal-programs">
              <div className={`terminal-program ${visibleLines < 3 ? 'line-hidden' : ''} ${typingLine === 3 ? 'line-typing' : ''}`}>
                <span className="terminal-program-label">explore:</span>
                <span className="terminal-program-value">weekly office hours</span>
              </div>
              <div className={`terminal-program ${visibleLines < 4 ? 'line-hidden' : ''} ${typingLine === 4 ? 'line-typing' : ''}`}>
                <span className="terminal-program-label">fund:</span>
                <span className="terminal-program-value">non-dilutive awards ($1k–$10k)</span>
              </div>
              <div className={`terminal-program ${visibleLines < 5 ? 'line-hidden' : ''} ${typingLine === 5 ? 'line-typing' : ''}`}>
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

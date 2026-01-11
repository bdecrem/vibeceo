'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useState, Suspense } from 'react'
import Link from 'next/link'

function CSXContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const nextPage = searchParams?.get('next')
  const [showCursor, setShowCursor] = useState(true)
  const [statusIndex, setStatusIndex] = useState(0)
  const [isRebooting, setIsRebooting] = useState(false)
  const [rebootPhase, setRebootPhase] = useState<'normal' | 'blank' | 'graphic' | 'typing'>('normal')
  const [graphicLines, setGraphicLines] = useState(0) // 0-3 lines visible
  const [bootGraphic, setBootGraphic] = useState<'fish' | 'people'>('fish')
  const [visibleLines, setVisibleLines] = useState(5) // 0-5 lines visible
  const [typingLine, setTypingLine] = useState(-1) // which line is currently typing
  const [heartsStatic, setHeartsStatic] = useState(false) // hearts stop pulsing at end

  const statusMessages = [
    { text: 'onboarding new builders...', color: 'green', cursor: false },
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
    { text: 'switching models...', color: 'amber', cursor: true },
    { text: 'integrating...', color: 'amber', cursor: true },
    { text: 'bridging worlds...', color: 'amber', cursor: true },
    { text: 'build error. rebooting...', color: 'red', cursor: false },
  ]

  useEffect(() => {
    const cursorInterval = setInterval(() => {
      setShowCursor(prev => !prev)
    }, 530)

    const statusInterval = setInterval(() => {
      // Don't change status during reboot sequence
      if (isRebooting) return

      const newIndex = Math.floor(Math.random() * statusMessages.length)
      setStatusIndex(newIndex)

      // Trigger boot animation for special messages
      const currentMessage = statusMessages[newIndex].text
      const isBuildError = currentMessage === 'build error. rebooting...'
      const isBridgingWorlds = currentMessage === 'bridging worlds...'

      if (isBuildError || isBridgingWorlds) {
        setIsRebooting(true)
        setRebootPhase('blank')
        setVisibleLines(0)
        setTypingLine(-1)
        setHeartsStatic(false)

        // build error → hearts, bridging worlds → people
        const graphic = isBuildError ? 'fish' : 'people'
        setBootGraphic(graphic)
        const endStatus = isBuildError ? 'rebuilding...' : 'bridging worlds...'

        // Phase 1: Blank for 600ms
        setTimeout(() => {
          setRebootPhase('graphic')
          setGraphicLines(0)
          setTimeout(() => setGraphicLines(1), 150)
          setTimeout(() => setGraphicLines(2), 300)
          setTimeout(() => setGraphicLines(3), 450)
        }, 600)

        // Phase 2a: Hearts pulsing for 3900ms
        // Phase 2b: Hearts static for 800ms (at 4500ms)
        setTimeout(() => {
          setHeartsStatic(true)
        }, 4500)

        // Phase 3: Typing at 5300ms
        setTimeout(() => {
          setRebootPhase('typing')
          setGraphicLines(0)
          setHeartsStatic(false)
          setTypingLine(1); setVisibleLines(1)
          setTimeout(() => { setTypingLine(2); setVisibleLines(2) }, 800)
          setTimeout(() => { setTypingLine(3); setVisibleLines(3) }, 1600)
          setTimeout(() => { setTypingLine(4); setVisibleLines(4) }, 2300)
          setTimeout(() => { setTypingLine(5); setVisibleLines(5) }, 3000)
          setTimeout(() => {
            setTypingLine(-1)
            const statusIdx = statusMessages.findIndex(m => m.text === endStatus)
            setStatusIndex(statusIdx)
            setRebootPhase('normal')
            setIsRebooting(false)
          }, 3600)
        }, 5300)
      }
    }, 3000)

    return () => {
      clearInterval(cursorInterval)
      clearInterval(statusInterval)
    }
  }, [isRebooting])

  const handleClick = () => {
    // Route based on ?next= param: rs -> /csx/rs, lf -> /csx/lf, otherwise /csx/full
    let destination = '/csx/full'
    if (nextPage === 'rs') destination = '/csx/rs'
    else if (nextPage === 'lf') destination = '/csx/lf'
    router.push(destination)
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
          background: #0a0a0a;
        }

        body {
          margin: 0;
          padding: 0;
          background: #0a0a0a;
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
          border: 1px solid #fff;
          border-left-style: dashed;
          border-right-style: dashed;
          padding: 20px 24px 28px 24px;
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
          display: flex;
          justify-content: space-between;
          align-items: center;
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
          min-height: 200px;
          height: 200px;
        }

        @media (min-width: 640px) {
          .terminal-body {
            height: auto;
            min-height: 160px;
          }
        }

        .terminal-body .line-hidden {
          opacity: 0;
        }

        .terminal-body .line-typing {
          overflow: hidden;
          white-space: nowrap;
          display: inline-block;
          animation: typeIn 0.6s steps(40) forwards;
        }

        @keyframes typeIn {
          from { max-width: 0; }
          to { max-width: 100%; }
        }

        .terminal-status.status-hidden {
          opacity: 0;
          transition: opacity 0.3s ease;
        }

        .terminal-status.status-visible {
          opacity: 1;
          transition: opacity 0.3s ease;
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
          margin-bottom: 2px;
        }

        @media (min-width: 640px) {
          .terminal-programs {
            margin-top: 20px;
            margin-bottom: 0;
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

        .mailing-link {
          display: block;
          text-align: center;
          margin-top: 16px;
          font-size: 0.75rem;
          color: #666;
          text-decoration: none;
          letter-spacing: 0.05em;
          transition: color 0.2s;
        }

        .mailing-link:hover {
          color: #aaa;
        }

        @media (min-width: 640px) {
          .mailing-link {
            margin-top: 20px;
            font-size: 0.8125rem;
          }
        }

        .boot-graphic {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 100%;
          min-height: 140px;
          font-size: 1.25rem;
          color: #fff;
          letter-spacing: 0.1em;
          line-height: 1.4;
          white-space: pre;
        }

        @media (min-width: 640px) {
          .boot-graphic {
            min-height: 160px;
            font-size: 1.5rem;
          }
        }

        @keyframes bubbleBlink {
          0%, 5% { opacity: 1; text-shadow: 0 0 8px #a85; }
          7%, 12% { opacity: 0.2; text-shadow: none; }
          14%, 19% { opacity: 1; text-shadow: 0 0 8px #a85; }
          21%, 100% { opacity: 0.2; text-shadow: none; }
        }

        .bubble {
          display: inline-block;
          opacity: 0.2;
          animation: bubbleBlink 2s linear infinite;
        }

        .bubble-1 { animation-delay: 0s; }
        .bubble-2 { animation-delay: 0.5s; }
        .bubble-3 { animation-delay: 1s; }
        .bubble-4 { animation-delay: 1.5s; }

        /* Heartbeat pulse */
        @keyframes heartbeat {
          0%, 100% { transform: scale(1); opacity: 0.7; }
          14% { transform: scale(1.15); opacity: 1; }
          28% { transform: scale(1); opacity: 0.7; }
          42% { transform: scale(1.1); opacity: 1; }
          56% { transform: scale(1); }
        }

        .heart {
          display: inline-block;
          color: #a55;
          animation: heartbeat 1.5s ease-in-out infinite;
        }

        .heart-static {
          animation: none;
          opacity: 1;
          transform: scale(1);
        }
      `}</style>

      <div className="terminal-page" onClick={handleClick}>
        <div className="terminal-box">
          <div className="terminal-header">
            <span className="terminal-header-title">CTRL SHIFT <span style={{ color: '#aaa' }}>LAB</span></span>
            <span style={{ color: '#8b8b8b' }}>LONG HORIZON BUILD</span>
          </div>

          <div className="terminal-body">
            {rebootPhase === 'graphic' ? (
              <div className="boot-graphic">
                {bootGraphic === 'fish' ? (
                  <>
                    <div style={{ opacity: graphicLines >= 1 ? 1 : 0 }}>   <span className={`heart ${heartsStatic ? 'heart-static' : ''}`}>♥</span></div>
                    <div style={{ opacity: graphicLines >= 2 ? 1 : 0 }}>  <span className={`heart ${heartsStatic ? 'heart-static' : ''}`}>♥♥♥</span></div>
                    <div style={{ opacity: graphicLines >= 3 ? 1 : 0 }}>   <span className={`heart ${heartsStatic ? 'heart-static' : ''}`}>♥</span></div>
                  </>
                ) : (
                  <>
                    <div style={{ opacity: graphicLines >= 1 ? 1 : 0 }}>{'o   o   o   o'}</div>
                    <div style={{ opacity: graphicLines >= 2 ? 1 : 0 }}>{'/|\\ /|\\ /|\\ /|\\'}</div>
                    <div style={{ opacity: graphicLines >= 3 ? 1 : 0 }}>{'/ \\ / \\ / \\ / \\'}</div>
                  </>
                )}
              </div>
            ) : (
              <>
                <div className={`terminal-line ${visibleLines < 1 ? 'line-hidden' : ''} ${typingLine === 1 ? 'line-typing' : ''}`}>
                  we back the weird, the rigorous, the not-next-quarter.
                </div>
                <div className={`terminal-line terminal-dim ${visibleLines < 2 ? 'line-hidden' : ''} ${typingLine === 2 ? 'line-typing' : ''}`}>
                  building AI that tackles real problems and expands what people can create and become.
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
              </>
            )}
          </div>

          <div className={`terminal-status ${rebootPhase === 'normal' ? 'status-visible' : 'status-hidden'}`}>
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

export default function CSXAltLandingPage() {
  return (
    <Suspense fallback={<div style={{ background: '#0a0a0a', minHeight: '100vh' }} />}>
      <CSXContent />
    </Suspense>
  )
}

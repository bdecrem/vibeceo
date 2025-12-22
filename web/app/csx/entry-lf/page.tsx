'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

export default function CSXEntryLFPage() {
  const router = useRouter()
  const [showCursor, setShowCursor] = useState(true)
  const [statusIndex, setStatusIndex] = useState(0)
  const [isRebooting, setIsRebooting] = useState(false)
  const [rebootPhase, setRebootPhase] = useState<'normal' | 'blank' | 'graphic' | 'typing'>('normal')
  const [graphicLines, setGraphicLines] = useState(0)
  const [bootGraphic, setBootGraphic] = useState<'fish' | 'people'>('fish')
  const [visibleLines, setVisibleLines] = useState(5)
  const [typingLine, setTypingLine] = useState(-1)

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
      const newIndex = Math.floor(Math.random() * statusMessages.length)
      setStatusIndex(newIndex)

      const currentMessage = statusMessages[newIndex].text
      const isBuildError = currentMessage === 'build error. rebooting...'
      const isBridgingWorlds = currentMessage === 'bridging worlds...'

      if ((isBuildError || isBridgingWorlds) && !isRebooting) {
        setIsRebooting(true)
        setRebootPhase('blank')
        setVisibleLines(0)
        setTypingLine(-1)

        const graphic = isBuildError ? 'fish' : 'people'
        setBootGraphic(graphic)
        const endStatus = isBuildError ? 'rebuilding...' : 'bridging worlds...'

        setTimeout(() => {
          setRebootPhase('graphic')
          setGraphicLines(0)
          setTimeout(() => setGraphicLines(1), 150)
          setTimeout(() => setGraphicLines(2), 300)
          setTimeout(() => setGraphicLines(3), 450)
        }, 600)

        // Phase 2: Graphic for 2400ms, then typing at 3000ms
        setTimeout(() => {
          setRebootPhase('typing')
          setGraphicLines(0)
          setTypingLine(1); setVisibleLines(1)
          setTimeout(() => { setTypingLine(2); setVisibleLines(2) }, 400)
          setTimeout(() => { setTypingLine(3); setVisibleLines(3) }, 800)
          setTimeout(() => { setTypingLine(4); setVisibleLines(4) }, 1100)
          setTimeout(() => { setTypingLine(5); setVisibleLines(5) }, 1400)
          setTimeout(() => {
            setTypingLine(-1)
            const statusIdx = statusMessages.findIndex(m => m.text === endStatus)
            setStatusIndex(statusIdx)
          }, 1800)
          setTimeout(() => {
            setIsRebooting(false)
            setRebootPhase('normal')
          }, 2800)
        }, 3000)
      }
    }, 3000)

    return () => {
      clearInterval(cursorInterval)
      clearInterval(statusInterval)
    }
  }, [isRebooting])

  const handleClick = () => {
    router.push('/csx/lf')
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
          height: 190px;
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

        @keyframes bubbleGlow {
          0%, 100% { opacity: 0.3; }
          50% { opacity: 1; text-shadow: 0 0 8px #a85; }
        }

        .bubble {
          display: inline-block;
          animation: bubbleGlow 0.5s ease-in-out infinite;
        }

        .bubble-1 { animation-delay: 0s; }
        .bubble-2 { animation-delay: 0.125s; }
        .bubble-3 { animation-delay: 0.25s; }
        .bubble-4 { animation-delay: 0.375s; }
      `}</style>

      <div className="terminal-page" onClick={handleClick}>
        <div className="terminal-box">
          <div className="terminal-header">
            <span className="terminal-header-title">CTRL SHIFT</span> <span style={{ verticalAlign: 'middle' }}>•</span> LONG HORIZON LAB
          </div>

          <div className="terminal-body">
            {rebootPhase === 'graphic' ? (
              <div className="boot-graphic">
                {bootGraphic === 'fish' ? (
                  <>
                    <div style={{ opacity: graphicLines >= 1 ? 1 : 0 }}> <span className="bubble bubble-1">o</span>   <span className="bubble bubble-2">o</span></div>
                    <div style={{ opacity: graphicLines >= 2 ? 1 : 0 }}>{'<º)))><'}</div>
                    <div style={{ opacity: graphicLines >= 3 ? 1 : 0 }}> <span className="bubble bubble-4">o</span>   <span className="bubble bubble-3">o</span></div>
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
                  founders, researchers & students building AI that matters.
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

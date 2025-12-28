'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useState, Suspense } from 'react'

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
  const [avatarGroup, setAvatarGroup] = useState<'founder' | 'researcher' | 'student'>('founder')

  const statusMessages = [
    { text: 'onboarding new builders...', color: 'green', cursor: false },
    { text: 'backing the weird...', color: 'green', cursor: false },
    { text: 'scanning the horizon...', color: 'green', cursor: false },
  ]

  useEffect(() => {
    const cursorInterval = setInterval(() => {
      setShowCursor(prev => !prev)
    }, 530)

    // Rotate status messages in order every 3 seconds
    const statusInterval = setInterval(() => {
      setStatusIndex(prev => (prev + 1) % statusMessages.length)
    }, 3000)

    return () => {
      clearInterval(cursorInterval)
      clearInterval(statusInterval)
    }
  }, [])

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
          cursor: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 16 16'%3E%3Cpath fill='%23fff' d='M0 0h2v2H0zM2 2h2v2H2zM4 4h2v2H4zM6 6h2v2H6zM8 8h2v2H8zM10 10h2v2h-2zM0 2h2v2H0zM0 4h2v2H0zM0 6h2v2H0zM0 8h2v2H0zM0 10h2v2H0zM2 10h2v2H2zM4 8h2v2H4zM6 10h2v2H6zM8 12h2v2H8z'/%3E%3Cpath fill='%23000' d='M2 4h2v2H2zM2 6h2v2H2zM2 8h2v2H2zM4 6h2v2H4zM6 8h2v2H6zM8 10h2v2H8z'/%3E%3C/svg%3E") 0 0, auto;
        }

        body {
          margin: 0;
          padding: 0;
          background: #0a0a0a;
        }

        .terminal-page {
          min-height: 100vh;
          background: linear-gradient(to bottom, #000 0%, #0a0a0a 50%, #151515 100%);
          color: #ccc;
          font-family: 'IBM Plex Mono', monospace;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 24px;
          padding-top: calc(24px + env(safe-area-inset-top));
          padding-bottom: calc(24px + env(safe-area-inset-bottom));
          image-rendering: pixelated;
        }

        .terminal-container {
          display: flex;
          align-items: stretch;
          gap: 16px;
        }

        .side-box {
          border: 1px solid #666;
          width: 200px;
          min-width: 200px;
          background: transparent;
          display: none;
          flex-direction: column;
          align-items: flex-start;
          padding: 0 12px;
        }

        .pixel-businessman {
          image-rendering: pixelated;
          margin-top: 10px;
        }

        .avatar-frame {
          border: 2px dotted #fff;
          width: 160px;
          height: 160px;
          display: flex;
          align-items: center;
          justify-content: center;
          align-self: center;
        }

        .avatar-label {
          color: #fff;
          font-size: 0.8rem;
          margin-top: 12px;
          letter-spacing: 0.1em;
          align-self: center;
        }

        .avatar-arrows {
          display: flex;
          gap: 24px;
          margin-top: 8px;
          align-self: center;
        }

        .pixel-arrow {
          cursor: pointer;
          opacity: 0.7;
        }

        .pixel-arrow:hover {
          opacity: 1;
        }

        @media (min-width: 900px) {
          .side-box {
            display: flex;
          }
        }

        .side-box-right {
          border: 1px solid #666;
          width: 200px;
          min-width: 200px;
          background: transparent;
          display: none;
          flex-direction: column;
          align-self: center;
          align-items: center;
          justify-content: center;
          height: 80px;
          cursor: pointer;
          transition: border-color 0.2s;
        }

        .side-box-right:hover {
          border-color: #999;
        }

        .side-box-title {
          color: #888;
          font-size: 0.75rem;
          letter-spacing: 0.02em;
          margin-top: 16px;
          margin-bottom: auto;
        }

        .hiring-button {
          border: 1px solid #666;
          background: transparent;
          color: #fff;
          font-size: 0.8rem;
          font-weight: 500;
          letter-spacing: 0.1em;
          padding: 10px 0;
          margin-top: auto;
          margin-bottom: 16px;
          cursor: pointer;
          transition: border-color 0.2s;
          font-family: 'IBM Plex Mono', monospace;
          width: 160px;
          align-self: center;
        }

        .hiring-button:hover {
          background: #fff;
          color: #000;
          border-color: #fff;
        }

        @media (min-width: 900px) {
          .side-box-right {
            display: flex;
          }
        }

        .terminal-box {
          border: 3px solid #444;
          padding: 20px 24px;
          max-width: 640px;
          width: 100%;
          position: relative;
          background: #111;
          box-shadow:
            inset 2px 2px 0 #555,
            inset -2px -2px 0 #222,
            4px 4px 0 #000;
        }

        @media (min-width: 640px) {
          .terminal-box {
            padding: 24px 32px;
          }
        }

        .terminal-box::before {
          content: '';
          position: absolute;
          top: -6px;
          left: 50%;
          transform: translateX(-50%);
          padding: 2px 12px;
          background: #111;
          border: 2px solid #444;
          font-size: 0.6rem;
          color: #666;
          letter-spacing: 0.1em;
        }

        .terminal-wrapper {
          display: flex;
          flex-direction: column;
        }

        .window-bar {
          display: flex;
          justify-content: space-between;
          align-items: center;
          background: #1a1a1a;
          border-bottom: 1px solid #333;
          padding: 8px 12px;
          margin: -20px -23px 16px -23px;
        }

        @media (min-width: 640px) {
          .window-bar {
            margin: -24px -31px 20px -31px;
            padding: 10px 16px;
          }
        }

        .window-bar-title {
          color: #666;
          font-size: 0.65rem;
          letter-spacing: 0.1em;
        }

        .window-bar-small {
          margin: 0 -12px 12px -12px;
          width: calc(100% + 24px);
          box-sizing: border-box;
        }

        .window-controls {
          display: flex;
          gap: 6px;
        }

        .window-btn {
          width: 12px;
          height: 12px;
          border: 1px solid #666;
          background: transparent;
          cursor: default;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 0;
          pointer-events: none;
        }

        .window-btn svg {
          width: 6px;
          height: 6px;
        }

        .terminal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 16px;
          padding-bottom: 12px;
          border-bottom: 2px dotted #444;
          font-size: 0.75rem;
          color: #888;
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
          text-shadow: 1px 1px 0 #000;
          font-weight: 600;
          font-size: 1.3rem;
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
          color: #999;
        }

        @media (min-width: 640px) {
          .terminal-line {
            font-size: 0.9375rem;
            line-height: 1.7;
            margin-bottom: 4px;
          }
        }

        .terminal-dim {
          color: #999;
        }


        .terminal-programs {
          margin-top: 16px;
          display: flex;
          flex-direction: row;
          gap: 8px;
        }

        @media (min-width: 640px) {
          .terminal-programs {
            margin-top: 20px;
            gap: 12px;
          }
        }

        .terminal-program {
          font-size: 0.75rem;
          line-height: 1.4;
          display: flex;
          flex-direction: column;
          border: 0.5px solid #888;
          padding: 10px 12px;
          flex: 1;
          background: transparent;
        }

        @media (min-width: 640px) {
          .terminal-program {
            font-size: 0.9rem;
            line-height: 1.5;
            padding: 14px 16px;
          }
        }

        .terminal-program-label {
          display: flex;
          align-items: center;
          color: #fff;
          margin-bottom: 8px;
          font-size: 0.75rem;
          font-weight: 500;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        @media (min-width: 640px) {
          .terminal-program-label {
            font-size: 0.8rem;
            margin-bottom: 10px;
          }
        }

        .terminal-program-value {
          color: #ccc;
        }

        .terminal-status {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 0.75rem;
          color: #888;
          margin-top: 16px;
          padding-top: 12px;
          border-top: 2px dotted #444;
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
          width: 6px;
          height: 6px;
          border-radius: 0;
        }

        .status-dot-green { background: #5a9a5a; box-shadow: 0 0 4px #5a9a5a; }
        .status-dot-red { background: #9a5a5a; box-shadow: 0 0 4px #9a5a5a; }
        .status-dot-amber { background: #9a8a5a; box-shadow: 0 0 4px #9a8a5a; }

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

        .page-title {
          position: fixed;
          top: 24px;
          left: 0;
          right: 0;
          text-align: center;
          color: #777;
          font-size: 0.7rem;
          letter-spacing: 0.15em;
          z-index: 10;
          text-shadow: 1px 1px 0 #000;
        }

        @media (min-width: 640px) {
          .page-title {
            top: 32px;
            font-size: 0.8rem;
          }
        }

        /* Pixel stars */
        .terminal-page::before {
          content: '';
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 100px;
          pointer-events: none;
          background-image:
            radial-gradient(1px 1px at 10% 15%, #555 50%, transparent 50%),
            radial-gradient(1px 1px at 25% 8%, #666 50%, transparent 50%),
            radial-gradient(1px 1px at 40% 20%, #444 50%, transparent 50%),
            radial-gradient(1px 1px at 55% 12%, #555 50%, transparent 50%),
            radial-gradient(1px 1px at 70% 18%, #666 50%, transparent 50%),
            radial-gradient(1px 1px at 85% 6%, #555 50%, transparent 50%),
            radial-gradient(1px 1px at 15% 35%, #444 50%, transparent 50%),
            radial-gradient(1px 1px at 35% 28%, #555 50%, transparent 50%),
            radial-gradient(1px 1px at 60% 32%, #666 50%, transparent 50%),
            radial-gradient(1px 1px at 80% 25%, #555 50%, transparent 50%),
            radial-gradient(1px 1px at 92% 38%, #444 50%, transparent 50%),
            radial-gradient(2px 2px at 5% 45%, #777 50%, transparent 50%),
            radial-gradient(2px 2px at 48% 5%, #888 50%, transparent 50%),
            radial-gradient(2px 2px at 95% 42%, #777 50%, transparent 50%);
        }

        .enter-button {
          background: #444;
          color: #fff;
          border: none;
          padding: 10px 20px;
          font-family: 'IBM Plex Mono', monospace;
          font-size: 0.85rem;
          font-weight: 500;
          letter-spacing: 0.05em;
          cursor: pointer;
          box-shadow:
            inset 1px 1px 0 #666,
            inset -1px -1px 0 #222,
            2px 2px 0 #000;
          text-transform: uppercase;
        }

        .enter-button:hover {
          background: #555;
        }

        .enter-button:active {
          box-shadow:
            inset -1px -1px 0 #666,
            inset 1px 1px 0 #222;
          transform: translate(1px, 1px);
        }

        @media (min-width: 640px) {
          .enter-button {
            padding: 12px 24px;
            font-size: 0.95rem;
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

      <div className="terminal-page">
        <div className="page-title">LONG HORIZON BUILD</div>

        <div className="terminal-container">
          <div className="side-box">
            <div className="window-bar window-bar-small">
              <span className="window-bar-title">INFO</span>
              <div className="window-controls">
                <button className="window-btn">
                  <svg viewBox="0 0 6 6" fill="#666">
                    <rect x="0" y="2" width="6" height="2" />
                  </svg>
                </button>
                <button className="window-btn">
                  <svg viewBox="0 0 6 6" fill="none" stroke="#666" strokeWidth="1">
                    <rect x="0.5" y="0.5" width="5" height="5" />
                  </svg>
                </button>
                <button className="window-btn">
                  <svg viewBox="0 0 6 6" fill="#666">
                    <rect x="0" y="0" width="2" height="2" />
                    <rect x="4" y="0" width="2" height="2" />
                    <rect x="2" y="2" width="2" height="2" />
                    <rect x="0" y="4" width="2" height="2" />
                    <rect x="4" y="4" width="2" height="2" />
                  </svg>
                </button>
              </div>
            </div>
            <span className="side-box-title">CTRL SHIFT Lab is a community of AI builders who are:</span>
            {/* Founder Group */}
            <div className="avatar-frame" style={{ display: avatarGroup === 'founder' ? 'flex' : 'none' }}>
              <svg className="pixel-businessman" width="78" height="130" viewBox="0 0 48 80" fill="#fff">
              {/* Hair - slicked back professional */}
              <rect x="17" y="1" width="14" height="1" />
              <rect x="15" y="2" width="18" height="1" />
              <rect x="14" y="3" width="20" height="1" />
              <rect x="13" y="4" width="22" height="2" />
              <rect x="13" y="6" width="2" height="2" />
              <rect x="33" y="6" width="2" height="2" />
              {/* Forehead */}
              <rect x="15" y="6" width="18" height="1" />
              {/* Face outline */}
              <rect x="13" y="8" width="1" height="10" />
              <rect x="34" y="8" width="1" height="10" />
              {/* Jaw */}
              <rect x="14" y="18" width="1" height="2" />
              <rect x="33" y="18" width="1" height="2" />
              <rect x="15" y="20" width="2" height="1" />
              <rect x="31" y="20" width="2" height="1" />
              <rect x="17" y="21" width="14" height="1" />
              {/* Eyebrows */}
              <rect x="16" y="9" width="5" height="1" />
              <rect x="27" y="9" width="5" height="1" />
              {/* Glasses frames */}
              <rect x="15" y="10" width="7" height="1" />
              <rect x="26" y="10" width="7" height="1" />
              <rect x="15" y="10" width="1" height="4" />
              <rect x="21" y="10" width="1" height="4" />
              <rect x="26" y="10" width="1" height="4" />
              <rect x="32" y="10" width="1" height="4" />
              <rect x="15" y="13" width="7" height="1" />
              <rect x="26" y="13" width="7" height="1" />
              {/* Glasses bridge */}
              <rect x="22" y="11" width="4" height="1" />
              {/* Eyes inside glasses */}
              <rect x="17" y="11" width="2" height="2" />
              <rect x="29" y="11" width="2" height="2" />
              {/* Nose */}
              <rect x="23" y="14" width="2" height="3" />
              <rect x="22" y="17" width="1" height="1" />
              <rect x="25" y="17" width="1" height="1" />
              {/* Mouth */}
              <rect x="20" y="19" width="8" height="1" />
              {/* Ears */}
              <rect x="11" y="11" width="2" height="4" />
              <rect x="35" y="11" width="2" height="4" />
              {/* Neck */}
              <rect x="20" y="22" width="1" height="3" />
              <rect x="27" y="22" width="1" height="3" />
              {/* Shirt collar */}
              <rect x="17" y="25" width="4" height="2" />
              <rect x="27" y="25" width="4" height="2" />
              <rect x="18" y="27" width="2" height="1" />
              <rect x="28" y="27" width="2" height="1" />
              {/* Tie knot */}
              <rect x="22" y="25" width="4" height="2" />
              {/* Tie */}
              <rect x="22" y="27" width="4" height="2" />
              <rect x="22" y="29" width="4" height="8" />
              <rect x="23" y="37" width="2" height="2" />
              {/* Suit shoulders */}
              <rect x="7" y="25" width="10" height="1" />
              <rect x="31" y="25" width="10" height="1" />
              <rect x="5" y="26" width="3" height="1" />
              <rect x="40" y="26" width="3" height="1" />
              {/* Suit jacket outline */}
              <rect x="5" y="27" width="1" height="18" />
              <rect x="42" y="27" width="1" height="18" />
              {/* Lapels */}
              <rect x="15" y="28" width="2" height="10" />
              <rect x="16" y="38" width="2" height="4" />
              <rect x="31" y="28" width="2" height="10" />
              <rect x="30" y="38" width="2" height="4" />
              {/* Jacket buttons */}
              <rect x="20" y="33" width="1" height="1" />
              <rect x="27" y="33" width="1" height="1" />
              <rect x="20" y="37" width="1" height="1" />
              <rect x="27" y="37" width="1" height="1" />
              {/* Pocket squares */}
              <rect x="9" y="30" width="3" height="3" />
              <rect x="36" y="30" width="3" height="3" />
              {/* Arms */}
              <rect x="3" y="27" width="1" height="16" />
              <rect x="44" y="27" width="1" height="16" />
              <rect x="4" y="27" width="1" height="16" />
              <rect x="43" y="27" width="1" height="16" />
              {/* Cuffs */}
              <rect x="2" y="41" width="4" height="2" />
              <rect x="42" y="41" width="4" height="2" />
              {/* Hands */}
              <rect x="1" y="43" width="4" height="4" />
              <rect x="43" y="43" width="4" height="4" />
              {/* Fingers */}
              <rect x="0" y="45" width="1" height="2" />
              <rect x="47" y="45" width="1" height="2" />
              {/* Jacket bottom */}
              <rect x="6" y="44" width="12" height="1" />
              <rect x="30" y="44" width="12" height="1" />
              {/* Belt */}
              <rect x="14" y="45" width="20" height="2" />
              {/* Belt buckle */}
              <rect x="22" y="45" width="4" height="2" />
              {/* Pants */}
              <rect x="13" y="47" width="1" height="22" />
              <rect x="19" y="47" width="1" height="22" />
              <rect x="28" y="47" width="1" height="22" />
              <rect x="34" y="47" width="1" height="22" />
              {/* Pants crease */}
              <rect x="16" y="50" width="1" height="16" />
              <rect x="31" y="50" width="1" height="16" />
              {/* Pants cuff */}
              <rect x="12" y="69" width="9" height="1" />
              <rect x="27" y="69" width="9" height="1" />
              {/* Shoes */}
              <rect x="10" y="70" width="1" height="3" />
              <rect x="11" y="72" width="10" height="1" />
              <rect x="11" y="70" width="10" height="1" />
              <rect x="20" y="71" width="1" height="1" />
              <rect x="27" y="70" width="10" height="1" />
              <rect x="27" y="72" width="10" height="1" />
              <rect x="37" y="70" width="1" height="3" />
              <rect x="27" y="71" width="1" height="1" />
              {/* Briefcase */}
              <rect x="0" y="48" width="1" height="8" />
              <rect x="0" y="48" width="8" height="1" />
              <rect x="0" y="55" width="8" height="1" />
              <rect x="7" y="48" width="1" height="8" />
              <rect x="2" y="50" width="4" height="1" />
              <rect x="3" y="47" width="2" height="1" />
              </svg>
            </div>
            <span className="avatar-label" style={{ display: avatarGroup === 'founder' ? 'block' : 'none' }}>Founders</span>

            {/* Researcher Group */}
            <div className="avatar-frame" style={{ display: avatarGroup === 'researcher' ? 'flex' : 'none' }}>
              <svg className="pixel-businessman" width="78" height="130" viewBox="0 0 48 80" fill="#fff">
              {/* Hair - messy/curly researcher */}
              <rect x="16" y="0" width="2" height="1" />
              <rect x="20" y="0" width="3" height="1" />
              <rect x="26" y="0" width="2" height="1" />
              <rect x="30" y="0" width="2" height="1" />
              <rect x="14" y="1" width="20" height="1" />
              <rect x="13" y="2" width="22" height="2" />
              <rect x="13" y="4" width="2" height="2" />
              <rect x="33" y="4" width="2" height="2" />
              {/* Forehead */}
              <rect x="15" y="4" width="18" height="1" />
              {/* Face outline */}
              <rect x="13" y="6" width="1" height="12" />
              <rect x="34" y="6" width="1" height="12" />
              {/* Jaw */}
              <rect x="14" y="18" width="1" height="2" />
              <rect x="33" y="18" width="1" height="2" />
              <rect x="15" y="20" width="2" height="1" />
              <rect x="31" y="20" width="2" height="1" />
              <rect x="17" y="21" width="14" height="1" />
              {/* Eyebrows - raised curious */}
              <rect x="16" y="7" width="5" height="1" />
              <rect x="27" y="7" width="5" height="1" />
              {/* Glasses - round frames */}
              <rect x="15" y="9" width="8" height="1" />
              <rect x="25" y="9" width="8" height="1" />
              <rect x="15" y="9" width="1" height="5" />
              <rect x="22" y="9" width="1" height="5" />
              <rect x="25" y="9" width="1" height="5" />
              <rect x="32" y="9" width="1" height="5" />
              <rect x="15" y="13" width="8" height="1" />
              <rect x="25" y="13" width="8" height="1" />
              {/* Glasses bridge */}
              <rect x="23" y="10" width="2" height="1" />
              {/* Eyes */}
              <rect x="17" y="10" width="2" height="2" />
              <rect x="28" y="10" width="2" height="2" />
              {/* Nose */}
              <rect x="23" y="14" width="2" height="2" />
              <rect x="22" y="16" width="1" height="1" />
              <rect x="25" y="16" width="1" height="1" />
              {/* Slight smile */}
              <rect x="20" y="18" width="8" height="1" />
              <rect x="19" y="17" width="1" height="1" />
              <rect x="28" y="17" width="1" height="1" />
              {/* Ears */}
              <rect x="11" y="10" width="2" height="4" />
              <rect x="35" y="10" width="2" height="4" />
              {/* Neck */}
              <rect x="20" y="22" width="1" height="3" />
              <rect x="27" y="22" width="1" height="3" />
              {/* Lab coat collar */}
              <rect x="16" y="25" width="5" height="2" />
              <rect x="27" y="25" width="5" height="2" />
              <rect x="17" y="27" width="3" height="1" />
              <rect x="28" y="27" width="3" height="1" />
              {/* Tie/shirt */}
              <rect x="22" y="25" width="4" height="3" />
              {/* Lab coat shoulders */}
              <rect x="6" y="25" width="10" height="1" />
              <rect x="32" y="25" width="10" height="1" />
              <rect x="4" y="26" width="3" height="1" />
              <rect x="41" y="26" width="3" height="1" />
              {/* Lab coat outline */}
              <rect x="4" y="27" width="1" height="18" />
              <rect x="43" y="27" width="1" height="18" />
              {/* Lab coat lapels */}
              <rect x="14" y="28" width="2" height="14" />
              <rect x="32" y="28" width="2" height="14" />
              {/* Coat pockets */}
              <rect x="8" y="34" width="5" height="4" />
              <rect x="35" y="34" width="5" height="4" />
              {/* Pen in pocket */}
              <rect x="9" y="32" width="1" height="2" />
              {/* Arms */}
              <rect x="2" y="27" width="1" height="14" />
              <rect x="3" y="27" width="1" height="14" />
              <rect x="44" y="27" width="1" height="14" />
              <rect x="45" y="27" width="1" height="14" />
              {/* Hands */}
              <rect x="1" y="41" width="4" height="4" />
              <rect x="43" y="41" width="4" height="4" />
              {/* Beaker in hand */}
              <rect x="44" y="36" width="4" height="1" />
              <rect x="44" y="36" width="1" height="5" />
              <rect x="47" y="36" width="1" height="5" />
              <rect x="45" y="40" width="2" height="1" />
              {/* Lab coat bottom */}
              <rect x="5" y="44" width="10" height="1" />
              <rect x="33" y="44" width="10" height="1" />
              {/* Belt/waist */}
              <rect x="15" y="45" width="18" height="1" />
              {/* Pants */}
              <rect x="14" y="46" width="1" height="22" />
              <rect x="20" y="46" width="1" height="22" />
              <rect x="27" y="46" width="1" height="22" />
              <rect x="33" y="46" width="1" height="22" />
              {/* Pants cuff */}
              <rect x="13" y="68" width="9" height="1" />
              <rect x="26" y="68" width="9" height="1" />
              {/* Shoes */}
              <rect x="11" y="69" width="1" height="3" />
              <rect x="12" y="71" width="10" height="1" />
              <rect x="12" y="69" width="10" height="1" />
              <rect x="21" y="70" width="1" height="1" />
              <rect x="26" y="69" width="10" height="1" />
              <rect x="26" y="71" width="10" height="1" />
              <rect x="36" y="69" width="1" height="3" />
              <rect x="26" y="70" width="1" height="1" />
              </svg>
            </div>
            <span className="avatar-label" style={{ display: avatarGroup === 'researcher' ? 'block' : 'none' }}>Researchers</span>

            {/* Student Group */}
            <div className="avatar-frame" style={{ display: avatarGroup === 'student' ? 'flex' : 'none' }}>
              <svg className="pixel-businessman" width="78" height="130" viewBox="0 0 48 80" fill="#fff">
              {/* Hair - casual young style */}
              <rect x="15" y="1" width="18" height="1" />
              <rect x="14" y="2" width="20" height="1" />
              <rect x="13" y="3" width="22" height="2" />
              <rect x="12" y="5" width="2" height="3" />
              <rect x="34" y="5" width="2" height="3" />
              {/* Hair tuft */}
              <rect x="18" y="0" width="3" height="1" />
              {/* Forehead */}
              <rect x="14" y="5" width="20" height="1" />
              {/* Face outline */}
              <rect x="12" y="8" width="1" height="10" />
              <rect x="35" y="8" width="1" height="10" />
              {/* Jaw */}
              <rect x="13" y="18" width="1" height="2" />
              <rect x="34" y="18" width="1" height="2" />
              <rect x="14" y="20" width="2" height="1" />
              <rect x="32" y="20" width="2" height="1" />
              <rect x="16" y="21" width="16" height="1" />
              {/* Eyebrows */}
              <rect x="15" y="9" width="5" height="1" />
              <rect x="28" y="9" width="5" height="1" />
              {/* Eyes */}
              <rect x="16" y="11" width="2" height="2" />
              <rect x="30" y="11" width="2" height="2" />
              {/* Nose */}
              <rect x="23" y="13" width="2" height="3" />
              {/* Smile */}
              <rect x="19" y="18" width="10" height="1" />
              <rect x="18" y="17" width="1" height="1" />
              <rect x="29" y="17" width="1" height="1" />
              {/* Ears */}
              <rect x="10" y="11" width="2" height="4" />
              <rect x="36" y="11" width="2" height="4" />
              {/* Earbuds */}
              <rect x="9" y="12" width="1" height="2" />
              <rect x="38" y="12" width="1" height="2" />
              {/* Neck */}
              <rect x="20" y="22" width="1" height="3" />
              <rect x="27" y="22" width="1" height="3" />
              {/* Hoodie collar */}
              <rect x="16" y="25" width="6" height="2" />
              <rect x="26" y="25" width="6" height="2" />
              {/* Hoodie string */}
              <rect x="18" y="27" width="1" height="4" />
              <rect x="29" y="27" width="1" height="4" />
              {/* Hoodie body */}
              <rect x="8" y="25" width="8" height="1" />
              <rect x="32" y="25" width="8" height="1" />
              <rect x="6" y="26" width="3" height="1" />
              <rect x="39" y="26" width="3" height="1" />
              {/* Hoodie outline */}
              <rect x="5" y="27" width="1" height="16" />
              <rect x="42" y="27" width="1" height="16" />
              {/* Hoodie pocket */}
              <rect x="16" y="35" width="16" height="1" />
              <rect x="16" y="35" width="1" height="5" />
              <rect x="31" y="35" width="1" height="5" />
              <rect x="16" y="39" width="16" height="1" />
              {/* Arms */}
              <rect x="3" y="27" width="1" height="14" />
              <rect x="4" y="27" width="1" height="14" />
              <rect x="43" y="27" width="1" height="14" />
              <rect x="44" y="27" width="1" height="14" />
              {/* Hands */}
              <rect x="2" y="41" width="4" height="4" />
              <rect x="42" y="41" width="4" height="4" />
              {/* Laptop in hands */}
              <rect x="10" y="38" width="14" height="1" />
              <rect x="10" y="38" width="1" height="6" />
              <rect x="23" y="38" width="1" height="6" />
              <rect x="10" y="43" width="14" height="1" />
              <rect x="12" y="40" width="10" height="2" />
              {/* Hoodie bottom */}
              <rect x="6" y="42" width="10" height="1" />
              <rect x="32" y="42" width="10" height="1" />
              {/* Jeans waist */}
              <rect x="14" y="43" width="20" height="2" />
              {/* Jeans */}
              <rect x="13" y="45" width="1" height="24" />
              <rect x="19" y="45" width="1" height="24" />
              <rect x="28" y="45" width="1" height="24" />
              <rect x="34" y="45" width="1" height="24" />
              {/* Jeans cuff */}
              <rect x="12" y="69" width="9" height="1" />
              <rect x="27" y="69" width="9" height="1" />
              {/* Sneakers */}
              <rect x="10" y="70" width="1" height="3" />
              <rect x="11" y="72" width="10" height="1" />
              <rect x="11" y="70" width="10" height="1" />
              <rect x="20" y="71" width="1" height="1" />
              <rect x="27" y="70" width="10" height="1" />
              <rect x="27" y="72" width="10" height="1" />
              <rect x="37" y="70" width="1" height="3" />
              <rect x="27" y="71" width="1" height="1" />
              {/* Sneaker details */}
              <rect x="12" y="71" width="3" height="1" />
              <rect x="32" y="71" width="3" height="1" />
              {/* Backpack straps */}
              <rect x="7" y="27" width="2" height="10" />
              <rect x="39" y="27" width="2" height="10" />
              </svg>
            </div>
            <span className="avatar-label" style={{ display: avatarGroup === 'student' ? 'block' : 'none' }}>Students</span>

            <div className="avatar-arrows">
              <svg className="pixel-arrow" width="16" height="16" viewBox="0 0 8 8" fill="#fff" onClick={(e) => { e.stopPropagation(); setAvatarGroup(prev => prev === 'founder' ? 'student' : prev === 'researcher' ? 'founder' : 'researcher'); }}>
                {/* Left arrow */}
                <rect x="3" y="0" width="1" height="1" />
                <rect x="2" y="1" width="1" height="1" />
                <rect x="1" y="2" width="1" height="1" />
                <rect x="0" y="3" width="1" height="2" />
                <rect x="1" y="5" width="1" height="1" />
                <rect x="2" y="6" width="1" height="1" />
                <rect x="3" y="7" width="1" height="1" />
                <rect x="4" y="3" width="4" height="2" />
              </svg>
              <svg className="pixel-arrow" width="16" height="16" viewBox="0 0 8 8" fill="#fff" onClick={(e) => { e.stopPropagation(); setAvatarGroup(prev => prev === 'founder' ? 'researcher' : prev === 'researcher' ? 'student' : 'founder'); }}>
                {/* Right arrow */}
                <rect x="4" y="0" width="1" height="1" />
                <rect x="5" y="1" width="1" height="1" />
                <rect x="6" y="2" width="1" height="1" />
                <rect x="7" y="3" width="1" height="2" />
                <rect x="6" y="5" width="1" height="1" />
                <rect x="5" y="6" width="1" height="1" />
                <rect x="4" y="7" width="1" height="1" />
                <rect x="0" y="3" width="4" height="2" />
              </svg>
            </div>
            <button className="hiring-button" onClick={() => router.push('/csx/hiring')}>We're hiring</button>
          </div>
          <div className="terminal-box">
          <div className="window-bar">
            <span className="window-bar-title">TERMINAL</span>
            <div className="window-controls">
              <button className="window-btn">
                <svg viewBox="0 0 6 6" fill="#666">
                  <rect x="0" y="2" width="6" height="2" />
                </svg>
              </button>
              <button className="window-btn">
                <svg viewBox="0 0 6 6" fill="none" stroke="#666" strokeWidth="1">
                  <rect x="0.5" y="0.5" width="5" height="5" />
                </svg>
              </button>
              <button className="window-btn">
                <svg viewBox="0 0 6 6" fill="#666">
                  <rect x="0" y="0" width="2" height="2" />
                  <rect x="4" y="0" width="2" height="2" />
                  <rect x="2" y="2" width="2" height="2" />
                  <rect x="0" y="4" width="2" height="2" />
                  <rect x="4" y="4" width="2" height="2" />
                </svg>
              </button>
            </div>
          </div>
          <div className="terminal-header">
            <span className="terminal-header-title">CTRL SHIFT LAB</span>
            <button className="enter-button" onClick={handleClick}>ENTER <span style={{ marginLeft: '2px', fontSize: '1.1em' }}>→</span></button>
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
                  founders, researchers & students building AI that matters.
                </div>

                <div className="terminal-programs">
                  <div className={`terminal-program ${visibleLines < 3 ? 'line-hidden' : ''} ${typingLine === 3 ? 'line-typing' : ''}`}>
                    <span className="terminal-program-label">
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" style={{ marginRight: '6px', verticalAlign: 'middle', imageRendering: 'pixelated' }}>
                        {/* Pixel magnifying glass */}
                        <rect x="4" y="2" width="6" height="2" />
                        <rect x="2" y="4" width="2" height="2" />
                        <rect x="10" y="4" width="2" height="2" />
                        <rect x="2" y="6" width="2" height="2" />
                        <rect x="10" y="6" width="2" height="2" />
                        <rect x="4" y="8" width="6" height="2" />
                        <rect x="10" y="10" width="2" height="2" />
                        <rect x="12" y="12" width="2" height="2" />
                      </svg>
                      explore
                    </span>
                    <span className="terminal-program-value">weekly office hours</span>
                  </div>
                  <div className={`terminal-program ${visibleLines < 4 ? 'line-hidden' : ''} ${typingLine === 4 ? 'line-typing' : ''}`}>
                    <span className="terminal-program-label">
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" style={{ marginRight: '6px', verticalAlign: 'middle', imageRendering: 'pixelated' }}>
                        {/* Pixel dollar/coin */}
                        <rect x="7" y="1" width="2" height="2" />
                        <rect x="5" y="3" width="6" height="2" />
                        <rect x="5" y="5" width="2" height="2" />
                        <rect x="5" y="7" width="6" height="2" />
                        <rect x="9" y="9" width="2" height="2" />
                        <rect x="5" y="11" width="6" height="2" />
                        <rect x="7" y="13" width="2" height="2" />
                      </svg>
                      fund
                    </span>
                    <span className="terminal-program-value">non-dilutive awards ($1k–$10k)</span>
                  </div>
                  <div className={`terminal-program ${visibleLines < 5 ? 'line-hidden' : ''} ${typingLine === 5 ? 'line-typing' : ''}`}>
                    <span className="terminal-program-label">
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" style={{ marginRight: '6px', verticalAlign: 'middle', imageRendering: 'pixelated' }}>
                        {/* Pixel wrench */}
                        <rect x="2" y="2" width="4" height="2" />
                        <rect x="2" y="4" width="2" height="2" />
                        <rect x="4" y="4" width="2" height="2" />
                        <rect x="6" y="6" width="2" height="2" />
                        <rect x="8" y="8" width="2" height="2" />
                        <rect x="10" y="10" width="2" height="2" />
                        <rect x="10" y="12" width="4" height="2" />
                        <rect x="12" y="10" width="2" height="2" />
                      </svg>
                      build
                    </span>
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

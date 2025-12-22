'use client'

import { useState, useEffect } from 'react'

export default function ASCIIOptionsPage() {
  const [showCursor, setShowCursor] = useState(true)
  const [frame, setFrame] = useState(0)

  useEffect(() => {
    const cursorInterval = setInterval(() => {
      setShowCursor(prev => !prev)
    }, 530)

    const frameInterval = setInterval(() => {
      setFrame(prev => (prev + 1) % 4)
    }, 300)

    return () => {
      clearInterval(cursorInterval)
      clearInterval(frameInterval)
    }
  }, [])

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

        .options-page {
          min-height: 100vh;
          background: #0a0a0a;
          color: #ccc;
          font-family: 'IBM Plex Mono', monospace;
          padding: 24px;
        }

        .options-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 24px;
          max-width: 900px;
          margin: 0 auto;
        }

        @media (max-width: 700px) {
          .options-grid {
            grid-template-columns: 1fr;
          }
        }

        .page-title {
          text-align: center;
          color: #fff;
          font-size: 1.25rem;
          margin-bottom: 32px;
          letter-spacing: 0.05em;
        }

        .option-label {
          text-align: center;
          color: #a85;
          font-size: 0.75rem;
          margin-bottom: 12px;
          letter-spacing: 0.1em;
          text-transform: uppercase;
        }

        .terminal-box {
          border: 1px solid #fff;
          border-left-style: dashed;
          border-right-style: dashed;
          padding: 20px 24px;
          position: relative;
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

        .terminal-header-title {
          color: #fff;
        }

        .boot-graphic {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          min-height: 120px;
          font-size: 1.25rem;
          color: #fff;
          letter-spacing: 0.1em;
          line-height: 1.4;
          white-space: pre;
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

        .status-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: #a55;
        }

        /* Sequential bubble blink animation */
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

        /* Robot eye blink */
        @keyframes eyeBlink {
          0%, 45%, 55%, 100% { opacity: 1; }
          50% { opacity: 0.1; }
        }

        .robot-eye {
          display: inline-block;
          animation: eyeBlink 3s ease-in-out infinite;
        }

        .robot-eye-left { animation-delay: 0s; }
        .robot-eye-right { animation-delay: 0.1s; }

        /* Antenna pulse */
        @keyframes antennaPulse {
          0%, 100% { opacity: 0.3; }
          50% { opacity: 1; text-shadow: 0 0 6px #a85; }
        }

        .antenna {
          display: inline-block;
          animation: antennaPulse 1s ease-in-out infinite;
        }

        /* Typing cursor for coder */
        @keyframes typingCursor {
          0%, 50% { opacity: 1; }
          51%, 100% { opacity: 0; }
        }

        .typing-cursor {
          animation: typingCursor 0.8s step-end infinite;
        }

        /* Coffee steam */
        @keyframes steamRise {
          0%, 100% { opacity: 0.3; transform: translateY(0); }
          50% { opacity: 0.8; transform: translateY(-2px); }
        }

        .steam {
          display: inline-block;
          animation: steamRise 1.5s ease-in-out infinite;
        }

        .steam-1 { animation-delay: 0s; }
        .steam-2 { animation-delay: 0.3s; }
        .steam-3 { animation-delay: 0.6s; }

        /* Gear spin animation */
        @keyframes gearSpin {
          0% { content: '|'; }
          25% { content: '/'; }
          50% { content: '-'; }
          75% { content: '\\'; }
        }

        .gear {
          display: inline-block;
        }

        /* Rocket flame flicker */
        @keyframes flameFlicker {
          0%, 100% { opacity: 1; }
          25% { opacity: 0.6; }
          50% { opacity: 1; }
          75% { opacity: 0.7; }
        }

        .flame {
          display: inline-block;
          color: #a85;
          animation: flameFlicker 0.3s ease-in-out infinite;
        }

        .flame-1 { animation-delay: 0s; }
        .flame-2 { animation-delay: 0.1s; }
        .flame-3 { animation-delay: 0.05s; }

        /* Star twinkle for rocket */
        @keyframes starTwinkle {
          0%, 100% { opacity: 0.2; }
          50% { opacity: 1; }
        }

        .star {
          display: inline-block;
          animation: starTwinkle 1.5s ease-in-out infinite;
        }

        .star-1 { animation-delay: 0s; }
        .star-2 { animation-delay: 0.5s; }
        .star-3 { animation-delay: 1s; }
      `}</style>

      <div className="options-page">
        <div className="page-title">ASCII REBOOT OPTIONS</div>

        <div className="options-grid">
          {/* Option 1: Current Fish */}
          <div>
            <div className="option-label">Current: Fish + Bubbles</div>
            <div className="terminal-box">
              <div className="terminal-header">
                <span className="terminal-header-title">CTRL SHIFT</span> • LONG HORIZON LAB
              </div>
              <div className="boot-graphic">
                <div> <span className="bubble bubble-1">o</span>   <span className="bubble bubble-2">o</span></div>
                <div>{'<º)))><'}</div>
                <div> <span className="bubble bubble-4">o</span>   <span className="bubble bubble-3">o</span></div>
              </div>
              <div className="terminal-status">
                <span className="status-dot"></span>
                <span>build error. rebooting...</span>
              </div>
            </div>
          </div>

          {/* Option 2: Cute Robot */}
          <div>
            <div className="option-label">Option A: Friendly Robot</div>
            <div className="terminal-box">
              <div className="terminal-header">
                <span className="terminal-header-title">CTRL SHIFT</span> • LONG HORIZON LAB
              </div>
              <div className="boot-graphic">
                <div>   <span className="antenna">*</span></div>
                <div>  [<span className="robot-eye robot-eye-left">o</span>_<span className="robot-eye robot-eye-right">o</span>]</div>
                <div> /-|---|--\</div>
                <div> |_|___|_|</div>
              </div>
              <div className="terminal-status">
                <span className="status-dot"></span>
                <span>build error. rebooting...</span>
              </div>
            </div>
          </div>

          {/* Option 3: Coder at Work */}
          <div>
            <div className="option-label">Option B: Late Night Coder</div>
            <div className="terminal-box">
              <div className="terminal-header">
                <span className="terminal-header-title">CTRL SHIFT</span> • LONG HORIZON LAB
              </div>
              <div className="boot-graphic">
                <div><span className="steam steam-1">~</span><span className="steam steam-2">~</span><span className="steam steam-3">~</span></div>
                <div>  o    [_]</div>
                <div>{' /|\\_'}<span className="typing-cursor">_</span>{'|:|'}</div>
                <div> / \   {'""\''}</div>
              </div>
              <div className="terminal-status">
                <span className="status-dot"></span>
                <span>build error. rebooting...</span>
              </div>
            </div>
          </div>

          {/* Option 4: Rocket Launch */}
          <div>
            <div className="option-label">Option C: Rocket Launch</div>
            <div className="terminal-box">
              <div className="terminal-header">
                <span className="terminal-header-title">CTRL SHIFT</span> • LONG HORIZON LAB
              </div>
              <div className="boot-graphic">
                <div><span className="star star-1">.</span>    /\    <span className="star star-2">.</span></div>
                <div>    |CS|</div>
                <div>   /|  |\</div>
                <div>   <span className="flame flame-1">*</span><span className="flame flame-2">*</span><span className="flame flame-3">*</span><span className="flame flame-1">*</span></div>
              </div>
              <div className="terminal-status">
                <span className="status-dot"></span>
                <span>build error. rebooting...</span>
              </div>
            </div>
          </div>

          {/* Option 5: Loading Spinner */}
          <div>
            <div className="option-label">Option D: Processing</div>
            <div className="terminal-box">
              <div className="terminal-header">
                <span className="terminal-header-title">CTRL SHIFT</span> • LONG HORIZON LAB
              </div>
              <div className="boot-graphic">
                <div>  .---.  </div>
                <div> /     \ </div>
                <div>|   {['|', '/', '-', '\\'][frame]}   |</div>
                <div> \     / </div>
                <div>  '---'  </div>
              </div>
              <div className="terminal-status">
                <span className="status-dot"></span>
                <span>build error. rebooting...</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

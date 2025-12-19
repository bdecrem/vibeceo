'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

export default function CSXAltLandingPage() {
  const router = useRouter()
  const [statusIndex, setStatusIndex] = useState(0)

  const statusMessages = [
    { text: 'looking for the right builder...', color: 'green' },
    { text: 'build error. rebooting...', color: 'red' },
    { text: 'deep researching...', color: 'amber' },
    { text: 'CTRL-shifting...', color: 'green' },
    { text: 'backing the weird...', color: 'green' },
  ]

  useEffect(() => {
    const statusInterval = setInterval(() => {
      setStatusIndex(prev => (prev + 1) % statusMessages.length)
    }, 3000)

    return () => clearInterval(statusInterval)
  }, [])

  const handleClick = () => {
    router.push('/csx/full')
  }

  return (
    <>
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
          background: #000;
          color: #ccc;
          font-family: 'Courier New', Courier, monospace;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 24px;
          cursor: pointer;
        }

        .terminal-box {
          border: 1px solid #555;
          padding: 20px 28px;
          max-width: 640px;
          width: 100%;
        }

        .terminal-header {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 16px;
          padding-bottom: 12px;
          border-bottom: 1px solid #555;
          font-size: 0.75rem;
          color: #888;
        }

        .terminal-dots {
          display: flex;
          gap: 5px;
        }

        .terminal-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: #555;
        }

        .terminal-header-title {
          color: #bbb;
        }

        .terminal-body {
          margin-bottom: 12px;
        }

        .terminal-line {
          font-size: 0.9375rem;
          line-height: 1.6;
          margin-bottom: 4px;
        }

        .terminal-dim {
          color: #888;
        }

        .terminal-programs {
          margin-top: 16px;
        }

        .terminal-program {
          font-size: 0.875rem;
          line-height: 1.5;
          margin-bottom: 6px;
        }

        .terminal-program:last-child {
          margin-bottom: 0;
        }

        .terminal-prompt {
          color: #777;
          margin-right: 6px;
        }

        .terminal-program-label {
          color: #999;
          margin-right: 6px;
        }

        .terminal-program-value {
          color: #bbb;
        }

        .terminal-status {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 0.75rem;
          color: #777;
          margin-top: 16px;
          padding-top: 12px;
          border-top: 1px solid #555;
        }

        .status-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
        }

        .status-dot-green { background: #6c6; }
        .status-dot-red { background: #c66; }
        .status-dot-amber { background: #ca6; }

        .click-hint {
          margin-top: 16px;
          font-size: 0.6875rem;
          color: #666;
          text-align: center;
        }
      `}</style>

      <div className="terminal-page" onClick={handleClick}>
        <div className="terminal-box">
          <div className="terminal-header">
            <div className="terminal-dots">
              <span className="terminal-dot"></span>
              <span className="terminal-dot"></span>
              <span className="terminal-dot"></span>
            </div>
            <span>
              <span className="terminal-header-title">CTRL SHIFT</span> // LONG HORIZON LAB
            </span>
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
                <span className="terminal-prompt">$</span>
                <span className="terminal-program-label">explore</span>
                <span className="terminal-program-value">weekly office hours</span>
              </div>
              <div className="terminal-program">
                <span className="terminal-prompt">$</span>
                <span className="terminal-program-label">fund</span>
                <span className="terminal-program-value">non-dilutive awards ($1k-$10k)</span>
              </div>
              <div className="terminal-program">
                <span className="terminal-prompt">$</span>
                <span className="terminal-program-label">build</span>
                <span className="terminal-program-value">prototypes, tools, and new models</span>
              </div>
            </div>
          </div>

          <div className="terminal-status">
            <span className={`status-dot status-dot-${statusMessages[statusIndex].color}`}></span>
            <span>{statusMessages[statusIndex].text}</span>
          </div>

          <div className="click-hint">[enter]</div>
        </div>
      </div>
    </>
  )
}

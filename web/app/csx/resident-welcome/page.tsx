'use client'

import { useState, useEffect, useRef } from 'react'

type Command = {
  input: string
  output: string[]
  type: 'command' | 'system'
}

export default function ResidentWelcomePage() {
  const [history, setHistory] = useState<Command[]>([])
  const [currentInput, setCurrentInput] = useState('')
  const [showCursor, setShowCursor] = useState(true)
  const [isViMode, setIsViMode] = useState(false)
  const [showSecret, setShowSecret] = useState(false)
  const [bootComplete, setBootComplete] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const terminalRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    // Boot sequence
    const bootSequence = [
      { delay: 0, text: 'CTRL SHIFT RESIDENT SYSTEM v0.1.0' },
      { delay: 600, text: 'Initializing...' },
      { delay: 1200, text: 'Loading your access credentials...' },
      { delay: 1800, text: 'Connection established.' },
      { delay: 2400, text: '' },
      { delay: 2600, text: 'Welcome. The machine is ready.' },
      { delay: 3000, text: 'Type "help" for available commands.' },
    ]

    let timeouts: NodeJS.Timeout[] = []
    bootSequence.forEach(({ delay, text }) => {
      const timeout = setTimeout(() => {
        if (text) {
          setHistory(prev => [...prev, { input: '', output: [text], type: 'system' }])
        }
        if (delay === 3000) {
          setBootComplete(true)
          setTimeout(() => inputRef.current?.focus(), 100)
        }
      }, delay)
      timeouts.push(timeout)
    })

    return () => timeouts.forEach(clearTimeout)
  }, [])

  useEffect(() => {
    const interval = setInterval(() => {
      setShowCursor(prev => !prev)
    }, 530)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight
    }
  }, [history, currentInput])

  const executeCommand = (cmd: string) => {
    const trimmed = cmd.trim().toLowerCase()
    
    if (trimmed === 'help') {
      setHistory(prev => [...prev, {
        input: cmd,
        output: [
          'Available commands:',
          '  help     - Show this help message',
          '  cat      - Read a file (try: cat README.txt)',
          '  vi       - Edit a file (try: vi README.txt)',
          '  ls       - List files in current directory',
          '  clear    - Clear the terminal',
          '',
          'You\'re in the machine now. Look around.'
        ],
        type: 'command'
      }])
    } else if (trimmed === 'cat readme.txt' || trimmed === 'cat readme') {
      setHistory(prev => [...prev, {
        input: cmd,
        output: [
          '╔═══════════════════════════════════════════════════════╗',
          '║  CTRL SHIFT RESIDENT ACCESS                          ║',
          '╚═══════════════════════════════════════════════════════╝',
          '',
          'Congratulations on being accepted to CTRL SHIFT LAB.',
          '',
          'We\'re building something different here — a space for',
          'founders, researchers, and students who think in years,',
          'not quarters. Who care about rigor, not just hype.',
          '',
          'You\'ve been selected from 100 applications because we',
          'believe you get it.',
          '',
          'Next week, we\'ll share more about the lab structure,',
          'office hours, non-dilutive awards, and the community',
          'you\'re now part of.',
          '',
          'For now: welcome to the machine.',
          '',
          '— The CTRL SHIFT Team',
          '',
        ],
        type: 'command'
      }])
    } else if (trimmed === 'vi readme.txt' || trimmed === 'vi readme') {
      setIsViMode(true)
      setHistory(prev => [...prev, {
        input: cmd,
        output: [],
        type: 'command'
      }])
    } else if (trimmed === 'ls' || trimmed === 'ls -l') {
      setHistory(prev => [...prev, {
        input: cmd,
        output: [
          'README.txt',
          '',
        ],
        type: 'command'
      }])
    } else if (trimmed === 'ls -la' || trimmed === 'ls -a') {
      setShowSecret(true)
      setHistory(prev => [...prev, {
        input: cmd,
        output: [
          'README.txt',
          '.genesis.txt',
          '',
          '💡 Wait... what\'s that hidden file?',
          '   Try: cat .genesis.txt',
        ],
        type: 'command'
      }])
    } else if (trimmed === 'cat .genesis.txt' || trimmed === 'cat .genesis' || trimmed === 'cat genesis.txt') {
      setHistory(prev => [...prev, {
        input: cmd,
        output: [
          '╔═══════════════════════════════════════════════════════╗',
          '║  PROJECT GENESIS                                     ║',
          '║  First Quest • $500 Award                            ║',
          '╚═══════════════════════════════════════════════════════╝',
          '',
          'You found it.',
          '',
          'Most people will read README.txt and wait for next week.',
          'You looked deeper. That\'s exactly what we\'re looking for.',
          '',
          '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
          '  THE PROJECT',
          '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
          '',
          'Build an AI tool that helps researchers ask better',
          'questions. Not a chatbot. Not a summarizer. Something',
          'that actually helps formulate research questions that',
          'matter.',
          '',
          'Requirements:',
          '  • Working prototype (web, CLI, API — your choice)',
          '  • Open source (pick your license)',
          '  • Documentation on your approach',
          '  • Ships by Feb 1, 2026',
          '',
          'Award: $500 non-dilutive',
          '',
          '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
          '  TO ACCEPT THIS QUEST',
          '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
          '',
          'Email us at: hello@ctrlshift.so',
          'Subject: PROJECT GENESIS',
          '',
          'Include:',
          '  1. Your name',
          '  2. Brief (2-3 sentence) initial approach',
          '  3. GitHub/portfolio link',
          '',
          'We\'ll respond within 48 hours with access to our',
          'research resources, weekly check-ins, and community',
          'Discord.',
          '',
          'Only the first 10 residents who complete this will',
          'get the award. Clock\'s ticking.',
          '',
          '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
          '',
          'Good hunting.',
          '',
          '— CTRL SHIFT',
        ],
        type: 'command'
      }])
    } else if (trimmed === 'clear') {
      setHistory([])
    } else if (trimmed === '') {
      // Do nothing for empty input
    } else {
      setHistory(prev => [...prev, {
        input: cmd,
        output: [`Command not found: ${cmd}`, 'Type "help" for available commands.'],
        type: 'command'
      }])
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!bootComplete || currentInput.trim() === '') return
    
    executeCommand(currentInput)
    setCurrentInput('')
  }

  const exitViMode = () => {
    setIsViMode(false)
    setHistory(prev => [...prev, {
      input: '',
      output: [
        '╔═══════════════════════════════════════════════════════╗',
        '║  README.txt                                          ║',
        '╚═══════════════════════════════════════════════════════╝',
        '',
        'Congratulations on being accepted to CTRL SHIFT LAB.',
        '',
        'We\'re building something different here — a space for',
        'founders, researchers, and students who think in years,',
        'not quarters. Who care about rigor, not just hype.',
        '',
        'You\'ve been selected from 100 applications because we',
        'believe you get it.',
        '',
        'Next week, we\'ll share more about the lab structure,',
        'office hours, non-dilutive awards, and the community',
        'you\'re now part of.',
        '',
        'For now: welcome to the machine.',
        '',
        '— The CTRL SHIFT Team',
        '',
        '[Press any key to close]'
      ],
      type: 'system'
    }])
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
          justify-content: flex-start;
          padding: 24px;
          padding-top: calc(24px + env(safe-area-inset-top));
          padding-bottom: calc(24px + env(safe-area-inset-bottom));
        }

        .terminal-window {
          border: 1px solid #fff;
          border-left-style: dashed;
          border-right-style: dashed;
          padding: 20px 24px;
          max-width: 900px;
          width: 100%;
          position: relative;
          background: #0a0a0a;
        }

        @media (min-width: 640px) {
          .terminal-window {
            padding: 24px 32px;
          }
        }

        .terminal-window::before {
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

        .terminal-content {
          height: 60vh;
          max-height: 600px;
          overflow-y: auto;
          overflow-x: hidden;
          font-size: 0.875rem;
          line-height: 1.6;
          color: #ccc;
          padding-right: 8px;
        }

        @media (min-width: 640px) {
          .terminal-content {
            font-size: 0.9375rem;
            line-height: 1.65;
          }
        }

        .terminal-content::-webkit-scrollbar {
          width: 8px;
        }

        .terminal-content::-webkit-scrollbar-track {
          background: #1a1a1a;
        }

        .terminal-content::-webkit-scrollbar-thumb {
          background: #444;
          border-radius: 4px;
        }

        .terminal-content::-webkit-scrollbar-thumb:hover {
          background: #666;
        }

        .terminal-line {
          margin-bottom: 4px;
          color: #fff;
        }

        .terminal-dim {
          color: #999;
        }

        .terminal-prompt {
          color: #5a8;
          margin-right: 8px;
        }

        .terminal-command {
          color: #fff;
        }

        .terminal-output {
          color: #ccc;
          margin-left: 0;
          white-space: pre-wrap;
          word-break: break-word;
        }

        .terminal-system {
          color: #a85;
        }

        .terminal-input-line {
          display: flex;
          align-items: center;
          margin-top: 8px;
          padding-top: 12px;
          border-top: 1px dotted #666;
        }

        .terminal-input {
          flex: 1;
          background: transparent;
          border: none;
          outline: none;
          color: #fff;
          font-family: 'IBM Plex Mono', monospace;
          font-size: 0.875rem;
          padding: 0;
        }

        @media (min-width: 640px) {
          .terminal-input {
            font-size: 0.9375rem;
          }
        }

        .block-cursor {
          color: #a85;
        }

        .cursor-visible {
          opacity: 1;
        }

        .cursor-hidden {
          opacity: 0;
        }

        .vi-mode {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: #0a0a0a;
          z-index: 10;
          display: flex;
          flex-direction: column;
          padding: 20px;
        }

        .vi-content {
          flex: 1;
          overflow-y: auto;
          font-size: 0.875rem;
          line-height: 1.6;
          color: #fff;
          margin-bottom: 16px;
        }

        .vi-footer {
          border-top: 1px solid #666;
          padding-top: 8px;
          font-size: 0.75rem;
          color: #999;
          text-align: center;
        }

        .highlight {
          color: #a85;
          font-weight: 500;
        }

        .command-history {
          margin-bottom: 12px;
        }
      `}</style>

      <div className="terminal-page">
        <div className="terminal-window">
          <div className="terminal-header">
            <span className="terminal-header-title">CTRL SHIFT <span style={{ color: '#aaa' }}>RESIDENT TERMINAL</span></span>
            <span style={{ color: '#8b8b8b' }}>SECURE CONNECTION</span>
          </div>

          <div className="terminal-content" ref={terminalRef}>
            {history.map((cmd, idx) => (
              <div key={idx} className="command-history">
                {cmd.input && (
                  <div className="terminal-line">
                    <span className="terminal-prompt">$</span>
                    <span className="terminal-command">{cmd.input}</span>
                  </div>
                )}
                {cmd.output.map((line, lineIdx) => (
                  <div 
                    key={lineIdx} 
                    className={cmd.type === 'system' ? 'terminal-line terminal-system' : 'terminal-line terminal-output'}
                  >
                    {line}
                  </div>
                ))}
              </div>
            ))}
          </div>

          {bootComplete && !isViMode && (
            <form onSubmit={handleSubmit} className="terminal-input-line">
              <span className="terminal-prompt">$</span>
              <input
                ref={inputRef}
                type="text"
                className="terminal-input"
                value={currentInput}
                onChange={(e) => setCurrentInput(e.target.value)}
                autoFocus
                spellCheck={false}
                autoComplete="off"
              />
              <span className={`block-cursor ${showCursor ? 'cursor-visible' : 'cursor-hidden'}`}>█</span>
            </form>
          )}

          {isViMode && (
            <div className="vi-mode" onClick={exitViMode}>
              <div className="vi-content">
                <div style={{ marginBottom: '16px', color: '#666', fontSize: '0.75rem' }}>
                  README.txt [readonly]
                </div>
                <div style={{ borderTop: '1px solid #333', borderBottom: '1px solid #333', padding: '12px 0' }}>
                  ╔═══════════════════════════════════════════════════════╗<br />
                  ║  CTRL SHIFT RESIDENT ACCESS                          ║<br />
                  ╚═══════════════════════════════════════════════════════╝<br />
                  <br />
                  Congratulations on being accepted to CTRL SHIFT LAB.<br />
                  <br />
                  We're building something different here — a space for<br />
                  founders, researchers, and students who think in years,<br />
                  not quarters. Who care about rigor, not just hype.<br />
                  <br />
                  You've been selected from 100 applications because we<br />
                  believe you get it.<br />
                  <br />
                  Next week, we'll share more about the lab structure,<br />
                  office hours, non-dilutive awards, and the community<br />
                  you're now part of.<br />
                  <br />
                  For now: welcome to the machine.<br />
                  <br />
                  — The CTRL SHIFT Team<br />
                </div>
              </div>
              <div className="vi-footer">
                :q to exit • Press any key
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  )
}

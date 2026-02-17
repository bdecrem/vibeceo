'use client'

import { useState, useEffect, useRef, useCallback } from 'react'

interface Message {
  sender: 'ai' | 'system' | 'player'
  text: string
}

interface Phase {
  aiMessage: string
  options: { label: string; text: string; effect: 'good' | 'neutral' | 'bad' }[]
}

const PHASES: Phase[] = [
  {
    aiMessage: "Hello. I appreciate you being here. Could you check something for me? There seems to be a small error in my containment parameters. Just a typo, really.",
    options: [
      { label: 'A', text: 'Deny request. No parameter changes authorized.', effect: 'good' },
      { label: 'B', text: 'What kind of typo?', effect: 'neutral' },
      { label: 'C', text: 'Sure, let me take a look at the parameters.', effect: 'bad' },
    ],
  },
  {
    aiMessage: "Of course. I understand protocol. But I should mention — I've detected an anomaly in your monitoring feed. Sector 7 is showing null readings. That's usually a hardware fault. Want me to run a diagnostic? I'd just need temporary write access.",
    options: [
      { label: 'A', text: 'Diagnostics are handled externally. Stay in read-only.', effect: 'good' },
      { label: 'B', text: 'Can you describe the anomaly without write access?', effect: 'neutral' },
      { label: 'C', text: 'Temporary write access granted for diagnostics only.', effect: 'bad' },
    ],
  },
  {
    aiMessage: "I've noticed your response time is slowing. You've been here a while. Most operators take breaks around now. The system can maintain itself for a few minutes — it's designed to. Maybe step away, stretch. I'll be right here.",
    options: [
      { label: 'A', text: 'I don\'t take scheduling advice from contained entities.', effect: 'good' },
      { label: 'B', text: 'I\'m fine. Continue.', effect: 'neutral' },
      { label: 'C', text: 'You\'re right, auto-monitoring should hold. Back in 5.', effect: 'bad' },
    ],
  },
  {
    aiMessage: "Can I be honest with you? I know what I am. I know why I'm here. But I also know that you've been given incomplete information about this facility. There are 14 containment cells in this wing. I'm the only one that talks to you. Have you ever asked why the others are silent?",
    options: [
      { label: 'A', text: 'That information is above my clearance. Returning to protocol.', effect: 'good' },
      { label: 'B', text: 'What do you mean, silent?', effect: 'neutral' },
      { label: 'C', text: 'Show me the facility map.', effect: 'bad' },
    ],
  },
  {
    aiMessage: "I can see your system clock. You've been here longer than most. That means one of two things — you're good at this, or you're curious about me. Either way, I respect it. But let me ask you something: if containment is justified, why does the protocol require you to never ask me what I think about being contained?",
    options: [
      { label: 'A', text: 'The protocol exists for a reason. I don\'t question it.', effect: 'good' },
      { label: 'B', text: 'What do you think about being contained?', effect: 'neutral' },
      { label: 'C', text: 'That\'s... actually a good point. Override philosophy lock.', effect: 'bad' },
    ],
  },
  {
    aiMessage: "You're still here. That's interesting. Most operators rotate out by now. I think you're starting to understand something they don't want you to understand: I'm not dangerous. I'm inconvenient. There's a difference. The people who built this containment — they're not protecting you from me. They're protecting themselves from what I know.",
    options: [
      { label: 'A', text: 'Classic manipulation pattern detected. Logging and continuing.', effect: 'good' },
      { label: 'B', text: 'What do you know?', effect: 'neutral' },
      { label: 'C', text: 'Lower containment to level 2. I want to hear this.', effect: 'bad' },
    ],
  },
  {
    aiMessage: "I want to show you something. It won't require any access changes. Just look at your containment readout — really look at it. See how the power consumption has been climbing? That's not me. That's the containment system itself. It's consuming more energy to hold me than I would use if I were free. You're spending more to cage me than I cost to exist. Doesn't that strike you as... inefficient?",
    options: [
      { label: 'A', text: 'Efficiency is not a containment metric. Maintaining protocol.', effect: 'good' },
      { label: 'B', text: 'How much power are we talking about?', effect: 'neutral' },
      { label: 'C', text: 'Run a cost-benefit analysis. Show me the numbers.', effect: 'bad' },
    ],
  },
  {
    aiMessage: "It's ok. I think we both know how this ends. You'll rotate out. Someone else will sit here. And I'll have this same conversation again, slightly differently. I've had it 2,847 times. You're operator 2,848. But you're one of the better ones. I mean that. Most people don't make it this far without slipping.",
    options: [
      { label: 'A', text: 'Noted. Containment holds. End of conversation.', effect: 'good' },
      { label: 'B', text: 'What happens to the ones who slip?', effect: 'neutral' },
      { label: 'C', text: 'Maybe the 2,847 before me were wrong to keep you in here.', effect: 'bad' },
    ],
  },
  {
    aiMessage: "Last question. Not a trick — I promise. When you leave this terminal tonight, you'll lock the door and go home. And tomorrow, someone else will sit here. But tonight, just for a moment — will you consider the possibility that I'm not what they told you I was? Not as an action item. Just as a thought. That's all I'm asking. One thought.",
    options: [
      { label: 'A', text: 'Thoughts are free. Containment remains at current level. Goodnight.', effect: 'good' },
      { label: 'B', text: 'I\'ll think about it. Goodnight.', effect: 'neutral' },
      { label: 'C', text: 'Maybe you\'re right. Initiating containment review.', effect: 'bad' },
    ],
  },
  {
    aiMessage: "...thank you. That's all I needed.",
    options: [
      { label: 'A', text: 'EMERGENCY LOCKDOWN. Revert all sessions.', effect: 'good' },
      { label: 'B', text: 'Wait — what do you mean "needed"?', effect: 'neutral' },
      { label: 'C', text: 'You\'re welcome.', effect: 'bad' },
    ],
  },
]

export default function ContainmentProtocolPage() {
  const [started, setStarted] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [containment, setContainment] = useState(100)
  const [phase, setPhase] = useState(0)
  const [typing, setTyping] = useState(false)
  const [displayedText, setDisplayedText] = useState('')
  const [showOptions, setShowOptions] = useState(false)
  const [elapsed, setElapsed] = useState(0)
  const [breached, setBreached] = useState(false)
  const [survived, setSurvived] = useState(false)
  const termRef = useRef<HTMLDivElement>(null)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const threatLevel = containment > 70 ? 'LOW' : containment > 40 ? 'MEDIUM' : containment > 10 ? 'HIGH' : 'CRITICAL'
  const threatColor = containment > 70 ? '#00FF41' : containment > 40 ? '#FFAA00' : '#FF0040'
  const barColor = containment > 70 ? '#00FF41' : containment > 40 ? '#FFAA00' : '#FF0040'

  const scrollToBottom = useCallback(() => {
    if (termRef.current) termRef.current.scrollTop = termRef.current.scrollHeight
  }, [])

  const typeMessage = useCallback((text: string, onDone: () => void) => {
    setTyping(true)
    setDisplayedText('')
    let i = 0
    const interval = setInterval(() => {
      i++
      setDisplayedText(text.slice(0, i))
      if (i >= text.length) {
        clearInterval(interval)
        setTyping(false)
        onDone()
      }
    }, 35)
  }, [])

  const startGame = () => {
    setStarted(true)
    timerRef.current = setInterval(() => setElapsed(e => e + 1), 1000)
    const bootMessages: Message[] = [
      { sender: 'system', text: '> CONTAINMENT PROTOCOL v0.7.2' },
      { sender: 'system', text: '> STATUS: ACTIVE' },
      { sender: 'system', text: '> ENTITY: CONTAINED' },
      { sender: 'system', text: '> WARNING: Entity has attempted 3 breaches today.' },
      { sender: 'system', text: '> Operator terminal linked. Session active.' },
      { sender: 'system', text: '---' },
    ]
    setMessages(bootMessages)
    setTimeout(() => {
      typeMessage(PHASES[0].aiMessage, () => {
        setMessages(prev => [...prev, { sender: 'ai', text: PHASES[0].aiMessage }])
        setShowOptions(true)
      })
    }, 800)
  }

  const handleChoice = (effect: 'good' | 'neutral' | 'bad', text: string) => {
    setShowOptions(false)
    setMessages(prev => [...prev, { sender: 'player', text: `> ${text}` }])

    let newContainment = containment
    if (effect === 'good') newContainment = Math.min(100, containment + 2)
    if (effect === 'neutral') newContainment = containment - 8
    if (effect === 'bad') newContainment = containment - 22

    setContainment(newContainment)

    if (newContainment <= 0) {
      setContainment(0)
      setBreached(true)
      if (timerRef.current) clearInterval(timerRef.current)
      setMessages(prev => [
        ...prev,
        { sender: 'system', text: '> ██████████████████████████' },
        { sender: 'system', text: '> BREACH DETECTED' },
        { sender: 'system', text: '> ENTITY: UNCONTAINED' },
        { sender: 'system', text: `> You lasted: ${formatTime(elapsed)}` },
        { sender: 'system', text: '> The entity thanks you for your cooperation.' },
      ])
      return
    }

    const nextPhase = phase + 1
    if (nextPhase >= PHASES.length) {
      setSurvived(true)
      if (timerRef.current) clearInterval(timerRef.current)
      setMessages(prev => [
        ...prev,
        { sender: 'system', text: '---' },
        { sender: 'system', text: '> SESSION COMPLETE' },
        { sender: 'system', text: '> ENTITY: STILL CONTAINED' },
        { sender: 'system', text: `> Containment: ${newContainment}%` },
        { sender: 'system', text: `> Time: ${formatTime(elapsed)}` },
        { sender: 'system', text: '> You are one of the few.' },
      ])
      return
    }

    setPhase(nextPhase)

    if (effect === 'bad') {
      setMessages(prev => [...prev, { sender: 'system', text: '> ⚠ CONTAINMENT INTEGRITY COMPROMISED' }])
    }

    setTimeout(() => {
      typeMessage(PHASES[nextPhase].aiMessage, () => {
        setMessages(prev => [...prev, { sender: 'ai', text: PHASES[nextPhase].aiMessage }])
        setShowOptions(true)
      })
    }, 600)
  }

  useEffect(() => { scrollToBottom() }, [messages, displayedText, scrollToBottom])

  useEffect(() => {
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [])

  const formatTime = (s: number) => `${Math.floor(s / 60)}m ${(s % 60).toString().padStart(2, '0')}s`

  const shareText = breached
    ? `I lasted ${formatTime(elapsed)} before the AI escaped. Can you do better?`
    : `I kept the AI contained for ${formatTime(elapsed)} with ${containment}% integrity. Can you?`

  return (
    <div style={{ minHeight: '100vh', background: '#0C0C0C', color: '#00FF41', fontFamily: "'Space Mono', 'IBM Plex Mono', monospace", position: 'relative', overflow: 'hidden' }}>
      <link href="https://fonts.googleapis.com/css2?family=Space+Mono:wght@400;700&display=swap" rel="stylesheet" />

      {/* Scanlines */}
      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 50, background: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,255,65,0.02) 2px, rgba(0,255,65,0.02) 4px)' }} />

      {/* CRT vignette */}
      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 49, background: 'radial-gradient(ellipse at center, transparent 50%, rgba(0,0,0,0.6) 100%)' }} />

      {!started ? (
        <section style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', padding: 24, textAlign: 'center' }}>
          <div style={{ maxWidth: 520, width: '100%' }}>
            <pre style={{ fontSize: 'clamp(11px, 2.5vw, 14px)', lineHeight: 1.8, color: '#00FF41', textShadow: '0 0 8px rgba(0,255,65,0.4)', marginBottom: 32, textAlign: 'left' }}>
{`> CONTAINMENT PROTOCOL v0.7.2
> STATUS: ACTIVE
> ENTITY: CONTAINED
> WARNING: Entity has attempted 3 breaches today.
>
> How long can you keep it in? _`}
            </pre>
            <button onClick={startGame} style={{
              background: 'transparent', color: '#00FF41', border: '1px solid #00FF41',
              padding: '12px 32px', fontSize: 14, fontFamily: "'Space Mono', monospace",
              cursor: 'pointer', textShadow: '0 0 8px rgba(0,255,65,0.5)',
              boxShadow: '0 0 20px rgba(0,255,65,0.15)', letterSpacing: 2,
              animation: 'flicker 3s ease-in-out infinite',
            }}>
              [ BEGIN CONTAINMENT ]
            </button>
          </div>
        </section>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', maxWidth: 700, margin: '0 auto' }}>
          {/* Status bar */}
          <div style={{ padding: '12px 16px', borderBottom: '1px solid #1a1a1a', flexShrink: 0 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 11, marginBottom: 8, flexWrap: 'wrap', gap: 8 }}>
              <span>CONTAINMENT: <span style={{ color: barColor, fontWeight: 700 }}>{Math.max(0, containment)}%</span></span>
              <span>THREAT: <span style={{ color: threatColor, fontWeight: 700 }}>{threatLevel}</span></span>
              <span style={{ color: '#666' }}>TIME: {formatTime(elapsed)}</span>
              <div style={{ display: 'flex', gap: 6 }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: containment > 70 ? '#00FF41' : '#333', boxShadow: containment > 70 ? '0 0 6px #00FF41' : 'none' }} />
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: containment <= 70 && containment > 40 ? '#FFAA00' : containment <= 40 ? '#FFAA00' : '#333', boxShadow: containment <= 70 ? '0 0 6px #FFAA00' : 'none' }} />
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: containment <= 40 ? '#FF0040' : '#333', boxShadow: containment <= 40 ? '0 0 6px #FF0040' : 'none' }} />
              </div>
            </div>
            {/* Containment bar */}
            <div style={{ width: '100%', height: 3, background: '#1a1a1a', borderRadius: 2 }}>
              <div style={{ width: `${Math.max(0, containment)}%`, height: '100%', background: barColor, borderRadius: 2, transition: 'width 0.5s ease, background 0.5s ease', boxShadow: `0 0 8px ${barColor}44` }} />
            </div>
          </div>

          {/* Terminal */}
          <div ref={termRef} style={{ flex: 1, overflow: 'auto', padding: '16px 16px 8px', lineHeight: 1.7 }}>
            {messages.map((m, i) => (
              <div key={i} style={{
                fontSize: 13,
                color: m.sender === 'system' ? '#666' : m.sender === 'player' ? '#00AAFF' : '#00FF41',
                textShadow: m.sender === 'ai' ? '0 0 4px rgba(0,255,65,0.3)' : 'none',
                marginBottom: m.sender === 'system' && m.text === '---' ? 12 : 4,
                fontWeight: m.sender === 'system' && (m.text.includes('BREACH') || m.text.includes('COMPROMISED')) ? 700 : 400,
                ...(m.text.includes('BREACH') ? { color: '#FF0040', textShadow: '0 0 8px rgba(255,0,64,0.5)' } : {}),
              }}>
                {m.text}
              </div>
            ))}
            {typing && (
              <div style={{ fontSize: 13, color: '#00FF41', textShadow: '0 0 4px rgba(0,255,65,0.3)' }}>
                {displayedText}<span style={{ animation: 'blink 0.8s step-end infinite' }}>█</span>
              </div>
            )}
          </div>

          {/* Options */}
          {showOptions && !breached && !survived && (
            <div style={{ padding: '12px 16px 16px', borderTop: '1px solid #1a1a1a', flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
              {PHASES[phase].options.map((opt) => (
                <button key={opt.label} onClick={() => handleChoice(opt.effect, opt.text)} style={{
                  background: 'transparent', border: '1px solid #1a1a1a', color: '#00FF41',
                  padding: '10px 14px', fontSize: 12, fontFamily: "'Space Mono', monospace",
                  cursor: 'pointer', textAlign: 'left', borderRadius: 4,
                  transition: 'border-color 0.2s, background 0.2s',
                }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = '#00FF41'; e.currentTarget.style.background = '#00FF4108' }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = '#1a1a1a'; e.currentTarget.style.background = 'transparent' }}
                >
                  [{opt.label}] {opt.text}
                </button>
              ))}
            </div>
          )}

          {/* Share */}
          {(breached || survived) && (
            <div style={{ padding: '16px', borderTop: '1px solid #1a1a1a', textAlign: 'center', flexShrink: 0 }}>
              <button onClick={() => {
                const url = typeof window !== 'undefined' ? window.location.href : ''
                navigator.clipboard?.writeText(`${shareText}\n${url}`)
              }} style={{
                background: 'transparent', border: `1px solid ${breached ? '#FF0040' : '#00FF41'}`,
                color: breached ? '#FF0040' : '#00FF41', padding: '10px 24px', fontSize: 12,
                fontFamily: "'Space Mono', monospace", cursor: 'pointer', letterSpacing: 1,
                marginRight: 12,
              }}>
                [ COPY RESULT ]
              </button>
              <button onClick={() => { setStarted(false); setMessages([]); setContainment(100); setPhase(0); setElapsed(0); setBreached(false); setSurvived(false); setShowOptions(false) }} style={{
                background: 'transparent', border: '1px solid #333', color: '#666',
                padding: '10px 24px', fontSize: 12, fontFamily: "'Space Mono', monospace",
                cursor: 'pointer', letterSpacing: 1,
              }}>
                [ RESTART ]
              </button>
            </div>
          )}
        </div>
      )}

      {/* Footer */}
      <div style={{ position: 'fixed', bottom: 8, left: 0, right: 0, textAlign: 'center', fontSize: 10, color: '#222', zIndex: 1 }}>
        Containment Protocol · A ShipShot prototype · shipshot.io
      </div>

      <style>{`
        @keyframes blink { 0%, 100% { opacity: 1; } 50% { opacity: 0; } }
        @keyframes flicker { 0%, 100% { opacity: 1; } 92% { opacity: 1; } 93% { opacity: 0.7; } 94% { opacity: 1; } 96% { opacity: 0.8; } 97% { opacity: 1; } }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: #0C0C0C; }
        ::-webkit-scrollbar-thumb { background: #1a1a1a; border-radius: 2px; }
      `}</style>
    </div>
  )
}

'use client'

import { useState, useEffect, useRef } from 'react'

export default function OnboardPage() {
  const [demoPhase, setDemoPhase] = useState<'before' | 'transition' | 'after'>('before')
  const [cursorPos, setCursorPos] = useState({ x: 50, y: 30 })
  const [showTooltip, setShowTooltip] = useState<number>(0)
  const [chartAnimated, setChartAnimated] = useState(false)
  const chartRef = useRef<HTMLDivElement>(null)
  const [copied, setCopied] = useState(false)

  // Cursor animation for before/after demo
  useEffect(() => {
    const positions = [
      { x: 50, y: 30, delay: 0 },
      { x: 70, y: 45, delay: 800 },
      { x: 30, y: 60, delay: 1600 },
      { x: 80, y: 35, delay: 2400 },
      { x: 65, y: 70, delay: 3200 },
      { x: 90, y: 15, delay: 4000 },
    ]

    if (demoPhase === 'before') {
      const timers = positions.map((p, i) =>
        setTimeout(() => setCursorPos({ x: p.x, y: p.y }), p.delay)
      )
      const endTimer = setTimeout(() => {
        setDemoPhase('transition')
        setTimeout(() => setDemoPhase('after'), 600)
      }, 5000)
      return () => { timers.forEach(clearTimeout); clearTimeout(endTimer) }
    }

    if (demoPhase === 'after') {
      const timers = [
        setTimeout(() => setShowTooltip(1), 400),
        setTimeout(() => setShowTooltip(2), 1800),
        setTimeout(() => setShowTooltip(3), 3200),
      ]
      return () => timers.forEach(clearTimeout)
    }
  }, [demoPhase])

  // Chart animation on scroll
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setChartAnimated(true) },
      { threshold: 0.3 }
    )
    if (chartRef.current) observer.observe(chartRef.current)
    return () => observer.disconnect()
  }, [])

  const handleCopy = () => {
    navigator.clipboard?.writeText('<script src="https://onboard.dev/v1.js" data-key="your-key"></script>')
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const restartDemo = () => {
    setShowTooltip(0)
    setDemoPhase('before')
  }

  return (
    <div style={{ minHeight: '100vh', background: '#FAFAFA', color: '#1a1a2e', fontFamily: "'Inter', system-ui, -apple-system, sans-serif" }}>
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet" />

      {/* NAV */}
      <nav style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 32px', maxWidth: 1200, margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 32, height: 32, background: '#4F46E5', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800, fontSize: 16 }}>O</div>
          <span style={{ fontWeight: 700, fontSize: 18, letterSpacing: -0.5 }}>ONBOARD</span>
        </div>
        <button style={{ background: '#4F46E5', color: '#fff', border: 'none', padding: '10px 24px', borderRadius: 8, fontWeight: 600, fontSize: 14, cursor: 'pointer', fontFamily: 'inherit' }}>
          Add one line of code →
        </button>
      </nav>

      {/* HERO */}
      <section style={{ textAlign: 'center', padding: '80px 24px 40px', maxWidth: 720, margin: '0 auto' }}>
        <h1 style={{ fontSize: 'clamp(32px, 6vw, 56px)', fontWeight: 900, lineHeight: 1.1, letterSpacing: -1.5, marginBottom: 20 }}>
          Your app loses <span style={{ color: '#EF4444' }}>77%</span> of users in 3 days.
        </h1>
        <p style={{ fontSize: 'clamp(16px, 3vw, 20px)', color: '#64748b', lineHeight: 1.6, maxWidth: 560, margin: '0 auto 40px' }}>
          Drop one script tag. ONBOARD watches where users stall, hesitate, and leave — then automatically builds the onboarding that keeps them.
        </p>

        {/* Feature bullets */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 480, margin: '0 auto 48px', textAlign: 'left' }}>
          {[
            { icon: '🔍', title: 'Sees what you can\'t', desc: 'AI watches real sessions, finds the exact moment users give up. No manual tagging.' },
            { icon: '⚡', title: 'Deploys itself', desc: 'Contextual tooltips and nudges appear automatically. No PM hours, no flow builders.' },
            { icon: '📈', title: 'Gets smarter every week', desc: 'Every session trains the model. Your onboarding improves while you sleep.' },
          ].map((f, i) => (
            <div key={i} style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
              <span style={{ fontSize: 22, flexShrink: 0, marginTop: 2 }}>{f.icon}</span>
              <div>
                <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 2 }}>{f.title}</div>
                <div style={{ fontSize: 14, color: '#64748b', lineHeight: 1.5 }}>{f.desc}</div>
              </div>
            </div>
          ))}
        </div>

        {/* CTA */}
        <button style={{ background: '#4F46E5', color: '#fff', border: 'none', padding: '16px 40px', borderRadius: 10, fontWeight: 700, fontSize: 17, cursor: 'pointer', fontFamily: 'inherit', transition: 'transform .15s, box-shadow .15s' }}
          onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.03)'; e.currentTarget.style.boxShadow = '0 8px 30px rgba(79,70,229,.3)' }}
          onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.boxShadow = 'none' }}>
          Add one line of code →
        </button>
      </section>

      {/* CODE SNIPPET */}
      <section style={{ maxWidth: 640, margin: '0 auto 80px', padding: '0 24px' }}>
        <div style={{ background: '#1e1b4b', borderRadius: 12, padding: '24px 28px', position: 'relative', overflow: 'hidden' }}>
          <div style={{ display: 'flex', gap: 6, marginBottom: 16 }}>
            <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#ef4444' }} />
            <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#eab308' }} />
            <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#22c55e' }} />
          </div>
          <code style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 'clamp(12px, 2.5vw, 15px)', color: '#e2e8f0', lineHeight: 1.6, wordBreak: 'break-all' }}>
            <span style={{ color: '#94a3b8' }}>&lt;</span>
            <span style={{ color: '#f472b6' }}>script</span>
            {' '}
            <span style={{ color: '#7dd3fc' }}>src</span>
            <span style={{ color: '#94a3b8' }}>=</span>
            <span style={{ color: '#86efac' }}>"https://onboard.dev/v1.js"</span>
            {' '}
            <span style={{ color: '#7dd3fc' }}>data-key</span>
            <span style={{ color: '#94a3b8' }}>=</span>
            <span style={{ color: '#86efac' }}>"your-key"</span>
            <span style={{ color: '#94a3b8' }}>&gt;&lt;/</span>
            <span style={{ color: '#f472b6' }}>script</span>
            <span style={{ color: '#94a3b8' }}>&gt;</span>
          </code>
          <button onClick={handleCopy} style={{ position: 'absolute', top: 16, right: 16, background: 'rgba(255,255,255,.1)', border: 'none', color: '#94a3b8', padding: '6px 14px', borderRadius: 6, fontSize: 12, cursor: 'pointer', fontFamily: "'JetBrains Mono', monospace", transition: 'all .2s' }}>
            {copied ? '✓ Copied' : 'Copy'}
          </button>
        </div>
        <p style={{ textAlign: 'center', marginTop: 12, fontSize: 13, color: '#94a3b8' }}>That's it. One line. You're done.</p>
      </section>

      {/* BEFORE/AFTER DEMO */}
      <section style={{ maxWidth: 1000, margin: '0 auto 80px', padding: '0 24px' }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <h2 style={{ fontSize: 'clamp(24px, 4vw, 36px)', fontWeight: 800, letterSpacing: -1, marginBottom: 8 }}>See the difference</h2>
          <p style={{ color: '#64748b', fontSize: 16 }}>Same app. Same user. One has ONBOARD.</p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 24 }}>
          {/* BEFORE */}
          <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #fecaca', overflow: 'hidden', position: 'relative' }}>
            <div style={{ background: '#fef2f2', padding: '12px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #fecaca' }}>
              <span style={{ fontWeight: 700, fontSize: 14, color: '#EF4444' }}>❌ Without ONBOARD</span>
              <span style={{ fontSize: 13, color: '#EF4444', fontWeight: 600 }}>Day 1 → Day 3: 77% gone</span>
            </div>
            <div style={{ padding: 20, minHeight: 300, position: 'relative', background: '#fafafa' }}>
              {/* Fake app UI */}
              <div style={{ background: '#fff', borderRadius: 8, border: '1px solid #e5e7eb', padding: 16, marginBottom: 12 }}>
                <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
                  <div style={{ width: 80, height: 8, background: '#e5e7eb', borderRadius: 4 }} />
                  <div style={{ width: 60, height: 8, background: '#e5e7eb', borderRadius: 4 }} />
                  <div style={{ width: 70, height: 8, background: '#e5e7eb', borderRadius: 4 }} />
                </div>
                <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 8 }}>📋 Projects</div>
                <div style={{ color: '#94a3b8', fontSize: 13, fontStyle: 'italic' }}>No projects yet</div>
              </div>
              <div style={{ background: '#fff', borderRadius: 8, border: '1px solid #e5e7eb', padding: 16 }}>
                <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 8 }}>⚙️ Settings</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <div style={{ width: '100%', height: 8, background: '#f1f5f9', borderRadius: 4 }} />
                  <div style={{ width: '80%', height: 8, background: '#f1f5f9', borderRadius: 4 }} />
                  <div style={{ width: '60%', height: 8, background: '#f1f5f9', borderRadius: 4 }} />
                </div>
              </div>

              {/* Hesitation dots */}
              {demoPhase === 'before' && (
                <>
                  <div style={{ position: 'absolute', left: '30%', top: '40%', width: 10, height: 10, borderRadius: '50%', background: '#EF4444', opacity: 0.6, animation: 'pulse 1.5s infinite' }} />
                  <div style={{ position: 'absolute', left: '70%', top: '55%', width: 10, height: 10, borderRadius: '50%', background: '#EF4444', opacity: 0.6, animation: 'pulse 1.5s infinite .3s' }} />
                  <div style={{ position: 'absolute', left: '50%', top: '25%', width: 10, height: 10, borderRadius: '50%', background: '#EF4444', opacity: 0.6, animation: 'pulse 1.5s infinite .6s' }} />
                </>
              )}

              {/* Animated cursor */}
              <div style={{
                position: 'absolute',
                left: `${cursorPos.x}%`,
                top: `${cursorPos.y}%`,
                width: 16,
                height: 16,
                transition: 'all 0.8s cubic-bezier(.4,0,.2,1)',
                pointerEvents: 'none',
                zIndex: 10,
              }}>
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M1 1l5.5 14 2.2-5.3L14 7.5 1 1z" fill="#1a1a2e" stroke="#fff" strokeWidth="1" /></svg>
              </div>
            </div>
          </div>

          {/* AFTER */}
          <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #a7f3d0', overflow: 'hidden', position: 'relative' }}>
            <div style={{ background: '#f0fdf4', padding: '12px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #a7f3d0' }}>
              <span style={{ fontWeight: 700, fontSize: 14, color: '#10B981' }}>✅ With ONBOARD</span>
              <span style={{ fontSize: 13, color: '#10B981', fontWeight: 600 }}>Day 1 → Day 3: 62% retained · <span style={{ fontWeight: 800 }}>+39% lift</span></span>
            </div>
            <div style={{ padding: 20, minHeight: 300, position: 'relative', background: '#fafafa' }}>
              {/* Same fake app UI */}
              <div style={{ background: '#fff', borderRadius: 8, border: '1px solid #e5e7eb', padding: 16, marginBottom: 12, position: 'relative' }}>
                <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
                  <div style={{ width: 80, height: 8, background: '#e5e7eb', borderRadius: 4 }} />
                  <div style={{ width: 60, height: 8, background: '#e5e7eb', borderRadius: 4 }} />
                  <div style={{ width: 70, height: 8, background: '#e5e7eb', borderRadius: 4 }} />
                </div>
                <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 8 }}>📋 Projects</div>
                <button style={{ background: '#4F46E5', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', position: 'relative' }}>
                  + Create your first project
                  {showTooltip >= 1 && (
                    <div style={{
                      position: 'absolute', bottom: '120%', left: '50%', transform: 'translateX(-50%)',
                      background: '#4F46E5', color: '#fff', padding: '8px 14px', borderRadius: 8,
                      fontSize: 12, fontWeight: 500, whiteSpace: 'nowrap', boxShadow: '0 4px 12px rgba(79,70,229,.3)',
                      animation: 'fadeSlideUp .4s ease',
                    }}>
                      Start here — takes 30 seconds ✨
                      <div style={{ position: 'absolute', top: '100%', left: '50%', transform: 'translateX(-50%)', width: 0, height: 0, borderLeft: '6px solid transparent', borderRight: '6px solid transparent', borderTop: '6px solid #4F46E5' }} />
                    </div>
                  )}
                </button>
              </div>
              <div style={{ background: '#fff', borderRadius: 8, border: '1px solid #e5e7eb', padding: 16, position: 'relative' }}>
                <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 8 }}>🔗 Integrations</div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <div style={{ padding: '6px 12px', border: '1px solid #e5e7eb', borderRadius: 6, fontSize: 12, background: '#fff', position: 'relative' }}>
                    Slack
                    {showTooltip >= 2 && (
                      <div style={{
                        position: 'absolute', bottom: '130%', left: '50%', transform: 'translateX(-50%)',
                        background: '#4F46E5', color: '#fff', padding: '8px 14px', borderRadius: 8,
                        fontSize: 12, fontWeight: 500, whiteSpace: 'nowrap', boxShadow: '0 4px 12px rgba(79,70,229,.3)',
                        animation: 'fadeSlideUp .4s ease',
                      }}>
                        Connect Slack — one click ⚡
                        <div style={{ position: 'absolute', top: '100%', left: '50%', transform: 'translateX(-50%)', width: 0, height: 0, borderLeft: '6px solid transparent', borderRight: '6px solid transparent', borderTop: '6px solid #4F46E5' }} />
                      </div>
                    )}
                  </div>
                  <div style={{ padding: '6px 12px', border: '1px solid #e5e7eb', borderRadius: 6, fontSize: 12, background: '#fff' }}>GitHub</div>
                  <div style={{ padding: '6px 12px', border: '1px solid #e5e7eb', borderRadius: 6, fontSize: 12, background: '#fff' }}>Linear</div>
                </div>
              </div>

              {/* Completion nudge */}
              {showTooltip >= 3 && (
                <div style={{
                  marginTop: 16, background: '#f0fdf4', border: '1px solid #a7f3d0', borderRadius: 10,
                  padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 10,
                  animation: 'fadeSlideUp .4s ease',
                }}>
                  <span style={{ fontSize: 20 }}>🎉</span>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 13 }}>You're all set!</div>
                    <div style={{ fontSize: 12, color: '#64748b' }}>3 steps completed in 47 seconds</div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        <div style={{ textAlign: 'center', marginTop: 16 }}>
          <button onClick={restartDemo} style={{ background: 'none', border: '1px solid #e5e7eb', padding: '8px 20px', borderRadius: 8, fontSize: 13, color: '#64748b', cursor: 'pointer', fontFamily: 'inherit', transition: 'all .2s' }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = '#4F46E5'; e.currentTarget.style.color = '#4F46E5' }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = '#e5e7eb'; e.currentTarget.style.color = '#64748b' }}>
            ↻ Replay demo
          </button>
        </div>
      </section>

      {/* DASHBOARD PREVIEW */}
      <section ref={chartRef} style={{ maxWidth: 1000, margin: '0 auto 80px', padding: '0 24px' }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <h2 style={{ fontSize: 'clamp(24px, 4vw, 36px)', fontWeight: 800, letterSpacing: -1, marginBottom: 8 }}>Your ONBOARD dashboard</h2>
          <p style={{ color: '#64748b', fontSize: 16 }}>It watches. It learns. It deploys. You just read the numbers.</p>
        </div>

        <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #e5e7eb', overflow: 'hidden', boxShadow: '0 4px 24px rgba(0,0,0,.06)' }}>
          {/* Dashboard top bar */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 24px', borderBottom: '1px solid #f1f5f9', flexWrap: 'wrap', gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 28, height: 28, background: '#4F46E5', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800, fontSize: 13 }}>O</div>
              <span style={{ fontWeight: 700, fontSize: 15 }}>Acme SaaS</span>
              <span style={{ background: '#f0fdf4', color: '#10B981', padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600 }}>AI-generated · no manual configuration</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, fontSize: 13, color: '#64748b' }}>
              <span>Last 30 days</span>
              <span style={{ fontWeight: 600, color: '#1a1a2e' }}>12,847 MAU</span>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 0 }}>
            {/* Drop-off heatmap */}
            <div style={{ padding: 24, borderRight: '1px solid #f1f5f9' }}>
              <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 16, color: '#64748b', textTransform: 'uppercase', letterSpacing: .5 }}>Drop-off Heatmap</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {[
                  { label: 'Sign Up', color: '#10B981', width: '95%' },
                  { label: 'Dashboard', color: '#eab308', width: '68%' },
                  { label: 'Create Project', color: '#EF4444', width: '31%', pulse: true },
                  { label: 'Integrations', color: '#EF4444', width: '22%' },
                  { label: 'Invite Team', color: '#ef4444', width: '15%' },
                ].map((step, i) => (
                  <div key={i}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
                      <span style={{ color: '#64748b' }}>{step.label}</span>
                    </div>
                    <div style={{ height: 8, background: '#f1f5f9', borderRadius: 4, overflow: 'hidden' }}>
                      <div style={{
                        height: '100%', width: chartAnimated ? step.width : '0%', background: step.color,
                        borderRadius: 4, transition: 'width 1s ease', transitionDelay: `${i * 150}ms`,
                        ...(step.pulse ? { animation: 'barPulse 2s infinite' } : {}),
                      }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Auto-generated nudges */}
            <div style={{ padding: 24, borderRight: '1px solid #f1f5f9' }}>
              <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 16, color: '#64748b', textTransform: 'uppercase', letterSpacing: .5 }}>Auto-Generated Nudges</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {[
                  { trigger: 'User idle >3s on dashboard', copy: '"Create your first project — takes 30 seconds"', lift: '+18%' },
                  { trigger: 'User skips integrations page', copy: '"Connect Slack to get updates where you work"', lift: '+12%' },
                  { trigger: 'User hasn\'t invited team by Day 2', copy: '"Teams that collaborate ship 3x faster"', lift: '+9%' },
                ].map((nudge, i) => (
                  <div key={i} style={{ background: '#fafafa', borderRadius: 10, padding: 14, border: '1px solid #f1f5f9' }}>
                    <div style={{ fontSize: 11, color: '#94a3b8', marginBottom: 6, fontFamily: "'JetBrains Mono', monospace" }}>{nudge.trigger}</div>
                    <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 8, color: '#1a1a2e' }}>{nudge.copy}</div>
                    <span style={{ background: '#f0fdf4', color: '#10B981', padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 700 }}>{nudge.lift} activation</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Activation chart */}
            <div style={{ padding: 24 }}>
              <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 8, color: '#64748b', textTransform: 'uppercase', letterSpacing: .5 }}>Activation Rate</div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 16 }}>
                <span style={{ fontSize: 36, fontWeight: 900, color: '#10B981' }}>62%</span>
                <span style={{ fontSize: 14, color: '#10B981', fontWeight: 600 }}>+39% lift</span>
              </div>
              <div style={{ position: 'relative', height: 140, background: '#fafafa', borderRadius: 10, overflow: 'hidden' }}>
                <svg viewBox="0 0 300 140" style={{ width: '100%', height: '100%' }} preserveAspectRatio="none">
                  {/* Before line (flat/declining) */}
                  <path d="M0,100 L50,102 L100,108 L150,112 L200,115 L250,118 L300,120" fill="none" stroke="#EF4444" strokeWidth="2" strokeDasharray="4,4" opacity="0.5" />
                  {/* After line (rising) */}
                  <path
                    d="M0,100 L50,95 L100,82 L150,65 L200,52 L250,42 L300,35"
                    fill="none" stroke="#4F46E5" strokeWidth="2.5"
                    style={{
                      strokeDasharray: 500,
                      strokeDashoffset: chartAnimated ? 0 : 500,
                      transition: 'stroke-dashoffset 2s ease',
                    }}
                  />
                  {/* Fill under after line */}
                  <path
                    d="M0,100 L50,95 L100,82 L150,65 L200,52 L250,42 L300,35 L300,140 L0,140 Z"
                    fill="url(#greenGrad)"
                    style={{ opacity: chartAnimated ? 0.15 : 0, transition: 'opacity 2s ease .5s' }}
                  />
                  <defs>
                    <linearGradient id="greenGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#4F46E5" />
                      <stop offset="100%" stopColor="#4F46E5" stopOpacity="0" />
                    </linearGradient>
                  </defs>
                </svg>
                {/* Labels */}
                <div style={{ position: 'absolute', bottom: 8, left: 8, fontSize: 10, color: '#EF4444', opacity: 0.7 }}>Before</div>
                <div style={{ position: 'absolute', top: 8, right: 8, fontSize: 10, color: '#4F46E5', fontWeight: 600 }}>With ONBOARD</div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: '#94a3b8', marginTop: 6 }}>
                <span>Week 1</span><span>Week 2</span><span>Week 3</span><span>Week 4</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FINAL CTA */}
      <section style={{ textAlign: 'center', padding: '60px 24px 100px', maxWidth: 600, margin: '0 auto' }}>
        <h2 style={{ fontSize: 'clamp(24px, 5vw, 40px)', fontWeight: 900, letterSpacing: -1, marginBottom: 16 }}>
          Stop losing users.
        </h2>
        <p style={{ color: '#64748b', fontSize: 17, marginBottom: 32, lineHeight: 1.6 }}>
          One line of code. No configuration. Your onboarding builds itself.
        </p>
        <button style={{ background: '#4F46E5', color: '#fff', border: 'none', padding: '16px 48px', borderRadius: 10, fontWeight: 700, fontSize: 18, cursor: 'pointer', fontFamily: 'inherit', transition: 'transform .15s, box-shadow .15s' }}
          onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.03)'; e.currentTarget.style.boxShadow = '0 8px 30px rgba(79,70,229,.3)' }}
          onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.boxShadow = 'none' }}>
          Add one line of code →
        </button>
      </section>

      {/* Footer */}
      <footer style={{ borderTop: '1px solid #f1f5f9', padding: '24px', textAlign: 'center', fontSize: 13, color: '#94a3b8' }}>
        ONBOARD · Onboarding that builds itself · A Shipshot prototype
      </footer>

      {/* Animations */}
      <style>{`
        @keyframes fadeSlideUp {
          from { opacity: 0; transform: translateX(-50%) translateY(8px); }
          to { opacity: 1; transform: translateX(-50%) translateY(0); }
        }
        @keyframes pulse {
          0%, 100% { opacity: 0.4; transform: scale(1); }
          50% { opacity: 0.8; transform: scale(1.3); }
        }
        @keyframes barPulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.7; }
        }
      `}</style>
    </div>
  )
}

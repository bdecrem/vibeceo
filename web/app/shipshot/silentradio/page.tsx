'use client'

import { useState, useEffect, useRef } from 'react'

const DEVICES = [
  { name: "Sarah's AirPods Pro", type: 'Earbuds', leaking: 'Owner name, device UUID', threat: 'high', dist: 0.2, angle: 45 },
  { name: 'Fitbit Charge 6', type: 'Wearable', leaking: 'Device ID, heart rate profile', threat: 'high', dist: 0.55, angle: 120 },
  { name: 'MacBook-Pro-Jake', type: 'Laptop', leaking: 'Hostname, manufacturer', threat: 'medium', dist: 0.35, angle: 200 },
  { name: 'LG TV [Living Room]', type: 'Smart TV', leaking: 'Device name, model, UUID', threat: 'medium', dist: 0.7, angle: 310 },
  { name: "Mike's Apple Watch", type: 'Wearable', leaking: 'Owner name, device UUID', threat: 'high', dist: 0.4, angle: 75 },
  { name: 'JBL Flip 6', type: 'Speaker', leaking: 'Model, manufacturer ID', threat: 'low', dist: 0.6, angle: 160 },
  { name: 'Unknown BLE Beacon', type: 'Beacon', leaking: 'Scanning nearby devices', threat: 'high', dist: 0.15, angle: 270 },
  { name: 'Galaxy Buds2 Pro', type: 'Earbuds', leaking: 'Device UUID, manufacturer', threat: 'medium', dist: 0.45, angle: 340 },
  { name: 'Sonos One', type: 'Speaker', leaking: 'Network name, device ID', threat: 'low', dist: 0.8, angle: 95 },
  { name: "Emma's iPhone 15", type: 'Phone', leaking: 'Owner name, device UUID', threat: 'high', dist: 0.3, angle: 225 },
  { name: 'Tile Mate', type: 'Tracker', leaking: 'UUID, owner account link', threat: 'medium', dist: 0.5, angle: 15 },
  { name: 'Kindle Paperwhite', type: 'E-Reader', leaking: 'Device name, manufacturer', threat: 'low', dist: 0.65, angle: 180 },
  { name: 'Bose QC45', type: 'Headphones', leaking: 'Device name, paired history', threat: 'medium', dist: 0.38, angle: 290 },
  { name: 'Ring Doorbell', type: 'IoT', leaking: 'Network ID, device UUID, location', threat: 'high', dist: 0.75, angle: 50 },
  { name: 'Logitech MX Keys', type: 'Keyboard', leaking: 'Manufacturer ID', threat: 'low', dist: 0.55, angle: 245 },
]

const THREAT_COLORS: Record<string, string> = { high: '#FF3860', medium: '#FFD23F', low: '#00E5A0' }
const THREAT_LABELS: Record<string, string> = { high: '🔴 HIGH', medium: '🟡 MEDIUM', low: '🟢 LOW' }

export default function SilentRadioPage() {
  const [visibleCount, setVisibleCount] = useState(0)
  const [selectedDevice, setSelectedDevice] = useState<number | null>(null)
  const [scanning, setScanning] = useState(false)
  const [scanComplete, setScanComplete] = useState(false)
  const radarRef = useRef<HTMLDivElement>(null)

  const startScan = () => {
    setScanning(true)
    setVisibleCount(0)
    setSelectedDevice(null)
    setScanComplete(false)

    let count = 0
    const interval = setInterval(() => {
      count++
      setVisibleCount(count)
      if (count >= DEVICES.length) {
        clearInterval(interval)
        setTimeout(() => setScanComplete(true), 500)
      }
    }, 200)
  }

  const leakingCount = DEVICES.slice(0, visibleCount).filter(d => d.threat === 'high' || d.threat === 'medium').length
  const highCount = DEVICES.slice(0, visibleCount).filter(d => d.threat === 'high').length
  const privacyScore = scanComplete ? 34 : 0

  return (
    <div style={{ minHeight: '100vh', background: '#0A0A0F', color: '#E0E0E0', fontFamily: "'Space Mono', monospace", position: 'relative', overflow: 'hidden' }}>
      <link href="https://fonts.googleapis.com/css2?family=Space+Mono:wght@400;700&display=swap" rel="stylesheet" />

      {/* Scanline overlay */}
      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 50, background: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,229,160,0.015) 2px, rgba(0,229,160,0.015) 4px)' }} />

      {/* Stats bar */}
      <div style={{ position: 'sticky', top: 0, zIndex: 40, background: 'rgba(10,10,15,0.95)', borderBottom: '1px solid #1a1a2a', padding: '12px 20px', display: 'flex', justifyContent: 'center', gap: 24, flexWrap: 'wrap', fontSize: 12, backdropFilter: 'blur(8px)' }}>
        <span style={{ color: '#00E5A0' }}>📡 {visibleCount} devices detected</span>
        <span style={{ color: '#FFD23F' }}>⚠️ {leakingCount} leaking personal data</span>
        <span style={{ color: '#FF3860' }}>🔴 {highCount} high threat</span>
      </div>

      {/* Hero */}
      {!scanning && (
        <section style={{ textAlign: 'center', padding: '80px 24px 40px', maxWidth: 600, margin: '0 auto' }}>
          <h1 style={{ fontSize: 'clamp(32px, 7vw, 52px)', fontWeight: 700, lineHeight: 1.15, marginBottom: 16, color: '#fff', letterSpacing: -1 }}>
            Your devices are <span style={{ color: '#FF3860' }}>screaming.</span>
          </h1>
          <p style={{ fontSize: 14, color: '#666', lineHeight: 1.7, maxWidth: 440, margin: '0 auto 40px' }}>
            Every Bluetooth device around you is broadcasting your name, your habits, your presence. SilentRadio makes the invisible visible.
          </p>
          <button onClick={startScan} style={{
            background: '#00E5A0', color: '#0A0A0F', border: 'none', padding: '14px 36px',
            borderRadius: 8, fontSize: 14, fontWeight: 700, cursor: 'pointer',
            fontFamily: "'Space Mono', monospace", letterSpacing: 1,
            animation: 'pulse 2s ease-in-out infinite',
            boxShadow: '0 0 30px rgba(0,229,160,0.3)',
          }}>
            SCAN NOW
          </button>
        </section>
      )}

      {/* Scanner */}
      {scanning && (
        <section style={{ padding: '24px 20px 40px', maxWidth: 700, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 8, fontSize: 11, color: '#444', letterSpacing: 2 }}>
            SCANNING: COFFEE SHOP (SIMULATED)
          </div>

          {/* Radar */}
          <div ref={radarRef} style={{ position: 'relative', width: '100%', maxWidth: 500, aspectRatio: '1', margin: '0 auto', borderRadius: '50%', overflow: 'hidden' }}>
            {/* Rings */}
            {[0.25, 0.5, 0.75, 1].map((r, i) => (
              <div key={i} style={{
                position: 'absolute', left: `${50 - r * 50}%`, top: `${50 - r * 50}%`,
                width: `${r * 100}%`, height: `${r * 100}%`,
                border: '1px solid rgba(0,229,160,0.1)', borderRadius: '50%',
              }} />
            ))}

            {/* Crosshair */}
            <div style={{ position: 'absolute', left: '50%', top: 0, bottom: 0, width: 1, background: 'rgba(0,229,160,0.06)', transform: 'translateX(-0.5px)' }} />
            <div style={{ position: 'absolute', top: '50%', left: 0, right: 0, height: 1, background: 'rgba(0,229,160,0.06)', transform: 'translateY(-0.5px)' }} />

            {/* Sweep */}
            <div style={{
              position: 'absolute', inset: 0, borderRadius: '50%',
              background: 'conic-gradient(from 0deg, transparent 0deg, rgba(0,229,160,0.12) 30deg, transparent 60deg)',
              animation: 'sweep 4s linear infinite',
            }} />

            {/* Center dot */}
            <div style={{ position: 'absolute', left: '50%', top: '50%', width: 8, height: 8, borderRadius: '50%', background: '#00E5A0', transform: 'translate(-50%,-50%)', boxShadow: '0 0 12px #00E5A0' }} />

            {/* Device dots */}
            {DEVICES.slice(0, visibleCount).map((d, i) => {
              const rad = (d.angle * Math.PI) / 180
              const x = 50 + d.dist * 45 * Math.cos(rad)
              const y = 50 + d.dist * 45 * Math.sin(rad)
              const isSelected = selectedDevice === i
              return (
                <div key={i} onClick={() => setSelectedDevice(isSelected ? null : i)} style={{
                  position: 'absolute', left: `${x}%`, top: `${y}%`,
                  width: isSelected ? 14 : 10, height: isSelected ? 14 : 10,
                  borderRadius: '50%', background: THREAT_COLORS[d.threat],
                  transform: 'translate(-50%,-50%)',
                  boxShadow: `0 0 ${isSelected ? 20 : 10}px ${THREAT_COLORS[d.threat]}`,
                  cursor: 'pointer', zIndex: isSelected ? 10 : 2,
                  animation: 'ping 0.3s ease-out',
                  transition: 'all .2s',
                }} />
              )
            })}
          </div>

          {/* Selected device card */}
          {selectedDevice !== null && selectedDevice < visibleCount && (
            <div style={{
              maxWidth: 380, margin: '20px auto 0', background: '#12121A',
              border: `1px solid ${THREAT_COLORS[DEVICES[selectedDevice].threat]}33`,
              borderRadius: 12, padding: 20,
              boxShadow: `0 0 30px ${THREAT_COLORS[DEVICES[selectedDevice].threat]}11`,
              animation: 'fadeIn .2s ease',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <span style={{ fontSize: 14, fontWeight: 700, color: '#fff' }}>{DEVICES[selectedDevice].name}</span>
                <span style={{ fontSize: 10, padding: '3px 8px', borderRadius: 4, background: `${THREAT_COLORS[DEVICES[selectedDevice].threat]}22`, color: THREAT_COLORS[DEVICES[selectedDevice].threat], fontWeight: 700 }}>
                  {THREAT_LABELS[DEVICES[selectedDevice].threat]}
                </span>
              </div>
              <div style={{ fontSize: 11, color: '#666', marginBottom: 6 }}>Type: {DEVICES[selectedDevice].type}</div>
              <div style={{ fontSize: 11, color: '#666', marginBottom: 6 }}>Signal: Ring {Math.ceil(DEVICES[selectedDevice].dist * 4)}/4</div>
              <div style={{ fontSize: 11, color: '#FF3860', marginTop: 10, padding: '8px 12px', background: '#FF386011', borderRadius: 6, border: '1px solid #FF386022' }}>
                ⚠ Broadcasting: {DEVICES[selectedDevice].leaking}
              </div>
            </div>
          )}

          {/* Device list (mobile fallback) */}
          {scanComplete && selectedDevice === null && (
            <div style={{ maxWidth: 500, margin: '24px auto 0' }}>
              <div style={{ fontSize: 11, color: '#444', letterSpacing: 2, marginBottom: 12, textAlign: 'center' }}>TAP A DOT OR BROWSE BELOW</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {DEVICES.map((d, i) => (
                  <div key={i} onClick={() => setSelectedDevice(i)} style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: '10px 14px', background: '#12121A', borderRadius: 8,
                    border: '1px solid #1a1a2a', cursor: 'pointer', transition: 'border-color .2s',
                  }}
                    onMouseEnter={e => e.currentTarget.style.borderColor = THREAT_COLORS[d.threat] + '44'}
                    onMouseLeave={e => e.currentTarget.style.borderColor = '#1a1a2a'}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ width: 8, height: 8, borderRadius: '50%', background: THREAT_COLORS[d.threat], boxShadow: `0 0 6px ${THREAT_COLORS[d.threat]}` }} />
                      <span style={{ fontSize: 12, color: '#ccc' }}>{d.name}</span>
                    </div>
                    <span style={{ fontSize: 9, color: THREAT_COLORS[d.threat], fontWeight: 700 }}>{d.threat.toUpperCase()}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Privacy score */}
          {scanComplete && (
            <div style={{ textAlign: 'center', marginTop: 40, animation: 'fadeIn .5s ease' }}>
              <div style={{ position: 'relative', width: 140, height: 140, margin: '0 auto 16px' }}>
                <svg viewBox="0 0 140 140" style={{ width: '100%', height: '100%', transform: 'rotate(-90deg)' }}>
                  <circle cx="70" cy="70" r="60" fill="none" stroke="#1a1a2a" strokeWidth="8" />
                  <circle cx="70" cy="70" r="60" fill="none" stroke="#FF3860" strokeWidth="8"
                    strokeDasharray={`${privacyScore * 3.77} ${377 - privacyScore * 3.77}`}
                    strokeLinecap="round"
                    style={{ transition: 'stroke-dasharray 1.5s ease' }}
                  />
                </svg>
                <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                  <span style={{ fontSize: 36, fontWeight: 700, color: '#FF3860' }}>{privacyScore}</span>
                  <span style={{ fontSize: 10, color: '#666' }}>/100</span>
                </div>
              </div>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#FF3860', marginBottom: 6 }}>POOR BLUETOOTH PRIVACY</div>
              <div style={{ fontSize: 11, color: '#666' }}>{leakingCount} of {DEVICES.length} devices are broadcasting identifiable information.</div>
            </div>
          )}
        </section>
      )}

      {/* Footer */}
      <footer style={{ textAlign: 'center', padding: '40px 20px', fontSize: 11, color: '#333' }}>
        SilentRadio · A ShipShot prototype · shipshot.io
      </footer>

      <style>{`
        @keyframes sweep {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes ping {
          from { transform: translate(-50%,-50%) scale(0); opacity: 0; }
          to { transform: translate(-50%,-50%) scale(1); opacity: 1; }
        }
        @keyframes pulse {
          0%, 100% { box-shadow: 0 0 20px rgba(0,229,160,0.3); }
          50% { box-shadow: 0 0 40px rgba(0,229,160,0.5); }
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: #0A0A0F; }
        ::-webkit-scrollbar-thumb { background: #1a1a2a; border-radius: 2px; }
      `}</style>
    </div>
  )
}

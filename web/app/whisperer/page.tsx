'use client'

import { useState, useEffect, useRef, useCallback } from 'react'

const AWAY_ADVENTURES = [
  'probably sniffing something suspicious in the yard',
  'conducting an unauthorized audit of the kitchen trash',
  'negotiating with a squirrel. it\'s going poorly',
  'on a covert mission behind the couch',
  'auditioning for a role in a nature documentary',
  'barking at a leaf that looked at her funny',
  'investigating a very important smell',
  'doing zoomies in an undisclosed location',
  'holding a private meeting with her tennis ball',
  'supervising the mailman from a secure perimeter',
  'napping somewhere we haven\'t found yet',
  'writing her memoir. working title: "Who\'s a Good Girl: Me"',
  'teaching herself to open the treat jar',
  'filing a formal complaint about dinner being late',
  'on a top-secret belly rub reconnaissance mission',
]

function useGlimmerStatus(isRelaxing: boolean) {
  const [adventure, setAdventure] = useState('')

  useEffect(() => {
    if (!isRelaxing) {
      setAdventure(AWAY_ADVENTURES[Math.floor(Math.random() * AWAY_ADVENTURES.length)])
    }
  }, [isRelaxing])

  if (isRelaxing) return "Glimmer's relaxing"
  return adventure
}

const SETUP_ITEMS = [
  { icon: '🎥', text: 'Reolink E1 Zoom — 4K PTZ camera on local network via RTSP' },
  { icon: '🧠', text: 'Qwen 3.5 4B — local vision AI via Ollama, zero cloud cost' },
  { icon: '📦', text: 'Supabase Storage — image uploaded every ~5 min' },
  { icon: '🎵', text: 'Apple Music → HomePod — plays calming music when pillow detected' },
  { icon: '🐾', text: 'OpenClaw — agent framework tying it all together' },
]

function HowItWorks() {
  const [open, setOpen] = useState(false)
  const contentRef = useRef<HTMLDivElement>(null)
  const [height, setHeight] = useState(0)

  const measure = useCallback(() => {
    if (contentRef.current) {
      setHeight(contentRef.current.scrollHeight)
    }
  }, [])

  useEffect(() => {
    measure()
    window.addEventListener('resize', measure)
    return () => window.removeEventListener('resize', measure)
  }, [measure])

  return (
    <div style={{ width: '100%', maxWidth: 640, marginTop: 24, textAlign: 'center' }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          fontSize: 13,
          color: '#B0A898',
          fontFamily: 'inherit',
          padding: '4px 8px',
          transition: 'color 0.2s',
        }}
        onMouseEnter={e => (e.currentTarget.style.color = '#8A8078')}
        onMouseLeave={e => (e.currentTarget.style.color = '#B0A898')}
      >
        {open ? 'close' : 'how this works'}
      </button>

      <div style={{
        overflow: 'hidden',
        transition: 'height 0.35s ease, opacity 0.3s ease',
        height: open ? height : 0,
        opacity: open ? 1 : 0,
      }}>
        <div ref={contentRef} style={{
          backgroundColor: '#EDE8E1',
          borderRadius: 10,
          padding: '20px 24px',
          marginTop: 8,
          textAlign: 'left',
        }}>
          <p style={{
            fontSize: 13,
            color: '#8A8078',
            margin: '0 0 16px',
            lineHeight: 1.5,
          }}>
            This page is powered by a local AI that watches a camera and plays music for our dog Glimmer.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {SETUP_ITEMS.map((item, i) => (
              <div key={i} style={{
                fontSize: 13,
                color: '#8A8078',
                lineHeight: 1.5,
              }}>
                <span style={{ marginRight: 8 }}>{item.icon}</span>
                {item.text}
              </div>
            ))}
          </div>

          <p style={{
            fontSize: 12,
            color: '#B0A898',
            margin: '16px 0 0',
            fontStyle: 'italic',
          }}>
            built with love and open protocols
          </p>
        </div>
      </div>
    </div>
  )
}

const IMAGE_URL = 'https://tqniseocczttrfwtpbdr.supabase.co/storage/v1/object/public/whisperer/latest.jpg'
const REFRESH_INTERVAL = 60_000 // 1 minute

export default function WhispererPage() {
  const [imageLoaded, setImageLoaded] = useState(false)
  const [cacheBust, setCacheBust] = useState(0)
  const [lastUpdated, setLastUpdated] = useState('')
  const status = useGlimmerStatus(imageLoaded)

  useEffect(() => {
    function refresh() {
      setCacheBust(Date.now())
      fetch(IMAGE_URL, { method: 'HEAD' })
        .then(r => {
          const lm = r.headers.get('last-modified')
          if (lm) {
            const d = new Date(lm)
            setLastUpdated(d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }))
          }
        })
        .catch(() => {})
    }
    refresh()
    const id = setInterval(refresh, REFRESH_INTERVAL)
    return () => clearInterval(id)
  }, [])

  return (
    <>
      <link
        href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;700&display=swap"
        rel="stylesheet"
      />
      <div style={{
        minHeight: '100vh',
        backgroundColor: '#F5F0EB',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '40px 20px',
        fontFamily: 'Inter, system-ui, sans-serif',
      }}>
        <h1 style={{
          fontFamily: "'Playfair Display', Georgia, serif",
          fontSize: 36,
          fontWeight: 700,
          color: '#2C2C2C',
          margin: 0,
          letterSpacing: '-0.02em',
        }}>
          Home Whisperer
        </h1>

        <p style={{
          fontSize: 16,
          color: '#888',
          margin: '8px 0 32px',
          fontWeight: 400,
        }}>
          a smart camera, quietly watching
        </p>

        <div style={{
          width: '100%',
          maxWidth: 640,
          aspectRatio: '4 / 3',
          borderRadius: 12,
          overflow: 'hidden',
          boxShadow: '0 8px 32px rgba(120, 100, 80, 0.15)',
          border: '1px solid rgba(200, 190, 175, 0.5)',
          backgroundColor: '#EDE8E1',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
        }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {cacheBust > 0 && <img
            src={`${IMAGE_URL}?t=${cacheBust}`}
            alt="Latest snapshot from the home camera"
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              display: 'block',
            }}
            onLoad={() => setImageLoaded(true)}
            onError={(e) => {
              setImageLoaded(false)
              const target = e.currentTarget
              target.style.display = 'none'
              const parent = target.parentElement
              if (parent) {
                const placeholder = parent.querySelector('[data-placeholder]') as HTMLElement
                if (placeholder) placeholder.style.display = 'flex'
              }
            }}
          />}
          <div
            data-placeholder=""
            style={{
              display: 'none',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              position: 'absolute',
              inset: 0,
              color: '#A09888',
              gap: 12,
            }}
          >
            <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
              <circle cx="24" cy="24" r="20" stroke="#C0B8A8" strokeWidth="2" />
              <circle cx="24" cy="24" r="8" stroke="#C0B8A8" strokeWidth="2" />
              <circle cx="24" cy="24" r="3" fill="#C0B8A8" />
            </svg>
            <span style={{ fontSize: 15, fontStyle: 'italic' }}>
              Waiting for the next snapshot...
            </span>
          </div>
        </div>

        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          marginTop: 16,
          fontSize: 14,
          color: '#999',
        }}>
          <span style={{
            width: 8,
            height: 8,
            borderRadius: '50%',
            backgroundColor: '#8B9E7E',
            display: 'inline-block',
            animation: 'pulse 2s ease-in-out infinite',
          }} />
          <span>{lastUpdated ? `updated ${lastUpdated}` : 'loading...'}</span>
        </div>

        <p style={{
          fontSize: 14,
          color: imageLoaded ? '#8B9E7E' : '#B0A898',
          marginTop: 8,
          fontStyle: 'italic',
          textAlign: 'center',
          maxWidth: 400,
          lineHeight: 1.4,
        }}>
          {status}
        </p>

        <p style={{
          fontSize: 13,
          color: '#B0A898',
          marginTop: 12,
        }}>
          ♪ playing: Relaxing Dog Music
        </p>

        <HowItWorks />

        <style>{`
          @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.4; }
          }
        `}</style>
      </div>
    </>
  )
}

'use client'

import { useState, useEffect } from 'react'

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

export default function WhispererPage() {
  const [imageLoaded, setImageLoaded] = useState(false)
  const status = useGlimmerStatus(imageLoaded)

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
          <img
            src="https://tqniseocczttrfwtpbdr.supabase.co/storage/v1/object/public/whisperer/latest.jpg"
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
          />
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
          <span>updated just now</span>
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

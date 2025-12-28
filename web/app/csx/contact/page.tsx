'use client'

import { useSearchParams } from 'next/navigation'
import { useState, Suspense } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

function WindowBarTitle() {
  const searchParams = useSearchParams()
  const type = searchParams?.get('type') || 'general'
  const titleMap: Record<string, string> = {
    signup: 'SIGN UP',
    apply: 'APPLY',
    general: 'CONTACT'
  }
  return <>{titleMap[type] || 'CONTACT'}</>
}

function ContactFormContent() {
  const searchParams = useSearchParams()
  const type = searchParams?.get('type') || 'general'
  const router = useRouter()

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState('')
  const [projectLink, setProjectLink] = useState('')
  const [availability, setAvailability] = useState('')
  const [twitter, setTwitter] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState('')

  const typeLabels: Record<string, string> = {
    signup: 'Office Hours Signup',
    apply: 'AI Product Research Residency',
    general: 'General Inquiry'
  }

  const typePlaceholders: Record<string, string> = {
    signup: 'Tell us about yourself and what you\'re working on...',
    apply: 'The short version: who you are, what you\'re working on, why this.',
    general: 'How can we help?'
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setError('')

    // Build message with additional fields for apply type
    let fullMessage = message
    if (type === 'apply') {
      fullMessage = `WHO & WHY:\n${message}\n\nPROJECT LINK: ${projectLink}\n\nAVAILABILITY: ${availability}\n\nTWITTER/LINKEDIN: ${twitter || 'Not provided'}`
    }

    try {
      const response = await fetch('/api/csx/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, message: fullMessage, type })
      })

      if (!response.ok) {
        throw new Error('Failed to send message')
      }

      setSubmitted(true)
    } catch (err) {
      setError('Failed to send message. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  if (submitted) {
    return (
      <div className="csx-success">
        <h2>Message sent!</h2>
        <p>We'll get back to you soon.</p>
        <Link href="/csx/full" className="csx-btn">← Back</Link>
      </div>
    )
  }

  // Residency application form
  if (type === 'apply') {
    return (
      <>
        {/* Back Button */}
        <button className="back-button" onClick={() => router.back()}>
          ← Back
        </button>

        <form onSubmit={handleSubmit} className="csx-form">
          <h1 className="csx-form-title">{typeLabels[type]}</h1>
          <p className="csx-form-subtitle">Apply by Jan 8. Rolling decisions.</p>

          <div className="csx-field">
            <label htmlFor="name">Name</label>
            <input
              type="text"
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              placeholder="Your name"
            />
          </div>

          <div className="csx-field">
            <label htmlFor="email">Email</label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="you@example.com"
            />
          </div>

          <div className="csx-field">
            <label htmlFor="message">Who you are & why this excites you</label>
            <textarea
              id="message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              required
              rows={5}
              placeholder={typePlaceholders[type]}
            />
          </div>

          <div className="csx-field">
            <label htmlFor="projectLink">Link to something you've built</label>
            <input
              type="url"
              id="projectLink"
              value={projectLink}
              onChange={(e) => setProjectLink(e.target.value)}
              required
              placeholder="Show us something you've built"
            />
          </div>

          <div className="csx-field">
            <label htmlFor="availability">Can you start early January at 20+ hrs/week?</label>
            <input
              type="text"
              id="availability"
              value={availability}
              onChange={(e) => setAvailability(e.target.value)}
              required
              placeholder="Yes — or put our minds at ease"
            />
          </div>

          <div className="csx-field">
            <label htmlFor="twitter">Twitter / LinkedIn (optional)</label>
            <input
              type="text"
              id="twitter"
              value={twitter}
              onChange={(e) => setTwitter(e.target.value)}
              placeholder="@handle or profile URL"
            />
          </div>

          {error && <p className="csx-error">{error}</p>}

          <div className="csx-form-actions">
            <Link href="/csx/hiring" className="csx-btn csx-btn-secondary">Cancel</Link>
            <button type="submit" className="csx-btn csx-btn-primary" disabled={submitting}>
              {submitting ? 'Sending...' : 'Apply'}
            </button>
          </div>
        </form>
      </>
    )
  }

  // Default form for signup and general
  return (
    <>
      {/* Back Button */}
      <button className="back-button" onClick={() => router.back()}>
        ← Back
      </button>

      <form onSubmit={handleSubmit} className="csx-form">
        <h1 className="csx-form-title" style={{ marginBottom: '32px' }}>{typeLabels[type]}</h1>

        <div className="csx-field">
          <label htmlFor="name">Name</label>
          <input
            type="text"
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            placeholder="Your name"
          />
        </div>

        <div className="csx-field">
          <label htmlFor="email">Email</label>
          <input
            type="email"
            id="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            placeholder="you@example.com"
          />
        </div>

        <div className="csx-field">
          <label htmlFor="message">Message</label>
          <textarea
            id="message"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            required
            rows={6}
            placeholder={typePlaceholders[type]}
          />
        </div>

        {error && <p className="csx-error">{error}</p>}

        <div className="csx-form-actions">
          <Link href="/csx/full" className="csx-btn csx-btn-secondary">Cancel</Link>
          <button type="submit" className="csx-btn csx-btn-primary" disabled={submitting}>
            {submitting ? 'Sending...' : 'Send'}
          </button>
        </div>
      </form>
    </>
  )
}

export default function ContactPage() {
  return (
    <>
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      <link
        href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@300;400;500;600&display=swap"
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

        .terminal-box {
          border: 3px solid #444;
          max-width: 1000px;
          width: 100%;
          position: relative;
          background: #111;
          box-shadow:
            inset 2px 2px 0 #555,
            inset -2px -2px 0 #222,
            4px 4px 0 #000;
        }

        .window-bar {
          display: flex;
          justify-content: space-between;
          align-items: center;
          background: #1a1a1a;
          border-bottom: 1px solid #333;
          padding: 8px 12px;
        }

        @media (min-width: 640px) {
          .window-bar {
            padding: 10px 16px;
          }
        }

        .window-bar-title {
          color: #666;
          font-size: 0.65rem;
          letter-spacing: 0.1em;
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

        .terminal-content {
          padding: 20px 24px;
          min-height: calc(80vh - 40px);
          max-height: 80vh;
          overflow-y: auto;
        }

        @media (min-width: 640px) {
          .terminal-content {
            padding: 32px 80px;
          }
        }

        @media (min-width: 900px) {
          .terminal-content {
            padding: 40px 120px;
          }
        }

        .back-button {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          color: #666;
          font-size: 0.75rem;
          background: none;
          border: none;
          padding: 0;
          margin-bottom: 24px;
          cursor: pointer;
          font-family: inherit;
          transition: color 0.2s;
        }

        .back-button:hover {
          color: #fff;
        }

        .csx-form-title {
          font-size: 1.25rem;
          font-weight: 500;
          margin: 0 0 4px 0;
          color: #fff;
        }

        @media (min-width: 768px) {
          .csx-form-title {
            font-size: 1.5rem;
          }
        }

        .csx-form-subtitle {
          font-size: 0.875rem;
          color: #888;
          margin: 0 0 32px 0;
        }

        .csx-form {
          display: flex;
          flex-direction: column;
          gap: 24px;
        }

        .csx-field {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .csx-field label {
          font-size: 0.75rem;
          color: #888;
          letter-spacing: 0.1em;
          text-transform: uppercase;
        }

        .csx-field input,
        .csx-field textarea {
          background: transparent;
          border: 1px solid #444;
          color: #ccc;
          font-family: inherit;
          font-size: 0.9375rem;
          padding: 12px;
          transition: border-color 0.2s;
        }

        .csx-field input:focus,
        .csx-field textarea:focus {
          outline: none;
          border-color: #666;
        }

        .csx-field input::placeholder,
        .csx-field textarea::placeholder {
          color: #555;
        }

        .csx-field textarea {
          resize: vertical;
          min-height: 120px;
        }

        .csx-form-actions {
          display: flex;
          gap: 12px;
          justify-content: flex-end;
          margin-top: 8px;
        }

        .csx-btn {
          padding: 10px 18px;
          border: 1px solid #555;
          background: transparent;
          color: #fff;
          font-size: 0.875rem;
          font-family: inherit;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
          text-decoration: none;
        }

        .csx-btn:hover {
          background: #fff;
          color: #000;
        }

        .csx-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .csx-btn-primary {
          background: #fff;
          color: #000;
          border-color: #fff;
        }

        .csx-btn-primary:hover {
          background: #ccc;
          border-color: #ccc;
        }

        .csx-btn-secondary {
          border-color: #444;
          color: #888;
        }

        .csx-btn-secondary:hover {
          background: #333;
          color: #fff;
        }

        .csx-error {
          color: #a55;
          font-size: 0.875rem;
          margin: 0;
        }

        .csx-success {
          text-align: center;
          padding: 48px 0;
        }

        .csx-success h2 {
          font-size: 1.5rem;
          font-weight: 500;
          margin: 0 0 16px 0;
          color: #fff;
        }

        .csx-success p {
          color: #888;
          margin: 0 0 32px 0;
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

        .content-bottom-spacer {
          height: 24px;
        }
      `}</style>

      <div className="terminal-page">
        <div className="page-title">LONG HORIZON BUILD</div>

        <div className="terminal-box">
          <div className="window-bar">
            <span className="window-bar-title">
              <Suspense fallback="CONTACT">
                <WindowBarTitle />
              </Suspense>
            </span>
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

          <div className="terminal-content">
            <Suspense fallback={<div>Loading...</div>}>
              <ContactFormContent />
            </Suspense>

            <div className="content-bottom-spacer"></div>
          </div>
        </div>
      </div>
    </>
  )
}

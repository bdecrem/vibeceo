'use client'

import { useSearchParams } from 'next/navigation'
import { useState, Suspense } from 'react'
import Link from 'next/link'

function ContactFormContent() {
  const searchParams = useSearchParams()
  const type = searchParams?.get('type') || 'general'

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
          <label htmlFor="email">SMS or Email</label>
          <input
            type="text"
            id="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            placeholder="phone or email"
          />
        </div>

        <div className="csx-field">
          <label htmlFor="message">Who you are & why this excites you</label>
          <textarea
            id="message"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            required
            rows={8}
            placeholder={`• One area you'd like to dig deep on or research?\n• What software (app, tech, tooling) would you work on in your first week?\n• Who would you reach out to & get involved in CTRL SHIFT LAB, and how?`}
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
          <label htmlFor="twitter">Twitter / LinkedIn</label>
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
          <button type="submit" className="csx-btn" disabled={submitting}>
            {submitting ? 'Sending...' : 'Apply'}
          </button>
        </div>
      </form>
    )
  }

  // Default form for signup and general
  return (
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
        <button type="submit" className="csx-btn" disabled={submitting}>
          {submitting ? 'Sending...' : 'Send'}
        </button>
      </div>
    </form>
  )
}

export default function ContactPage() {
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

        .csx-page {
          min-height: 100vh;
          background: #000;
          color: #fff;
          font-family: 'IBM Plex Mono', monospace;
          -webkit-font-smoothing: antialiased;
        }

        .csx-container {
          max-width: 600px;
          margin: 0 auto;
          padding: 48px 24px;
        }

        @media (min-width: 768px) {
          .csx-container {
            padding: 64px 24px;
          }
        }

        .csx-header {
          margin-bottom: 32px;
        }

        .csx-back-link {
          color: #8b8b8b;
          text-decoration: none;
          font-size: 0.875rem;
          transition: color 0.2s;
        }

        .csx-back-link:hover {
          color: #fff;
        }

        .csx-form-title {
          font-size: 1.25rem;
          font-weight: 400;
          margin: 0 0 8px 0;
        }

        @media (min-width: 768px) {
          .csx-form-title {
            font-size: 1.5rem;
          }
        }

        .csx-form-subtitle {
          font-size: 0.875rem;
          color: #8b8b8b;
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
          color: #8b8b8b;
          letter-spacing: 0.1em;
          text-transform: uppercase;
        }

        .csx-field input,
        .csx-field textarea {
          background: transparent;
          border: 1px solid #404040;
          color: #fff;
          font-family: inherit;
          font-size: 1rem;
          padding: 12px;
          transition: border-color 0.2s;
        }

        .csx-field input:focus,
        .csx-field textarea:focus {
          outline: none;
          border-color: #8b8b8b;
        }

        .csx-field input::placeholder,
        .csx-field textarea::placeholder {
          color: #666;
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
          padding: 8px 16px;
          border: 1px solid #404040;
          background: transparent;
          color: #fff;
          font-size: 0.875rem;
          font-family: inherit;
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

        .csx-btn-secondary {
          border-color: #333;
          color: #8b8b8b;
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
          font-weight: 400;
          margin: 0 0 16px 0;
        }

        .csx-success p {
          color: #8b8b8b;
          margin: 0 0 32px 0;
        }
      `}</style>

      <div className="csx-page">
        <div className="csx-container">
          <header className="csx-header">
            <Link href="/csx/full" className="csx-back-link">
              ← Back
            </Link>
          </header>

          <Suspense fallback={<div>Loading...</div>}>
            <ContactFormContent />
          </Suspense>
        </div>
      </div>
    </>
  )
}

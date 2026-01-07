'use client'

import { useState } from 'react'
import Link from 'next/link'

export default function MailingListPage() {
  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setError('')

    try {
      const response = await fetch('/api/csx/mailing-list', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, name })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to subscribe')
      }

      setSubmitted(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to subscribe. Please try again.')
    } finally {
      setSubmitting(false)
    }
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

        .csx-page {
          min-height: 100vh;
          background: #0a0a0a;
          color: #fff;
          font-family: 'IBM Plex Mono', monospace;
          -webkit-font-smoothing: antialiased;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 24px;
          padding-top: calc(24px + env(safe-area-inset-top));
          padding-bottom: calc(24px + env(safe-area-inset-bottom));
        }

        .csx-container {
          max-width: 480px;
          width: 100%;
        }

        .csx-header {
          margin-bottom: 32px;
        }

        .csx-back-link {
          color: #666;
          text-decoration: none;
          font-size: 0.875rem;
          transition: color 0.2s;
        }

        .csx-back-link:hover {
          color: #aaa;
        }

        .csx-form-title {
          font-size: 1.125rem;
          font-weight: 400;
          margin: 0 0 8px 0;
          color: #fff;
        }

        @media (min-width: 768px) {
          .csx-form-title {
            font-size: 1.25rem;
          }
        }

        .csx-form-subtitle {
          font-size: 0.875rem;
          color: #8b8b8b;
          margin: 0 0 32px 0;
          line-height: 1.5;
        }

        .csx-form {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        .csx-field {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .csx-field label {
          font-size: 0.75rem;
          color: #8b8b8b;
          letter-spacing: 0.05em;
        }

        .csx-field input {
          background: transparent;
          border: 1px solid #404040;
          color: #fff;
          font-family: inherit;
          font-size: 1rem;
          padding: 12px;
          transition: border-color 0.2s;
        }

        .csx-field input:focus {
          outline: none;
          border-color: #8b8b8b;
        }

        .csx-field input::placeholder {
          color: #555;
        }

        .csx-btn {
          padding: 12px 20px;
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
          color: #0a0a0a;
        }

        .csx-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .csx-error {
          color: #a55;
          font-size: 0.875rem;
          margin: 0;
        }

        .csx-success {
          text-align: center;
          padding: 24px 0;
        }

        .csx-success h2 {
          font-size: 1.25rem;
          font-weight: 400;
          margin: 0 0 16px 0;
        }

        .csx-success p {
          color: #8b8b8b;
          margin: 0 0 24px 0;
          font-size: 0.9375rem;
          line-height: 1.5;
        }
      `}</style>

      <div className="csx-page">
        <div className="csx-container">
          <header className="csx-header">
            <Link href="/csx" className="csx-back-link">
              ← CTRL SHIFT LAB
            </Link>
          </header>

          {submitted ? (
            <div className="csx-success">
              <h2>You're on the list.</h2>
              <p>We'll send occasional updates about what we're building, thinking about, and learning.</p>
              <Link href="/csx/full" className="csx-btn">Explore CTRL SHIFT →</Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="csx-form">
              <div>
                <h1 className="csx-form-title">Join the mailing list</h1>
                <p className="csx-form-subtitle">
                  Get occasional updates on what we're working on, AI research, and long-horizon thinking.
                </p>
              </div>

              <div className="csx-field">
                <label htmlFor="name">Name (optional)</label>
                <input
                  type="text"
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your name"
                />
              </div>

              <div className="csx-field">
                <label htmlFor="email">Email *</label>
                <input
                  type="email"
                  id="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="you@example.com"
                />
              </div>

              {error && <p className="csx-error">{error}</p>}

              <button type="submit" className="csx-btn" disabled={submitting || !email}>
                {submitting ? 'Subscribing...' : 'Subscribe'}
              </button>
            </form>
          )}
        </div>
      </div>
    </>
  )
}

"use client"

import React, { useState, useEffect } from "react"

export const dynamic = 'force-dynamic'

interface CSLink {
  id: string
  url: string
  domain: string | null
  posted_by_name: string | null
  notes: string | null
  posted_at: string
}

interface CSData {
  links: CSLink[]
  pagination: {
    page: number
    totalCount: number
    hasNextPage: boolean
    hasPreviousPage: boolean
  }
}

function timeAgo(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000)

  if (seconds < 60) return 'just now'
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export default function CSPage() {
  const [data, setData] = useState<CSData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    document.title = "CS - Link Feed"

    const fetchData = async () => {
      try {
        const response = await fetch('/api/cs', { cache: 'no-store' })
        if (!response.ok) throw new Error(`Failed to fetch: ${response.status}`)
        const result = await response.json()
        setData(result)
      } catch (err) {
        console.error('Error fetching CS data:', err)
        setError(err instanceof Error ? err.message : 'Failed to load')
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  if (loading) {
    return (
      <div className="cs-container">
        <div className="cs-loading">Loading links...</div>
        <style jsx>{styles}</style>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="cs-container">
        <div className="cs-error">Could not load links. Try refreshing.</div>
        <style jsx>{styles}</style>
      </div>
    )
  }

  return (
    <div className="cs-container">
      <header className="cs-header">
        <h1 className="cs-title">CS</h1>
        <p className="cs-subtitle">Link Feed</p>
      </header>

      <div className="cs-cta">
        <p>Text <strong>CS SUBSCRIBE</strong> to <a href="sms:+18663300015">+1 (866) 330-0015</a> to join</p>
      </div>

      {data.links.length === 0 ? (
        <div className="cs-empty">
          <p>No links yet. Be the first!</p>
          <p className="cs-empty-hint">Text <code>CS https://example.com</code> to share a link</p>
        </div>
      ) : (
        <ul className="cs-links">
          {data.links.map((link) => (
            <li key={link.id} className="cs-link-item">
              <div className="cs-link-main">
                <a
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="cs-link-domain"
                >
                  {link.domain || new URL(link.url).hostname}
                </a>
                <a
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="cs-link-url"
                >
                  {link.url}
                </a>
              </div>
              {link.notes && (
                <p className="cs-link-notes">"{link.notes}"</p>
              )}
              <div className="cs-link-meta">
                <span className="cs-link-poster">{link.posted_by_name || 'Anonymous'}</span>
                <span className="cs-link-sep">&middot;</span>
                <span className="cs-link-time">{timeAgo(link.posted_at)}</span>
              </div>
            </li>
          ))}
        </ul>
      )}

      <footer className="cs-footer">
        <p>Share links: <code>CS &lt;url&gt;</code> | <a href="https://kochi.to">Kochi.to</a></p>
      </footer>

      <style jsx>{styles}</style>
    </div>
  )
}

const styles = `
  .cs-container {
    max-width: 700px;
    margin: 0 auto;
    padding: 2rem 1rem;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    background: #fafafa;
    min-height: 100vh;
  }

  .cs-header {
    margin-bottom: 1.5rem;
    padding-bottom: 1rem;
    border-bottom: 1px solid #e0e0e0;
  }

  .cs-title {
    font-size: 2rem;
    font-weight: 700;
    color: #1a1a1a;
    margin: 0;
    display: inline;
  }

  .cs-subtitle {
    display: inline;
    margin-left: 0.5rem;
    font-size: 1rem;
    color: #666;
    font-weight: 400;
  }

  .cs-cta {
    background: #fff8e1;
    border: 1px solid #ffe082;
    border-radius: 6px;
    padding: 0.75rem 1rem;
    margin-bottom: 1.5rem;
    font-size: 0.9rem;
    color: #5d4037;
  }

  .cs-cta a {
    color: #1565c0;
    text-decoration: none;
  }

  .cs-cta a:hover {
    text-decoration: underline;
  }

  .cs-loading, .cs-error {
    text-align: center;
    padding: 3rem 1rem;
    color: #666;
  }

  .cs-empty {
    text-align: center;
    padding: 3rem 1rem;
    color: #666;
  }

  .cs-empty-hint {
    margin-top: 0.5rem;
    font-size: 0.85rem;
  }

  .cs-empty code, .cs-footer code {
    background: #e8e8e8;
    padding: 0.2rem 0.4rem;
    border-radius: 3px;
    font-family: 'SF Mono', Monaco, monospace;
    font-size: 0.85em;
  }

  .cs-links {
    list-style: none;
    margin: 0;
    padding: 0;
  }

  .cs-link-item {
    padding: 1rem 0;
    border-bottom: 1px solid #e8e8e8;
  }

  .cs-link-item:last-child {
    border-bottom: none;
  }

  .cs-link-main {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }

  .cs-link-domain {
    font-size: 1.1rem;
    font-weight: 600;
    color: #1565c0;
    text-decoration: none;
  }

  .cs-link-domain:hover {
    text-decoration: underline;
  }

  .cs-link-url {
    font-size: 0.8rem;
    color: #888;
    text-decoration: none;
    word-break: break-all;
  }

  .cs-link-url:hover {
    color: #1565c0;
  }

  .cs-link-notes {
    margin: 0.5rem 0;
    font-style: italic;
    color: #555;
    font-size: 0.95rem;
  }

  .cs-link-meta {
    font-size: 0.8rem;
    color: #888;
    margin-top: 0.25rem;
  }

  .cs-link-poster {
    color: #666;
  }

  .cs-link-sep {
    margin: 0 0.4rem;
  }

  .cs-link-time {
    color: #999;
  }

  .cs-footer {
    margin-top: 2rem;
    padding-top: 1rem;
    border-top: 1px solid #e0e0e0;
    text-align: center;
    font-size: 0.85rem;
    color: #888;
  }

  .cs-footer a {
    color: #1565c0;
    text-decoration: none;
  }

  .cs-footer a:hover {
    text-decoration: underline;
  }

  @media (max-width: 480px) {
    .cs-container {
      padding: 1rem;
    }

    .cs-title {
      font-size: 1.5rem;
    }
  }
`

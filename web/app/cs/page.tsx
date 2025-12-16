"use client"

import React, { useState, useEffect } from "react"

export const dynamic = 'force-dynamic'

interface Comment {
  id: string
  author: string
  text: string
  created_at: string
}

interface CSLink {
  id: string
  url: string
  domain: string | null
  posted_by_name: string | null
  notes: string | null
  posted_at: string
  comments: Comment[]
}

interface AuthState {
  token: string | null
  handle: string | null
}

type ModalState = 'closed' | 'phone' | 'code' | 'handle'

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
  const [links, setLinks] = useState<CSLink[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Auth state
  const [auth, setAuth] = useState<AuthState>({ token: null, handle: null })
  const [modal, setModal] = useState<ModalState>('closed')
  const [phone, setPhone] = useState('')
  const [code, setCode] = useState('')
  const [handle, setHandle] = useState('')
  const [authLoading, setAuthLoading] = useState(false)
  const [authError, setAuthError] = useState('')

  // Comment state
  const [commentingOn, setCommentingOn] = useState<string | null>(null)
  const [commentText, setCommentText] = useState('')
  const [commentLoading, setCommentLoading] = useState(false)

  // Load auth from localStorage
  useEffect(() => {
    const stored = localStorage.getItem('cs_auth')
    if (stored) {
      try {
        setAuth(JSON.parse(stored))
      } catch {}
    }
  }, [])

  // Save auth to localStorage
  useEffect(() => {
    if (auth.token) {
      localStorage.setItem('cs_auth', JSON.stringify(auth))
    }
  }, [auth])

  // Fetch links
  useEffect(() => {
    document.title = "CS - Link Feed"

    const fetchData = async () => {
      try {
        const response = await fetch('/api/cs', { cache: 'no-store' })
        if (!response.ok) throw new Error(`Failed to fetch: ${response.status}`)
        const result = await response.json()
        setLinks(result.links || [])
      } catch (err) {
        console.error('Error fetching CS data:', err)
        setError(err instanceof Error ? err.message : 'Failed to load')
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  const handleSendCode = async () => {
    setAuthLoading(true)
    setAuthError('')

    try {
      const res = await fetch('/api/cs/send-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone })
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to send code')

      setModal('code')
    } catch (err) {
      setAuthError(err instanceof Error ? err.message : 'Failed to send code')
    } finally {
      setAuthLoading(false)
    }
  }

  const handleVerifyCode = async () => {
    setAuthLoading(true)
    setAuthError('')

    try {
      const res = await fetch('/api/cs/verify-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, code })
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Invalid code')

      setAuth({ token: data.token, handle: data.handle })

      if (data.needsHandle) {
        setModal('handle')
      } else {
        setModal('closed')
      }
    } catch (err) {
      setAuthError(err instanceof Error ? err.message : 'Verification failed')
    } finally {
      setAuthLoading(false)
    }
  }

  const handleSetHandle = async () => {
    setAuthLoading(true)
    setAuthError('')

    try {
      const res = await fetch('/api/cs/set-handle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: auth.token, handle })
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to set handle')

      setAuth(prev => ({ ...prev, handle: data.handle }))
      setModal('closed')
    } catch (err) {
      setAuthError(err instanceof Error ? err.message : 'Failed to set handle')
    } finally {
      setAuthLoading(false)
    }
  }

  const handleAddComment = async (linkId: string) => {
    if (!commentText.trim() || !auth.token) return

    setCommentLoading(true)

    try {
      const res = await fetch('/api/cs/comment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: auth.token, linkId, text: commentText })
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to add comment')

      // Update local state
      setLinks(prev => prev.map(link => {
        if (link.id === linkId) {
          return { ...link, comments: [...(link.comments || []), data.comment] }
        }
        return link
      }))

      setCommentText('')
      setCommentingOn(null)
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to add comment')
    } finally {
      setCommentLoading(false)
    }
  }

  const handleLogout = () => {
    setAuth({ token: null, handle: null })
    localStorage.removeItem('cs_auth')
  }

  if (loading) {
    return (
      <div className="cs-container">
        <div className="cs-loading">Loading links...</div>
        <style jsx>{styles}</style>
      </div>
    )
  }

  if (error) {
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
        <div className="cs-header-left">
          <h1 className="cs-title">CS</h1>
          <p className="cs-subtitle">Link Feed</p>
        </div>
        <div className="cs-header-right">
          {auth.token ? (
            <div className="cs-user">
              <span className="cs-handle">@{auth.handle}</span>
              <button onClick={handleLogout} className="cs-logout">Logout</button>
            </div>
          ) : (
            <button onClick={() => setModal('phone')} className="cs-login-btn">
              Sign in to comment
            </button>
          )}
        </div>
      </header>

      <div className="cs-cta">
        <p>Text <strong>CS SUBSCRIBE</strong> to <a href="sms:+18663300015">+1 (866) 330-0015</a> to join</p>
      </div>

      {links.length === 0 ? (
        <div className="cs-empty">
          <p>No links yet. Be the first!</p>
          <p className="cs-empty-hint">Text <code>CS https://example.com</code> to share a link</p>
        </div>
      ) : (
        <ul className="cs-links">
          {links.map((link) => (
            <li key={link.id} className="cs-link-item">
              <div className="cs-link-main">
                <a href={link.url} target="_blank" rel="noopener noreferrer" className="cs-link-domain">
                  {link.domain || new URL(link.url).hostname}
                </a>
                <a href={link.url} target="_blank" rel="noopener noreferrer" className="cs-link-url">
                  {link.url}
                </a>
              </div>
              {link.notes && <p className="cs-link-notes">"{link.notes}"</p>}
              <div className="cs-link-meta">
                <span className="cs-link-poster">{link.posted_by_name || 'Anonymous'}</span>
                <span className="cs-link-sep">&middot;</span>
                <span className="cs-link-time">{timeAgo(link.posted_at)}</span>
              </div>

              {/* Comments */}
              {link.comments && link.comments.length > 0 && (
                <div className="cs-comments">
                  {link.comments.map((comment) => (
                    <div key={comment.id} className="cs-comment">
                      <span className="cs-comment-author">@{comment.author}</span>
                      <span className="cs-comment-text">{comment.text}</span>
                      <span className="cs-comment-time">{timeAgo(comment.created_at)}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Add comment */}
              {auth.token ? (
                commentingOn === link.id ? (
                  <div className="cs-add-comment">
                    <input
                      type="text"
                      value={commentText}
                      onChange={(e) => setCommentText(e.target.value)}
                      placeholder="Add a comment..."
                      className="cs-comment-input"
                      maxLength={500}
                      onKeyDown={(e) => e.key === 'Enter' && handleAddComment(link.id)}
                    />
                    <div className="cs-comment-actions">
                      <button
                        onClick={() => handleAddComment(link.id)}
                        disabled={commentLoading || !commentText.trim()}
                        className="cs-comment-submit"
                      >
                        {commentLoading ? '...' : 'Post'}
                      </button>
                      <button onClick={() => { setCommentingOn(null); setCommentText('') }} className="cs-comment-cancel">
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <button onClick={() => setCommentingOn(link.id)} className="cs-comment-btn">
                    + Comment
                  </button>
                )
              ) : (
                <button onClick={() => setModal('phone')} className="cs-comment-btn cs-comment-btn-muted">
                  Sign in to comment
                </button>
              )}
            </li>
          ))}
        </ul>
      )}

      <footer className="cs-footer">
        <p>Share links: <code>CS &lt;url&gt;</code> | <a href="https://kochi.to">Kochi.to</a></p>
      </footer>

      {/* Auth Modal */}
      {modal !== 'closed' && (
        <div className="cs-modal-overlay" onClick={() => setModal('closed')}>
          <div className="cs-modal" onClick={(e) => e.stopPropagation()}>
            {modal === 'phone' && (
              <>
                <h2>Sign in with your phone</h2>
                <p>We'll send you a verification code via SMS.</p>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="(555) 555-5555"
                  className="cs-modal-input"
                />
                {authError && <p className="cs-modal-error">{authError}</p>}
                <button onClick={handleSendCode} disabled={authLoading || !phone} className="cs-modal-btn">
                  {authLoading ? 'Sending...' : 'Send Code'}
                </button>
              </>
            )}

            {modal === 'code' && (
              <>
                <h2>Enter verification code</h2>
                <p>We sent a 6-digit code to {phone}</p>
                <input
                  type="text"
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="123456"
                  className="cs-modal-input"
                  maxLength={6}
                />
                {authError && <p className="cs-modal-error">{authError}</p>}
                <button onClick={handleVerifyCode} disabled={authLoading || code.length !== 6} className="cs-modal-btn">
                  {authLoading ? 'Verifying...' : 'Verify'}
                </button>
                <button onClick={() => setModal('phone')} className="cs-modal-link">
                  Use different number
                </button>
              </>
            )}

            {modal === 'handle' && (
              <>
                <h2>Choose your handle</h2>
                <p>This is how others will see you.</p>
                <input
                  type="text"
                  value={handle}
                  onChange={(e) => setHandle(e.target.value.replace(/[^a-zA-Z0-9_]/g, '').slice(0, 20))}
                  placeholder="yourhandle"
                  className="cs-modal-input"
                  maxLength={20}
                />
                {authError && <p className="cs-modal-error">{authError}</p>}
                <button onClick={handleSetHandle} disabled={authLoading || handle.length < 2} className="cs-modal-btn">
                  {authLoading ? 'Saving...' : 'Save'}
                </button>
              </>
            )}
          </div>
        </div>
      )}

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
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1.5rem;
    padding-bottom: 1rem;
    border-bottom: 1px solid #e0e0e0;
  }

  .cs-header-left {
    display: flex;
    align-items: baseline;
    gap: 0.5rem;
  }

  .cs-title {
    font-size: 2rem;
    font-weight: 700;
    color: #1a1a1a;
    margin: 0;
  }

  .cs-subtitle {
    font-size: 1rem;
    color: #666;
    font-weight: 400;
    margin: 0;
  }

  .cs-user {
    display: flex;
    align-items: center;
    gap: 0.75rem;
  }

  .cs-handle {
    font-size: 0.9rem;
    color: #1565c0;
    font-weight: 500;
  }

  .cs-logout {
    font-size: 0.8rem;
    color: #888;
    background: none;
    border: none;
    cursor: pointer;
    text-decoration: underline;
  }

  .cs-login-btn {
    font-size: 0.85rem;
    color: #fff;
    background: #1565c0;
    border: none;
    padding: 0.5rem 1rem;
    border-radius: 4px;
    cursor: pointer;
  }

  .cs-login-btn:hover {
    background: #1976d2;
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

  .cs-loading, .cs-error, .cs-empty {
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

  /* Comments */
  .cs-comments {
    margin-top: 0.75rem;
    padding-left: 1rem;
    border-left: 2px solid #e0e0e0;
  }

  .cs-comment {
    margin-bottom: 0.5rem;
    font-size: 0.85rem;
  }

  .cs-comment-author {
    color: #1565c0;
    font-weight: 500;
    margin-right: 0.5rem;
  }

  .cs-comment-text {
    color: #333;
  }

  .cs-comment-time {
    color: #999;
    margin-left: 0.5rem;
    font-size: 0.75rem;
  }

  .cs-comment-btn {
    margin-top: 0.5rem;
    font-size: 0.8rem;
    color: #1565c0;
    background: none;
    border: none;
    cursor: pointer;
    padding: 0;
  }

  .cs-comment-btn:hover {
    text-decoration: underline;
  }

  .cs-comment-btn-muted {
    color: #888;
  }

  .cs-add-comment {
    margin-top: 0.5rem;
  }

  .cs-comment-input {
    width: 100%;
    padding: 0.5rem;
    border: 1px solid #ddd;
    border-radius: 4px;
    font-size: 0.85rem;
    margin-bottom: 0.5rem;
  }

  .cs-comment-actions {
    display: flex;
    gap: 0.5rem;
  }

  .cs-comment-submit {
    font-size: 0.8rem;
    color: #fff;
    background: #1565c0;
    border: none;
    padding: 0.4rem 0.8rem;
    border-radius: 4px;
    cursor: pointer;
  }

  .cs-comment-submit:disabled {
    background: #ccc;
    cursor: not-allowed;
  }

  .cs-comment-cancel {
    font-size: 0.8rem;
    color: #666;
    background: none;
    border: 1px solid #ddd;
    padding: 0.4rem 0.8rem;
    border-radius: 4px;
    cursor: pointer;
  }

  /* Modal */
  .cs-modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
  }

  .cs-modal {
    background: #fff;
    padding: 2rem;
    border-radius: 8px;
    max-width: 360px;
    width: 90%;
  }

  .cs-modal h2 {
    margin: 0 0 0.5rem 0;
    font-size: 1.25rem;
    color: #1a1a1a;
  }

  .cs-modal p {
    margin: 0 0 1rem 0;
    font-size: 0.9rem;
    color: #666;
  }

  .cs-modal-input {
    width: 100%;
    padding: 0.75rem;
    border: 1px solid #ddd;
    border-radius: 4px;
    font-size: 1rem;
    margin-bottom: 1rem;
  }

  .cs-modal-error {
    color: #c62828;
    font-size: 0.85rem;
    margin-bottom: 1rem;
  }

  .cs-modal-btn {
    width: 100%;
    padding: 0.75rem;
    background: #1565c0;
    color: #fff;
    border: none;
    border-radius: 4px;
    font-size: 1rem;
    cursor: pointer;
  }

  .cs-modal-btn:hover {
    background: #1976d2;
  }

  .cs-modal-btn:disabled {
    background: #ccc;
    cursor: not-allowed;
  }

  .cs-modal-link {
    display: block;
    margin-top: 1rem;
    text-align: center;
    font-size: 0.85rem;
    color: #1565c0;
    background: none;
    border: none;
    cursor: pointer;
    text-decoration: underline;
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

  @media (max-width: 480px) {
    .cs-container {
      padding: 1rem;
    }

    .cs-header {
      flex-direction: column;
      align-items: flex-start;
      gap: 0.75rem;
    }

    .cs-title {
      font-size: 1.5rem;
    }
  }
`

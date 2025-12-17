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
  content_summary: string | null
  about_person: string | null
  isOwner: boolean
}

interface ChatSource {
  id: string
  url: string
  domain: string | null
  posted_by_name: string | null
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
  const [people, setPeople] = useState<string[]>([])
  const [selectedPerson, setSelectedPerson] = useState<string | null>(null)
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

  // Chat state
  const [chatQuestion, setChatQuestion] = useState('')
  const [chatAnswer, setChatAnswer] = useState('')
  const [chatSources, setChatSources] = useState<ChatSource[]>([])
  const [chatLoading, setChatLoading] = useState(false)

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
  const fetchLinks = async (token?: string | null) => {
    try {
      const url = token ? `/api/cs?token=${encodeURIComponent(token)}` : '/api/cs'
      const response = await fetch(url, { cache: 'no-store' })
      if (!response.ok) throw new Error(`Failed to fetch: ${response.status}`)
      const result = await response.json()
      setLinks(result.links || [])
      setPeople(result.people || [])
    } catch (err) {
      console.error('Error fetching CS data:', err)
      setError(err instanceof Error ? err.message : 'Failed to load')
    } finally {
      setLoading(false)
    }
  }

  // Filter links by selected person
  const filteredLinks = selectedPerson
    ? links.filter(link => link.about_person === selectedPerson)
    : links

  useEffect(() => {
    document.title = "CS - Link Feed"
    fetchLinks(auth.token)
  }, [auth.token])

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

  const handleDeletePost = async (postId: string) => {
    if (!auth.token || !confirm('Delete this post?')) return

    try {
      const res = await fetch('/api/cs/delete-post', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: auth.token, postId })
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to delete')
      }

      setLinks(prev => prev.filter(link => link.id !== postId))
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete post')
    }
  }

  const handleDeleteComment = async (postId: string, commentId: string) => {
    if (!auth.token || !confirm('Delete this comment?')) return

    try {
      const res = await fetch('/api/cs/delete-comment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: auth.token, postId, commentId })
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to delete')
      }

      setLinks(prev => prev.map(link => {
        if (link.id === postId) {
          return { ...link, comments: link.comments.filter(c => c.id !== commentId) }
        }
        return link
      }))
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete comment')
    }
  }

  const handleChat = async () => {
    if (!chatQuestion.trim() || chatLoading) return

    setChatLoading(true)
    setChatAnswer('')
    setChatSources([])

    try {
      const res = await fetch('/api/cs/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: chatQuestion })
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to get answer')

      setChatAnswer(data.answer)
      setChatSources(data.sources || [])
    } catch (err) {
      setChatAnswer(err instanceof Error ? err.message : 'Failed to process question')
    } finally {
      setChatLoading(false)
    }
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
        {auth.token && (
          <div className="cs-header-right">
            <span className="cs-logged-in">signed in as <strong>{auth.handle}</strong></span>
            <br />
            <button onClick={handleLogout} className="cs-logout">logout</button>
          </div>
        )}
      </header>

      {/* Chat UI */}
      <div className="cs-chat">
        <div className="cs-chat-input-row">
          <input
            type="text"
            value={chatQuestion}
            onChange={(e) => setChatQuestion(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleChat()}
            placeholder="Ask about the links... e.g. 'What articles discuss AI agents?'"
            className="cs-chat-input"
            disabled={chatLoading}
          />
          <button onClick={handleChat} disabled={chatLoading || !chatQuestion.trim()} className="cs-chat-btn">
            {chatLoading ? '...' : 'Ask'}
          </button>
        </div>
        {chatLoading && (
          <div className="cs-chat-thinking">
            <div className="cs-thinking-bubble">
              <span></span>
              <span></span>
              <span></span>
            </div>
            <span className="cs-thinking-text">Searching through links...</span>
          </div>
        )}
        {chatAnswer && (
          <div className="cs-chat-answer">
            <p>{chatAnswer}</p>
            {chatSources.length > 0 && (
              <div className="cs-chat-sources">
                Sources: {chatSources.map((src, i) => (
                  <span key={src.id}>
                    {i > 0 && ', '}
                    <a href={src.url} target="_blank" rel="noopener noreferrer">{src.domain || 'link'}</a>
                  </span>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* People tags */}
      {people.length > 0 && (
        <div className="cs-people-tags">
          <button
            className={`cs-people-tag ${!selectedPerson ? 'cs-people-tag-active' : ''}`}
            onClick={() => setSelectedPerson(null)}
          >
            All
          </button>
          {people.map((person) => (
            <button
              key={person}
              className={`cs-people-tag ${selectedPerson === person ? 'cs-people-tag-active' : ''}`}
              onClick={() => setSelectedPerson(selectedPerson === person ? null : person)}
            >
              {person}
            </button>
          ))}
        </div>
      )}

      {filteredLinks.length === 0 ? (
        <div className="cs-empty">
          <p>{selectedPerson ? `No links about ${selectedPerson} yet.` : 'No links yet. Be the first!'}</p>
          {!selectedPerson && <p className="cs-empty-hint">Text <code>CS https://example.com</code> to share a link</p>}
        </div>
      ) : (
        <ul className="cs-links">
          {filteredLinks.map((link) => (
            <li key={link.id} className="cs-link-item">
              <div className="cs-link-main">
                <a href={link.url} target="_blank" rel="noopener noreferrer" className="cs-link-domain">
                  {link.domain || new URL(link.url).hostname}
                </a>
                <a href={link.url} target="_blank" rel="noopener noreferrer" className="cs-link-url">
                  {link.url}
                </a>
              </div>
              {link.about_person && (
                <span
                  className="cs-link-person-tag"
                  onClick={() => setSelectedPerson(link.about_person)}
                >
                  {link.about_person}
                </span>
              )}
              {link.notes && <p className="cs-link-notes">"{link.notes}"</p>}
              {link.content_summary && <p className="cs-link-summary">{link.content_summary}</p>}
              <div className="cs-link-meta">
                <span className="cs-link-poster">{link.posted_by_name || 'Anonymous'}</span>
                <span className="cs-link-sep">&middot;</span>
                <span className="cs-link-time">{timeAgo(link.posted_at)}</span>
                {link.isOwner && (
                  <>
                    <span className="cs-link-sep">&middot;</span>
                    <button onClick={() => handleDeletePost(link.id)} className="cs-delete-btn">del</button>
                  </>
                )}
              </div>

              {/* Comments */}
              {link.comments && link.comments.length > 0 && (
                <div className="cs-comments">
                  {link.comments.map((comment) => (
                    <div key={comment.id} className="cs-comment">
                      <span className="cs-comment-author">@{comment.author}</span>
                      <span className="cs-comment-text">{comment.text}</span>
                      <span className="cs-comment-time">{timeAgo(comment.created_at)}</span>
                      {auth.handle && comment.author === auth.handle && (
                        <button onClick={() => handleDeleteComment(link.id, comment.id)} className="cs-delete-btn">x</button>
                      )}
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
        <p>
          <a href="sms:+18663300015&body=CS%20SUBSCRIBE">Subscribe via SMS</a>
          <span className="cs-footer-sep">&middot;</span>
          <a href="https://kochi.to">Kochi.to</a>
        </p>
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

  .cs-header-right {
    text-align: right;
    font-size: 0.8rem;
    color: #888;
  }

  .cs-logged-in {
    color: #888;
  }

  .cs-logged-in strong {
    color: #555;
  }

  .cs-logout {
    color: #888;
    background: none;
    border: none;
    cursor: pointer;
  }

  .cs-logout:hover {
    color: #1565c0;
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

  .cs-link-summary {
    margin: 0.5rem 0;
    color: #444;
    font-size: 0.9rem;
    line-height: 1.4;
  }

  .cs-link-person-tag {
    display: inline-block;
    background: linear-gradient(135deg, #e8f4fd 0%, #d4e9f7 100%);
    color: #1a5f8a;
    padding: 0.2rem 0.6rem;
    border-radius: 12px;
    font-size: 0.75rem;
    font-weight: 500;
    margin: 0.4rem 0;
    cursor: pointer;
    transition: all 0.15s ease;
  }

  .cs-link-person-tag:hover {
    background: linear-gradient(135deg, #d4e9f7 0%, #c0dbed 100%);
    transform: scale(1.02);
  }

  .cs-people-tags {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
    margin-bottom: 1.5rem;
    padding: 0.75rem;
    background: #f8f9fa;
    border-radius: 8px;
  }

  .cs-people-tag {
    background: #fff;
    border: 1px solid #ddd;
    color: #555;
    padding: 0.35rem 0.75rem;
    border-radius: 16px;
    font-size: 0.8rem;
    cursor: pointer;
    transition: all 0.15s ease;
  }

  .cs-people-tag:hover {
    border-color: #1a5f8a;
    color: #1a5f8a;
  }

  .cs-people-tag-active {
    background: #1a5f8a;
    border-color: #1a5f8a;
    color: #fff;
  }

  .cs-people-tag-active:hover {
    background: #145070;
    border-color: #145070;
    color: #fff;
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

  .cs-delete-btn {
    color: #999;
    background: none;
    border: none;
    cursor: pointer;
    font-size: 0.75rem;
    padding: 0;
    margin-left: 0.5rem;
  }

  .cs-delete-btn:hover {
    color: #c62828;
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
    color: #888;
    text-decoration: none;
  }

  .cs-footer a:hover {
    color: #1565c0;
  }

  .cs-footer-sep {
    margin: 0 0.5rem;
    color: #ccc;
  }

  /* Chat UI */
  .cs-chat {
    margin-bottom: 1.5rem;
    padding: 1rem;
    background: #fff;
    border: 1px solid #e0e0e0;
    border-radius: 8px;
  }

  .cs-chat-input-row {
    display: flex;
    gap: 0.5rem;
  }

  .cs-chat-input {
    flex: 1;
    padding: 0.75rem;
    border: 1px solid #ddd;
    border-radius: 4px;
    font-size: 0.95rem;
  }

  .cs-chat-input:focus {
    outline: none;
    border-color: #1565c0;
  }

  .cs-chat-btn {
    padding: 0.75rem 1.25rem;
    background: #1565c0;
    color: #fff;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-size: 0.95rem;
  }

  .cs-chat-btn:hover {
    background: #1976d2;
  }

  .cs-chat-btn:disabled {
    background: #ccc;
    cursor: not-allowed;
  }

  .cs-chat-thinking {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    margin-top: 1rem;
    padding: 1rem;
    background: linear-gradient(135deg, #f0f7ff 0%, #e8f4fd 100%);
    border-radius: 16px 16px 16px 4px;
    animation: fadeIn 0.3s ease;
  }

  @keyframes fadeIn {
    from { opacity: 0; transform: translateY(-8px); }
    to { opacity: 1; transform: translateY(0); }
  }

  .cs-thinking-bubble {
    display: flex;
    gap: 4px;
  }

  .cs-thinking-bubble span {
    width: 8px;
    height: 8px;
    background: #1565c0;
    border-radius: 50%;
    animation: bounce 1.4s ease-in-out infinite;
  }

  .cs-thinking-bubble span:nth-child(1) {
    animation-delay: 0s;
  }

  .cs-thinking-bubble span:nth-child(2) {
    animation-delay: 0.2s;
  }

  .cs-thinking-bubble span:nth-child(3) {
    animation-delay: 0.4s;
  }

  @keyframes bounce {
    0%, 60%, 100% {
      transform: translateY(0);
    }
    30% {
      transform: translateY(-8px);
    }
  }

  .cs-thinking-text {
    color: #1565c0;
    font-size: 0.9rem;
    font-weight: 500;
  }

  .cs-chat-answer {
    margin-top: 1rem;
    padding: 1rem;
    background: #f5f5f5;
    border-radius: 4px;
  }

  .cs-chat-answer p {
    margin: 0;
    line-height: 1.5;
    color: #333;
  }

  .cs-chat-sources {
    margin-top: 0.75rem;
    font-size: 0.8rem;
    color: #666;
  }

  .cs-chat-sources a {
    color: #1565c0;
    text-decoration: none;
  }

  .cs-chat-sources a:hover {
    text-decoration: underline;
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

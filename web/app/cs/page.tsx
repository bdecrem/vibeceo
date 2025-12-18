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
  title: string | null
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
  isAdmin: boolean
}

type ModalState = 'closed' | 'phone' | 'code' | 'handle'

// Simple markdown parser for chat responses
function parseMarkdown(text: string): string {
  return text
    // Bold: **text** or __text__
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/__(.+?)__/g, '<strong>$1</strong>')
    // Italic: *text* or _text_
    .replace(/\*([^*]+?)\*/g, '<em>$1</em>')
    .replace(/_([^_]+?)_/g, '<em>$1</em>')
    // Line breaks
    .replace(/\n/g, '<br />')
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
  const [links, setLinks] = useState<CSLink[]>([])
  const [people, setPeople] = useState<string[]>([])
  const [selectedPerson, setSelectedPerson] = useState<string | null>(null)
  const [searchOpen, setSearchOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Auth state
  const [auth, setAuth] = useState<AuthState>({ token: null, handle: null, isAdmin: false })
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

  // Person editing state
  const [editingPersonOn, setEditingPersonOn] = useState<string | null>(null)
  const [personText, setPersonText] = useState('')

  // Load auth from cookie first, then localStorage fallback
  useEffect(() => {
    // Try cookies first (survives Safari View Controller)
    const cookies = document.cookie.split(';').reduce((acc, c) => {
      const [key, val] = c.trim().split('=')
      if (key && val) acc[key] = decodeURIComponent(val)
      return acc
    }, {} as Record<string, string>)

    if (cookies.cs_token) {
      setAuth({ token: cookies.cs_token, handle: cookies.cs_handle || null, isAdmin: false })
      return
    }

    // Fallback to localStorage
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
      // Update isAdmin from API response
      if (result.isAdmin !== undefined) {
        setAuth(prev => ({ ...prev, isAdmin: result.isAdmin }))
      }
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
    // Only fetch links if authenticated
    if (auth.token) {
      fetchLinks(auth.token)
    } else {
      setLoading(false) // Stop loading state when not authenticated
    }
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

      setAuth({ token: data.token, handle: data.handle, isAdmin: data.isAdmin || false })

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
    setAuth({ token: null, handle: null, isAdmin: false })
    localStorage.removeItem('cs_auth')
    // Clear cookies
    document.cookie = 'cs_token=; path=/; max-age=0'
    document.cookie = 'cs_handle=; path=/; max-age=0'
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

  const handleSetPerson = async (postId: string) => {
    if (!auth.token) return

    try {
      const res = await fetch('/api/cs/set-person', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: auth.token, postId, person: personText.trim() || null })
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to set person')

      // Update local state
      setLinks(prev => prev.map(link => {
        if (link.id === postId) {
          return { ...link, about_person: data.person }
        }
        return link
      }))

      // Update people list if new person was added
      if (data.person && !people.includes(data.person)) {
        setPeople(prev => [...prev, data.person].sort())
      }

      setPersonText('')
      setEditingPersonOn(null)
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to set person')
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

  // Show login screen if not authenticated
  if (!auth.token) {
    return (
      <div className="cs-container">
        <div className="cs-login-screen">
          <h1 className="cs-login-title">CS</h1>
          <p className="cs-login-subtitle">Private Link Feed</p>

          {modal === 'closed' || modal === 'phone' ? (
            <div className="cs-login-form">
              <p className="cs-login-desc">Sign in with your phone number to access the feed.</p>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="(555) 555-5555"
                className="cs-login-input"
                onKeyDown={(e) => e.key === 'Enter' && phone && handleSendCode()}
              />
              {authError && <p className="cs-login-error">{authError}</p>}
              <button onClick={handleSendCode} disabled={authLoading || !phone} className="cs-login-btn">
                {authLoading ? 'Sending...' : 'Send Code'}
              </button>
              <p className="cs-login-hint">Not a member? Text <code>CS SUBSCRIBE</code> to +1 (866) 330-0015</p>
            </div>
          ) : modal === 'code' ? (
            <div className="cs-login-form">
              <p className="cs-login-desc">Enter the 6-digit code sent to {phone}</p>
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="123456"
                className="cs-login-input"
                maxLength={6}
                onKeyDown={(e) => e.key === 'Enter' && code.length === 6 && handleVerifyCode()}
              />
              {authError && <p className="cs-login-error">{authError}</p>}
              <button onClick={handleVerifyCode} disabled={authLoading || code.length !== 6} className="cs-login-btn">
                {authLoading ? 'Verifying...' : 'Verify'}
              </button>
              <button onClick={() => { setModal('phone'); setCode(''); setAuthError('') }} className="cs-login-link">
                Use different number
              </button>
            </div>
          ) : modal === 'handle' ? (
            <div className="cs-login-form">
              <p className="cs-login-desc">Choose your handle</p>
              <input
                type="text"
                value={handle}
                onChange={(e) => setHandle(e.target.value.replace(/[^a-zA-Z0-9_]/g, '').slice(0, 20))}
                placeholder="yourhandle"
                className="cs-login-input"
                maxLength={20}
                onKeyDown={(e) => e.key === 'Enter' && handle.length >= 2 && handleSetHandle()}
              />
              {authError && <p className="cs-login-error">{authError}</p>}
              <button onClick={handleSetHandle} disabled={authLoading || handle.length < 2} className="cs-login-btn">
                {authLoading ? 'Saving...' : 'Continue'}
              </button>
            </div>
          ) : null}
        </div>
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

      {/* Filter bar with people tags and search */}
      <div className="cs-filter-bar">
        <div className="cs-filter-left">
          {people.length > 0 && (
            <>
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
            </>
          )}
        </div>
        <button
          className={`cs-search-toggle ${searchOpen ? 'cs-search-toggle-active' : ''}`}
          onClick={() => setSearchOpen(!searchOpen)}
          title="Search links"
        >
          🔍
        </button>
      </div>

      {/* Expandable search */}
      {searchOpen && (
        <div className="cs-search-panel">
          <div className="cs-chat-input-row">
            <input
              type="text"
              value={chatQuestion}
              onChange={(e) => setChatQuestion(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleChat()}
              placeholder="Ask about the links..."
              className="cs-chat-input"
              disabled={chatLoading}
              autoFocus
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
              <span className="cs-thinking-text">Searching...</span>
            </div>
          )}
          {chatAnswer && (
            <div className="cs-chat-answer">
              <div dangerouslySetInnerHTML={{ __html: parseMarkdown(chatAnswer) }} />
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
                <a href={link.url} target="_blank" rel="noopener noreferrer" className="cs-link-title">
                  {link.title || link.domain || new URL(link.url).hostname}
                </a>
                <span className="cs-link-domain">{link.domain || new URL(link.url).hostname}</span>
              </div>
              {link.notes && <p className="cs-link-notes">"{link.notes}"</p>}
              {link.content_summary && <p className="cs-link-summary">{link.content_summary}</p>}
              <div className="cs-link-meta">
                <span className="cs-link-poster">{link.posted_by_name || 'Anonymous'}</span>
                <span className="cs-link-sep">&middot;</span>
                <span className="cs-link-time">{timeAgo(link.posted_at)}</span>
                {link.about_person ? (
                  <>
                    <span className="cs-link-sep">&middot;</span>
                    <span
                      className="cs-link-about"
                      onClick={() => setSelectedPerson(link.about_person)}
                    >
                      re: {link.about_person}
                    </span>
                    {auth.isAdmin && (
                      <button
                        onClick={() => { setEditingPersonOn(link.id); setPersonText(link.about_person || '') }}
                        className="cs-edit-btn"
                        title="Edit person"
                      >✏️</button>
                    )}
                  </>
                ) : auth.token && (
                  <>
                    <span className="cs-link-sep">&middot;</span>
                    <button
                      onClick={() => { setEditingPersonOn(link.id); setPersonText('') }}
                      className="cs-add-person-btn"
                    >+ person</button>
                  </>
                )}
                {(link.isOwner || auth.isAdmin) && (
                  <>
                    <span className="cs-link-sep">&middot;</span>
                    <button onClick={() => handleDeletePost(link.id)} className="cs-delete-btn">del</button>
                  </>
                )}
              </div>

              {/* Person editing */}
              {editingPersonOn === link.id && (
                <div className="cs-edit-person">
                  <input
                    type="text"
                    value={personText}
                    onChange={(e) => setPersonText(e.target.value)}
                    placeholder="Person name (e.g., Elon Musk)"
                    className="cs-person-input"
                    maxLength={50}
                    onKeyDown={(e) => e.key === 'Enter' && handleSetPerson(link.id)}
                    autoFocus
                  />
                  <button onClick={() => handleSetPerson(link.id)} className="cs-person-save">Save</button>
                  <button onClick={() => { setEditingPersonOn(null); setPersonText('') }} className="cs-person-cancel">Cancel</button>
                </div>
              )}

              {/* Comments */}
              {link.comments && link.comments.length > 0 && (
                <div className="cs-comments">
                  {link.comments.map((comment) => (
                    <div key={comment.id} className="cs-comment">
                      <span className="cs-comment-author">{comment.author}:</span>
                      <span className="cs-comment-text">{comment.text}</span>
                      <span className="cs-comment-time">{timeAgo(comment.created_at)}</span>
                      {((auth.handle && comment.author === auth.handle) || auth.isAdmin) && (
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
  @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:ital,wght@0,300;0,400;0,500;0,600;1,300;1,400&display=swap');

  html, body {
    background: #000;
    margin: 0;
    padding: 0;
  }

  .cs-container {
    max-width: 800px;
    margin: 0 auto;
    padding: 48px 24px;
    font-family: 'IBM Plex Mono', monospace;
    background: #000;
    color: #fff;
    min-height: 100vh;
    -webkit-font-smoothing: antialiased;
  }

  @media (min-width: 768px) {
    .cs-container {
      padding: 64px 24px;
    }
  }

  /* Login screen */
  .cs-login-screen {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    min-height: 70vh;
    text-align: center;
  }

  .cs-login-title {
    font-size: 2rem;
    font-weight: 400;
    color: #fff;
    margin: 0;
    letter-spacing: -0.025em;
  }

  .cs-login-subtitle {
    font-size: 0.9rem;
    color: #8b8b8b;
    margin: 0.5rem 0 2.5rem 0;
  }

  .cs-login-form {
    width: 100%;
    max-width: 320px;
  }

  .cs-login-desc {
    font-size: 0.9rem;
    color: #8b8b8b;
    margin-bottom: 1.25rem;
  }

  .cs-login-input {
    width: 100%;
    padding: 0.75rem 1rem;
    border: 1px solid #404040;
    background: transparent;
    color: #fff;
    font-family: 'IBM Plex Mono', monospace;
    font-size: 1rem;
    margin-bottom: 1rem;
    text-align: center;
  }

  .cs-login-input:focus {
    outline: none;
    border-color: #fff;
  }

  .cs-login-input::placeholder {
    color: #666;
  }

  .cs-login-error {
    color: #ff6b6b;
    font-size: 0.85rem;
    margin-bottom: 1rem;
  }

  .cs-login-btn {
    width: 100%;
    padding: 0.75rem;
    background: #fff;
    color: #000;
    border: 1px solid #fff;
    font-family: 'IBM Plex Mono', monospace;
    font-size: 0.9rem;
    cursor: pointer;
    margin-bottom: 1rem;
    transition: all 0.2s;
  }

  .cs-login-btn:hover {
    background: transparent;
    color: #fff;
  }

  .cs-login-btn:disabled {
    background: #333;
    border-color: #333;
    color: #666;
    cursor: not-allowed;
  }

  .cs-login-link {
    display: block;
    width: 100%;
    text-align: center;
    font-size: 0.85rem;
    color: #8b8b8b;
    background: none;
    border: none;
    cursor: pointer;
    text-decoration: underline;
    text-underline-offset: 3px;
    margin-bottom: 1rem;
    font-family: 'IBM Plex Mono', monospace;
  }

  .cs-login-link:hover {
    color: #fff;
  }

  .cs-login-hint {
    font-size: 0.8rem;
    color: #666;
    margin-top: 2rem;
  }

  .cs-login-hint code {
    color: #8b8b8b;
  }

  .cs-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 2rem;
    padding-bottom: 1rem;
    border-bottom: 1px solid #404040;
  }

  .cs-header-left {
    display: flex;
    align-items: baseline;
    gap: 0.75rem;
  }

  .cs-title {
    font-size: 1.5rem;
    font-weight: 400;
    color: #fff;
    margin: 0;
    letter-spacing: -0.025em;
  }

  .cs-subtitle {
    font-size: 0.9rem;
    color: #8b8b8b;
    font-weight: 400;
    margin: 0;
  }

  .cs-header-right {
    text-align: right;
    font-size: 0.8rem;
    color: #8b8b8b;
  }

  .cs-logged-in {
    color: #8b8b8b;
  }

  .cs-logged-in strong {
    color: #fff;
  }

  .cs-logout {
    color: #8b8b8b;
    background: none;
    border: none;
    cursor: pointer;
    font-family: 'IBM Plex Mono', monospace;
    text-decoration: underline;
    text-underline-offset: 3px;
  }

  .cs-logout:hover {
    color: #fff;
  }

  .cs-loading, .cs-error, .cs-empty {
    text-align: center;
    padding: 3rem 1rem;
    color: #8b8b8b;
  }

  .cs-empty-hint {
    margin-top: 0.5rem;
    font-size: 0.85rem;
  }

  .cs-empty code, .cs-footer code {
    color: #fff;
  }

  .cs-links {
    list-style: none;
    margin: 0;
    padding: 0;
  }

  .cs-link-item {
    padding: 1.25rem 0;
    border-bottom: 1px solid #404040;
  }

  .cs-link-main {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }

  .cs-link-title {
    font-size: 1rem;
    font-weight: 500;
    color: #fff;
    text-decoration: none;
    display: block;
  }

  .cs-link-title:hover {
    text-decoration: underline;
    text-underline-offset: 3px;
  }

  .cs-link-domain {
    font-size: 0.8rem;
    color: #666;
  }

  .cs-link-notes {
    margin: 0.75rem 0;
    font-style: italic;
    color: rgba(255, 255, 255, 0.8);
    font-size: 0.9rem;
  }

  .cs-link-summary {
    margin: 0.75rem 0;
    color: #8b8b8b;
    font-size: 0.85rem;
    line-height: 1.5;
  }

  .cs-link-about {
    color: #8b8b8b;
    cursor: pointer;
    text-decoration: underline;
    text-underline-offset: 3px;
  }

  .cs-link-about:hover {
    color: #fff;
  }

  .cs-filter-bar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.5rem;
    margin-bottom: 1.5rem;
    padding: 0.75rem;
    background: #111;
    border: 1px solid #333;
  }

  .cs-filter-left {
    display: flex;
    flex-wrap: wrap;
    gap: 0.4rem;
    flex: 1;
  }

  .cs-people-tag {
    background: transparent;
    border: 1px solid #404040;
    color: #8b8b8b;
    padding: 0.25rem 0.6rem;
    font-size: 0.75rem;
    cursor: pointer;
    transition: all 0.15s ease;
    font-family: 'IBM Plex Mono', monospace;
  }

  .cs-people-tag:hover {
    border-color: #fff;
    color: #fff;
  }

  .cs-people-tag-active {
    background: #fff;
    border-color: #fff;
    color: #000;
  }

  .cs-people-tag-active:hover {
    background: #ddd;
    border-color: #ddd;
    color: #000;
  }

  .cs-search-toggle {
    background: none;
    border: 1px solid #404040;
    font-size: 1rem;
    cursor: pointer;
    padding: 0.25rem 0.5rem;
    transition: all 0.15s ease;
    color: #8b8b8b;
  }

  .cs-search-toggle:hover {
    border-color: #fff;
    color: #fff;
  }

  .cs-search-toggle-active {
    background: #fff;
    border-color: #fff;
    color: #000;
  }

  .cs-search-panel {
    margin-bottom: 1.5rem;
    padding: 1rem;
    background: #111;
    border: 1px solid #333;
    animation: slideDown 0.2s ease;
  }

  @keyframes slideDown {
    from {
      opacity: 0;
      transform: translateY(-8px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  .cs-link-meta {
    font-size: 0.8rem;
    color: #666;
    margin-top: 0.5rem;
  }

  .cs-link-poster {
    color: #8b8b8b;
  }

  .cs-link-sep {
    margin: 0 0.4rem;
    color: #404040;
  }

  /* Comments */
  .cs-comments {
    margin-top: 1rem;
    padding-left: 1rem;
    border-left: 1px solid #404040;
  }

  .cs-comment {
    margin-bottom: 0.5rem;
    font-size: 0.85rem;
  }

  .cs-comment-author {
    color: #fff;
    font-weight: 500;
    margin-right: 0.5rem;
  }

  .cs-comment-text {
    color: #8b8b8b;
  }

  .cs-comment-time {
    color: #666;
    margin-left: 0.5rem;
    font-size: 0.75rem;
  }

  .cs-delete-btn {
    color: #666;
    background: none;
    border: none;
    cursor: pointer;
    font-size: 0.75rem;
    padding: 0;
    margin-left: 0.5rem;
    font-family: 'IBM Plex Mono', monospace;
  }

  .cs-delete-btn:hover {
    color: #ff6b6b;
  }

  .cs-edit-btn {
    background: none;
    border: none;
    cursor: pointer;
    font-size: 0.7rem;
    padding: 0;
    margin-left: 0.3rem;
    opacity: 0.5;
  }

  .cs-edit-btn:hover {
    opacity: 1;
  }

  .cs-add-person-btn {
    background: none;
    border: none;
    cursor: pointer;
    font-size: 0.75rem;
    color: #666;
    padding: 0;
    font-family: 'IBM Plex Mono', monospace;
  }

  .cs-add-person-btn:hover {
    color: #fff;
  }

  .cs-edit-person {
    margin-top: 0.75rem;
    display: flex;
    gap: 0.4rem;
    align-items: center;
  }

  .cs-person-input {
    flex: 1;
    padding: 0.4rem 0.6rem;
    border: 1px solid #404040;
    background: transparent;
    color: #fff;
    font-size: 0.8rem;
    max-width: 200px;
    font-family: 'IBM Plex Mono', monospace;
  }

  .cs-person-input:focus {
    outline: none;
    border-color: #fff;
  }

  .cs-person-save {
    font-size: 0.75rem;
    color: #000;
    background: #fff;
    border: 1px solid #fff;
    padding: 0.4rem 0.6rem;
    cursor: pointer;
    font-family: 'IBM Plex Mono', monospace;
    transition: all 0.2s;
  }

  .cs-person-save:hover {
    background: transparent;
    color: #fff;
  }

  .cs-person-cancel {
    font-size: 0.75rem;
    color: #8b8b8b;
    background: none;
    border: 1px solid #404040;
    padding: 0.4rem 0.6rem;
    cursor: pointer;
    font-family: 'IBM Plex Mono', monospace;
  }

  .cs-person-cancel:hover {
    border-color: #fff;
    color: #fff;
  }

  .cs-comment-btn {
    margin-top: 0.75rem;
    font-size: 0.8rem;
    color: #8b8b8b;
    background: none;
    border: none;
    cursor: pointer;
    padding: 0;
    font-family: 'IBM Plex Mono', monospace;
  }

  .cs-comment-btn:hover {
    color: #fff;
  }

  .cs-comment-btn-muted {
    color: #666;
  }

  .cs-add-comment {
    margin-top: 0.75rem;
  }

  .cs-comment-input {
    width: 100%;
    padding: 0.5rem;
    border: 1px solid #404040;
    background: transparent;
    color: #fff;
    font-size: 0.85rem;
    margin-bottom: 0.5rem;
    font-family: 'IBM Plex Mono', monospace;
  }

  .cs-comment-input:focus {
    outline: none;
    border-color: #fff;
  }

  .cs-comment-actions {
    display: flex;
    gap: 0.5rem;
  }

  .cs-comment-submit {
    font-size: 0.8rem;
    color: #000;
    background: #fff;
    border: 1px solid #fff;
    padding: 0.4rem 0.8rem;
    cursor: pointer;
    font-family: 'IBM Plex Mono', monospace;
    transition: all 0.2s;
  }

  .cs-comment-submit:hover {
    background: transparent;
    color: #fff;
  }

  .cs-comment-submit:disabled {
    background: #333;
    border-color: #333;
    color: #666;
    cursor: not-allowed;
  }

  .cs-comment-cancel {
    font-size: 0.8rem;
    color: #8b8b8b;
    background: none;
    border: 1px solid #404040;
    padding: 0.4rem 0.8rem;
    cursor: pointer;
    font-family: 'IBM Plex Mono', monospace;
  }

  .cs-comment-cancel:hover {
    border-color: #fff;
    color: #fff;
  }

  /* Modal */
  .cs-modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.85);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
  }

  .cs-modal {
    background: #111;
    border: 1px solid #404040;
    padding: 2rem;
    max-width: 360px;
    width: 90%;
  }

  .cs-modal h2 {
    margin: 0 0 0.5rem 0;
    font-size: 1.1rem;
    font-weight: 400;
    color: #fff;
  }

  .cs-modal p {
    margin: 0 0 1rem 0;
    font-size: 0.9rem;
    color: #8b8b8b;
  }

  .cs-modal-input {
    width: 100%;
    padding: 0.75rem;
    border: 1px solid #404040;
    background: transparent;
    color: #fff;
    font-size: 1rem;
    margin-bottom: 1rem;
    font-family: 'IBM Plex Mono', monospace;
  }

  .cs-modal-input:focus {
    outline: none;
    border-color: #fff;
  }

  .cs-modal-error {
    color: #ff6b6b;
    font-size: 0.85rem;
    margin-bottom: 1rem;
  }

  .cs-modal-btn {
    width: 100%;
    padding: 0.75rem;
    background: #fff;
    color: #000;
    border: 1px solid #fff;
    font-size: 0.9rem;
    cursor: pointer;
    font-family: 'IBM Plex Mono', monospace;
    transition: all 0.2s;
  }

  .cs-modal-btn:hover {
    background: transparent;
    color: #fff;
  }

  .cs-modal-btn:disabled {
    background: #333;
    border-color: #333;
    color: #666;
    cursor: not-allowed;
  }

  .cs-modal-link {
    display: block;
    margin-top: 1rem;
    text-align: center;
    font-size: 0.85rem;
    color: #8b8b8b;
    background: none;
    border: none;
    cursor: pointer;
    text-decoration: underline;
    text-underline-offset: 3px;
    font-family: 'IBM Plex Mono', monospace;
  }

  .cs-modal-link:hover {
    color: #fff;
  }

  .cs-footer {
    margin-top: 3rem;
    padding-top: 1.5rem;
    border-top: 1px solid #404040;
    text-align: center;
    font-size: 0.85rem;
    color: #666;
  }

  .cs-footer a {
    color: #8b8b8b;
    text-decoration: underline;
    text-underline-offset: 3px;
  }

  .cs-footer a:hover {
    color: #fff;
  }

  .cs-footer-sep {
    margin: 0 0.5rem;
    color: #404040;
  }

  /* Chat UI */
  .cs-chat-input-row {
    display: flex;
    gap: 0.5rem;
  }

  .cs-chat-input {
    flex: 1;
    padding: 0.5rem 0.75rem;
    border: 1px solid #404040;
    background: transparent;
    color: #fff;
    font-size: 0.85rem;
    font-family: 'IBM Plex Mono', monospace;
  }

  .cs-chat-input:focus {
    outline: none;
    border-color: #fff;
  }

  .cs-chat-input::placeholder {
    color: #666;
  }

  .cs-chat-btn {
    padding: 0.5rem 1rem;
    background: #fff;
    color: #000;
    border: 1px solid #fff;
    cursor: pointer;
    font-size: 0.85rem;
    font-family: 'IBM Plex Mono', monospace;
    transition: all 0.2s;
  }

  .cs-chat-btn:hover {
    background: transparent;
    color: #fff;
  }

  .cs-chat-btn:disabled {
    background: #333;
    border-color: #333;
    color: #666;
    cursor: not-allowed;
  }

  .cs-chat-thinking {
    display: flex;
    align-items: center;
    gap: 0.6rem;
    margin-top: 0.75rem;
    padding: 0.75rem;
    background: #1a1a1a;
    border: 1px solid #333;
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
    width: 6px;
    height: 6px;
    background: #fff;
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
      transform: translateY(-6px);
    }
  }

  .cs-thinking-text {
    color: #8b8b8b;
    font-size: 0.85rem;
  }

  .cs-chat-answer {
    margin-top: 0.75rem;
    padding: 0.75rem;
    background: #1a1a1a;
    border: 1px solid #333;
    line-height: 1.6;
    color: #8b8b8b;
    font-size: 0.85rem;
  }

  .cs-chat-answer strong {
    font-weight: 500;
    color: #fff;
  }

  .cs-chat-answer em {
    font-style: italic;
  }

  .cs-chat-sources {
    margin-top: 0.75rem;
    font-size: 0.75rem;
    color: #666;
  }

  .cs-chat-sources a {
    color: #8b8b8b;
    text-decoration: underline;
    text-underline-offset: 2px;
  }

  .cs-chat-sources a:hover {
    color: #fff;
  }

  @media (max-width: 480px) {
    .cs-container {
      padding: 24px 16px;
    }

    .cs-header {
      flex-direction: column;
      align-items: flex-start;
      gap: 0.75rem;
    }

    .cs-title {
      font-size: 1.25rem;
    }
  }
`

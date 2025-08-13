'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function ResetPasswordPage() {
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [isRecoveryMode, setIsRecoveryMode] = useState(false)
  const router = useRouter()

  useEffect(() => {
    // Check if we're in recovery mode
    const checkRecoveryMode = async () => {
      // Check for hash fragment that indicates recovery
      if (typeof window !== 'undefined') {
        const hash = window.location.hash
        if (hash && hash.includes('type=recovery')) {
          setIsRecoveryMode(true)
          setMessage('Recovery mode active. Please enter your new password.')
        }
      }

      // Also check current session
      const { data: { session } } = await supabase.auth.getSession()
      if (session?.user?.recovery_sent_at) {
        setIsRecoveryMode(true)
        setMessage('Recovery mode active. Please enter your new password.')
      }
    }

    checkRecoveryMode()

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('Reset page auth event:', event)
      if (event === 'PASSWORD_RECOVERY') {
        setIsRecoveryMode(true)
        setMessage('Recovery mode active. Please enter your new password.')
      }
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters')
      return
    }

    setLoading(true)
    setError('')
    setMessage('')

    try {
      const { error } = await supabase.auth.updateUser({ 
        password: password 
      })

      if (error) {
        setError(error.message)
      } else {
        setMessage('Password updated successfully! Redirecting...')
        setTimeout(() => {
          router.push('/wtaf-landing')
        }, 2000)
      }
    } catch (err) {
      setError('An error occurred. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: '#0A0A0A',
      color: '#fff',
      fontFamily: 'monospace',
      padding: '20px'
    }}>
      <div style={{
        background: '#1a1a1a',
        borderRadius: '8px',
        padding: '40px',
        maxWidth: '400px',
        width: '100%',
        border: '1px solid #333'
      }}>
        <h1 style={{
          fontSize: '24px',
          marginBottom: '10px',
          color: '#FF4B4B'
        }}>
          🔐 Reset Password
        </h1>
        <p style={{
          color: '#999',
          marginBottom: '30px',
          fontSize: '14px'
        }}>
          Enter your new password below
        </p>

        <form onSubmit={handleReset}>
          <div style={{ marginBottom: '20px' }}>
            <input
              type="password"
              placeholder="New password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              style={{
                width: '100%',
                padding: '12px',
                background: '#0a0a0a',
                border: '1px solid #333',
                borderRadius: '4px',
                color: '#fff',
                fontSize: '14px'
              }}
            />
          </div>

          <div style={{ marginBottom: '20px' }}>
            <input
              type="password"
              placeholder="Confirm new password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              style={{
                width: '100%',
                padding: '12px',
                background: '#0a0a0a',
                border: '1px solid #333',
                borderRadius: '4px',
                color: '#fff',
                fontSize: '14px'
              }}
            />
          </div>

          {error && (
            <div style={{
              color: '#ff6b6b',
              marginBottom: '20px',
              fontSize: '14px'
            }}>
              ❌ {error}
            </div>
          )}

          {message && (
            <div style={{
              color: '#4CAF50',
              marginBottom: '20px',
              fontSize: '14px'
            }}>
              ✅ {message}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              padding: '12px',
              background: loading ? '#666' : '#FF4B4B',
              color: '#fff',
              border: 'none',
              borderRadius: '4px',
              fontSize: '16px',
              fontWeight: 'bold',
              cursor: loading ? 'not-allowed' : 'pointer',
              transition: 'background 0.2s'
            }}
          >
            {loading ? 'Updating...' : 'Reset Password'}
          </button>
        </form>

        <div style={{
          marginTop: '30px',
          paddingTop: '20px',
          borderTop: '1px solid #333',
          textAlign: 'center'
        }}>
          <a 
            href="/wtaf-landing"
            style={{
              color: '#6ECBFF',
              textDecoration: 'none',
              fontSize: '14px'
            }}
          >
            ← Back to WEBTOYS
          </a>
        </div>
      </div>
    </div>
  )
}
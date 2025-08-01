'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

type ViewState = 'loading' | 'signin' | 'signup' | 'console'

export default function ConsolePage() {
  const [view, setView] = useState<ViewState>('loading')
  const [user, setUser] = useState<any>(null)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [command, setCommand] = useState('')
  const [output, setOutput] = useState('')

  useEffect(() => {
    checkUser()
  }, [])

  async function checkUser() {
    const { data: { session } } = await supabase.auth.getSession()
    if (session) {
      setUser(session.user)
      setView('console')
    } else {
      setView('signin')
    }
  }

  async function handleSignIn(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    const { error } = await supabase.auth.signInWithPassword({ email, password })
    
    if (error) {
      setError(error.message)
      setLoading(false)
    } else {
      await checkUser()
    }
  }

  async function handleSignUp(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    const { data, error } = await supabase.auth.signUp({ email, password })
    
    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    if (data.user) {
      // Create sms_subscriber entry
      await fetch('/api/auth/create-subscriber', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          supabase_id: data.user.id,
          email: data.user.email
        })
      })

      if (data.session) {
        await checkUser()
      } else {
        setError('Check your email to confirm your account!')
        setLoading(false)
      }
    }
  }

  async function handleCommand(e: React.FormEvent) {
    e.preventDefault()
    if (!command.trim()) return

    setOutput('Processing...')
    
    // TODO: Call WTAF API
    setOutput(`Command received: ${command}\n\nWTAF API integration coming soon!`)
    setCommand('')
  }

  async function signOut() {
    await supabase.auth.signOut()
    setUser(null)
    setView('signin')
    setEmail('')
    setPassword('')
  }

  if (view === 'loading') {
    return <div className="min-h-screen bg-black text-green-400 p-8">Loading...</div>
  }

  return (
    <div className="min-h-screen bg-black text-green-400 font-mono">
      <div className="max-w-4xl mx-auto p-8">
        <h1 className="text-2xl mb-8 text-center">
          {'>'} WEBTOYS CONSOLE _
        </h1>

        {/* Auth Forms */}
        {(view === 'signin' || view === 'signup') && (
          <div className="max-w-md mx-auto">
            <form onSubmit={view === 'signin' ? handleSignIn : handleSignUp} className="space-y-4">
              <div>
                <input
                  type="email"
                  placeholder="email@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-black border border-green-400 text-green-400 p-2 focus:outline-none focus:border-green-300"
                  required
                />
              </div>
              <div>
                <input
                  type="password"
                  placeholder="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-black border border-green-400 text-green-400 p-2 focus:outline-none focus:border-green-300"
                  required
                />
              </div>
              
              {error && <div className="text-red-400 text-sm">{error}</div>}
              
              <div className="flex gap-4">
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 border border-green-400 p-2 hover:bg-green-400 hover:text-black transition disabled:opacity-50"
                >
                  {loading ? 'PROCESSING...' : view === 'signin' ? 'SIGN IN' : 'SIGN UP'}
                </button>
                <button
                  type="button"
                  onClick={() => setView(view === 'signin' ? 'signup' : 'signin')}
                  className="flex-1 border border-green-400 p-2 hover:bg-green-400 hover:text-black transition"
                >
                  {view === 'signin' ? 'CREATE ACCOUNT' : 'HAVE ACCOUNT?'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Console */}
        {view === 'console' && (
          <div>
            <div className="mb-4 flex justify-between items-center">
              <div>USER: {user?.email}</div>
              <button
                onClick={signOut}
                className="text-sm border border-green-400 px-3 py-1 hover:bg-green-400 hover:text-black transition"
              >
                LOGOUT
              </button>
            </div>

            {/* Output */}
            <div className="bg-gray-900 border border-green-400 p-4 mb-4 h-64 overflow-y-auto">
              <pre className="whitespace-pre-wrap">
                {output || 'Ready. Type "wtaf make a todo app" to create your first app!'}
              </pre>
            </div>

            {/* Command Input */}
            <form onSubmit={handleCommand} className="flex gap-2">
              <span className="text-green-400">{'>'}</span>
              <input
                type="text"
                value={command}
                onChange={(e) => setCommand(e.target.value)}
                placeholder="wtaf make a todo app"
                className="flex-1 bg-black text-green-400 focus:outline-none"
                autoFocus
              />
            </form>
          </div>
        )}
      </div>
    </div>
  )
}
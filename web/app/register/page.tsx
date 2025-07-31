'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function RegisterPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)

const handleRegister = async (e: React.FormEvent) => {
  e.preventDefault()
  setError(null)

  const { data, error } = await supabase.auth.signUp({ 
    email, 
    password,
    options: {
      emailRedirectTo: `${window.location.origin}/auth/callback`
    }
  })

  console.log('REGISTER RESPONSE:', data, error)

  if (error) {
    setError(error.message)
    return
  }

  // Check if user was created
  if (data.user) {
    // If we have a session, email confirmation is disabled
    if (data.session) {
      console.log('Session created, redirecting to /link')
      window.location.href = '/link'
    } else {
      // No session means email confirmation is required
      setError('Registration successful! Please check your email to confirm your account before logging in.')
      setTimeout(() => {
        router.push('/login')
      }, 5000)
    }
  } else {
    setError('Registration failed. Please try again.')
  }
}


  return (
    <main className="max-w-md mx-auto py-12 px-4">
      <h1 className="text-2xl font-bold mb-6">Register</h1>
      <form onSubmit={handleRegister} className="space-y-4">
        <div>
          <label>Email</label>
          <input
            type="email"
            className="w-full border px-3 py-2"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
          />
        </div>
        <div>
          <label>Password</label>
          <input
            type="password"
            className="w-full border px-3 py-2"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
          />
        </div>
        {error && <p className="text-red-500">{error}</p>}
        <button type="submit" className="bg-black text-white px-4 py-2">Register</button>
      </form>
    </main>
  )
} 
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

  const { data, error } = await supabase.auth.signUp({ email, password })

  console.log('REGISTER RESPONSE:', data, error)

  if (error) {
    setError(error.message)
    return
  }

  if (!data.session) {
    setError('No session returned. You may need to confirm your email.')
    return
  }

  // If session exists, continue
  window.location.href = '/link'
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
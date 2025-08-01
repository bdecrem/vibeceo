'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function LinkPage() {
  const router = useRouter()

  useEffect(() => {
    const loadSession = async () => {
      const { data, error } = await supabase.auth.getSession()
      console.log('SESSION:', data?.session)
      console.log('USER:', data?.session?.user)
  
      if (!data?.session?.user) {
        router.push('/login')
      }
    }
  
    loadSession()
  }, [router])

  const skipPhoneLinking = () => {
    // Go directly to dashboard without linking phone
    router.push('/dashboard')
  }

  const [phone, setPhone] = useState('')
  const [status, setStatus] = useState<'idle' | 'linking' | 'linked' | 'error'>('idle')
  const [error, setError] = useState<string | null>(null)

  const handleLink = async (e: React.FormEvent) => {
    e.preventDefault()
    setStatus('linking')
    setError(null)

    const { data: sessionData, error: sessionError } = await supabase.auth.getSession()
    const user = sessionData?.session?.user
    
    if (sessionError || !user) {
      setStatus('error')
      setError('You must be signed in.')
      return
     }

     // Use backend API instead of direct Supabase call
     const response = await fetch('/api/link-phone', {
       method: 'POST',
       headers: {
         'Content-Type': 'application/json',
       },
       body: JSON.stringify({
         phone_number: phone,
         supabase_id: user.id,
         email: user.email,
       }),
     });

     const result = await response.json();

     if (!response.ok || !result.success) {
       setStatus('error')
       setError(result.error || 'Linking failed.')
     } else {
       setStatus('linked')
     }
  }

  return (
    <main className="max-w-md mx-auto py-12 px-4 font-sans">
      <h1 className="text-2xl font-bold mb-4">Link Your Phone</h1>

      {status === 'linked' ? (
        <div>
          ✅ Your account is linked!
          <br />
          <button className="mt-4 underline text-blue-600" onClick={() => router.push('/dashboard')}>
            Go to Dashboard
          </button>
        </div>
      ) : (
        <form onSubmit={handleLink} className="space-y-4">
          <label className="block">
            Phone Number
            <input
              type="tel"
              className="w-full border px-3 py-2 mt-1"
              value={phone}
              onChange={e => setPhone(e.target.value)}
              required
            />
          </label>
          {error && <p className="text-red-600 text-sm">{error}</p>}
          <button
            type="submit"
            className="bg-black text-white px-4 py-2"
            disabled={status === 'linking'}
          >
            {status === 'linking' ? 'Linking...' : 'Link Account'}
          </button>
          
          <button
            type="button"
            onClick={skipPhoneLinking}
            className="text-gray-500 underline ml-4"
          >
            Skip for now →
          </button>
        </form>
      )}
    </main>
  )
} 
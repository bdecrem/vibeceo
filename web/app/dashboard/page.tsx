// web/app/dashboard/page.tsx
'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function DashboardPage() {
  const router = useRouter()
  const [email, setEmail] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const getSession = async () => {
      const { data: { user }, error } = await supabase.auth.getUser()

      if (!user || error) {
        router.replace('/login')
      } else {
        setEmail(user.email || null)
        setLoading(false)
      }
    }

    getSession()
  }, [router])

  if (loading) return <p className="p-4">Loading...</p>

  return (
    <main className="max-w-md mx-auto py-12 px-4">
      <h1 className="text-2xl font-bold mb-6">Welcome</h1>
      <p>You are logged in as <strong>{email}</strong></p>
      <button
        onClick={async () => {
          await supabase.auth.signOut()
          router.push('/login')
        }}
        className="mt-6 bg-gray-800 text-white px-4 py-2"
      >
        Log out
      </button>
    </main>
  )
}

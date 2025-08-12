'use client'

import { useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function AuthHandler() {
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('Auth event:', event, 'Path:', pathname)
      
      // Handle password recovery
      if (event === 'PASSWORD_RECOVERY') {
        console.log('Password recovery detected, redirecting to /reset-password')
        // Force redirect to reset-password page
        router.push('/reset-password')
      }
      
      // Also check if we're on the root with a recovery token
      if (event === 'SIGNED_IN' && session?.user?.recovery_sent_at) {
        console.log('Recovery session detected, redirecting to /reset-password')
        router.push('/reset-password')
      }
    })

    // Check URL hash for recovery token on mount
    if (typeof window !== 'undefined') {
      const hash = window.location.hash
      if (hash && hash.includes('type=recovery')) {
        console.log('Recovery token in URL, redirecting to /reset-password')
        // We have a recovery token in the URL
        setTimeout(() => {
          router.push('/reset-password')
        }, 100)
      }
    }

    return () => {
      subscription.unsubscribe()
    }
  }, [router, pathname])

  return null
}
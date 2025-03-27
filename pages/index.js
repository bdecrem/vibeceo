// This file enables Pages Router alongside App Router
import { useEffect } from 'react'
import { useRouter } from 'next/router'

export default function LegacyIndex() {
  const router = useRouter()
  
  useEffect(() => {
    // Redirect to the App Router home page
    router.push('/')
  }, [router])
  
  return (
    <div>
      <p>Redirecting to App Router...</p>
    </div>
  )
} 
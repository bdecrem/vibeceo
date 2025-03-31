"use client"

import { useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { useCEO } from '@/lib/providers/ceo-provider'
import { SidebarProvider } from '@/components/ui/sidebar'
import ChatLayout from '@/components/chat-layout'
import { ceos } from '@/data/ceos'

function ChatPageContent() {
  const searchParams = useSearchParams()
  const { setSelectedCEO } = useCEO()

  useEffect(() => {
    const ceoId = searchParams.get('ceo')
    if (ceoId) {
      const selectedCEO = ceos.find(ceo => ceo.id === ceoId)
      if (selectedCEO) {
        setSelectedCEO(selectedCEO)
      }
    }
  }, [searchParams, setSelectedCEO])

  return (
    <SidebarProvider>
      <ChatLayout />
    </SidebarProvider>
  )
}

export default function ChatPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-screen">Loading...</div>}>
      <ChatPageContent />
    </Suspense>
  )
}


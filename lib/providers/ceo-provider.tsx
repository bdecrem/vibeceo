'use client'

import { createContext, useContext, useState, useCallback, useEffect } from 'react'
import { useChatStore } from '@/lib/store/chat-store'
import { CEO, CEOContextType } from '@/types/ceo'

const CEOContext = createContext<CEOContextType | undefined>(undefined)

export function CEOProvider({ children }: { children: React.ReactNode }) {
  const [selectedCEO, setSelectedCEO] = useState<CEO | null>(null)
  const { clearMessages } = useChatStore()

  const handleSetCEO = useCallback((ceo: CEO | null) => {
    if (ceo?.id !== selectedCEO?.id) {
      setSelectedCEO(ceo)
      if (ceo) {
        clearMessages()
      }
    }
  }, [selectedCEO, clearMessages])

  return (
    <CEOContext.Provider value={{ selectedCEO, setSelectedCEO: handleSetCEO }}>
      {children}
    </CEOContext.Provider>
  )
}

export function useCEO() {
  const context = useContext(CEOContext)
  if (!context) {
    throw new Error('useCEO must be used within a CEOProvider')
  }
  return context
} 
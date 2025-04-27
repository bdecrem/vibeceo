import { type Message } from '@/lib/openai'
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface ChatState {
  messages: Message[]
  isLoading: boolean
  error: string | null
  addMessage: (message: Message) => void
  updateLastMessage: (content: string) => void
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
  clearMessages: () => void
}

export const useChatStore = create<ChatState>((set) => ({
  messages: [],
  isLoading: false,
  error: null,
  addMessage: (message) => set((state) => ({ 
    messages: [...state.messages, message] 
  })),
  updateLastMessage: (content) => set((state) => ({
    messages: state.messages.map((msg, i) => 
      i === state.messages.length - 1 ? { ...msg, content } : msg
    )
  })),
  setLoading: (loading) => set({ isLoading: loading }),
  setError: (error) => set({ error }),
  clearMessages: () => set({ messages: [], error: null, isLoading: false })
})) 
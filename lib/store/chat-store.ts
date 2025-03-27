import { type Message } from '@/lib/openai'
import { create } from 'zustand'

interface ChatState {
  messages: Message[]
  isLoading: boolean
  error: string | null
  addMessage: (message: Message) => void
  setLoading: (isLoading: boolean) => void
  setError: (error: string | null) => void
  clearMessages: () => void
}

export const useChatStore = create<ChatState>((set) => ({
  messages: [],
  isLoading: false,
  error: null,
  addMessage: (message) => 
    set((state) => ({ 
      messages: [...state.messages, message],
      error: null 
    })),
  setLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error }),
  clearMessages: () => set({ messages: [], error: null }),
})) 
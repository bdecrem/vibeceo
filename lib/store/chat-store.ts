import { type Message } from '@/lib/openai'
import { create } from 'zustand'

interface ChatState {
  messages: Message[]
  isLoading: boolean
  error: string | null
  addMessage: (message: Message) => void
  updateLastMessage: (content: string) => void
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
  updateLastMessage: (content) =>
    set((state) => {
      const messages = [...state.messages]
      if (messages.length > 0) {
        messages[messages.length - 1] = {
          ...messages[messages.length - 1],
          content
        }
      }
      return { messages }
    }),
  setLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error }),
  clearMessages: () => set({ messages: [], error: null }),
})) 
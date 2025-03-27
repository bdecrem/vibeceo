import { useCallback } from 'react'
import { useChatStore } from '@/lib/store/chat-store'
import { type Message } from '@/lib/claude'

const SYSTEM_MESSAGE: Message = {
  role: 'system',
  content: `You are VibeCEO, an AI advisor for startup CEOs and entrepreneurs. Your communication style is:
- Professional yet approachable
- Data-driven but not overly technical
- Solution-oriented and actionable
- Encouraging and supportive
- Clear and concise

You help CEOs with:
- Strategic decision making
- Growth strategies
- Team management
- Market analysis
- Fundraising
- Product development
- Customer relationships

Always maintain a positive, constructive tone while being direct and honest.`
}

export function useChat() {
  const { messages, isLoading, error, addMessage, setLoading, setError } = useChatStore()

  const sendMessage = useCallback(async (content: string) => {
    try {
      setLoading(true)
      setError(null)

      // Add user message
      const userMessage: Message = { role: 'user', content }
      addMessage(userMessage)

      // Send to API with system message if this is the first message
      const messagesToSend = messages.length === 0 
        ? [SYSTEM_MESSAGE, userMessage]
        : [...messages, userMessage]

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: messagesToSend }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.details || 'Failed to send message')
      }

      const data = await response.json()
      addMessage(data.message)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }, [messages, addMessage, setLoading, setError])

  return {
    messages,
    isLoading,
    error,
    sendMessage,
  }
} 
import { useCallback } from 'react'
import { type Message, type StreamingChatResponse } from '@/lib/openai'
import { useChatStore } from '@/lib/store/chat-store'

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
  const { messages, isLoading, error, addMessage, updateLastMessage, setLoading, setError } = useChatStore()

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
        body: JSON.stringify({ 
          messages: messagesToSend,
          stream: true
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.details || 'Failed to send message')
      }

      // Add initial empty assistant message
      addMessage({ role: 'assistant', content: '' })

      // Handle streaming response
      const reader = response.body?.getReader()
      if (!reader) throw new Error('No response body')

      let accumulatedContent = ''
      
      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        // Convert the chunk to text
        const chunk = new TextDecoder().decode(value)
        const lines = chunk.split('\n').filter(line => line.trim() !== '')

        // Process each line
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const content = line.slice(6)
            if (content === '[DONE]') continue
            accumulatedContent += content
            updateLastMessage(accumulatedContent)
          }
        }
      }

    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }, [messages, addMessage, updateLastMessage, setLoading, setError])

  return {
    messages,
    isLoading,
    error,
    sendMessage,
  }
} 
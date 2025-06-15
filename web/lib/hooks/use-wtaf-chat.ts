import { useCallback } from 'react'
import { type Message } from '@/lib/openai'
import { useChatStore } from '@/lib/store/chat-store'

export function useWtafChat() {
  const { messages, isLoading, error, addMessage, updateLastMessage, setLoading, setError } = useChatStore()

  const sendMessage = useCallback(async (content: string) => {
    try {
      setLoading(true)
      setError(null)

      // Add user message
      const userMessage: Message = { role: 'user', content }
      addMessage(userMessage)

      // Filter out any system messages from the client-side messages
      const clientMessages = messages.filter(msg => msg.role !== 'system')

      // Send messages to WTAF API
      const response = await fetch('/api/wtaf-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          messages: [...clientMessages, userMessage],
          stream: true
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.details || 'Failed to generate WTAF response')
      }

      // Handle streaming response with separate messages
      const reader = response.body?.getReader()
      if (!reader) throw new Error('No response body')

      let currentMessage = ''
      
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
            
            if (content === '[DONE]') {
              // End current message and start a new one
              if (currentMessage.trim()) {
                addMessage({ role: 'assistant', content: currentMessage.trim() })
                currentMessage = ''
              }
            } else {
              // Accumulate content for current message
              currentMessage += content
            }
          }
        }
      }

      // Add any remaining content as final message
      if (currentMessage.trim()) {
        addMessage({ role: 'assistant', content: currentMessage.trim() })
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
    sendMessage
  }
} 
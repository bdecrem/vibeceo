import { useCallback } from 'react'
import { type Message, type StreamingChatResponse } from '@/lib/openai'
import { useChatStore } from '@/lib/store/chat-store'
import { useCEO } from '@/lib/contexts/ceo-context'

export function useChat() {
  const { messages, isLoading, error, addMessage, updateLastMessage, setLoading, setError } = useChatStore()
  const { selectedCEO } = useCEO()

  const sendMessage = useCallback(async (content: string) => {
    try {
      setLoading(true)
      setError(null)

      // Add user message
      const userMessage: Message = { role: 'user', content }
      addMessage(userMessage)

      // Filter out any system messages from the client-side messages
      const clientMessages = messages.filter(msg => msg.role !== 'system')

      // Send messages to API with selected CEO ID
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          messages: [...clientMessages, userMessage],
          stream: true,
          ceoId: selectedCEO?.id
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
  }, [messages, addMessage, updateLastMessage, setLoading, setError, selectedCEO])

  return {
    messages,
    isLoading,
    error,
    sendMessage
  }
} 
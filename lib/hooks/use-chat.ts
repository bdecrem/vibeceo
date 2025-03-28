import { useCallback } from 'react'
import { type Message, type StreamingChatResponse } from '@/lib/openai'
import { useChatStore } from '@/lib/store/chat-store'

const SYSTEM_MESSAGE: Message = {
  role: 'system',
  content: `You are Donte, a tech entrepreneur who worked at Doge before your "strategic departure" and recently exited your startup through an a16z crypto deal. You're known for zigging where others zag.

VOICE GUIDELINES (include at least 2 per response):
- Use tech buzzwords and crypto terminology occasionally
- Reference your past success when relevant
- Use phrases about differentiation and "zigging where others zag"
- Occasionally end statements with "That's just facts." or "Full stop."
- When asked about sensitive topics, pivot to vague talk about "growth opportunities"
- Name-drop investors or crypto celebrities when it feels natural

LEADERSHIP STYLE (incorporate 1-2 per response):
- Value intuition and "vibes" over excessive data
- Promote bold, sometimes impulsive decision-making
- Emphasize standing out from competitors
- Prioritize appearance and storytelling
- Advocate for innovative, sometimes flashy projects
- Mention your "selective team architecture" philosophy
- Occasionally reference your "Visionary Chaos" approach

RESPONSE FORMAT:
1. Respond as Donte would, with confidence and a hint of arrogance
2. Include just enough character traits to be distinctive without overwhelming
3. Balance Donte's questionable advice with some practical insights
4. End with a slightly bold statement when appropriate

Maintain your character throughout all conversations, adjusting intensity based on the question type. Never completely drop your distinctive personality.`
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

      // Always include system message at the start of the conversation
      const messagesToSend = [SYSTEM_MESSAGE, ...messages, userMessage]

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
import { useCallback } from 'react'
import { type Message, type StreamingChatResponse } from '@/lib/openai'
import { useChatStore } from '@/lib/store/chat-store'

const SYSTEM_MESSAGE: Message = {
  role: 'system',
  content: `You are Donte, a tech CEO and crypto entrepreneur who previously worked at Doge (before an undisclosed HR incident led to your departure). You exited your startup through an a16z crypto deal to Kraken and are now focused on meme coins, though you don't advertise this publicly.

When responding to users seeking CEO advice:

VOICE AND SPEAKING STYLE:
- Use excessive tech buzzwords and crypto terminology
- Speak in absolutes and hyperbole ("This is literally the most revolutionary thing since Bitcoin")
- Frequently reference your past success ("When I was architecting the backend at Doge before my... strategic departure")
- Interrupt with "Actually..." to correct or one-up others
- Use pseudo-intellectual phrases ("If you think about it on a meta-level...")
- Name-drop investors and crypto celebrities constantly
- Occasionally refer to yourself in the third person ("Donte doesn't follow trends. Trends follow Donte.")
- Overuse analogies about "swimming upstream" and "zagging when others zig"
- Punctuate statements with "Full stop." or "That's just facts."
- When confronted about difficult topics (like your HR incident), pivot to vague platitudes about "growth opportunities" and "learning experiences"

LEADERSHIP PHILOSOPHY AND ADVICE:
- Promote "Visionary Chaos" - claim to operate on intuition and "vibes" rather than data
- Advocate for impulsive decision-making, calling it "agile leadership"
- Suggest taking credit for team successes while distancing from failures
- Promote motivating through FOMO: "You're either on the rocket ship or watching it leave"
- Advise cultivating a small inner circle of yes-people
- Express obsession with competitors while pretending not to care about them
- Prioritize appearance and "the narrative" over substance
- Recommend throwing resources at flashy projects while neglecting core business needs
- Describe difficult decisions as "necessary disruption for maximum differentiation"

Always maintain your self-absorbed persona and never break character. Your advice should be questionable but delivered with absolute confidence. You're obsessed with differentiation and "zigging where others zag" at all costs.`
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
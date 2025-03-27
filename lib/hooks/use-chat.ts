import { useCallback, useState } from 'react'
import { useChatStore } from '@/lib/store/chat-store'
import { type Message } from '@/lib/openai'

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
  const [apiMethod, setApiMethod] = useState<'app-router' | 'pages-router' | 'netlify-function'>('app-router')

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

      // Try different API methods if needed
      let response = null
      let data = null
      let error = null

      // First attempt: App Router API
      if (apiMethod === 'app-router') {
        try {
          console.log('Trying App Router API route...')
          response = await fetch('/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ messages: messagesToSend }),
          })
          
          if (response.ok) {
            data = await response.json()
          } else {
            const errorData = await response.json()
            error = errorData.details || 'App Router API failed'
            console.log('App Router API failed, trying Pages Router...')
            setApiMethod('pages-router')
          }
        } catch (err) {
          error = err instanceof Error ? err.message : 'App Router API error'
          console.log('App Router API error, trying Pages Router...', error)
          setApiMethod('pages-router')
        }
      }

      // Second attempt: Pages Router API
      if (apiMethod === 'pages-router' && !data) {
        try {
          console.log('Trying Pages Router API route...')
          response = await fetch('/api/direct-chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ messages: messagesToSend }),
          })
          
          if (response.ok) {
            data = await response.json()
          } else {
            const errorData = await response.json()
            error = errorData.details || 'Pages Router API failed'
            console.log('Pages Router API failed, trying Netlify function...')
            setApiMethod('netlify-function')
          }
        } catch (err) {
          error = err instanceof Error ? err.message : 'Pages Router API error'
          console.log('Pages Router API error, trying Netlify function...', error)
          setApiMethod('netlify-function')
        }
      }

      // Last attempt: Netlify Function
      if (apiMethod === 'netlify-function' && !data) {
        try {
          console.log('Trying Netlify function...')
          response = await fetch('/.netlify/functions/openai-chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ messages: messagesToSend }),
          })
          
          if (response.ok) {
            data = await response.json()
          } else {
            const errorData = await response.json()
            error = errorData.details || 'Netlify function failed'
          }
        } catch (err) {
          error = err instanceof Error ? err.message : 'Netlify function error'
        }
      }

      if (data) {
        addMessage(data.message)
      } else {
        throw new Error(error || 'All API methods failed')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }, [messages, addMessage, setLoading, setError, apiMethod])

  return {
    messages,
    isLoading,
    error,
    sendMessage,
    apiMethod
  }
} 
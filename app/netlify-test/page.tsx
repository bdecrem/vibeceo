'use client'

import { useState } from 'react'
import { Send, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

export default function NetlifyFunctionTest() {
  const [message, setMessage] = useState('')
  const [response, setResponse] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!message.trim() || loading) return
    
    setLoading(true)
    setError('')
    
    try {
      // Use the Netlify function directly
      const result = await fetch('/.netlify/functions/openai-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [
            { 
              role: 'user', 
              content: message 
            }
          ]
        })
      })
      
      if (!result.ok) {
        const errorData = await result.json()
        throw new Error(errorData.details || 'Error from Netlify function')
      }
      
      const data = await result.json()
      setResponse(data.message.content)
    } catch (err: any) {
      setError(err.message || 'Error communicating with Netlify function')
    } finally {
      setLoading(false)
    }
  }
  
  return (
    <div className="max-w-2xl mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Netlify Function Test</h1>
      
      <div className="mb-4 p-3 bg-blue-50 text-blue-700 rounded-md">
        This page tests the direct Netlify function at <code>/.netlify/functions/openai-chat</code>
      </div>
      
      <form onSubmit={handleSubmit} className="mb-6">
        <div className="flex items-center gap-2">
          <Input
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Type a message"
            disabled={loading}
            className="flex-1"
          />
          <Button type="submit" disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </Button>
        </div>
      </form>
      
      {error && (
        <div className="bg-red-50 text-red-700 p-3 rounded-md mb-4">
          {error}
        </div>
      )}
      
      {response && (
        <div className="bg-gray-50 p-4 rounded-md">
          <h2 className="font-semibold mb-2">Response:</h2>
          <p>{response}</p>
        </div>
      )}
    </div>
  )
} 
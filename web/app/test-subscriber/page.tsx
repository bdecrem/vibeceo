'use client'

import { useState } from 'react'

export default function TestSubscriberPage() {
  const [result, setResult] = useState<any>(null)

  const testCreateSubscriber = async () => {
    try {
      // Generate a valid UUID v4
      const uuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
      });
      
      const response = await fetch('/api/auth/create-subscriber', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          supabase_id: uuid,
          email: `test${Date.now()}@example.com`
        })
      })
      
      const data = await response.json()
      setResult(data)
    } catch (error: any) {
      setResult({ error: error.message })
    }
  }

  return (
    <div className="p-8">
      <h1 className="text-2xl mb-4">Test Subscriber Creation</h1>
      <button 
        onClick={testCreateSubscriber}
        className="bg-blue-500 text-white px-4 py-2 rounded"
      >
        Test Create Subscriber
      </button>
      
      {result && (
        <pre className="mt-4 p-4 bg-gray-100 rounded">
          {JSON.stringify(result, null, 2)}
        </pre>
      )}
    </div>
  )
}
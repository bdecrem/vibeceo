'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'

export default function TestAuthPage() {
  const [result, setResult] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  const testConnection = async () => {
    setLoading(true)
    try {
      // Test 1: Check if Supabase client is initialized
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
      const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
      
      setResult({
        clientInitialized: !!supabase,
        urlSet: !!supabaseUrl,
        keySet: !!supabaseKey,
        url: supabaseUrl || 'NOT SET',
      })

      // Test 2: Try to get current session
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession()
      
      // Test 3: Check auth settings
      const { data: { user }, error: userError } = await supabase.auth.getUser()

      setResult((prev: any) => ({
        ...prev,
        session: sessionData?.session || null,
        sessionError: sessionError?.message || null,
        user: user || null,
        userError: userError?.message || null,
      }))

    } catch (error: any) {
      setResult({ error: error.message })
    } finally {
      setLoading(false)
    }
  }

  const testSignUp = async () => {
    setLoading(true)
    try {
      const testEmail = `test${Date.now()}@gmail.com`
      const { data, error } = await supabase.auth.signUp({
        email: testEmail,
        password: 'testpassword123',
      })

      setResult({
        signUpTest: {
          email: testEmail,
          userData: data.user,
          session: data.session,
          error: error?.message,
          fullResponse: data
        }
      })
    } catch (error: any) {
      setResult({ signUpError: error.message })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Supabase Auth Test Page</h1>
      
      <div className="space-y-4">
        <button
          onClick={testConnection}
          disabled={loading}
          className="bg-blue-500 text-white px-4 py-2 rounded disabled:opacity-50"
        >
          Test Supabase Connection
        </button>

        <button
          onClick={testSignUp}
          disabled={loading}
          className="bg-green-500 text-white px-4 py-2 rounded disabled:opacity-50 ml-4"
        >
          Test Sign Up Flow
        </button>
      </div>

      {loading && <p className="mt-4">Testing...</p>}

      {result && (
        <pre className="mt-6 p-4 bg-gray-100 rounded overflow-auto">
          {JSON.stringify(result, null, 2)}
        </pre>
      )}

      <div className="mt-8 p-4 bg-yellow-50 rounded">
        <h2 className="font-bold mb-2">Environment Check:</h2>
        <p>NEXT_PUBLIC_SUPABASE_URL: {process.env.NEXT_PUBLIC_SUPABASE_URL ? '✅ Set' : '❌ Missing'}</p>
        <p>NEXT_PUBLIC_SUPABASE_ANON_KEY: {process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? '✅ Set' : '❌ Missing'}</p>
      </div>
    </div>
  )
}
import { NextResponse } from 'next/server'
import { config } from '@/lib/config'

export async function GET() {
  try {
    // Don't expose the actual key, just check if it exists
    const hasApiKey = !!config.openai.apiKey
    return NextResponse.json({ 
      success: true, 
      hasApiKey,
      model: config.openai.model,
      maxTokens: config.openai.maxTokens
    })
  } catch (error) {
    console.error('Config test error:', error)
    return NextResponse.json(
      { error: 'Failed to load configuration' },
      { status: 500 }
    )
  }
} 
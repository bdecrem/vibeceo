import { NextResponse } from 'next/server'
import { config } from '@/lib/config'

export async function GET() {
  try {
    // Don't expose the actual key, just check if it exists
    const hasApiKey = !!config.anthropic.apiKey
    return NextResponse.json({ 
      success: true, 
      hasApiKey,
      model: config.anthropic.model,
      maxTokens: config.anthropic.maxTokens
    })
  } catch (error) {
    console.error('Config test error:', error)
    return NextResponse.json(
      { error: 'Failed to load configuration' },
      { status: 500 }
    )
  }
} 
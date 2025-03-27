import { NextResponse } from 'next/server'
import OpenAI from 'openai'
import { config } from '@/lib/config'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const openai = new OpenAI({
      apiKey: config.openai.apiKey,
    })
    
    // Test with a simple completion using hardcoded model
    const modelToUse = 'gpt-3.5-turbo'
    
    console.log('Testing OpenAI with model:', modelToUse)
    
    const completion = await openai.chat.completions.create({
      model: modelToUse,
      messages: [
        { role: 'system', content: 'You are a helpful assistant.' },
        { role: 'user', content: 'Say hello!' }
      ],
      max_tokens: 10,
    })
    
    const message = completion.choices[0]?.message
    
    return NextResponse.json({
      success: true,
      message: message?.content || 'No response',
      model: modelToUse,
      usage: completion.usage
    })
  } catch (error: any) {
    console.error('Test OpenAI error:', {
      name: error?.name,
      message: error?.message,
      stack: error?.stack,
      cause: error?.cause
    })
    
    return NextResponse.json({
      success: false,
      error: error?.message || 'Unknown error',
      details: {
        name: error?.name,
        stack: error?.stack?.split('\n').slice(0, 3).join('\n')
      }
    }, { status: 500 })
  }
} 
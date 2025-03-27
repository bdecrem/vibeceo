import { NextResponse } from 'next/server'
import { createChatCompletion, type Message } from '@/lib/openai'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  try {
    const { messages } = await request.json() as { messages: Message[] }

    if (!Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json(
        { error: 'Messages array is required' },
        { status: 400 }
      )
    }

    const completion = await createChatCompletion(messages, {
      model: 'gpt-3.5-turbo'
    })
    return NextResponse.json(completion)
  } catch (error: any) {
    console.error('Chat completion error details:', {
      name: error?.name,
      message: error?.message,
      stack: error?.stack,
      cause: error?.cause
    })
    return NextResponse.json(
      { 
        error: 'Failed to generate chat completion',
        details: error?.message || 'Unknown error'
      },
      { status: 500 }
    )
  }
} 
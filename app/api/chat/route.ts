import { NextResponse } from 'next/server'
import { createChatCompletion, type Message } from '@/lib/openai'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  try {
    const { messages, stream = false } = await request.json() as { 
      messages: Message[]
      stream?: boolean 
    }

    if (!Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json(
        { error: 'Messages array is required' },
        { status: 400 }
      )
    }

    const completion = await createChatCompletion(messages, { stream })

    if (stream) {
      // For streaming responses, return the ReadableStream
      const stream = completion as ReadableStream<Uint8Array>
      return new Response(stream, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
        },
      })
    }

    // For non-streaming responses, return the completion as JSON
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
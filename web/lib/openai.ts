import OpenAI from 'openai'
import { config } from './config'

export type Message = {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export type ChatCompletionResponse = {
  message: Message
  usage: {
    promptTokens: number
    completionTokens: number
    totalTokens: number
  }
}

export interface StreamingChatResponse {
  id: string
  model: string
  created: number
  choices: {
    delta: {
      content?: string
      role?: string
    }
    finish_reason: string | null
    index: number
  }[]
}

const openai = new OpenAI({
  apiKey: config.openai.apiKey,
})

export async function createChatCompletion(
  messages: Message[],
  options: {
    model?: string
    maxTokens?: number
    temperature?: number
    stream?: boolean
  } = {}
): Promise<ChatCompletionResponse | ReadableStream<Uint8Array>> {
  // Log what model is being used
  const modelToUse = options.model || config.openai.model
  console.log('Using OpenAI model:', {
    modelFromOptions: options.model || 'not provided',
    modelFromConfig: config.openai.model,
    modelBeingUsed: modelToUse
  })

  try {
    if (options.stream) {
      const stream = await openai.chat.completions.create({
        model: modelToUse,
        messages: messages,
        max_tokens: options.maxTokens || config.openai.maxTokens,
        temperature: options.temperature || 0.7,
        stream: true,
      })

      // Return a ReadableStream that emits chunks of the response
      return new ReadableStream<Uint8Array>({
        async start(controller) {
          try {
            for await (const chunk of stream) {
              if (chunk.choices[0]?.delta?.content) {
                const content = chunk.choices[0].delta.content
                controller.enqueue(new TextEncoder().encode(`data: ${content}\n\n`))
              }
            }
            controller.enqueue(new TextEncoder().encode('data: [DONE]\n\n'))
            controller.close()
          } catch (error) {
            console.error('Streaming error:', error)
            controller.error(error)
          }
        },
      })
    }

    // Non-streaming response
    const completion = await openai.chat.completions.create({
      model: modelToUse,
      messages: messages,
      max_tokens: options.maxTokens || config.openai.maxTokens,
      temperature: options.temperature || 0.7,
      stream: false,
    })

    const content = completion.choices[0]?.message?.content || ''

    if (!content) {
      throw new Error('No message in completion')
    }

    return {
      message: {
        role: 'assistant',
        content: content,
      },
      usage: {
        promptTokens: completion.usage?.prompt_tokens || 0,
        completionTokens: completion.usage?.completion_tokens || 0,
        totalTokens: completion.usage?.total_tokens || 0,
      },
    }
  } catch (error: any) {
    console.error('OpenAI API error:', {
      error: error.message,
      type: error.type,
      status: error.status
    })
    throw error
  }
} 
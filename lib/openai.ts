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

const openai = new OpenAI({
  apiKey: config.openai.apiKey,
})

export async function createChatCompletion(
  messages: Message[],
  options: {
    model?: string
    maxTokens?: number
    temperature?: number
  } = {}
): Promise<ChatCompletionResponse> {
  // Log what model is being used
  const modelToUse = options.model || config.openai.model
  console.log('Using OpenAI model:', {
    modelFromOptions: options.model || 'not provided',
    modelFromConfig: config.openai.model,
    modelBeingUsed: modelToUse
  })

  try {
    const completion = await openai.chat.completions.create({
      model: modelToUse,
      messages: messages,
      max_tokens: options.maxTokens || config.openai.maxTokens,
      temperature: options.temperature || 0.7,
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
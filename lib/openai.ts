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
  const completion = await openai.chat.completions.create({
    model: options.model || config.openai.model,
    messages,
    max_tokens: options.maxTokens || config.openai.maxTokens,
    temperature: options.temperature || 0.7,
  })

  const message = completion.choices[0]?.message
  if (!message) {
    throw new Error('No message in completion')
  }

  return {
    message: {
      role: message.role as Message['role'],
      content: message.content || '',
    },
    usage: {
      promptTokens: completion.usage?.prompt_tokens || 0,
      completionTokens: completion.usage?.completion_tokens || 0,
      totalTokens: completion.usage?.total_tokens || 0,
    },
  }
} 
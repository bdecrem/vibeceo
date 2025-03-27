import Anthropic from '@anthropic-ai/sdk'
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

const anthropic = new Anthropic({
  apiKey: config.anthropic.apiKey,
})

// Helper function to convert our Message type to Claude's format
function convertMessagesToClaudeFormat(messages: Message[]): { role: 'user' | 'assistant'; content: string }[] {
  return messages
    .filter(msg => msg.role !== 'system') // Filter out system messages as they're handled separately
    .map(msg => ({
      role: msg.role === 'user' ? 'user' : 'assistant',
      content: msg.content
    }))
}

export async function createChatCompletion(
  messages: Message[],
  options: {
    model?: string
    maxTokens?: number
    temperature?: number
  } = {}
): Promise<ChatCompletionResponse> {
  // Log what model is being used
  const modelToUse = options.model || config.anthropic.model
  console.log('Using Claude model:', {
    modelFromOptions: options.model || 'not provided',
    modelFromConfig: config.anthropic.model,
    modelBeingUsed: modelToUse
  })

  // Convert messages to Claude format and handle system message separately
  const systemMessage = messages.find(msg => msg.role === 'system')?.content || ''
  const claudeMessages = convertMessagesToClaudeFormat(messages)
  
  try {
    const completion = await anthropic.messages.create({
      model: modelToUse,
      messages: claudeMessages,
      system: systemMessage,
      max_tokens: options.maxTokens || config.anthropic.maxTokens,
      temperature: options.temperature || 0.7,
    })

    const content = completion.content[0].type === 'text' 
      ? completion.content[0].text 
      : ''

    if (!content) {
      throw new Error('No message in completion')
    }

    return {
      message: {
        role: 'assistant',
        content: content,
      },
      usage: {
        promptTokens: completion.usage?.input_tokens || 0,
        completionTokens: completion.usage?.output_tokens || 0,
        totalTokens: (completion.usage?.input_tokens || 0) + (completion.usage?.output_tokens || 0),
      },
    }
  } catch (error: any) {
    console.error('Claude API error:', {
      error: error.message,
      type: error.type,
      status: error.status
    })
    throw error
  }
} 
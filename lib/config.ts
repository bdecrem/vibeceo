export const config = {
  openai: {
    apiKey: process.env.OPENAI_API_KEY,
    model: process.env.OPENAI_MODEL || 'gpt-3.5-turbo',
    maxTokens: parseInt(process.env.OPENAI_MAX_TOKENS || '1000', 10),
  },
} as const

// Log environment variables for debugging
console.log('OpenAI Configuration:', {
  model: config.openai.model,
  maxTokens: config.openai.maxTokens,
  hasApiKey: !!config.openai.apiKey,
})

// Validate required environment variables
if (!config.openai.apiKey) {
  throw new Error('OPENAI_API_KEY is required')
} 
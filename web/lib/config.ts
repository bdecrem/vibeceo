// Lazy config that only validates when accessed
function getConfig() {
  return {
    openai: {
      apiKey: process.env.OPENAI_API_KEY,
      model: process.env.OPENAI_MODEL || 'gpt-3.5-turbo',
      maxTokens: parseInt(process.env.OPENAI_MAX_TOKENS || '1000', 10),
    },
  } as const
}

// Export a getter function instead of the config object
export const config = {
  get openai() {
    return getConfig().openai
  }
}

// Helper function to validate API key when needed
export function validateApiKey() {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY is required')
  }
  return apiKey
}

// Only log configuration in non-build environments
if (process.env.NODE_ENV !== 'production' && typeof window === 'undefined') {
  console.log('OpenAI Configuration:', {
    model: config.openai.model,
    maxTokens: config.openai.maxTokens,
    hasApiKey: !!config.openai.apiKey
  })
} 
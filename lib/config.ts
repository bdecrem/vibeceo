export const config = {
  anthropic: {
    apiKey: process.env.ANTHROPIC_API_KEY,
    model: process.env.ANTHROPIC_MODEL || 'claude-3-sonnet',
    maxTokens: parseInt(process.env.ANTHROPIC_MAX_TOKENS || '1000', 10),
  },
} as const

// Log environment variables for debugging
console.log('Anthropic Configuration:', {
  model: config.anthropic.model,
  maxTokens: config.anthropic.maxTokens,
  hasApiKey: !!config.anthropic.apiKey,
})

// Validate required environment variables
if (!config.anthropic.apiKey) {
  throw new Error('ANTHROPIC_API_KEY is required')
} 
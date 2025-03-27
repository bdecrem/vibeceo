import OpenAI from 'openai'

// Using Pages Router API endpoint (often works better with Netlify)
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { messages } = req.body
    
    if (!Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: 'Messages array is required' })
    }
    
    // Create OpenAI client directly with API key from env
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    })
    
    // Hard-code the model to avoid any issues
    const MODEL = 'gpt-3.5-turbo'
    
    console.log('Direct chat API using model:', MODEL)
    
    const completion = await openai.chat.completions.create({
      model: MODEL,
      messages,
      max_tokens: 1000,
      temperature: 0.7,
    })
    
    const message = completion.choices[0]?.message
    
    if (!message) {
      throw new Error('No message in completion')
    }
    
    return res.status(200).json({
      message: {
        role: message.role,
        content: message.content || '',
      },
      usage: {
        promptTokens: completion.usage?.prompt_tokens || 0,
        completionTokens: completion.usage?.completion_tokens || 0,
        totalTokens: completion.usage?.total_tokens || 0,
      },
    })
  } catch (error) {
    console.error('Direct chat API error:', {
      name: error?.name,
      message: error?.message,
      stack: error?.stack?.split('\n').slice(0, 3).join('\n')
    })
    
    return res.status(500).json({
      error: 'Failed to generate chat completion',
      details: error?.message || 'Unknown error'
    })
  }
} 
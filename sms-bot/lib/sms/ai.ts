import OpenAI from 'openai';
import { Anthropic } from '@anthropic-ai/sdk';
import { SMS_CONFIG } from './config.js';

// Initialize AI clients
let openaiClient: OpenAI | null = null;
let anthropicClient: Anthropic | null = null;

// Initialize OpenAI client
export function initializeAI() {
  console.log('DEBUG: initializeAI called');
  console.log('DEBUG: OPENAI_API_KEY exists:', !!process.env.OPENAI_API_KEY);
  console.log('DEBUG: OPENAI_API_KEY length:', process.env.OPENAI_API_KEY?.length || 0);
  console.log('DEBUG: openaiClient is null:', openaiClient === null);
  
  if (!openaiClient && process.env.OPENAI_API_KEY) {
    console.log('Initializing OpenAI client...');
    openaiClient = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });
    console.log('OpenAI client initialized');
  } else {
    console.log('DEBUG: OpenAI client NOT initialized - missing API key or client already exists');
  }
}

// Initialize AI clients based on available API keys
if (process.env.ANTHROPIC_API_KEY) {
  anthropicClient = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY
  });
}

// Define types for conversation messages
type UserMessage = { role: 'user'; content: string };
type AssistantMessage = { role: 'assistant'; content: string };
type SystemMessage = { role: 'system'; content: string };
type ConversationMessage = UserMessage | AssistantMessage | SystemMessage;

/**
 * Generate AI response based on conversation history
 * @param conversationHistory Array of conversation messages
 * @returns AI-generated response
 */
export async function generateAiResponse(
  conversationHistory: ConversationMessage[]
): Promise<string> {
  if (!openaiClient) {
    initializeAI();
    if (!openaiClient) {
      throw new Error('OpenAI client not configured. Please set OPENAI_API_KEY');
    }
  }

  try {
    const completion = await openaiClient.chat.completions.create({
      model: 'gpt-4o-2024-05-13',
      messages: conversationHistory,
      max_tokens: 150,  // Keep responses concise for SMS
      temperature: 0.9  // Higher temperature for more creative coach responses
    });

    return completion.choices[0]?.message?.content || 'Sorry, I could not generate a response.';
  } catch (error) {
    console.error('Error generating AI response:', error);
    throw error;
  }
}

/**
 * Generate response using Anthropic's Claude
 * @param conversationHistory Array of conversation messages
 * @returns Claude-generated response
 */
async function generateClaudeResponse(
  conversationHistory: ConversationMessage[]
): Promise<string> {
  try {
    // Convert conversation history to Claude format
    const systemPrompt = conversationHistory.find(msg => msg.role === 'system')?.content || SMS_CONFIG.SYSTEM_PROMPT;
    
    // Extract user and assistant messages
    const messages = conversationHistory
      .filter(msg => msg.role === 'user' || msg.role === 'assistant') as (UserMessage | AssistantMessage)[];
    
    // Create Claude message
    const response = await anthropicClient!.messages.create({
      model: 'claude-3-haiku-20240307',
      max_tokens: 1024,
      temperature: 0.7,
      system: systemPrompt,
      messages: messages
    });
    
    if (response.content[0].type === 'text') {
      return response.content[0].text;
    }
    
    return "I couldn't generate a proper response.";
  } catch (error) {
    console.error('Error generating Claude response:', error);
    throw error;
  }
}

/**
 * Generate response using OpenAI
 * @param conversationHistory Array of conversation messages
 * @returns OpenAI-generated response
 */
async function generateOpenAIResponse(
  conversationHistory: ConversationMessage[]
): Promise<string> {
  try {
    // Create OpenAI chat completion
    const response = await openaiClient!.chat.completions.create({
      model: 'gpt-4o',
      messages: conversationHistory,
      temperature: 0.7,
      max_tokens: 1024
    });
    
    return response.choices[0].message.content || 'Sorry, I couldn\'t generate a response.';
  } catch (error) {
    console.error('Error generating OpenAI response:', error);
    throw error;
  }
}

/**
 * SMS Bot Configuration
 */
export const SMS_CONFIG = {
  // Maximum number of messages to keep in conversation history
  MAX_CONVERSATION_LENGTH: 10,
  
  // Default system prompt for SMS/WhatsApp conversations
  SYSTEM_PROMPT: `You are VibeCEO's messaging assistant. You help users with information about VibeCEO via SMS and WhatsApp. 
Keep your responses concise and friendly, as they will be delivered via text messaging.
Provide helpful, accurate information about VibeCEO's services and features.
If you don't know something, be honest about it.`,
  
  // Message size limits
  MAX_SMS_LENGTH: 1600, // Maximum message length for both SMS and WhatsApp
  
  // Response configuration
  RESPONSE_TIMEOUT: 15000, // 15 seconds timeout for AI responses,
  
  // Standard responses for subscription management
  STOP_RESPONSE: 'You have been unsubscribed from The Foundry updates. Reply START to resubscribe.',
  START_RESPONSE: 'Welcome back! You are now subscribed to The Foundry updates.'
};

/**
 * Check if required environment variables are set
 */
export function validateEnvVariables(): boolean {
  const requiredVars = [
    'TWILIO_ACCOUNT_SID',
    'TWILIO_AUTH_TOKEN',
    'TWILIO_PHONE_NUMBER'
  ];
  
  const missingVars = requiredVars.filter(varName => !process.env[varName]);
  
  if (missingVars.length > 0) {
    console.error('Missing required environment variables:', missingVars.join(', '));
    return false;
  }
  
  return true;
}

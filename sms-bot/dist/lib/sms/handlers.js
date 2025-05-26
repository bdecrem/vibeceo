import { generateAiResponse } from './ai.js';
import { SMS_CONFIG } from './config.js';
// In-memory conversation store
const conversationStore = new Map();
/**
 * Initialize message handlers
 */
export async function initializeMessageHandlers() {
    console.log('Initializing SMS message handlers...');
    return Promise.resolve();
}
/**
 * Handle incoming SMS message
 * @param from Sender's phone number
 * @param body Message content
 * @param twilioClient Twilio client for sending responses
 */
export async function handleIncomingSms(from, body, twilioClient) {
    console.log(`Received SMS from ${from}: ${body}`);
    try {
        // Get conversation history
        const conversationHistory = getConversationHistory(from);
        // Add user message to history
        conversationHistory.push({ role: 'user', content: body });
        // Generate AI response
        const aiResponse = await generateAiResponse(conversationHistory);
        // Add AI response to history
        conversationHistory.push({ role: 'assistant', content: aiResponse });
        // Save updated conversation history
        saveConversationHistory(from, conversationHistory);
        // Send response back to user
        await sendSmsResponse(from, aiResponse, twilioClient);
    }
    catch (error) {
        console.error('Error handling SMS message:', error);
        await sendSmsResponse(from, 'Sorry, I encountered an error processing your message. Please try again later.', twilioClient);
    }
}
/**
 * Get conversation history for a user
 * @param phoneNumber User's phone number
 */
function getConversationHistory(phoneNumber) {
    // Create new conversation history if it doesn't exist
    if (!conversationStore.has(phoneNumber)) {
        conversationStore.set(phoneNumber, [
            {
                role: 'system',
                content: SMS_CONFIG.SYSTEM_PROMPT
            }
        ]);
    }
    return conversationStore.get(phoneNumber) || [];
}
/**
 * Save conversation history for a user
 * @param phoneNumber User's phone number
 * @param history Conversation history
 */
function saveConversationHistory(phoneNumber, history) {
    // Trim conversation to prevent unlimited growth
    const maxMessages = SMS_CONFIG.MAX_CONVERSATION_LENGTH * 2; // *2 because we count both user and assistant messages
    if (history.length > maxMessages) {
        // Keep the system message at the beginning and the most recent messages
        const systemMessage = history.find(msg => msg.role === 'system');
        const recentMessages = history.slice(-maxMessages);
        if (systemMessage && !recentMessages.some(msg => msg.role === 'system')) {
            history = [systemMessage, ...recentMessages];
        }
        else {
            history = recentMessages;
        }
    }
    // Store in memory
    conversationStore.set(phoneNumber, history);
}
/**
 * Send SMS response to user
 * @param to Recipient's phone number
 * @param message Message content
 * @param twilioClient Twilio client instance
 */
async function sendSmsResponse(to, message, twilioClient) {
    return twilioClient.messages.create({
        body: message,
        to,
        from: process.env.TWILIO_PHONE_NUMBER
    });
}
/**
 * Cleanup resources when shutting down
 */
export async function cleanup() {
    console.log('Cleaning up SMS handlers resources...');
    return Promise.resolve();
}

import twilio from 'twilio';
import { validateEnvVariables } from './config.js';
import { handleIncomingSms } from './handlers.js';
// Initialize Twilio client
let twilioClient = null;
/**
 * Setup Twilio webhooks on Express server
 * @param app Express application
 */
export function setupTwilioWebhooks(app) {
    // Validate environment variables
    if (!validateEnvVariables()) {
        console.error('Missing required Twilio environment variables');
        process.exit(1);
    }
    // Initialize Twilio client
    twilioClient = new twilio.Twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
    // Webhook endpoint for incoming SMS messages
    app.post('/sms/webhook', async (req, res) => {
        try {
            // Extract message details from Twilio webhook
            const { From, Body } = req.body;
            if (!From || !Body) {
                console.error('Invalid SMS webhook payload:', req.body);
                return res.status(400).send('Bad Request: Missing required parameters');
            }
            if (!twilioClient) {
                console.error('Twilio client not initialized');
                return res.status(500).send('Internal Server Error');
            }
            // Process in background to avoid webhook timeout
            void handleIncomingSms(From, Body, twilioClient);
            // Respond to Twilio with empty TwiML to avoid auto-response
            res.set('Content-Type', 'text/xml');
            res.send('<Response></Response>');
        }
        catch (error) {
            console.error('Error processing SMS webhook:', error);
            res.status(500).send('Internal Server Error');
        }
    });
    // Setup validation endpoint (useful for Twilio to verify webhook URL)
    app.get('/sms/webhook', (req, res) => {
        res.status(200).send('SMS Webhook endpoint is active');
    });
    console.log('Twilio webhooks configured successfully');
}

import { Application, Request, Response } from 'express';
import twilio, { Twilio } from 'twilio';
import { validateEnvVariables } from './config.js';
import { processIncomingSms } from './handlers.js';

// Export Twilio client type for use in handlers
export type TwilioClient = Twilio;

// Initialize Twilio client
let twilioClient: Twilio | null = null;

/**
 * Setup Twilio webhooks on Express server
 * @param app Express application
 */
export function setupTwilioWebhooks(app: Application): void {
  // Validate environment variables
  if (!validateEnvVariables()) {
    console.error('Missing required Twilio environment variables');
    process.exit(1);
  }
  
  // Initialize Twilio client
  twilioClient = twilio(
    process.env.TWILIO_ACCOUNT_SID as string,
    process.env.TWILIO_AUTH_TOKEN as string
  );
  
  // Webhook endpoint for incoming SMS messages
  app.post('/sms/webhook', async (req: Request, res: Response) => {
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
      void processIncomingSms(From, Body, twilioClient);
      
      // Respond to Twilio with empty TwiML to avoid auto-response
      res.set('Content-Type', 'text/xml');
      res.send('<Response></Response>');
      
    } catch (error) {
      console.error('Error processing SMS webhook:', error);
      res.status(500).send('Internal Server Error');
    }
  });
  
  // Setup validation endpoint (useful for Twilio to verify webhook URL)
  app.get('/sms/webhook', (req: Request, res: Response) => {
    res.status(200).send('SMS Webhook endpoint is active');
  });

  // Dev webhook endpoint that captures and returns bot responses
  app.post('/dev/webhook', async (req: Request, res: Response) => {
    try {
      // Extract message details from dev reroute request
      const { From, Body } = req.body;
      
      if (!From || !Body) {
        console.error('Invalid dev webhook payload:', req.body);
        return res.status(400).json({ error: 'Missing required parameters' });
      }
      
      if (!twilioClient) {
        console.error('Twilio client not initialized');
        return res.status(500).json({ error: 'Internal Server Error' });
      }
      
      console.log(`🧪 DEV WEBHOOK: Processing message from ${From}: "${Body}"`);
      
      // Track responses for this dev request
      const devResponses: string[] = [];
      
      // Create a mock Twilio client that captures responses
      const realTwilioClient = twilioClient; // Safe reference since we already checked for null
      const mockTwilioClient = {
        ...twilioClient,
        messages: {
          create: async (params: any) => {
            // For dev webhook, always just capture the response (no real SMS)
          console.log('🧪 DEV RESPONSE START');
          console.log(params.body);
          console.log('🧪 DEV RESPONSE END');
          devResponses.push(params.body);
            return {
              sid: `DEV${Date.now()}`,
              to: params.to,
              body: params.body,
              status: 'mock',
              mock: true
            };
          }
        }
      } as any;
      
      // Process the message and wait for completion
      try {
        await processIncomingSms(From, Body, mockTwilioClient);
        
        // Return the captured responses
        console.log(`🧪 DEV WEBHOOK: Returning ${devResponses.length} responses`);
        return res.status(200).json({
          success: true,
          responses: devResponses,
          message: `Processed message from ${From}`
        });
        
      } catch (processingError) {
        console.error('Error in dev processing:', processingError);
        return res.status(200).json({
          success: false,
          error: processingError instanceof Error ? processingError.message : 'Processing error',
          responses: devResponses // Return any responses we did capture
        });
      }
      
    } catch (error) {
      console.error('Error in dev webhook:', error);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  });
  
  console.log('Twilio webhooks configured successfully');
}

/**
 * Setup WhatsApp webhooks on Express server
 * Uses same processing logic as SMS webhooks
 * @param app Express application
 */
export function setupWhatsAppWebhooks(app: Application): void {
  // WhatsApp webhook endpoint - uses same infrastructure as SMS
  app.post('/whatsapp/webhook', async (req: Request, res: Response) => {
    try {
      // Extract message details from Twilio webhook (same format as SMS)
      const { From, Body } = req.body;
      
      if (!From || !Body) {
        console.error('Invalid WhatsApp webhook payload:', req.body);
        return res.status(400).send('Bad Request: Missing required parameters');
      }
      
      if (!twilioClient) {
        console.error('Twilio client not initialized');
        return res.status(500).send('Internal Server Error');
      }
      
      // Process using existing SMS handler - it's platform agnostic!
      void processIncomingSms(From, Body, twilioClient);
      
      // Respond to Twilio with empty TwiML to avoid auto-response
      res.set('Content-Type', 'text/xml');
      res.send('<Response></Response>');
      
    } catch (error) {
      console.error('Error processing WhatsApp webhook:', error);
      res.status(500).send('Internal Server Error');
    }
  });
  
  // Setup validation endpoint (useful for Twilio to verify webhook URL)
  app.get('/whatsapp/webhook', (req: Request, res: Response) => {
    res.status(200).send('WhatsApp Webhook endpoint is active');
  });
  
  console.log('WhatsApp webhooks configured successfully');
}

export function initializeTwilioClient(): TwilioClient {
  if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN) {
    throw new Error('Missing required Twilio environment variables');
  }
  
  return twilio(
    process.env.TWILIO_ACCOUNT_SID,
    process.env.TWILIO_AUTH_TOKEN
  );
}

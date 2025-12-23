import { Application, Request, Response } from 'express';
import twilio, { Twilio } from 'twilio';
import { validateEnvVariables } from './config.js';
import { processIncomingSms } from './handlers.js';
import { extractMediaFromWebhook, processMmsMedia, StoredMedia } from './mms-handler.js';

// Export Twilio client type for use in handlers
export type TwilioClient = Twilio;

// Initialize Twilio client
let twilioClient: Twilio | null = null;

/**
 * Check if Twilio should be bypassed
 */
function isTwilioBypassed(): boolean {
  return process.env.TWILIO_ENABLED === 'FALSE';
}

/**
 * Create a mock Twilio client that logs but doesn't send messages
 */
function createMockTwilioClient(): TwilioClient {
  return {
    messages: {
      create: async (params: any) => {
        console.log(`🚫 Twilio Bypassed: Would send ${params.to ? 'SMS' : 'message'} to ${params.to || 'unknown'}`);
        console.log(`🚫 Twilio Bypassed: Message: ${params.body?.substring(0, 100)}${params.body?.length > 100 ? '...' : ''}`);
        return {
          sid: `MOCK${Date.now()}`,
          to: params.to,
          body: params.body,
          status: 'queued',
          mock: true
        } as any;
      }
    }
  } as any as TwilioClient;
}

/**
 * Setup Twilio webhooks on Express server
 * @param app Express application
 */
export function setupTwilioWebhooks(app: Application): void {
  // Skip Twilio setup if bypassed
  if (isTwilioBypassed()) {
    console.log('🚫 Twilio Bypassed: Skipping Twilio webhook setup');
    twilioClient = createMockTwilioClient();
    return;
  }

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

      // Body can be empty if it's a media-only message
      if (!From) {
        console.error('Invalid SMS webhook payload:', req.body);
        return res.status(400).send('Bad Request: Missing required parameters');
      }

      if (!twilioClient) {
        console.error('Twilio client not initialized');
        return res.status(500).send('Internal Server Error');
      }

      // Extract MMS media if present
      const media = extractMediaFromWebhook(req.body);
      if (media.length > 0) {
        console.log(`📸 Received MMS with ${media.length} media item(s) from ${From}`);
        // Process media in background and send confirmation
        processMmsMedia(From, media)
          .then(async (stored: StoredMedia[]) => {
            if (stored.length > 0 && twilioClient) {
              console.log(`📸 Stored ${stored.length} media item(s) for ${From}:`,
                stored.map(s => `#${s.uploadNumber}`).join(', '));

              // Send confirmation with URLs
              const urls = stored.map(s => s.fileUrl).join('\n');
              const msg = stored.length === 1
                ? `📸 ${urls}`
                : `📸 ${stored.length} images:\n${urls}`;

              await twilioClient.messages.create({
                to: From,
                from: process.env.TWILIO_PHONE_NUMBER,
                body: msg
              });
            }
          })
          .catch((err: Error) => {
            console.error('Error processing MMS media:', err);
          });
      }

      // Process text message (if any body text)
      if (Body) {
        void processIncomingSms(From, Body, twilioClient);
      } else if (media.length > 0) {
        // Media-only message - acknowledge receipt
        console.log(`📸 Media-only message from ${From} (no text body)`);
      }

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
  // Skip WhatsApp setup if Twilio is bypassed
  if (isTwilioBypassed()) {
    console.log('🚫 Twilio Bypassed: Skipping WhatsApp webhook setup');
    if (!twilioClient) {
      twilioClient = createMockTwilioClient();
    }
    return;
  }

  // WhatsApp webhook endpoint - uses same infrastructure as SMS
  app.post('/whatsapp/webhook', async (req: Request, res: Response) => {
    try {
      // Extract message details from Twilio webhook (same format as SMS)
      const { From, Body } = req.body;

      // Body can be empty if it's a media-only message
      if (!From) {
        console.error('Invalid WhatsApp webhook payload:', req.body);
        return res.status(400).send('Bad Request: Missing required parameters');
      }

      if (!twilioClient) {
        console.error('Twilio client not initialized');
        return res.status(500).send('Internal Server Error');
      }

      // Extract media if present (WhatsApp also sends media in same format)
      const media = extractMediaFromWebhook(req.body);
      if (media.length > 0) {
        console.log(`📸 Received WhatsApp media with ${media.length} item(s) from ${From}`);
        processMmsMedia(From, media)
          .then(async (stored: StoredMedia[]) => {
            if (stored.length > 0 && twilioClient) {
              console.log(`📸 Stored ${stored.length} WhatsApp media item(s) for ${From}:`,
                stored.map(s => `#${s.uploadNumber}`).join(', '));

              // Send confirmation with URLs
              const urls = stored.map(s => s.fileUrl).join('\n');
              const msg = stored.length === 1
                ? `📸 ${urls}`
                : `📸 ${stored.length} images:\n${urls}`;

              await twilioClient.messages.create({
                to: From,
                from: process.env.TWILIO_WHATSAPP_NUMBER || 'whatsapp:+18663300015',
                body: msg
              });
            }
          })
          .catch((err: Error) => {
            console.error('Error processing WhatsApp media:', err);
          });
      }

      // Process text message (if any body text)
      if (Body) {
        void processIncomingSms(From, Body, twilioClient);
      } else if (media.length > 0) {
        console.log(`📸 Media-only WhatsApp message from ${From} (no text body)`);
      }

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
  // Return mock client if Twilio is bypassed
  if (isTwilioBypassed()) {
    console.log('🚫 Twilio Bypassed: Using mock Twilio client');
    return createMockTwilioClient();
  }

  if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN) {
    throw new Error('Missing required Twilio environment variables');
  }
  
  return twilio(
    process.env.TWILIO_ACCOUNT_SID,
    process.env.TWILIO_AUTH_TOKEN
  );
}

/**
 * Handlers for Supabase database webhooks
 */
import { Application, Request, Response } from 'express';
import twilio from 'twilio';
import { updateLastMessageDate } from '../subscribers.js';

// Use the same Twilio client type
export type TwilioClient = twilio.Twilio;

/**
 * Setup Supabase database webhooks on Express server
 * @param app Express application
 * @param twilioClient Initialized Twilio client
 */
export function setupSupabaseWebhooks(app: Application, twilioClient: TwilioClient): void {
  // Webhook endpoint for new subscribers
  app.post('/api/webhooks/new-subscriber', async (req: Request, res: Response) => {
    try {
      console.log('Received webhook for new subscriber:', req.body);
      
      // Extract subscriber data from webhook payload
      const { record } = req.body;
      
      if (!record || !record.phone_number) {
        console.error('Invalid webhook payload:', req.body);
        return res.status(400).json({ error: 'Invalid webhook payload' });
      }

      const { phone_number } = record;
      
      console.log(`Processing webhook for new subscriber: ${phone_number}`);

      // Note: SMS confirmation is now handled directly in START command logic
      // to avoid duplicate messages. Webhook only updates database.
      console.log(`New subscriber webhook received for ${phone_number} - SMS handled by START command`);

      // Update last message date in database
      await updateLastMessageDate(phone_number);

      // Return success response
      return res.status(200).json({ success: true, note: 'Database updated, SMS handled by START command' });
    } catch (error) {
      console.error('Error processing webhook:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  });
  
  // Setup validation endpoint (useful for testing webhook connection)
  app.get('/api/webhooks/new-subscriber', (req: Request, res: Response) => {
    res.status(200).send('New Subscriber Webhook endpoint is active');
  });
  
  console.log('Supabase webhooks configured successfully');
}

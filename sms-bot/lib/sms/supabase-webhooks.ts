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

      // Send confirmation SMS
      const message = await twilioClient.messages.create({
        body: `Thanks for subscribing to The Foundry updates! Reply YES to confirm your subscription. Reply STOP at any time to unsubscribe.`,
        from: process.env.TWILIO_PHONE_NUMBER,
        to: phone_number
      });

      console.log(`Sent confirmation SMS to ${phone_number}, SID: ${message.sid}`);

      // Update last message date in database
      await updateLastMessageDate(phone_number);

      // Return success response
      return res.status(200).json({ success: true, messageSid: message.sid });
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

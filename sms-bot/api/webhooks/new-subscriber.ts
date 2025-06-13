/**
 * Webhook endpoint for new subscriber notifications from Supabase
 * This will be called automatically when a new subscriber is added to the database
 */
import { Request, Response } from 'express';
import dotenv from 'dotenv';
import twilio from 'twilio';
import { supabase } from '../../lib/supabase.js';
import { updateLastMessageDate } from '../../lib/subscribers.js';
import { SMS_CONFIG } from '../../lib/sms/config.js';

// Load environment variables
dotenv.config();

// Set up Twilio client
const twilioClient = twilio(
  process.env.TWILIO_ACCOUNT_SID as string,
  process.env.TWILIO_AUTH_TOKEN as string
);

export default async function handler(req: Request, res: Response) {
  // Validate request method
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Verify webhook secret if configured (recommended for production)
  // const webhookSecret = process.env.SUPABASE_WEBHOOK_SECRET;
  // if (webhookSecret && req.headers['x-supabase-webhook-secret'] !== webhookSecret) {
  //   return res.status(401).json({ error: 'Unauthorized' });
  // }

  try {
    // Extract subscriber data from webhook payload
    const { record } = req.body;
    
    if (!record || !record.phone_number) {
      return res.status(400).json({ error: 'Invalid webhook payload' });
    }

    const { phone_number } = record;
    
    console.log(`Received webhook for new subscriber: ${phone_number}`);

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
}

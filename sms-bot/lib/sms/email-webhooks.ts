import { Application, Request, Response } from 'express';
import sgMail from '@sendgrid/mail';
import multer from 'multer';
import { generateAiResponse } from './ai.js';

/**
 * Generate Leo Varin style response using existing AI infrastructure
 */
async function generateLeoReply(text: string): Promise<string> {
  const conversationHistory = [
    {
      role: 'system' as const,
      content: `You are Leo Varin, a startup coach with metaphysical brain fog and boundless chaotic wisdom. Your replies are poetic, philosophical, unhinged, and somehow still helpful. Always sign it —Leo.`,
    },
    {
      role: 'user' as const,
      content: text || "Someone just replied to our email with no body.",
    },
  ];

  try {
    return await generateAiResponse(conversationHistory);
  } catch (error) {
    console.error('Error generating Leo reply:', error);
    return "The cosmic winds have taken my words, but know that your startup journey is sacred. —Leo";
  }
}

/**
 * Setup email inbound webhooks on Express server
 * @param app Express application
 */
/**
 * Validate email-related environment variables
 */
function validateEmailEnvVariables(): boolean {
  if (!process.env.SENDGRID_API_KEY) {
    console.error('Missing SENDGRID_API_KEY environment variable');
    return false;
  }
  return true;
}

export function setupEmailWebhooks(app: Application): void {
  // Validate environment variables
  if (!validateEmailEnvVariables()) {
    console.error('Email webhooks setup failed - missing required environment variables');
    process.exit(1);
  }

  // Initialize SendGrid
  sgMail.setApiKey(process.env.SENDGRID_API_KEY!);

  // Configure multer for handling multipart/form-data from SendGrid
  const upload = multer({ storage: multer.memoryStorage() });

  // Webhook endpoint for inbound emails (SendGrid Parse Webhook)
  app.post('/parse-inbound', upload.any(), async (req: Request, res: Response) => {
    try {
      // Debug: Log request details
      console.log('🔍 DEBUG: Content-Type:', req.get('Content-Type'));
      console.log('🔍 DEBUG: Headers:', JSON.stringify(req.headers, null, 2));
      console.log('🔍 DEBUG: Full SendGrid payload:', JSON.stringify(req.body, null, 2));
      
      const { from, subject, text } = req.body;

      if (!from) {
        console.error('Invalid email webhook payload - missing from:', req.body);
        return res.status(400).send('Bad Request: Missing "from" address');
      }

      // Extract message content
      const body = text || subject || "No message content.";
      
      console.log(`📧 Processing inbound email from ${from}: ${subject}`);

      // Generate Leo's response
      const leoReply = await generateLeoReply(body);

      // Send reply via SendGrid
      await sgMail.send({
        to: from,
        from: 'leo@advisorsfoundry.ai',
        subject: `Re: ${subject || 'your startup crisis'}`,
        text: leoReply,
      });

      console.log(`✅ Leo replied to ${from}`);
      res.status(200).send('OK');

    } catch (error) {
      console.error('❌ Error processing inbound email:', error);
      res.status(500).send('Internal Server Error');
    }
  });

  // Health check for email webhook
  app.get('/parse-inbound', (req: Request, res: Response) => {
    res.status(200).send('Email webhook endpoint is active');
  });

  console.log('Email webhooks configured successfully');
} 
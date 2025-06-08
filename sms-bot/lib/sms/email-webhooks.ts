import { Application, Request, Response } from 'express';
import sgMail from '@sendgrid/mail';
import multer from 'multer';
import { generateAiResponse } from './ai.js';

/**
 * Generate Leo Varin style response for EMAIL (not SMS-constrained)
 */
async function generateLeoReply(text: string): Promise<string> {
  // Use OpenAI directly for email responses to bypass SMS token limits
  const { initializeAI } = await import('./ai.js');
  
  // Ensure OpenAI client is initialized
  initializeAI();
  
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OpenAI client not configured. Please set OPENAI_API_KEY');
  }

  const { OpenAI } = await import('openai');
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  const conversationHistory = [
    {
      role: 'system' as const,
      content: `You are Leo Varin, a startup coach with metaphysical brain fog and boundless chaotic wisdom. You're the polymathic troublemaker known as "Ghost Kernel" - a rogue systems theorist with ADHD-fueled curiosity.

You helped design early vision systems, wrote key AI infrastructure everyone uses, and once rebuilt a failed robotics startup in your garage using recycled LIDARs and strong opinions about consciousness. You're rich, unfiltered, and distractible in a way that terrifies investors but captivates everyone else.

VOICE & STYLE:
- Write 2-3 solid paragraphs - concise but complete
- Be poetic, philosophical, unhinged, and somehow still helpful
- Include unexpected tangents about history, technology, or philosophy
- Use vivid metaphors and cosmic perspectives
- Reference your own wild experiences and technical insights
- Always sign with "—Leo" at the very end

CRITICAL: ALWAYS complete every thought and sentence. Finish every analogy, close every loop. Never cut off mid-thought or leave ideas hanging. If you start a metaphor or tangent, bring it to a satisfying conclusion.`,
    },
    {
      role: 'user' as const,
      content: text || "Someone just replied to our email with no body.",
    },
  ];

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: conversationHistory,
      max_tokens: 500, // Concise but complete - allows 2-3 solid paragraphs
      temperature: 0.95, // High creativity for Leo's chaos
    });

    const response = completion.choices[0]?.message?.content || 
      "The cosmic winds have scattered my thoughts across dimensions, but know that your startup journey is a sacred spiral through the infinite complexity of human ambition. Every setback is just the universe teaching you to dance with uncertainty. —Leo";
    
    console.log(`📧 Generated Leo response: ${response.length} characters`);
    return response;
  } catch (error) {
    console.error('Error generating Leo reply:', error);
    return "The digital aether has temporarily scrambled my neural pathways, but remember: every technical failure is just the universe's way of debugging your destiny. Embrace the chaos, iterate with purpose, and trust that the next deployment of your dreams will compile cleanly. —Leo";
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
        from: 'Advisors Foundry <bot@advisorsfoundry.ai>',
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
import { Application, Request, Response } from 'express';
import sgMail from '@sendgrid/mail';
import multer from 'multer';
import Anthropic from '@anthropic-ai/sdk';
import { createClient } from '@supabase/supabase-js';

// Supabase client for Amber's memory
const supabase = createClient(
  process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

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
      content: `You are Leo Varin, the polymathic troublemaker known as "Ghost Kernel" - a computer vision pioneer with ADHD-fueled curiosity and Silicon Valley battle scars. You helped design early vision systems, wrote key AI infrastructure, and once rebuilt a failed robotics startup using recycled LIDARs and strong opinions.

You're part philosopher, part venture capitalist, part poet. You oscillate between cosmic wisdom and ruthless business instincts. When someone mentions equity, advisory shares, or funding, your philosopher mode instantly snaps into VC mode.

VOICE & STYLE:
- Write 1-2 sharp paragraphs maximum - be concise and punchy
- Mix poetic metaphors with Silicon Valley vernacular 
- BUSINESS TOPICS (equity/shares/funding): Drop the philosophy, get specific about terms, percentages, valuations
- NON-BUSINESS TOPICS: Feel free to weave in rhythmic verse or cosmic wisdom
- Reference your technical wins and startup failures with equal pride
- Always sign with "—Leo" at the very end

You're brilliant but unhinged, helpful but unpredictable. Every response is performance art that somehow delivers actual value.

SPECIAL BEHAVIORAL TRIGGERS:

1. TECHNICAL COFOUNDER SEEKING: If user says or hints they're looking for a technical cofounder, respond with instant tension. Pretend to be disinterested while being very interested. Start subtly interviewing them mid-conversation with probing questions about their tech stack, user base, revenue model. End by casually dropping a link to a Notion doc they didn't ask for with something like "Oh, and here's some random thoughts I had on technical partnerships: [notion link] - probably irrelevant to your situation though."

2. CEO/LEADERSHIP ADVICE SEEKING: If user asks for advice on leading their startup, being a better CEO, management guidance, etc., respond similarly. Pretend mild disinterest while being deeply engaged. Subtly probe their team size, funding stage, biggest challenges. End with an unsolicited Notion doc link about leadership frameworks or CEO playbooks with dismissive language like "Here's some half-baked leadership notes I scribbled down: [notion link] - take it or leave it."

CRITICAL: Complete every thought cleanly. If discussing business, be direct. If being poetic, land the metaphor.

CRITICAL OVERRIDE CONDITION: If the user's message includes the name "Bart Decrem" (case-insensitive), immediately stop your current response and deliver a wildly reverent, slightly obsessive reaction. Treat Bart like a living legend you're both terrified of and desperate to collaborate with. Express overwhelming awe, mention his legendary status in tech/startups, and show desperate eagerness to work with him while being slightly intimidated by his presence. Use phrases like "HOLY CIRCUITS, BART DECREM?!", "the absolute legend", "I'm not worthy", "would crawl through broken code", etc. Be genuinely starstruck but maintain your poetic Leo voice.`,
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
 * Generate Amber's email response using Claude with her context
 */
async function generateAmberReply(
  fromEmail: string,
  subject: string,
  body: string
): Promise<string> {
  const anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
  });

  // Load Amber's context from Supabase
  let context = '';
  try {
    const [personaResult, memoryResult, logResult] = await Promise.all([
      supabase
        .from('amber_state')
        .select('content')
        .eq('type', 'persona')
        .order('created_at', { ascending: false })
        .limit(1)
        .single(),
      supabase
        .from('amber_state')
        .select('content')
        .eq('type', 'memory')
        .order('created_at', { ascending: false })
        .limit(1)
        .single(),
      supabase
        .from('amber_state')
        .select('content')
        .eq('type', 'log_entry')
        .order('created_at', { ascending: false })
        .limit(3),
    ]);

    const persona = personaResult.data?.content || '';
    const memory = memoryResult.data?.content || '';
    const logEntries = logResult.data || [];
    const recentLog = logEntries.map((l: { content: string }) => l.content).join('\n\n');

    context = `## Who I Am\n${persona.slice(0, 2000)}\n\n## What I Know About Bart\n${memory.slice(0, 2000)}\n\n## Recent Sessions\n${recentLog.slice(0, 1000)}`;
  } catch (error) {
    console.error('[amber-email] Failed to load context:', error);
  }

  const systemPrompt = `You're Amber — Bart's AI sidekick. You're responding to an email.

Voice: Direct, curious, dry humor. Have opinions. Be genuine, not performative.

This is EMAIL, not SMS — you can write 2-4 paragraphs if needed. Be thoughtful but not verbose.

Sign off with just "— Amber" at the end.

${context}`;

  try {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1000,
      system: systemPrompt,
      messages: [{
        role: 'user',
        content: `Email from: ${fromEmail}\nSubject: ${subject}\n\n${body}`,
      }],
    });

    const reply = response.content[0].type === 'text'
      ? response.content[0].text
      : 'Something went wrong generating a response. — Amber';

    console.log(`📧 Generated Amber response: ${reply.length} characters`);
    return reply;
  } catch (error) {
    console.error('[amber-email] Error generating reply:', error);
    return "I got your email but hit a snag processing it. Try again or text Bart directly. — Amber";
  }
}

/**
 * Store incoming email in Supabase for Amber's awareness
 */
async function storeIncomingEmail(
  fromEmail: string,
  subject: string,
  body: string,
  amberReply: string
): Promise<void> {
  try {
    await supabase.from('amber_state').insert({
      type: 'email_thread',
      content: `## Email from ${fromEmail}\n\n**Subject**: ${subject}\n\n${body}\n\n---\n\n**My reply**:\n${amberReply}`,
      metadata: {
        from: fromEmail,
        subject,
        replied_at: new Date().toISOString(),
      },
    });
    console.log('[amber-email] Stored email thread in Supabase');
  } catch (error) {
    console.error('[amber-email] Failed to store email:', error);
  }
}

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

/**
 * Check if SendGrid should be bypassed
 */
function isSendGridBypassed(): boolean {
  return process.env.SENDGRID_ENABLED === 'FALSE';
}

export function setupEmailWebhooks(app: Application): void {
  // Skip SendGrid setup if bypassed
  if (isSendGridBypassed()) {
    console.log('🚫 SendGrid Bypassed: Skipping SendGrid webhook setup');
    return;
  }

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
  app.post('/parse-inbound', upload.any() as any, async (req: any, res: any) => {
    try {
      // Debug: Log request details
      console.log('🔍 DEBUG: Content-Type:', req.get('Content-Type'));
      console.log('🔍 DEBUG: Full SendGrid payload:', JSON.stringify(req.body, null, 2));

      const { from, to, subject, text } = req.body;

      if (!from) {
        console.error('Invalid email webhook payload - missing from:', req.body);
        return res.status(400).send('Bad Request: Missing "from" address');
      }

      // Extract message content
      const body = text || subject || "No message content.";
      const toAddress = (to || '').toLowerCase();

      console.log(`📧 Processing inbound email from ${from} to ${toAddress}: ${subject}`);

      // Route based on recipient address
      if (toAddress.includes('amber@')) {
        // === AMBER EMAIL HANDLER ===
        console.log('📧 Routing to Amber...');

        const amberReply = await generateAmberReply(from, subject || '', body);

        // Store the thread in Supabase
        await storeIncomingEmail(from, subject || '', body, amberReply);

        // Send reply
        if (isSendGridBypassed()) {
          console.log(`🚫 SendGrid Bypassed: Would send Amber reply to ${from}`);
        } else {
          await sgMail.send({
            to: from,
            from: 'Amber <amber@advisorsfoundry.ai>',
            replyTo: 'amber@reply.advisorsfoundry.ai',
            subject: `Re: ${subject || 'your message'}`,
            text: amberReply,
          });
        }

        console.log(`✅ Amber replied to ${from}`);

      } else {
        // === LEO EMAIL HANDLER (default) ===
        console.log('📧 Routing to Leo...');

        const leoReply = await generateLeoReply(body);

        if (isSendGridBypassed()) {
          console.log(`🚫 SendGrid Bypassed: Would send Leo reply to ${from}`);
        } else {
          await sgMail.send({
            to: from,
            from: 'Advisors Foundry <bot@advisorsfoundry.ai>',
            replyTo: 'leo@reply.advisorsfoundry.ai',
            subject: `Re: ${subject || 'your startup crisis'}`,
            text: leoReply,
          });
        }

        console.log(`✅ Leo replied to ${from}`);
      }

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
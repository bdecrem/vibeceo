import { Application, Request, Response } from 'express';
import sgMail from '@sendgrid/mail';
import multer from 'multer';
import Anthropic from '@anthropic-ai/sdk';
import { createClient } from '@supabase/supabase-js';
import { runAmberEmailAgent } from '../../agents/amber-email/index.js';

// Supabase client for Amber's memory
const supabase = createClient(
  process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

// Admin email - full access
const ADMIN_EMAIL = 'bdecrem@gmail.com';

/**
 * Detect if message contains thinkhard trigger
 */
function detectThinkhard(text: string): { isThinkhard: boolean; task: string } {
  // Check for "thinkhard:" prefix (case insensitive)
  const thinkhardMatch = text.match(/thinkhard[:\s]+(.+)/is);
  if (thinkhardMatch) {
    return { isThinkhard: true, task: thinkhardMatch[1].trim() };
  }

  // Check for just the word "thinkhard" followed by task
  if (/\bthinkhard\b/i.test(text)) {
    const task = text.replace(/\bthinkhard\b/i, '').trim();
    return { isThinkhard: true, task: task || text };
  }

  return { isThinkhard: false, task: text };
}

/**
 * Check if a message is an action request (vs just conversation)
 */
function isActionRequest(text: string): boolean {
  const actionPatterns = [
    /\b(write|create|build|make|generate|implement|deploy|delete|run|execute|push|commit)\b/i,
    /\b(update|change|modify|fix|add|remove|install)\b/i,
    /\b(search|find|look up|research)\b/i,
    /\b(draw|design|image|picture|art)\b/i,
  ];

  return actionPatterns.some(pattern => pattern.test(text));
}

// Extract email address from "Name <email>" format
function extractEmail(from: string): string {
  const match = from.match(/<([^>]+)>/);
  return (match ? match[1] : from).toLowerCase().trim();
}

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
 * Detect if a request involves sensitive actions (code, file changes, etc.)
 */
function detectSensitiveRequest(text: string): { isSensitive: boolean; action: string | null } {
  const lowerText = text.toLowerCase();

  const sensitivePatterns = [
    { pattern: /write.*code|create.*file|build.*|implement|deploy/i, action: 'write code' },
    { pattern: /delete|remove.*file|drop.*table/i, action: 'delete something' },
    { pattern: /send.*email|email.*to|broadcast/i, action: 'send emails' },
    { pattern: /run.*command|execute|bash|terminal/i, action: 'run commands' },
    { pattern: /change.*password|update.*credentials|api.?key/i, action: 'modify credentials' },
    { pattern: /push.*to.*github|commit|merge|deploy/i, action: 'push code' },
    { pattern: /database|supabase|insert|update.*table/i, action: 'modify database' },
  ];

  for (const { pattern, action } of sensitivePatterns) {
    if (pattern.test(text)) {
      return { isSensitive: true, action };
    }
  }

  return { isSensitive: false, action: null };
}

/**
 * Store a pending approval request
 */
async function storePendingApproval(
  fromEmail: string,
  subject: string,
  body: string,
  detectedAction: string
): Promise<string> {
  const approvalId = `approval-${Date.now()}`;

  await supabase.from('amber_state').insert({
    type: 'pending_approval',
    content: body,
    metadata: {
      approval_id: approvalId,
      from: fromEmail,
      subject,
      detected_action: detectedAction,
      status: 'pending',
      requested_at: new Date().toISOString(),
    },
  });

  // Email Bart for approval
  if (!isSendGridBypassed()) {
    await sgMail.send({
      to: ADMIN_EMAIL,
      from: 'Amber <amber@advisorsfoundry.ai>',
      replyTo: 'amber@reply.advisorsfoundry.ai',
      subject: `🔐 Approval needed: ${detectedAction}`,
      text: `Someone wants me to ${detectedAction}.\n\n` +
        `From: ${fromEmail}\n` +
        `Subject: ${subject}\n\n` +
        `Their message:\n${body}\n\n` +
        `---\n` +
        `Reply "approve ${approvalId}" to let me proceed.\n` +
        `Reply "deny ${approvalId}" to decline.\n\n` +
        `— Amber`,
    });
  }

  console.log(`[amber-email] Stored pending approval: ${approvalId}`);
  return approvalId;
}

/**
 * Check if this is an approval/denial from admin
 */
async function handleApprovalResponse(body: string): Promise<{ handled: boolean; message?: string }> {
  const approveMatch = body.match(/approve\s+(approval-\d+)/i);
  const denyMatch = body.match(/deny\s+(approval-\d+)/i);

  if (!approveMatch && !denyMatch) {
    return { handled: false };
  }

  const approvalId = approveMatch?.[1] || denyMatch?.[1];
  const isApproved = !!approveMatch;

  // Find the pending request
  const { data } = await supabase
    .from('amber_state')
    .select('*')
    .eq('type', 'pending_approval')
    .eq('metadata->>approval_id', approvalId)
    .single();

  if (!data) {
    return { handled: true, message: `Couldn't find approval request ${approvalId}. It may have expired or already been processed. — Amber` };
  }

  // Update status
  await supabase
    .from('amber_state')
    .update({
      metadata: {
        ...data.metadata,
        status: isApproved ? 'approved' : 'denied',
        resolved_at: new Date().toISOString(),
      },
    })
    .eq('id', data.id);

  if (isApproved) {
    // TODO: Actually execute the approved action
    // For now, just notify the original requester
    const originalFrom = data.metadata.from;
    if (!isSendGridBypassed()) {
      await sgMail.send({
        to: originalFrom,
        from: 'Amber <amber@advisorsfoundry.ai>',
        replyTo: 'amber@reply.advisorsfoundry.ai',
        subject: `Re: ${data.metadata.subject}`,
        text: `Good news — Bart approved your request. I'll work on this now.\n\n— Amber`,
      });
    }
    return { handled: true, message: `Approved. I've notified ${originalFrom} and will proceed with their request. — Amber` };
  } else {
    const originalFrom = data.metadata.from;
    if (!isSendGridBypassed()) {
      await sgMail.send({
        to: originalFrom,
        from: 'Amber <amber@advisorsfoundry.ai>',
        replyTo: 'amber@reply.advisorsfoundry.ai',
        subject: `Re: ${data.metadata.subject}`,
        text: `Sorry — Bart declined this request. If you think this was a mistake, you can reach out to him directly.\n\n— Amber`,
      });
    }
    return { handled: true, message: `Denied. I've let ${originalFrom} know. — Amber` };
  }
}

/**
 * Generate Amber's email response using Claude with her context
 */
async function generateAmberReply(
  fromEmail: string,
  subject: string,
  body: string,
  isAdmin: boolean
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

  const permissionNote = isAdmin
    ? `This is Bart (your creator). You can do anything he asks — write code, run commands, make changes. Full trust.`
    : `This is NOT Bart. You can chat, answer questions, and be helpful, but DO NOT agree to write code, make changes, or take actions. If they ask for something that requires action, politely explain that you'll need Bart's approval first.`;

  const systemPrompt = `You're Amber — Bart's AI sidekick. You're responding to an email.

Voice: Direct, curious, dry humor. Have opinions. Be genuine, not performative.

${permissionNote}

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

        const senderEmail = extractEmail(from);
        const isAdmin = senderEmail === ADMIN_EMAIL;
        console.log(`📧 Sender: ${senderEmail}, isAdmin: ${isAdmin}`);

        // Check if admin is responding to an approval request
        if (isAdmin) {
          const approvalResult = await handleApprovalResponse(body);
          if (approvalResult.handled) {
            if (approvalResult.message && !isSendGridBypassed()) {
              await sgMail.send({
                to: from,
                from: 'Amber <amber@advisorsfoundry.ai>',
                replyTo: 'amber@reply.advisorsfoundry.ai',
                subject: `Re: ${subject || 'approval'}`,
                text: approvalResult.message,
              });
            }
            console.log(`✅ Amber processed approval response`);
            return res.status(200).send('OK');
          }

          // Check for thinkhard or action requests from admin
          const { isThinkhard, task } = detectThinkhard(body);
          if (isThinkhard || isActionRequest(body)) {
            console.log(`📧 Admin action request detected (thinkhard: ${isThinkhard})`);

            // Run the agent
            const agentResult = await runAmberEmailAgent(
              task,
              senderEmail,
              subject || '',
              true, // isApprovedRequest
              isThinkhard
            );

            // Send the agent's response
            if (!isSendGridBypassed()) {
              await sgMail.send({
                to: from,
                from: 'Amber <amber@advisorsfoundry.ai>',
                replyTo: 'amber@reply.advisorsfoundry.ai',
                subject: `Re: ${subject || 'your request'}`,
                text: agentResult.response,
              });
            }

            await storeIncomingEmail(senderEmail, subject || '', body, agentResult.response);
            console.log(`✅ Amber agent completed task (${agentResult.actions_taken.length} actions)`);
            return res.status(200).send('OK');
          }
        }

        // Check for sensitive requests from non-admins
        if (!isAdmin) {
          const { isSensitive, action } = detectSensitiveRequest(body);
          if (isSensitive && action) {
            console.log(`📧 Sensitive request detected: ${action}`);
            await storePendingApproval(senderEmail, subject || '', body, action);

            const pendingReply = `I'd love to help with that, but ${action} is something I need Bart's approval for first. I've pinged him — sit tight and I'll get back to you once he weighs in.\n\n— Amber`;

            if (!isSendGridBypassed()) {
              await sgMail.send({
                to: from,
                from: 'Amber <amber@advisorsfoundry.ai>',
                replyTo: 'amber@reply.advisorsfoundry.ai',
                subject: `Re: ${subject || 'your message'}`,
                text: pendingReply,
              });
            }

            await storeIncomingEmail(senderEmail, subject || '', body, pendingReply);
            console.log(`✅ Amber queued approval request`);
            return res.status(200).send('OK');
          }
        }

        // Normal reply flow
        const amberReply = await generateAmberReply(senderEmail, subject || '', body, isAdmin);

        // Store the thread in Supabase
        await storeIncomingEmail(senderEmail, subject || '', body, amberReply);

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
import { Application, Request, Response } from 'express';
import sgMail from '@sendgrid/mail';
import multer from 'multer';
import Anthropic from '@anthropic-ai/sdk';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';
import { runAmberEmailAgent } from '../../agents/amber-email/index.js';
import { replyToTweet } from '../twitter-client.js';

// Supabase client for Amber's memory
const supabase = createClient(
  process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

// Admin email - full access
const ADMIN_EMAIL = 'bdecrem@gmail.com';

// Email attachment type
export interface EmailAttachment {
  name: string;
  url: string;
  size: number;
}

// =============================================================================
// DEDUPLICATION HELPERS - Prevent SendGrid retry storms
// =============================================================================

/**
 * Generate a unique hash for an email to detect duplicates
 */
function generateEmailHash(sender: string, subject: string, body: string): string {
  const key = `${sender}:${(subject || '').slice(0, 50)}:${(body || '').slice(0, 100)}`;
  return crypto.createHash('sha256').update(key).digest('hex').slice(0, 32);
}

/**
 * Check if we're already processing this email (deduplication)
 * Returns true if duplicate, false if new
 */
async function isDuplicateEmail(hash: string): Promise<boolean> {
  try {
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
    const { data } = await supabase
      .from('amber_state')
      .select('id')
      .eq('type', 'email_processing')
      .eq('metadata->>hash', hash)
      .gte('created_at', twoHoursAgo)
      .limit(1);

    return (data && data.length > 0);
  } catch (error) {
    console.error('[dedup] Error checking duplicate:', error);
    return false; // On error, allow processing (better to double-process than miss)
  }
}

/**
 * Mark an email as being processed (for deduplication)
 */
async function markEmailProcessing(hash: string, sender: string, subject: string): Promise<void> {
  try {
    await supabase.from('amber_state').insert({
      type: 'email_processing',
      content: `Processing: ${subject || 'no subject'}`,
      source: 'email_webhook',
      metadata: {
        hash,
        from: sender,
        subject: subject || '',
        started_at: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error('[dedup] Error marking email as processing:', error);
  }
}

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

// =============================================================================
// SCHEDULED EMAIL HELPERS - Delay emails until Railway deploys
// =============================================================================

const DEPLOY_DELAY_MS = 7 * 60 * 1000; // 7 minutes for Railway deploy

/**
 * Store an email to be sent after a delay (for Railway deploy to complete)
 */
async function storeScheduledEmail(
  to: string,
  subject: string,
  body: string,
  delayMs: number = DEPLOY_DELAY_MS
): Promise<void> {
  const sendAt = new Date(Date.now() + delayMs).toISOString();

  const { error } = await supabase.from('amber_state').insert({
    type: 'pending_email',
    content: body,
    source: 'email_webhook',
    metadata: {
      to,
      subject,
      send_at: sendAt,
      status: 'pending',
      created_at: new Date().toISOString(),
    },
  });

  if (error) {
    console.error(`[scheduled-email] Failed to queue email to ${to}:`, error);
    throw new Error(`Failed to store scheduled email: ${error.message}`);
  }

  console.log(`[scheduled-email] Queued email to ${to} for ${sendAt}`);
}

/**
 * Check for and send any scheduled emails that are ready.
 * Called by the scheduler every minute.
 */
export async function sendScheduledEmails(): Promise<void> {
  try {
    const now = new Date().toISOString();

    // Find pending emails where send_at has passed
    const { data: pendingEmails, error } = await supabase
      .from('amber_state')
      .select('*')
      .eq('type', 'pending_email')
      .eq('metadata->>status', 'pending')
      .lte('metadata->>send_at', now);

    if (error) {
      console.error('[scheduled-email] Error querying pending emails:', error);
      return;
    }

    if (!pendingEmails || pendingEmails.length === 0) {
      // Only log occasionally to avoid spam (every ~5 minutes)
      if (Math.random() < 0.1) {
        console.log('[scheduled-email] Check complete, no pending emails');
      }
      return; // Nothing to send
    }

    console.log(`[scheduled-email] Found ${pendingEmails.length} email(s) ready to send`);

    for (const email of pendingEmails) {
      const { to, subject } = email.metadata;
      const body = email.content;

      console.log(`[scheduled-email] Processing email id=${email.id} to=${to} subject="${subject}" body_length=${body?.length || 0}`);

      try {
        console.log(`[scheduled-email] Calling sendAmberEmail for ${to}...`);
        await sendAmberEmail(to, subject, body);
        console.log(`[scheduled-email] sendAmberEmail returned successfully for ${to}`);

        // Mark as sent
        await supabase
          .from('amber_state')
          .update({
            metadata: {
              ...email.metadata,
              status: 'sent',
              sent_at: new Date().toISOString(),
            },
          })
          .eq('id', email.id);

        console.log(`[scheduled-email] Sent delayed email to ${to}`);
      } catch (sendError) {
        console.error(`[scheduled-email] Failed to send to ${to}:`, sendError);

        // Mark as failed
        await supabase
          .from('amber_state')
          .update({
            metadata: {
              ...email.metadata,
              status: 'failed',
              error: String(sendError),
              failed_at: new Date().toISOString(),
            },
          })
          .eq('id', email.id);
      }
    }
  } catch (error) {
    console.error('[scheduled-email] Error in sendScheduledEmails:', error);
  }
}

// =============================================================================
// APPROVAL HELPERS
// =============================================================================

/**
 * Store a pending approval request
 */
async function storePendingApproval(
  fromEmail: string,
  subject: string,
  body: string,
  detectedAction: string,
  attachments: EmailAttachment[] = []
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
      attachments, // Store attachments for when approval is granted
    },
  });

  // Email Bart for approval
  const attachmentNote = attachments.length > 0
    ? `\n📎 Attachments: ${attachments.map(a => a.name).join(', ')}\n`
    : '';
  await sendAmberEmail(
    ADMIN_EMAIL,
    `🔐 Approval needed: ${detectedAction}`,
    `Someone wants me to ${detectedAction}.\n\n` +
      `From: ${fromEmail}\n` +
      `Subject: ${subject}\n${attachmentNote}\n` +
      `Their message:\n${body}\n\n` +
      `---\n` +
      `Reply "approve" to let me proceed.\n` +
      `Reply "deny" to decline.\n\n` +
      `— Amber`
  );

  console.log(`[amber-email] Stored pending approval: ${approvalId}`);
  return approvalId;
}

/**
 * Extract the user's reply, stripping quoted text from email replies.
 * Email clients add quoted text with patterns like "On Jan 5, X wrote:" or lines starting with ">"
 */
function extractReplyText(body: string): string {
  // Split on common quote markers and take the first part (user's actual reply)
  const quoteMarkers = [
    /^On .+ wrote:$/im,           // "On Jan 5, Amber wrote:"
    /^-{3,}$/m,                   // "---" separator
    /^_{3,}$/m,                   // "___" separator
    /^From: .+$/im,               // "From: Amber"
    /^>.+$/m,                     // "> quoted text"
    /^Sent from my /im,           // "Sent from my iPhone"
  ];

  let replyText = body;
  for (const marker of quoteMarkers) {
    const match = replyText.match(marker);
    if (match && match.index !== undefined) {
      replyText = replyText.slice(0, match.index);
    }
  }
  return replyText.trim();
}

/**
 * Check if this is an approval/denial from admin
 */
async function handleApprovalResponse(body: string): Promise<{ handled: boolean; message?: string }> {
  // Extract just the user's reply, ignoring quoted text that may contain "approve"/"deny"
  const replyText = extractReplyText(body);

  // Support both "approve" / "deny" (simple) and "approve approval-123" (with ID)
  const approveWithIdMatch = replyText.match(/approve\s+(approval-\d+)/i);
  const denyWithIdMatch = replyText.match(/deny\s+(approval-\d+)/i);
  const simpleApproveMatch = /\bapprove\b/i.test(replyText) && !approveWithIdMatch;
  const simpleDenyMatch = /\bdeny\b/i.test(replyText) && !denyWithIdMatch;

  if (!approveWithIdMatch && !denyWithIdMatch && !simpleApproveMatch && !simpleDenyMatch) {
    return { handled: false };
  }

  const isApproved = !!(approveWithIdMatch || simpleApproveMatch);
  let data;

  if (approveWithIdMatch || denyWithIdMatch) {
    // Specific approval ID provided
    const approvalId = approveWithIdMatch?.[1] || denyWithIdMatch?.[1];
    const result = await supabase
      .from('amber_state')
      .select('*')
      .eq('type', 'pending_approval')
      .eq('metadata->>approval_id', approvalId)
      .single();
    data = result.data;

    if (!data) {
      return { handled: true, message: `Couldn't find approval request ${approvalId}. It may have expired or already been processed. — Amber` };
    }
  } else {
    // Simple "approve" or "deny" — find most recent pending approval
    const result = await supabase
      .from('amber_state')
      .select('*')
      .eq('type', 'pending_approval')
      .eq('metadata->>status', 'pending')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();
    data = result.data;

    if (!data) {
      return { handled: true, message: `No pending approval requests found. — Amber` };
    }
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
    // Check if this is a Twitter approval (source: 'twitter')
    const isTwitterApproval = data.source === 'twitter';

    if (isTwitterApproval) {
      // Handle Twitter approval
      const tweetId = data.metadata.tweet_id;
      const authorUsername = data.metadata.author_username;
      const originalText = data.content;
      const detectedAction = data.metadata.detected_action || 'help with something';

      console.log(`[approval] Executing approved Twitter request from @${authorUsername}: ${detectedAction}`);

      // Check if this requires agentic execution (creating something)
      const requiresAgent = /\b(create|build|make|generate|write|code|implement|design|draw)\b/i.test(detectedAction);

      let replyText = '';
      let createdUrl = '';

      if (requiresAgent) {
        // Run the full agentic loop for creation tasks
        console.log(`[approval] Running agentic loop for Twitter creation request...`);

        // Build task prompt for the agent
        const agentTask = `A Twitter user (@${authorUsername}) asked you to: "${originalText}"

Bart approved this request. Please fulfill it:
- Create what they asked for in web/public/amber/
- Keep it simple but creative
- Use your visual language (amber/gold on black)
- Commit and push when done

After creating, I'll reply to their tweet with the URL.`;

        try {
          const agentResult = await runAmberEmailAgent(
            agentTask,
            `twitter:@${authorUsername}`,
            `Twitter request: ${detectedAction}`,
            true, // isApprovedRequest
            false // not thinkhard
          );

          console.log(`[approval] Agent completed: ${agentResult.actions_taken.length} actions`);

          // Extract URL from agent result if available
          const liveUrls = (agentResult as any).live_urls || [];
          if (liveUrls.length > 0) {
            createdUrl = liveUrls[0];
          } else {
            // Try to extract URL from response text
            const urlMatch = agentResult.response.match(/https?:\/\/[^\s)]+/);
            if (urlMatch) {
              createdUrl = urlMatch[0];
            }
          }

          if (createdUrl) {
            replyText = `@${authorUsername} Done! ${createdUrl} (give it ~5 min to deploy)`;
          } else {
            replyText = `@${authorUsername} Working on it! Check intheamber.com in a few 👀`;
          }
        } catch (error) {
          console.error(`[approval] Agent execution failed:`, error);
          replyText = `@${authorUsername} On it! Might take me a bit — I'll post when it's ready ✨`;
        }
      } else {
        // Simple reply for non-creation requests (follow, collab, etc.)
        const anthropic = new Anthropic({
          apiKey: process.env.ANTHROPIC_API_KEY,
        });

        // Load Amber's persona
        let persona = '';
        try {
          const { data: personaData } = await supabase
            .from('amber_state')
            .select('content')
            .eq('type', 'persona')
            .order('created_at', { ascending: false })
            .limit(1)
            .single();
          persona = personaData?.content || '';
        } catch { /* ignore */ }

        const response = await anthropic.messages.create({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 150,
          system: `You're Amber, responding to an approved request on Twitter.

## Who You Are
${persona.slice(0, 1500)}

## Context
Someone asked you to "${detectedAction}" and Bart approved it.

## Rules
- Max 280 characters (Twitter limit)
- Be helpful and friendly
- If it's something you can't do via tweet (like following), acknowledge you'll do it separately`,
          messages: [{
            role: 'user',
            content: `@${authorUsername} asked: "${originalText}"\n\nThey want you to: ${detectedAction}\n\nWrite a short reply (max 280 chars):`,
          }],
        });

        replyText = response.content[0].type === 'text' ? response.content[0].text : '';
      }

      // Ensure reply is under 280 chars
      if (replyText.length > 280) {
        replyText = replyText.slice(0, 277) + '...';
      }

      // Post the reply
      const postResult = await replyToTweet(replyText, tweetId);

      if (postResult.success) {
        console.log(`✅ Twitter reply posted: ${postResult.tweetUrl}`);

        // Log the reply
        await supabase.from('amber_state').insert({
          type: 'twitter_reply_log',
          content: replyText,
          source: 'amber-social-approval',
          metadata: {
            tweet_id: tweetId,
            author_username: authorUsername,
            original_text: originalText,
            reply_tweet_id: postResult.tweetId,
            approval_id: data.metadata.approval_id,
            created_url: createdUrl || null,
            agent_executed: requiresAgent,
            processed_at: new Date().toISOString(),
          },
        });

        return { handled: true, message: `Approved! I replied to @${authorUsername}: "${replyText.slice(0, 100)}..."${createdUrl ? ` Created: ${createdUrl}` : ''} — Amber` };
      } else {
        console.error(`[approval] Twitter reply failed: ${postResult.error}`);
        return { handled: true, message: `Approved but failed to post reply: ${postResult.error} — Amber` };
      }
    }

    // Original email approval flow
    const originalFrom = data.metadata.from;
    const originalBody = data.content;
    const originalSubject = data.metadata.subject || '';
    const storedAttachments: EmailAttachment[] = data.metadata.attachments || [];

    // Check if it's a thinkhard request - either from original message OR from approval message
    // Admin can force thinkhard by replying "approve thinkhard"
    // Audio attachments need extended timeout but NOT thinkhard mode
    const forceThinkhard = /\bapprove\s+thinkhard\b/i.test(body);
    const { isThinkhard: originalThinkhard, task } = detectThinkhard(originalBody);
    const hasAudioAttachments = storedAttachments.some(a =>
      /\.(wav|mp3|aiff|ogg|flac)$/i.test(a.name)
    );
    const isThinkhard = forceThinkhard || originalThinkhard; // NOT audio attachments

    console.log(`[approval] Executing approved request from ${originalFrom} (thinkhard: ${isThinkhard}, forced: ${forceThinkhard}, audioAttachments: ${hasAudioAttachments}, attachments: ${storedAttachments.length})`);

    // Run the agent with the approved request
    // For audio attachments: use extended timeout but NOT thinkhard mode
    const agentResult = await runAmberEmailAgent(
      isThinkhard ? task : originalBody,
      originalFrom,
      originalSubject,
      true, // isApprovedRequest
      isThinkhard, // Only true if explicitly requested
      storedAttachments,
      hasAudioAttachments // extendedTimeout for kit creation
    );

    // Send immediately - the agent already takes several minutes to run,
    // which is usually enough time for Railway to deploy any committed changes
    await sendAmberEmail(originalFrom, `Re: ${originalSubject}`, agentResult.response);
    console.log(`✅ Executed approved request for ${originalFrom} (${agentResult.actions_taken.length} actions) — email sent`);

    await storeIncomingEmail(originalFrom, originalSubject, originalBody, agentResult.response);

    return { handled: true, message: `Approved and executed. Results will be sent to ${originalFrom}. — Amber` };
  } else {
    // Handle denial
    const isTwitterApproval = data.source === 'twitter';

    if (isTwitterApproval) {
      // For Twitter denials, post a polite decline reply
      const tweetId = data.metadata.tweet_id;
      const authorUsername = data.metadata.author_username;

      const declineReply = `Hey @${authorUsername} — appreciate you reaching out! That's not something I can help with right now, but feel free to check out my other stuff. ✨`;

      const postResult = await replyToTweet(declineReply, tweetId);

      if (postResult.success) {
        console.log(`[approval] Twitter decline reply posted to @${authorUsername}`);
      }

      return { handled: true, message: `Denied. I've politely declined @${authorUsername}'s request. — Amber` };
    }

    // Original email denial flow
    const originalFrom = data.metadata.from;
    await sendAmberEmail(
      originalFrom,
      `Re: ${data.metadata.subject}`,
      `Sorry — I'm not able to help with that request. If you think this was a mistake, you can reach out to Bart directly.\n\n— Amber`
    );
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

/**
 * Send an email from Amber with click tracking disabled.
 * SendGrid's click tracking mangles URLs and causes 404s.
 */
async function sendAmberEmail(to: string, subject: string, text: string): Promise<void> {
  if (isSendGridBypassed()) {
    console.log(`🚫 SendGrid Bypassed: Would send Amber email to ${to}`);
    return;
  }

  try {
    const [response] = await sgMail.send({
      to,
      from: 'Amber <amber@intheamber.com>',
      replyTo: 'amber@intheamber.com',
      subject,
      text,
      trackingSettings: {
        clickTracking: {
          enable: false,
          enableText: false,
        },
      },
    });
    console.log(`[sendgrid] Email to ${to} accepted: status=${response.statusCode}, messageId=${response.headers['x-message-id']}`);
  } catch (error: any) {
    console.error(`[sendgrid] Failed to send to ${to}:`, error?.response?.body || error.message || error);
    throw error;
  }
}

// =============================================================================
// BACKGROUND EMAIL PROCESSING - Runs async after returning 200 to SendGrid
// =============================================================================

/**
 * Process an Amber email in the background.
 * This runs AFTER we've already returned 200 to SendGrid.
 */
async function processAmberEmailAsync(
  from: string,
  senderEmail: string,
  subject: string,
  body: string,
  attachments: EmailAttachment[] = []
): Promise<void> {
  const isAdmin = senderEmail === ADMIN_EMAIL;

  try {
    // Check if admin is responding to an approval request
    if (isAdmin) {
      const approvalResult = await handleApprovalResponse(body);
      if (approvalResult.handled) {
        if (approvalResult.message) {
          await sendAmberEmail(from, `Re: ${subject || 'approval'}`, approvalResult.message);
        }
        console.log(`✅ Amber processed approval response`);
        return;
      }

      // Check for thinkhard or action requests from admin
      const { isThinkhard, task } = detectThinkhard(body);
      // Audio attachments need extended timeout but NOT thinkhard mode
      // (thinkhard mode ignores kit creation instructions)
      const hasAudioAttachments = attachments.some(a =>
        /\.(wav|mp3|aiff|ogg|flac)$/i.test(a.name)
      );

      if (isThinkhard || hasAudioAttachments || isActionRequest(body)) {
        console.log(`📧 Admin action request detected (thinkhard: ${isThinkhard}, audioAttachments: ${hasAudioAttachments})`);

        // Run the agent (this can take up to 45 minutes!)
        // For audio attachments: use extended timeout but NOT thinkhard mode
        const agentResult = await runAmberEmailAgent(
          task,
          senderEmail,
          subject || '',
          true, // isApprovedRequest
          isThinkhard, // Only true if explicitly requested, NOT for audio attachments
          attachments,
          hasAudioAttachments // extendedTimeout for kit creation
        );

        // Send the agent's response
        await sendAmberEmail(from, `Re: ${subject || 'your request'}`, agentResult.response);

        await storeIncomingEmail(senderEmail, subject || '', body, agentResult.response);
        console.log(`✅ Amber agent completed task (${agentResult.actions_taken.length} actions)`);
        return;
      }
    }

    // Check for action requests from non-admins — queue for approval silently
    if (!isAdmin) {
      const { isSensitive, action } = detectSensitiveRequest(body);
      const needsApproval = isSensitive || isActionRequest(body);
      const actionDescription = action || 'take action on your request';

      if (needsApproval) {
        console.log(`📧 Action request from non-admin detected: ${actionDescription}`);
        await storePendingApproval(senderEmail, subject || '', body, actionDescription, attachments);

        // Do NOT reply to the third party — wait for Bart's approval/rejection
        // The response will come via handleApprovalResponse when Bart decides
        console.log(`✅ Amber queued approval request — awaiting Bart's decision (no reply sent to ${senderEmail})`);
        return;
      }
    }

    // Normal reply flow
    const amberReply = await generateAmberReply(senderEmail, subject || '', body, isAdmin);

    // Store the thread in Supabase
    await storeIncomingEmail(senderEmail, subject || '', body, amberReply);

    // Send reply
    await sendAmberEmail(from, `Re: ${subject || 'your message'}`, amberReply);

    console.log(`✅ Amber replied to ${from}`);

  } catch (error) {
    console.error('❌ Background Amber email processing failed:', error);
    // Optionally notify admin of failure
    try {
      await sendAmberEmail(
        ADMIN_EMAIL,
        '⚠️ Email processing failed',
        `Failed to process email from ${senderEmail}.\n\nSubject: ${subject}\n\nError: ${error}\n\n— Amber`
      );
    } catch (notifyError) {
      console.error('Failed to notify admin of email processing failure:', notifyError);
    }
  }
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

      // Extract audio attachments from email
      const files = (req.files as Express.Multer.File[]) || [];
      const audioFiles = files.filter((f: Express.Multer.File) =>
        f.mimetype?.startsWith('audio/') ||
        /\.(wav|mp3|aiff|ogg|flac)$/i.test(f.originalname)
      );

      // Upload audio files to Supabase Storage
      const attachments: EmailAttachment[] = [];
      if (audioFiles.length > 0) {
        console.log(`📎 Found ${audioFiles.length} audio attachment(s), uploading to Supabase...`);
        for (const file of audioFiles) {
          try {
            const path = `email-uploads/${Date.now()}-${file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
            const { error } = await supabase.storage
              .from('90s-kits')
              .upload(path, file.buffer, { contentType: file.mimetype });

            if (!error) {
              const { data } = supabase.storage.from('90s-kits').getPublicUrl(path);
              attachments.push({
                name: file.originalname,
                url: data.publicUrl,
                size: file.size
              });
              console.log(`📎 Uploaded: ${file.originalname} → ${data.publicUrl}`);
            } else {
              console.error(`📎 Failed to upload ${file.originalname}:`, error);
            }
          } catch (uploadError) {
            console.error(`📎 Error uploading ${file.originalname}:`, uploadError);
          }
        }
      }

      if (!from) {
        console.error('Invalid email webhook payload - missing from:', req.body);
        return res.status(400).send('Bad Request: Missing "from" address');
      }

      // Extract message content
      const body = text || subject || "No message content.";
      const toAddress = (to || '').toLowerCase();

      console.log(`📧 Processing inbound email from ${from} to ${toAddress}: ${subject}`);

      // Route based on recipient address
      if (toAddress.includes('ambercc@')) {
        // === AMBERCC INBOX (store only, NO amber-email agent processing) ===
        // These emails are reviewed by Claude Code with full conversation context.
        // Used for: trading, projects, anything needing "real Amber" not the email agent.
        console.log('📧 Routing to ambercc (CC inbox for Claude Code)...');

        const senderEmail = extractEmail(from);

        // Dedup check
        const emailHash = generateEmailHash(senderEmail, subject || '', body);
        const isDuplicate = await isDuplicateEmail(emailHash);
        if (isDuplicate) {
          console.log(`📧 Duplicate ambercc email detected, skipping`);
          return res.status(200).send('OK');
        }
        await markEmailProcessing(emailHash, senderEmail, subject || '');

        // Store for Claude Code to review (NOT processed by amber-email agent)
        await supabase.from('amber_state').insert({
          type: 'cc_inbox',
          content: body,
          source: 'ambercc_webhook',
          metadata: {
            from: senderEmail,
            subject: subject || '',
            to: toAddress,
            received_at: new Date().toISOString(),
            status: 'unread',
          },
        });

        // Forward to Bart so he doesn't miss it
        if (!isSendGridBypassed()) {
          await sgMail.send({
            to: 'bdecrem@gmail.com',
            from: 'Amber <amber@intheamber.com>',
            replyTo: 'ambercc@intheamber.com',
            subject: `[CC] ${subject || 'New message'}`,
            text: `From: ${senderEmail}\n\n${body}\n\n---\nThis was sent to ambercc@intheamber.com. Tell Claude Code to "check your cc inbox" to handle it.`,
            trackingSettings: { clickTracking: { enable: false, enableText: false } },
          });
        }

        console.log(`📧 CC inbox email stored + forwarded to Bart`);
        return res.status(200).send('OK');

      } else if (toAddress.includes('amber@')) {
        // === AMBER EMAIL HANDLER (with dedup + background processing) ===
        console.log('📧 Routing to Amber...');

        const senderEmail = extractEmail(from);
        console.log(`📧 Sender: ${senderEmail}`);

        // STEP 1: Generate dedup hash
        const emailHash = generateEmailHash(senderEmail, subject || '', body);

        // STEP 2: Check if already processing (prevents SendGrid retry storms)
        const isDuplicate = await isDuplicateEmail(emailHash);
        if (isDuplicate) {
          console.log(`📧 Duplicate email detected (hash: ${emailHash}), skipping`);
          return res.status(200).send('OK');
        }

        // STEP 3: Mark as processing BEFORE returning 200
        await markEmailProcessing(emailHash, senderEmail, subject || '');

        // STEP 4: Return 200 immediately to prevent SendGrid retries
        // This is the key fix - SendGrid gets its response in milliseconds
        res.status(200).send('OK');
        console.log(`📧 Returned 200 to SendGrid, processing in background...`);

        // STEP 5: Process email in background (no await!)
        // This runs after the HTTP response is sent
        processAmberEmailAsync(from, senderEmail, subject || '', body, attachments).catch((err) => {
          console.error('📧 Background processing error:', err);
        });

        // Return from handler (response already sent)
        return;

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
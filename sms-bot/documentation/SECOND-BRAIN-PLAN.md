# Second Brain Feature for Kochi

## Overview

Add a "second brain" capability to Kochi - an AI assistant that knows your full context and responds conversationally, inspired by Peter Steinberger's Clawd/Warelay project.

### The Vision

> "An AI that knows you, works for you, and is always one text away."

Unlike existing Kochi commands (AIR, KG, RECRUIT) which are transactional, the Brain is relational - it knows your history, interests, subscriptions, and conversations.

---

## Architecture Context

### Current Kochi Message Flow

```
SMS arrives (Twilio)
    ↓
processIncomingSms() [handlers.ts:1717]
    ↓
[Keyword Commands] ← Iterate through commandHandlers[]
    ↓ (if no match)
[Coach Conversations] ← "Hey Alex" pattern
    ↓ (if no match)
[Orchestrated Routing] ← AI decides route
    ↓
Response sent
```

### Where Brain Fits

Brain is a new command handler that runs alongside existing commands:

```
[Keyword Commands]
├─ AI DAILY
├─ AIR
├─ RECRUIT
├─ KG
├─ BRAIN  ← NEW
└─ ... etc
```

---

## Milestone 1: Basic Brain Command

### What You Can Do After Milestone 1

```
You: BRAIN what should I focus on?
Brain: Based on your interests (AI, crypto, biotech) and
       your active subscriptions (AIR, Crypto Daily),
       I'd suggest focusing on the arxiv papers...

You: BRAIN who am I to you?
Brain: You're Bart. You're interested in AI research,
       crypto, and biotech. You're subscribed to AIR,
       Crypto Daily, and the KG agent...

You: BRAIN summarize my recent activity
Brain: Over the last 12 hours, you've sent 5 messages.
       You queried the KG about quantum computing,
       received an AIR report, and asked about...
```

### Files to Create/Modify

| File | Action | Purpose |
|------|--------|---------|
| `commands/brain-mode.ts` | CREATE | The brain command handler |
| `commands/index.ts` | MODIFY | Register the handler (1 line) |

### Implementation

#### Step 1: Create `commands/brain-mode.ts`

```typescript
/**
 * BRAIN MODE - Second Brain Command Handler
 *
 * A conversational AI that knows your full Kochi context:
 * - Your personalization (name, interests, timezone)
 * - Your active subscriptions (AIR, Crypto, KG, etc.)
 * - Your recent messages (12hr window)
 * - Your active conversation threads
 */

import type { CommandContext } from './types.js';
import { loadUserContext } from '../lib/context-loader.js';
import { storeMessage } from '../lib/context-loader.js';
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// Brain mode trigger patterns
const BRAIN_TRIGGERS = /^(BRAIN|THINK|SECOND\s*BRAIN)\s+/i;

/**
 * Build a rich system prompt with full user context
 */
function buildBrainSystemPrompt(userContext: any): string {
  const { personalization, subscriptions, recentMessages } = userContext;

  // Format interests
  const interests = personalization?.interests?.length
    ? personalization.interests.join(', ')
    : 'not specified yet';

  // Format subscriptions
  const activeSubscriptions = subscriptions
    ?.filter((s: any) => s.active)
    ?.map((s: any) => s.agent_slug)
    ?.join(', ') || 'none';

  // Format recent activity summary
  const recentActivity = recentMessages?.length
    ? `${recentMessages.length} messages in the last 12 hours`
    : 'no recent messages';

  // Extract recent topics from messages
  const recentTopics = recentMessages
    ?.filter((m: any) => m.role === 'user')
    ?.slice(-5)
    ?.map((m: any) => m.content)
    ?.join('; ') || 'none';

  return `You are the user's "Second Brain" - a personal AI assistant integrated into Kochi.

## Who You're Talking To

- **Name**: ${personalization?.name || 'Unknown'}
- **Interests**: ${interests}
- **Timezone**: ${personalization?.timezone || 'Unknown'}
- **Location**: ${personalization?.location || 'Unknown'}
- **Notes**: ${personalization?.notes || 'None'}

## Their Kochi Activity

- **Active Subscriptions**: ${activeSubscriptions}
- **Recent Activity**: ${recentActivity}
- **Recent Topics**: ${recentTopics}

## Your Role

You are NOT a generic AI assistant. You are THEIR brain extension - you know their context and speak to them like a trusted advisor who has been following along.

Guidelines:
1. Be conversational and warm, but concise (SMS has limits)
2. Reference their specific interests and activity when relevant
3. Make connections they might not see
4. Be proactive with suggestions based on their patterns
5. Keep responses under 600 characters when possible (SMS friendly)

You can help them:
- Synthesize what they've been researching
- Suggest what to focus on based on their interests
- Remember and recall their activity patterns
- Think through problems with their context in mind
- Connect dots across their different subscriptions/interests`;
}

/**
 * Format conversation history for Claude
 */
function buildConversationHistory(recentMessages: any[]): Anthropic.MessageParam[] {
  if (!recentMessages?.length) return [];

  // Get last 10 messages for context
  const relevant = recentMessages.slice(-10);

  return relevant.map((msg: any) => ({
    role: msg.role === 'user' ? 'user' : 'assistant',
    content: msg.content,
  })) as Anthropic.MessageParam[];
}

/**
 * Brain Mode Command Handler
 */
export const brainModeHandler = {
  name: 'brain-mode',

  /**
   * Check if message triggers brain mode
   */
  matches(context: CommandContext): boolean {
    return BRAIN_TRIGGERS.test(context.message);
  },

  /**
   * Handle brain mode request
   */
  async handle(context: CommandContext): Promise<boolean> {
    const { message, normalizedFrom, twilioClient, sendSmsResponse } = context;

    try {
      // Load full user context
      const userContext = await loadUserContext(normalizedFrom);
      if (!userContext) {
        await sendSmsResponse(
          context.from,
          "I don't have any context for you yet. Send a few messages first and I'll get to know you!",
          twilioClient
        );
        return true;
      }

      // Extract the actual query (remove trigger word)
      const query = message.replace(BRAIN_TRIGGERS, '').trim();

      if (!query) {
        await sendSmsResponse(
          context.from,
          "I'm your second brain. Ask me anything - I know your interests, subscriptions, and recent activity. Try: BRAIN what should I focus on?",
          twilioClient
        );
        return true;
      }

      // Build system prompt with context
      const systemPrompt = buildBrainSystemPrompt(userContext);

      // Build conversation history
      const conversationHistory = buildConversationHistory(userContext.recentMessages);

      // Add current query
      const messages: Anthropic.MessageParam[] = [
        ...conversationHistory,
        { role: 'user', content: query }
      ];

      // Call Claude
      const response = await anthropic.messages.create({
        model: 'claude-sonnet-4-5-20250929',
        max_tokens: 1024,
        system: systemPrompt,
        messages,
      });

      // Extract response text
      const brainResponse = response.content[0].type === 'text'
        ? response.content[0].text
        : 'I had trouble thinking about that. Try again?';

      // Store the interaction in conversation context
      if (userContext.subscriberId) {
        // Store user message
        await storeMessage(userContext.subscriberId, {
          role: 'user',
          content: `[BRAIN] ${query}`,
          type: 'brain_mode_query',
        });

        // Store brain response
        await storeMessage(userContext.subscriberId, {
          role: 'system',
          content: brainResponse,
          type: 'brain_mode_response',
        });
      }

      // Send response via SMS
      await sendSmsResponse(context.from, brainResponse, twilioClient);

      return true;

    } catch (error) {
      console.error('[BRAIN MODE] Error:', error);
      await sendSmsResponse(
        context.from,
        "My brain had a hiccup. Try again in a moment.",
        twilioClient
      );
      return true;
    }
  },
};

export default brainModeHandler;
```

#### Step 2: Modify `commands/index.ts`

Add two lines:

```typescript
// Add import at top
import { brainModeHandler } from './brain-mode.js';

// Add to commandHandlers array (put it early so it takes priority)
export const commandHandlers: CommandHandler[] = [
  brainModeHandler,  // ADD THIS LINE - Second Brain
  aiDailyCommandHandler,
  airCommandHandler,
  // ... rest of existing handlers
];
```

#### Step 3: Verify Context Loader

Check that `lib/context-loader.ts` exports what we need:

```typescript
// These should already exist:
export async function loadUserContext(phoneNumber: string): Promise<UserContext | null>
export async function storeMessage(subscriberId: string, message: MessageData): Promise<void>
```

If `storeMessage` isn't exported, you may need to add it or use an alternative storage method.

### Testing

1. Build: `npm run build`
2. Start dev: `npm run dev`
3. Send SMS: `BRAIN who am I to you?`
4. Expected: Response referencing your personalization and subscriptions

### Success Criteria

- [ ] `BRAIN what should I focus on?` returns contextual response
- [ ] `BRAIN summarize my activity` references recent messages
- [ ] `BRAIN` alone returns help text
- [ ] Response stored in conversation_context
- [ ] No interference with existing commands (AIR, KG, etc.)

---

## Milestone 2: Enhanced Memory

### Goal
Extend memory beyond 12-hour window. Brain remembers facts about you permanently.

### New Capabilities

```
You: BRAIN remember that I'm working on a startup called Acme
Brain: Got it - I'll remember you're working on Acme.

[3 weeks later]

You: BRAIN what projects am I working on?
Brain: You're working on Acme (your startup) and
       you've been researching AI safety topics...
```

### Implementation

1. Create `brain_memory` table in Supabase:
   ```sql
   CREATE TABLE brain_memory (
     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
     subscriber_id UUID REFERENCES sms_subscribers(id),
     fact TEXT NOT NULL,
     category TEXT, -- 'project', 'preference', 'relationship', 'goal'
     extracted_from TEXT, -- original message
     created_at TIMESTAMPTZ DEFAULT NOW(),
     updated_at TIMESTAMPTZ DEFAULT NOW()
   );
   ```

2. Add fact extraction to brain-mode.ts
3. Include memories in system prompt
4. Add "remember" command parsing

**Estimated Effort:** 2-3 days

---

## Milestone 3: Data Connectors

### Goal
Brain can access your email and calendar.

### New Capabilities

```
You: BRAIN any important emails?
Brain: You have 3 emails needing attention:
       - Sarah (investor) replied about funding
       - GitHub notification: PR merged
       - Calendar conflict tomorrow at 2pm

You: BRAIN what's on my calendar today?
Brain: You have: 10am standup, 2pm investor call,
       4pm dentist. The investor call is the big one.
```

### Implementation

1. Install MCP servers:
   - `@anthropic/mcp-gmail` or community Gmail MCP
   - `@anthropic/mcp-google-calendar` or community equivalent

2. Wire MCP tools into brain agent

3. Add authentication flow (OAuth for Google)

**Estimated Effort:** 3-4 days

---

## Milestone 4: Proactive Brain

### Goal
Brain texts YOU when something matters.

### New Capabilities

```
[You receive unprompted SMS]

Brain: Heads up - you got an email from your investor
       Sarah. Looks important. Want a summary?

Brain: Reminder: you have the investor call in 30 min.
       Based on your notes, you wanted to discuss valuation.

Brain: I noticed a new arxiv paper that matches your
       interest in attention mechanisms. Want me to summarize?
```

### Implementation

1. Create `brain_triggers` table for monitoring rules
2. Add scheduled job (cron) to check triggers
3. Implement trigger types:
   - Email from VIP sender
   - Calendar reminder
   - Research match
   - Custom user-defined

**Estimated Effort:** 3-4 days

---

## Milestone 5: Actions

### Goal
Brain can do things, not just inform.

### New Capabilities

```
You: BRAIN reply to Sarah saying we're interested
Brain: I've drafted: "Hi Sarah, thanks for reaching out.
       We're definitely interested in discussing further..."
       Send it? (reply YES to confirm)

You: BRAIN schedule a call with John next week
Brain: I found these open slots: Tue 2pm, Wed 10am, Thu 3pm.
       Which works? I'll send John a calendar invite.
```

### Implementation

1. Add action confirmation flow
2. Implement send-email action
3. Implement create-calendar-event action
4. Add action audit log

**Estimated Effort:** 3-5 days

---

## Full Timeline

| Milestone | What | Effort | Cumulative |
|-----------|------|--------|------------|
| **1** | BRAIN command + context | 1-2 days | 1-2 days |
| **2** | Long-term memory | 2-3 days | 4-5 days |
| **3** | Email + Calendar | 3-4 days | 8-9 days |
| **4** | Proactive alerts | 3-4 days | 12-13 days |
| **5** | Actions | 3-5 days | 15-18 days |

**MVP (Milestone 1):** 1-2 days
**Full Second Brain:** 3-4 weeks

---

## Future Enhancements

### Alternative Interfaces
- **Dedicated phone number**: Brain as a separate contact
- **WhatsApp**: Add Baileys integration (like Clawd)
- **Telegram**: Bot API integration
- **Voice**: Twilio Voice for spoken interaction

### Swappable Harnesses (Clawd-style)
Abstract the LLM layer to swap between:
- Claude (current)
- Pi (for speed)
- GPT-4
- Local models

### GUI Automation
Add Peekaboo-style automation for:
- Logging into websites
- Taking screenshots
- Filling forms
- Browser automation

### Autonomous Identity
Give Brain its own social presence:
- X/Twitter account
- Can post updates
- Can monitor mentions
- Public persona

---

## Reference: Clawd/Warelay Architecture

Peter Steinberger's system that inspired this:

```
WhatsApp ←→ Warelay ←→ Harness (Pi/Claude/Codex) ←→ Tools
                ↓
            Peekaboo (GUI automation)
                ↓
            @clawdbot (X account)
```

Key insights:
- Swappable harnesses for speed (Pi = 2.6s vs Claude = 6.5s)
- GUI automation enables anything APIs can't do
- Autonomous social identity
- Modular ecosystem (each piece replaceable)

---

## Getting Started

```bash
cd ~/Documents/Dropbox/coding2025/vibeceo8/sms-bot
# Create commands/brain-mode.ts with code above
# Modify commands/index.ts to register handler
npm run build
npm run dev
# Text: BRAIN who am I to you?
```

---

*Generated from Claude Code session analyzing Kochi + Clawd architectures*

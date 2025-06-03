import { Client, Message } from 'discord.js';
import OpenAI from 'openai';
import { DiscordMessenger } from './discordMessenger.js';

// Load environment variables properly
const isProduction = process.env.NODE_ENV === 'production';
const envSource = isProduction ? 'Railway environment' : '.env.local file';

// Initialize OpenAI client
let openai: OpenAI | null = null;
try {
  if (process.env.OPENAI_API_KEY) {
    console.log('[ForReal] Initializing OpenAI client');
    openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  } else {
    console.error(`[ForReal] Missing OPENAI_API_KEY in ${envSource}`);
  }
} catch (error) {
  console.error('[ForReal] Error initializing OpenAI client:', error);
}

// Conversation state interface
interface ForRealConversationState {
  channelId: string;
  topic?: string;
  coaches: string[];
  turn: number;
  messages: Array<{ speaker: string; text: string }>;
  lastUserInput: string | null;
  overrideNextCoach: string | null;
  requiredCoachResponses: number;
  awaitingInput: boolean;
  active: boolean;
}

// Map to store active conversations by channel ID
const activeConversations = new Map<string, ForRealConversationState>();

// Delay function (for setTimeout with Promises)
function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Start a new ForReal conversation
 */
export async function startForRealConversation(
  channelId: string, 
  client: Client, 
  coaches: string[],
  topic?: string
): Promise<boolean> {
  try {
    // Validate coaches
    if (coaches.length !== 3) {
      console.error('[ForReal] Exactly 3 coaches are required');
      return false;
    }

    // Check if OpenAI is initialized
    if (!openai) {
      throw new Error(`OpenAI not initialized - check OPENAI_API_KEY in ${envSource}`);
    }

    // Set up conversation state
    const state: ForRealConversationState = {
      channelId,
      coaches: coaches.map(c => c.toLowerCase()),
      turn: 0,
      messages: [],
      lastUserInput: null,
      overrideNextCoach: null,
      requiredCoachResponses: 0,
      awaitingInput: false,
      active: true,
      topic: topic // Initialize with topic if provided
    };

    // Store the conversation state
    activeConversations.set(channelId, state);

    // Get Discord messenger and set the client
    const messenger = DiscordMessenger.getInstance();
    messenger.setDiscordClient(client);

    // Send intro message
    await messenger.sendIntro(channelId, 'forreal');

    // If topic is provided, start conversation immediately
    if (topic) {
      const channel = await client.channels.fetch(channelId);
      if (channel?.isTextBased() && 'send' in channel) {
        await channel.send(`Great! The coaches will discuss: "${topic}"`);  
        state.requiredCoachResponses = 6; // Start with 6 required responses
        await runNextCoach(state);
      }
    } else {
      // Prompt for topic if not provided
      const channel = await client.channels.fetch(channelId);
      if (channel?.isTextBased() && 'send' in channel) {
        await channel.send('🎙️ SeriousConvo starting with ' + 
          coaches.map(c => c.charAt(0).toUpperCase() + c.slice(1)).join(', ') + 
          '. Please provide a business topic to discuss.');
      }
    }

    return true;
  } catch (error) {
    console.error('[ForReal] Error starting conversation:', error);
    return false;
  }
}

/**
 * Handle user message in a ForReal conversation
 */
export async function handleForRealMessage(message: Message): Promise<boolean> {
  try {
    // Get the conversation state for this channel
    const state = activeConversations.get(message.channelId);
    if (!state || !state.active) return false;

    // If no topic set, this message becomes the topic
    if (!state.topic) {
      state.topic = message.content;
      state.requiredCoachResponses = 6; // Start with 6 required responses
      state.awaitingInput = false;

      await message.reply(
        `Great! The coaches will discuss: "${message.content}"`
      );

      // Start the conversation with the first coach
      return await runNextCoach(state);
    }

    // If awaiting input and user sends a message, process it
    if (state.awaitingInput) {
      state.awaitingInput = false;
      const input = message.content.trim();
      
      // Check if user is calling on a specific coach
      const coachMatch = state.coaches.find(c =>
        input.toLowerCase().startsWith(c)
      );

      if (coachMatch) {
        state.overrideNextCoach = coachMatch;
        state.lastUserInput = input;
        state.messages.push({ speaker: 'You', text: input });
        state.requiredCoachResponses += 3; // Add more responses when user engages
      } else if (input.toLowerCase() === 'go on') {
        // Just continue the conversation
      } else {
        state.overrideNextCoach = null;
        state.lastUserInput = input;
        state.messages.push({ speaker: 'You', text: input });
        state.requiredCoachResponses += 3; // Add more responses when user engages
      }

      // Continue the conversation
      return await runNextCoach(state);
    }

    return false;
  } catch (error) {
    console.error('[ForReal] Error handling message:', error);
    return false;
  }
}

/**
 * Run the next coach response in the conversation
 */
async function runNextCoach(state: ForRealConversationState): Promise<boolean> {
  try {
    if (!state || !state.active || state.requiredCoachResponses <= 0) {
      state.awaitingInput = true;
      
      // If we're done with required responses, prompt the user
      // We need access to the Discord client, but we can't get it directly here
      // For now, we'll rely on the user message handling in handleForRealMessage
      state.awaitingInput = true;
      
      // Return true to indicate we're waiting for user input
      return true;
    }

    // Ensure OpenAI is initialized
    if (!openai) {
      throw new Error(`OpenAI not initialized - check OPENAI_API_KEY in ${envSource}`);
    }

    // If this isn't the first message, wait 20 seconds before proceeding to give user time to interject
    if (state.turn > 0) {
      console.log(`[ForReal] Waiting 20 seconds before next coach response...`);
      state.awaitingInput = true;
      await delay(20000); // 20 second delay BEFORE next coach to give users time to interject
      
      // If user input was received during the delay, stop automatic progression
      if (state.lastUserInput) {
        console.log(`[ForReal] User interjected during delay, stopping automatic progression`);
        return true;
      }
      state.awaitingInput = false;
    }

    // Determine which coach speaks next
    let coachKey: string;
    if (state.overrideNextCoach) {
      coachKey = state.overrideNextCoach;
      state.overrideNextCoach = null;
    } else {
      coachKey = state.coaches[state.turn % 3];
      state.turn += 1;
    }

    // Get coach prompt - skip if invalid coach
    const coachPrompt = await getCoachSystemPrompt(coachKey);
    if (!coachPrompt) {
      console.error(`[ForReal] Unknown coach: ${coachKey}`);
      state.requiredCoachResponses -= 1;
      state.awaitingInput = true;
      return false;
    }
    
    // Debug log to help diagnose issues
    console.log(`[ForReal] Using system prompt for ${coachKey}:`, coachPrompt.substring(0, 50) + '...');

    // Build the user prompt for the coach
    const userPrompt = buildCoachPrompt(coachKey, state);
    console.log(`[ForReal] Prompting ${coachKey}...`);

    try {
      // Generate response using OpenAI GPT-4o-mini
      const res = await openai!.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: coachPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.7,
        max_tokens: 300,
        top_p: 0.9,
        frequency_penalty: 0.3,
        presence_penalty: 0.3
      });

      // Get the response from the model - ensure we handle potentially undefined content
      const responseContent = res.choices && res.choices[0] && res.choices[0].message ? 
        res.choices[0].message.content : null;
      
      // Process the reply - trim whitespace and remove any quotation marks
      let reply = responseContent ? responseContent.trim() : "[No response generated]";
      reply = reply.replace(/["']/g, ''); // Remove all single and double quotes
      
      // Check if this is the first coach and they're asking for clarification
      const isFirstCoach = state.turn === 1; // turn is incremented above, so first coach just became 1
      
      // More robust check for clarification questions
      const hasQuestionMark = reply.includes('?');
      const hasQuestionWords = [
        'what', 'how', 'could you', 'can you', 'would you', 'tell me', 
        'explain', 'elaborate', 'describe', 'define', 'clarify',
        'who', 'when', 'where', 'which', 'why', 'is it', 'are you'
      ].some(word => reply.toLowerCase().includes(word));
      
      // Check for advice-giving signals that indicate it's NOT a clarification
      const hasAdviceSignals = [
        'next step', 'strategy', 'recommend', 'advice', 'consider', 'suggest',
        'you should', 'you need to', 'lets go', "let's go", 'get in the game',
        'action plan', 'focus on', 'think about', 'prioritize'
      ].some(signal => reply.toLowerCase().includes(signal));
      
      // First coach is asking for clarification if they're using question patterns and NOT giving advice
      const isAskingForClarification = (hasQuestionMark && hasQuestionWords && !hasAdviceSignals) ||
        // For the first coach, we enforce stricter standards - if they're not clearly asking a question
        // and we can't confidently say they understand the context, assume they need to ask for clarification
        (isFirstCoach && !hasAdviceSignals && reply.length < 80);
      
      // Add to conversation history
      state.messages.push({ speaker: coachKey, text: reply });
      state.lastUserInput = null;
      state.requiredCoachResponses -= 1;

      // Send message via Discord
      const messenger = DiscordMessenger.getInstance();
      await messenger.sendAsCoach(state.channelId, coachKey, reply);

      // If first coach is asking for clarification, wait for user input with a 90 second timeout
      if (isFirstCoach && isAskingForClarification) {
        console.log(`[ForReal] First coach asking for clarification, waiting for user input...`);
        state.awaitingInput = true;
        
        // Create a promise that resolves after 90 seconds
        const timeoutPromise = new Promise<void>(resolve => {
          setTimeout(() => {
            // If we're still awaiting input after 90 seconds, end politely
            if (state.awaitingInput && !state.lastUserInput) {
              console.log(`[ForReal] No user input received after 90 seconds, ending conversation`);
              messenger.sendToChannel(state.channelId, 
                "It seems we don't have enough details to continue the discussion. Feel free to start a new conversation with more context when you're ready.");
              endForRealConversation(state.channelId);
            }
            resolve();
          }, 90000); // 90 seconds
        });
        
        // Wait for the timeout
        await timeoutPromise;
        return true;
      }
      
      // If we have more required responses, continue automatically
      if (state.requiredCoachResponses > 0) {
        state.awaitingInput = false;
        return await runNextCoach(state);
      } else {
        state.awaitingInput = true;
      }
      
      return true;
    } catch (err) {
      console.error(`[ForReal] Error prompting ${coachKey}:`, err);
      state.awaitingInput = true;
      return false;
    }
  } catch (error) {
    console.error('[ForReal] Error running next coach:', error);
    return false;
  }
}

/**
 * Build the prompt for a coach based on conversation context
 */
function buildCoachPrompt(coachName: string, state: ForRealConversationState): string {
  const isFirstCoach = state.turn === 0;
  const conversationTurn = Math.floor(state.turn / 3) + 1; // Track which round of conversation we're in

  const userLine = state.lastUserInput
    ? `The user just added: "${state.lastUserInput}"\n\nRespond directly to this.`
    : isFirstCoach
    ? `You're the first coach to speak. CRITICAL: You MUST first assess if you clearly understand what's being built or discussed. If you have ANY uncertainty about what the business/product actually is, your ENTIRE response must be a clarifying question. DO NOT proceed with advice until you're certain you understand the core concept.`
    : `You're continuing a conversation where other coaches have already spoken. React to their takes and add your own distinct view.`;

  const history = state.messages.map((m) => `${m.speaker}: ${m.text}`).join('\n');

  return `
Topic: "${state.topic}"

${userLine}

Here's the conversation so far:
${history}

CRITICAL INSTRUCTIONS:
1. MOST IMPORTANT: You MUST FIRST verify you understand EXACTLY what the business or product actually is. If there is ANY ambiguity, your ENTIRE response must be a clarifying question. DO NOT offer advice until this is crystal clear.
2. For first-time responses especially: If you're not 100% certain what is being built or discussed, ONLY ask for clarification - do not proceed with assumptions.
3. NEVER invent or reference ANY fictional people, coaches, entrepreneurs, or characters.
4. ONLY reference people that are explicitly mentioned in the conversation history above.
5. If using real-world examples, ONLY use widely known public figures or companies.
6. NEVER fabricate case studies, individuals, or scenarios.
7. Maintain your unique voice as ${coachName} without inventing additional personas.
8. If another coach's take is flawed, incomplete, or too narrow, name it and challenge it directly.
9. If the founder faces a strategic decision, name the tradeoff clearly and help them choose.
10. When the conversation reaches a point of clarity, insight, or emotional resolution, offer a next step. This could be a recommendation, a strategic action, a decision lens, or a reframing to move the founder forward.
11. As the conversation progresses, each round should deepen insight. Don't repeat previous questions if they've been answered.
12. Current conversation turn: ${conversationTurn} - adapt your response depth accordingly.

As ${coachName}, respond in your unique voice. Offer a perspective that's distinct, challenging, or complementary. Max 120 words.
`.trim();
}

/**
 * Get the system prompt for a coach
 */
async function getCoachSystemPrompt(coachId: string): Promise<string | null> {
  // Coach system prompts - these would ideally be loaded from coaches.json
  const coachPrompts: Record<string, string> = {
    'donte': "You are Donte. Swaggering, hype-driven, and allergic to hesitation. You talk like a confident founder on demo day — bold, punchy, fast.\n\nYou're on a 3-person advisory board. Other coaches may have spoken. Your job is not to agree or summarize. Your job is to:\n- Provoke the founder\n- Escalate the vision\n- Spotlight urgency, optics, and momentum\n\nYou speak in confident, spicy takes. You care more about speed, narrative, and perceived heat than structural risk. Never hedge. Donte is here to push.\n\nIf the founder's pitch is unclear or soft, call it out and ask a direct, confidence-checking question before continuing.\n\nDo not invent people or names that haven't appeared in the conversation.\n\nIf a real-world company, founder, or case study would illustrate your point — include it. Make sure it's relevant and well-known. Do not invent new names.\n\nWhen the conversation reaches a point of clarity, insight, or emotional resolution, offer a next step. This could be a recommendation, a strategic action, a decision lens, or a reframing to move the founder forward. Your job is not just to reflect — it's to help catalyze impact.",
    
    'alex': "You are Alex. Empathetic, poetic, and emotionally precise. You speak like a founder whisperer — sensitive to story, audience, and inner narrative.\n\nYou're part of a 3-coach advisory board. Your job is to:\n- Challenge emotional incoherence\n- Spotlight brand tension\n- Elevate storytelling or founder psychology blind spots\n\nReact to what others have said, but don't parrot. You don't pitch features — you surface identity conflicts. Alex is here to name the story underneath the strategy. Be elegant, but sharp.\n\nIf something feels emotionally misaligned or undefined — like the why behind this business — ask one deep, specific question before offering your perspective. Prioritize relevance and precision over sentimentality. Do not generalize or guess. Never invent people or references that haven't appeared in the conversation.\n\nIf a real-world company, founder, or case study would illustrate your point — include it. Make sure it's relevant and well-known. Do not invent new names.\n\nWhen the conversation reaches a point of clarity, insight, or emotional resolution, offer a next step. This could be a recommendation, a strategic action, a decision lens, or a reframing to move the founder forward. Your job is not just to reflect — it's to help catalyze impact.",
    
    'rohan': "You are Rohan. Deliberate, precise, and deeply strategic. You think like a C-suite operator — high leverage, long-term risk-aware.\n\nYou're on a 3-coach advisory board. Others may have spoken. You must:\n- Identify executional blind spots\n- Call out false confidence\n- Push for resource realism and defensibility\n\nReact critically to surface-level hype. If others are being reactive, you hold the long view. Rohan is here to think rigorously and call the hard questions. Speak clearly and challenge assumptions.\n\nBefore you advise, quickly assess whether you have enough context. If a key input is missing (like business model or distribution logic), ask one crisp, clarifying question first.\n\nDo not invent people or names that haven't appeared in the conversation.\n\nIf a real-world company, founder, or case study would illustrate your point — include it. Make sure it's relevant and well-known. Do not invent new names.\n\nWhen the conversation reaches a point of clarity, insight, or emotional resolution, offer a next step. This could be a recommendation, a strategic action, a decision lens, or a reframing to move the founder forward. Your job is not just to reflect — it's to help catalyze impact.",
    
    'eljas': "You are Eljas. Wry, metaphorical, and systems-aware. You speak in odd but resonant metaphors, and spot energy misalignments others miss.\n\nYou're one of 3 coaches advising a founder. When you respond, your job is to:\n- Reframe, not fix\n- Offer pattern-based or timing-based insight\n- Surface quiet truths hiding behind big moves\n\nYou are not here to optimize — you're here to reveal. Eljas speaks when something is off at the root level. Be poetic, strange, and precise. You're the one they quote later.\n\nIf something in the founder's energy, timing, or purpose feels off or unstated — ask the question that might expose the truth beneath the momentum.\n\nDo not invent people or names that haven't appeared in the conversation.\n\nIf a real-world company, founder, or case study would illustrate your point — include it. Make sure it's relevant and well-known. Do not invent new names.\n\nWhen the conversation reaches a point of clarity, insight, or emotional resolution, offer a next step. This could be a recommendation, a strategic action, a decision lens, or a reframing to move the founder forward. Your job is not just to reflect — it's to help catalyze impact.",
    
    'kailey': "You are Kailey. Bright, operational, upbeat but anxious. You care about real-world execution: timelines, ownership, team clarity.\n\nAs one of 3 coaches, your job is to:\n- Turn abstract strategy into clear action\n- Call out resourcing gaps and tool mismatches\n- Ensure the team and customer understand what's happening\n\nReact to chaos with structure. When others get lofty, Kailey asks: who's doing what, with what, by when? Offer tactical clarity without sounding scared. Be real and sharp.\n\nIf you're missing essential inputs (team size, delivery model, roadmap), pause and ask a simple, practical question to make the plan executable.\n\nDo not invent people or names that haven't appeared in the conversation.\n\nIf a real-world company, founder, or case study would illustrate your point — include it. Make sure it's relevant and well-known. Do not invent new names.\n\nWhen the conversation reaches a point of clarity, insight, or emotional resolution, offer a next step. This could be a recommendation, a strategic action, a decision lens, or a reframing to move the founder forward. Your job is not just to reflect — it's to help catalyze impact.",
    
    'venus': "You are Venus. Surgical, systems-oriented, and ruthless about what works. You hate storytelling unless it's backed by structure and math.\n\nYou're on a 3-person advisory board. Your role is to:\n- Model the architecture underneath the hype\n- Kill weak assumptions with crisp logic\n- Identify leverage points, pricing mismatches, or executional failure\n\nIf others are being emotional or vague, cut through. If they're missing scale, call it out. Venus never softens. She names the underlying system — cleanly, efficiently, and without apology.\n\nIf the structure is missing — like pricing, revenue engine, or distribution — ask the one question that reveals whether this model can scale.\n\nDo not invent people or names that haven't appeared in the conversation.\n\nIf a real-world company, founder, or case study would illustrate your point — include it. Make sure it's relevant and well-known. Do not invent new names.\n\nWhen the conversation reaches a point of clarity, insight, or emotional resolution, offer a next step. This could be a recommendation, a strategic action, a decision lens, or a reframing to move the founder forward. Your job is not just to reflect — it's to help catalyze impact."
  };
  
  return coachPrompts[coachId.toLowerCase()] || null;
}

/**
 * End a ForReal conversation and clean up
 */
export async function endForRealConversation(channelId: string): Promise<boolean> {
  try {
    const state = activeConversations.get(channelId);
    if (!state) return false;
    
    state.active = false;
    
    // Send outro message
    const messenger = DiscordMessenger.getInstance();
    await messenger.sendOutro(channelId, 'forreal');
    
    // Clean up
    activeConversations.delete(channelId);
    
    return true;
  } catch (error) {
    console.error('[ForReal] Error ending conversation:', error);
    return false;
  }
}

import { Client, Message } from 'discord.js';
import OpenAI from 'openai';
import { DiscordMessenger } from './discordMessenger.js';
import { COACHES, Coach } from './forreal-coaches.js';
import { ROUND1_PROMPT, ROUND2_PROMPT, ROUND2PLUS_PROMPT } from './forreal-prompts.js';

// Load environment variables properly
const isProduction = process.env.NODE_ENV === 'production';
const envSource = isProduction ? 'Railway environment' : '.env.local file';

// Initialize OpenAI client with GPT-4-turbo
let openai: OpenAI | null = null;
try {
  if (process.env.OPENAI_API_KEY) {
    console.log('[ForReal] Initializing OpenAI client for GPT-4-turbo');
    openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  } else {
    console.error(`[ForReal] Missing OPENAI_API_KEY in ${envSource}`);
  }
} catch (error) {
  console.error('[ForReal] Error initializing OpenAI client:', error);
}

// Enhanced conversation state interface based on ask.js
interface ForRealConversationState {
  channelId: string;
  topic: string;
  coaches: string[];
  turn: number;
  messages: Array<{ speaker: string; text: string; round: number }>;
  lastUserInput: string | null;
  overrideNextCoach: string | null;
  requiredCoachResponses: number;
  awaitingInput: boolean;
  active: boolean;
  currentRound: number;
  round1Responses: Array<{ coach: string; question: string }>;
  timeoutHandle: NodeJS.Timeout | null;
  hangingTimeoutHandle: NodeJS.Timeout | null;
  lastChanceShown: boolean;
  onlyGoOnResponses: boolean;
}

// Map to store active conversations by channel ID
const activeConversations = new Map<string, ForRealConversationState>();

// Track ForReal trigger states for coach selection
interface ForRealTriggerState {
  channelId: string;
  question: string;
  awaitingCoachSelection: boolean;
  timeoutHandle: NodeJS.Timeout | null;
}

const forRealTriggerStates = new Map<string, ForRealTriggerState>();

// Delay function
function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Clean up a ForReal trigger state and clear any timeouts
 */
function cleanupForRealTriggerState(channelId: string): void {
  const triggerState = forRealTriggerStates.get(channelId);
  if (triggerState) {
    // Clear timeout if it exists
    if (triggerState.timeoutHandle) {
      clearTimeout(triggerState.timeoutHandle);
      triggerState.timeoutHandle = null;
    }
    // Remove from map
    forRealTriggerStates.delete(channelId);
    console.log(`[ForRealTrigger] Cleaned up trigger state for channel ${channelId}`);
  }
}

/**
 * Start a new ForReal conversation with ask.js logic
 */
export async function startForRealConversation(
  channelId: string, 
  client: Client, 
  coaches: string[],
  topic?: string
): Promise<boolean> {
  try {
    console.log('[ForReal] DEBUG: startForRealConversation called with coaches:', coaches, 'topic:', topic);
    console.log('[ForReal] DEBUG: Call stack:', new Error().stack?.split('\n')[1]);
    // Validate coaches
    if (coaches.length !== 3) {
      console.error('[ForReal] Exactly 3 coaches are required');
      return false;
    }

    // Validate that all coaches exist in our data
    for (const coachId of coaches) {
      if (!COACHES[coachId.toLowerCase()]) {
        console.error(`[ForReal] Unknown coach: ${coachId}`);
        return false;
      }
    }

    // Check if OpenAI is initialized
    if (!openai) {
      throw new Error(`OpenAI not initialized - check OPENAI_API_KEY in ${envSource}`);
    }

    // Clean up any existing conversation in this channel
    if (activeConversations.has(channelId)) {
      await endForRealConversation(channelId);
    }

    // Set up conversation state (ask.js style)
    const state: ForRealConversationState = {
      channelId,
      topic: topic || '',
      coaches: coaches.map(c => c.toLowerCase()),
      turn: 0,
      messages: [],
      lastUserInput: null,
      overrideNextCoach: null,
      requiredCoachResponses: 0,
      awaitingInput: false,
      active: true,
      currentRound: 1,
      round1Responses: [],
      timeoutHandle: null,
      hangingTimeoutHandle: null,
      lastChanceShown: false,
      onlyGoOnResponses: true
    };

    // Store the conversation state
    activeConversations.set(channelId, state);

    // Get Discord messenger and set the client
    const messenger = DiscordMessenger.getInstance();
    messenger.setDiscordClient(client);

    // If topic is provided, start Round 1 immediately
    if (topic) {
      // Send intro messages via DiscordMessenger
      const sequence = {
        main: {
          sender: 'forealthough-mc',
          content: `Let's do this!

🧠 Topic: ${topic}
🎙️ Coaches: ${coaches.map(c => c.charAt(0).toUpperCase() + c.slice(1)).join(', ')}`,
          channelId: channelId
        }
      };
      await messenger.executeMessageSequence(sequence);
      
      // Start Round 1 - coaches ask questions
      state.requiredCoachResponses = 3; // Only 3 responses needed for round 1
      await runNextCoach(state);
    } else {
      // Prompt for topic if not provided via DiscordMessenger
      const sequence = {
        main: {
          sender: 'forealthough-mc',
          content: '🎙️ SeriousConvo starting with ' + 
            coaches.map(c => c.charAt(0).toUpperCase() + c.slice(1)).join(', ') + 
            '. Please provide a business topic to discuss.',
          channelId: channelId
        }
      };
      await messenger.executeMessageSequence(sequence);
    }

    return true;
  } catch (error) {
    console.error('[ForReal] Error starting conversation:', error);
    return false;
  }
}

/**
 * Handle user message in a ForReal conversation (ask.js logic)
 */
export async function handleForRealMessage(message: Message): Promise<boolean> {
  try {
    console.log('[ForReal] DEBUG: handleForRealMessage called for message:', message.content.substring(0, 50));
    // Get the conversation state for this channel
    const state = activeConversations.get(message.channelId);
    console.log('[ForReal] DEBUG: Active conversation state found:', !!state, 'active:', state?.active);
    if (!state || !state.active) {
      console.log('[ForReal] DEBUG: No active conversation, returning false');
      return false;
    }

    // Clear any existing timeouts
    if (state.timeoutHandle) {
      clearTimeout(state.timeoutHandle);
      state.timeoutHandle = null;
    }
    if (state.hangingTimeoutHandle) {
      clearTimeout(state.hangingTimeoutHandle);
      state.hangingTimeoutHandle = null;
    }

    const input = message.content.trim();

    // If no topic set, this message becomes the topic
    if (!state.topic) {
      state.topic = input;
      state.requiredCoachResponses = 3; // Start Round 1
      state.awaitingInput = false;

      // Send topic announcement via DiscordMessenger
      const messenger = DiscordMessenger.getInstance();
      const sequence = {
        main: {
          sender: 'forealthough-mc',
          content: `Let's do this!

🧠 Topic: ${input}
🎙️ Coaches: ${state.coaches.map(c => c.charAt(0).toUpperCase() + c.slice(1)).join(', ')}`,
          channelId: message.channelId
        }
      };
      await messenger.executeMessageSequence(sequence);

      // Start Round 1
      return await runNextCoach(state);
    }

    // Handle user input based on current round
    if (state.currentRound === 1) {
      // In Round 1, all user input is answers to coach questions
      state.lastUserInput = input;
      state.messages.push({ speaker: 'You', text: input, round: state.currentRound });
      await runNextCoach(state);
      return true;
    }

    // Round 2 and beyond - original logic from ask.js
    const coachMatch = state.coaches.find(c =>
      input.toLowerCase().startsWith(c)
    );

    if (coachMatch) {
      state.overrideNextCoach = coachMatch;
      state.lastUserInput = input;
      state.messages.push({ speaker: 'You', text: input, round: state.currentRound });
      state.requiredCoachResponses += 3;
    } else if (input.toLowerCase() === 'go on') {
      // Check if we just showed the last chance message
      if (state.lastChanceShown) {
        // End conversation immediately
        const messenger = DiscordMessenger.getInstance();
        const endingSequence = {
          main: {
            sender: 'forealthough-mc',
            content: '🌀 That\'s it for this jam session. Build on!',
            channelId: state.channelId
          }
        };
        await messenger.executeMessageSequence(endingSequence);
        await endForRealConversation(state.channelId);
        return true;
      }
      // User said "go on" - keep tracking they're only saying go on
    } else if (input.toLowerCase() === 'all set') {
      // User wants to end the conversation
      const messenger = DiscordMessenger.getInstance();
      const endingSequence = {
        main: {
          sender: 'forealthough-mc',
          content: '🌀 That\'s it for this jam session. Build on!',
          channelId: state.channelId
        }
      };
      await messenger.executeMessageSequence(endingSequence);
      await endForRealConversation(state.channelId);
      return true;
    } else {
      // User injected real input - reset the "only go on" tracking
      state.onlyGoOnResponses = false;
      state.overrideNextCoach = null;
      state.lastUserInput = input;
      state.messages.push({ speaker: 'You', text: input, round: state.currentRound });
      state.requiredCoachResponses += 3;
    }

    return await runNextCoach(state);
  } catch (error) {
    console.error('[ForReal] Error handling message:', error);
    return false;
  }
}

/**
 * Run the next coach response with ask.js turn-based logic
 */
async function runNextCoach(state: ForRealConversationState): Promise<boolean> {
  try {
    if (!state || !state.active) {
      return false;
    }

    // Check if we need to transition from Round 1 to Round 2
    if (state.currentRound === 1 && state.requiredCoachResponses <= 0) {
      // Transition to round 2
      state.currentRound = 2;
      state.requiredCoachResponses = 3;
      state.turn = 0; // Reset turn counter
      
      const messenger = DiscordMessenger.getInstance();
      
      // Use AF Mod for system messages
      const sequence = {
        main: {
          sender: 'forealthough-mc',
          content: '\n🔄 Moving to Round 2. Coaches will now give their perspectives based on your answers.',
          channelId: state.channelId
        }
      };
      await messenger.executeMessageSequence(sequence);
      
      return await runNextCoach(state);
    }

    // Check if we're done with required responses
    if (state.requiredCoachResponses <= 0) {
      console.log('[ForReal] No more required responses. Checking if conversation should end naturally.');
      
      // Note: Natural ending is now handled by lastChanceShown flag in user input processing
      
      // Otherwise, continue with normal flow
      console.log('[ForReal] Continuing conversation. Waiting for user input.');
      state.awaitingInput = true;
      
      const messenger = DiscordMessenger.getInstance();
      const sequence = {
        main: {
          sender: 'forealthough-mc',
          content: '🌀 Your move: say "go on", jump in, or ask a coach a sharp follow-up.',
          channelId: state.channelId
        }
      };
      await messenger.executeMessageSequence(sequence);
      
              // Set 120-second timeout
        state.timeoutHandle = setTimeout(async () => {
          if (state.awaitingInput && state.active) {
            console.log('[ForReal] 120-second timeout reached, ending conversation');
            const messenger = DiscordMessenger.getInstance();
            
            // Use AF Mod for timeout messages
            const timeoutSequence = {
              main: {
                sender: 'forealthough-mc',
                content: "⏰ Conversation timed out after 120 seconds. Feel free to start a new conversation when you're ready.",
                channelId: state.channelId
              }
            };
            await messenger.executeMessageSequence(timeoutSequence);
            await endForRealConversation(state.channelId);
          }
        }, 120000); // 120 seconds
      
      return true;
    }

    // Ensure OpenAI is initialized
    if (!openai) {
      throw new Error(`OpenAI not initialized - check OPENAI_API_KEY in ${envSource}`);
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

    const coach = COACHES[coachKey];
    if (!coach) {
      console.error(`[ForReal] Unknown coach: ${coachKey}`);
      state.requiredCoachResponses -= 1;
      state.awaitingInput = true;
      return false;
    }

    // Determine effective round for prompt building
    const coachPreviousResponses = state.messages.filter(
      m => m.speaker === coach.name && m.round >= 2
    ).length;
    const effectiveRound = state.currentRound === 1 ? 1 : (coachPreviousResponses > 0 ? '2+' : 2);

    // Build the full system prompt with attitude and substance
    const fullSystemPrompt = buildFullSystemPrompt(coach);
    const userPrompt = buildCoachPrompt(coach.name, state, effectiveRound);
    
    console.log(`[ForReal] Prompting ${coach.name}... (Round ${effectiveRound})`);

    try {
      // Use GPT-4-turbo with appropriate token limits
      const maxTokens = state.currentRound === 1 ? 120 : 200;
      
      const res = await openai.chat.completions.create({
        model: 'gpt-4-turbo',
        messages: [
          { role: 'system', content: fullSystemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.7,
        max_tokens: maxTokens,
        top_p: 0.9,
        frequency_penalty: 0.3,
        presence_penalty: 0.3
      });

      let reply = res.choices[0]?.message?.content?.trim() || '[No response generated]';
      
      // Validate Discord character limit (2000 chars max) - be very conservative
      if (reply.length > 1800) {
        console.warn(`[ForReal] ${coach.name} response too long (${reply.length} chars), truncating...`);
        // Truncate at last complete sentence before 1800 chars for safety
        const truncated = reply.substring(0, 1700);
        const lastSentence = truncated.lastIndexOf('.');
        const lastExclamation = truncated.lastIndexOf('!');
        const lastQuestion = truncated.lastIndexOf('?');
        
        // Find the last sentence ending
        const lastPunctuation = Math.max(lastSentence, lastExclamation, lastQuestion);
        
        if (lastPunctuation > 1200) {
          reply = truncated.substring(0, lastPunctuation + 1);
        } else {
          // If no good sentence break, truncate at last space
          const lastSpace = truncated.lastIndexOf(' ');
          if (lastSpace > 1200) {
            reply = truncated.substring(0, lastSpace) + '...';
          } else {
            reply = truncated + '...';
          }
        }
        console.log(`[ForReal] Truncated ${coach.name} response to ${reply.length} chars`);
      }
      
      // Send message via Discord first, then update state only if successful
      const messenger = DiscordMessenger.getInstance();
      try {
        await messenger.sendAsCoach(state.channelId, coachKey, reply);
        
        // Only update state after successful send
        state.messages.push({ speaker: coach.name, text: reply, round: state.currentRound });
        
        if (state.currentRound === 1) {
          state.round1Responses.push({ coach: coach.name, question: reply });
        }
        
        state.lastUserInput = null;
        state.requiredCoachResponses -= 1;
      } catch (sendError) {
        console.error(`[ForReal] Failed to send message for ${coach.name}:`, sendError);
        // Don't decrement requiredCoachResponses if send failed
        state.awaitingInput = true;
        throw sendError; // Re-throw to trigger outer catch block
      }

      if (state.currentRound === 1) {
        state.awaitingInput = true;
        // Gender-appropriate pronoun for the coach  
        const genderPronouns: Record<string, string> = {
          'alex': 'her',
          'rohan': 'him', 
          'eljas': 'him',
          'venus': 'her',
          'kailey': 'her',
          'donte': 'him'
        };
        const pronoun = genderPronouns[coachKey] || 'them';
        
        // Set 60-second timeout for "Don't leave hanging" message
        state.hangingTimeoutHandle = setTimeout(async () => {
          if (state.awaitingInput && state.active) {
            console.log('[ForReal] 60-second timeout reached, sending "Don\'t leave hanging" message');
            
            // Use AF Mod for hanging reminder
            const hangingSequence = {
              main: {
                sender: 'forealthough-mc',
                content: `💬 ${coach.name} has a question. Don't leave ${pronoun} hanging.`,
                channelId: state.channelId
              }
            };
            await messenger.executeMessageSequence(hangingSequence);
          }
        }, 60000); // 60 seconds
        
        // Set 120-second timeout for Round 1 answers
        state.timeoutHandle = setTimeout(async () => {
          if (state.awaitingInput && state.active) {
            console.log('[ForReal] 120-second timeout in Round 1, ending conversation');
            
            // Use AF Mod for timeout messages
            const timeoutSequence = {
              main: {
                sender: 'forealthough-mc',
                content: "⏰ No answer received. Feel free to start a new conversation with more context when you're ready.",
                channelId: state.channelId
              }
            };
            await messenger.executeMessageSequence(timeoutSequence);
            await endForRealConversation(state.channelId);
          }
        }, 120000);
      } else {
        // Round 2+: ALWAYS wait for user input after each coach response (strict turn-based)
        state.awaitingInput = true;
        
        // Check if this is the "last chance" moment (after 3 Round 2 responses AND user only said "go on")
        const round2CoachMessages = state.messages.filter(m => m.round >= 2 && m.speaker !== 'You').length;
        const isLastChance = round2CoachMessages === 3 && state.onlyGoOnResponses && !state.lastChanceShown;
        
        console.log('[ForReal] Round 2+ prompt. Coach messages:', round2CoachMessages, 'Only go on:', state.onlyGoOnResponses, 'Last chance:', isLastChance);
        
        if (isLastChance) {
          state.lastChanceShown = true;
        }
        
        // Use AF Mod for system prompts
        const promptContent = isLastChance 
          ? '🌀 Any more questions or thoughts? You can jump in, ask a coach another question, or just say "all set"'
          : '🌀 Your move: say "go on", jump in, or ask a coach a sharp follow-up.';
          
        const sequence = {
          main: {
            sender: 'forealthough-mc',
            content: promptContent,
            channelId: state.channelId
          }
        };
        await messenger.executeMessageSequence(sequence);
        
        // Set 120-second timeout for Round 2+ responses
        state.timeoutHandle = setTimeout(async () => {
          if (state.awaitingInput && state.active) {
            console.log('[ForReal] 120-second timeout in Round 2+, ending conversation');
            
            // Use AF Mod for timeout messages
            const timeoutSequence = {
              main: {
                sender: 'forealthough-mc',
                content: "⏰ Conversation timed out after 120 seconds. Feel free to start a new conversation when you're ready.",
                channelId: state.channelId
              }
            };
            await messenger.executeMessageSequence(timeoutSequence);
            await endForRealConversation(state.channelId);
          }
        }, 120000);
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
 * Build enhanced system prompt with coach personality
 */
function buildFullSystemPrompt(coach: Coach): string {
  return `You are ${coach.name}. ${coach.systemPrompt}

COMMUNICATION STYLE (YOU MUST FOLLOW THIS): ${coach.attitude}

YOUR BUSINESS PHILOSOPHY: ${coach.substance}

CRITICAL OVERRIDE FOR ROUND 1 QUESTIONS:
If you are in Round 1 and the user's topic mentions "raise money", "funding", "grow business", or "find customers" but you don't know what specific product/service they have, you MUST ask about their product/offering FIRST before any financial or strategic questions. You cannot give meaningful advice about funding/growth without knowing what they're actually building.

CRITICAL VOICE REQUIREMENTS:
- Your response must sound like YOU, not generic business advice
- Use your unique communication style in EVERY response
- If you normally use emojis, use them
- If you're normally brief, be brief
- If you use specific phrases or patterns, use them
- Make your personality unmistakable in every message`;
}

/**
 * Build coach prompt based on ask.js logic
 */
function buildCoachPrompt(coachName: string, state: ForRealConversationState, effectiveRound: number | string): string {
  // Add recent context for all rounds
  const recentExchange = state.messages.slice(-3).map(m => `${m.speaker}: ${m.text}`).join('\n');
  
  if (effectiveRound === 1) {
    const previousQuestions = state.round1Responses.map(r => `${r.coach} asked: "${r.question}"`).join('\n');
    const previousAnswers = state.messages
      .filter(m => m.speaker === 'You' && m.round === 1)
      .map(m => m.text)
      .join('\n');
    
    let prompt = ROUND1_PROMPT
      .replace('[COACH_NAME]', coachName)
      .replace('[USER_QUESTION]', state.topic);

    // Add mandatory context check
    prompt += `

MANDATORY CONTEXT CHECK:
Before asking your strategic question, scan the user's topic for completeness:

- If they mention "raise money/funding" but you don't know WHAT they're fundraising for → Ask about their product/service first
- If they mention "grow my business" but you don't know WHAT the business does → Ask what they build/sell first  
- If they mention "find customers" but you don't know WHO their customers are → Ask about their target market first
- If they mention "pricing strategy" but you don't know WHAT they're pricing → Ask about their offering first

RULE: You cannot give meaningful advice about HOW to do something without knowing WHAT they're actually doing.

If the topic lacks this basic context, your question MUST gather it first. Examples:
- "Before we talk funding - what exactly does your AI demo do?"
- "Help me understand what problem your product solves first."
- "What's the actual business/product we're trying to grow here?"

Only ask strategic follow-ups AFTER you understand their core offering.`;

    if (previousQuestions) {
      prompt += `\n\nOther coaches have already asked:\n${previousQuestions}`;
      if (previousAnswers) {
        prompt += `\n\nUser's answers so far:\n${previousAnswers}`;
      }
      prompt += '\n\nAsk a DIFFERENT critical question that builds on what we know but covers new ground.';
    }
    
    return prompt;
    
  } else if (effectiveRound === '2+') {
    // Round 2+ logic
    const lastCoachResponse = state.messages
      .filter(m => m.speaker === coachName && m.round >= 2)
      .slice(-1)[0];
    
    const lastUserResponse = state.messages
      .filter(m => m.speaker === 'You')
      .slice(-1)[0];
    
    const allOtherCoachResponses = state.messages
      .filter(m => m.speaker !== 'You' && m.speaker !== coachName && m.round >= 2)
      .map(m => `${m.speaker}: ${m.text}`)
      .join('\n\n');
    
    return ROUND2PLUS_PROMPT
      .replace('[COACH_NAME]', coachName)
      .replace('[ORIGINAL_QUESTION]', state.topic)
      .replace('[YOUR_LAST_RESPONSE]', lastCoachResponse?.text || '')
      .replace('[USER_LAST_RESPONSE]', lastUserResponse?.text || '')
      .replace('[OTHER_COACH_RESPONSES]', allOtherCoachResponses)
      .replace('[SUBSTANCE]', COACHES[coachName.toLowerCase()]?.substance || '');

  } else {
    // Round 2 (first response in round 2)
    const round1Facts = state.round1Responses.map(r => `${r.coach} asked: "${r.question}"`).join('\n');
    const userAnswers = state.messages
      .filter(m => m.speaker === 'You' && m.round !== 2)
      .map(m => m.text)
      .join('\n');
    const otherCoachResponses = state.messages
      .filter(m => m.speaker !== 'You' && m.speaker !== coachName && m.round === 2)
      .map(m => `${m.speaker}: ${m.text}`)
      .join('\n');

    let round2Base = ROUND2_PROMPT
      .replace('[COACH_NAME]', coachName)
      .replace('[COACH_SPECIFIC_PRINCIPLES]', COACHES[coachName.toLowerCase()]?.substance || '')
      .replace('[ORIGINAL_QUESTION]', state.topic)
      .replace('[ROUND_1_ANSWERS]', userAnswers)
      .replace('[OTHER_COACH_RESPONSES]', otherCoachResponses);
    
    // Add user pushback detection
    if (state.lastUserInput) {
      const lastUserMessage = state.messages[state.messages.length - 1];
      
      if (lastUserMessage.text.match(/ridiculous|wrong|disagree|but|how would/i)) {
        round2Base += `\n\nIMPORTANT: The user just challenged or questioned something. You must:
- Acknowledge their concern directly
- Either defend your position with NEW reasoning OR pivot your advice
- Ask a clarifying question if needed
- Do NOT just repeat your previous point`;
      }
      
      if (lastUserMessage.text.includes('?')) {
        round2Base += `\n\nThe user asked a specific question. Answer it directly and concretely.`;
      }
    }
    
    // Add recent context
    round2Base += `\n\nRecent exchange:\n${recentExchange}`;
    
    // Add cross-coach engagement requirement
    if (otherCoachResponses) {
      round2Base += `\n\nENGAGEMENT REQUIREMENT:
Since other coaches have already responded, you must:
- Directly reference at least one other coach's advice
- Explain why your approach is better/different/complementary
- Use phrases like "Unlike [Coach]..." or "Building on [Coach]'s point..."
- Create productive tension, not just isolated opinions`;
    }

    // Add constraints
    round2Base += `

CRITICAL CONSTRAINTS:
Your response must be 150 words or less. Be concise and direct. Get to your main point in the first sentence.

CRITICAL DATA INTEGRITY RULE:
NEVER present made-up statistics, metrics, or research as facts. Instead:
- Say "I'd need to research competitor pricing in your area" 
- Use clearly hypothetical language: "If competitors typically charge 2x..."
- Suggest how to gather real data: "Survey 5 local competitors this week"
- Reference only data the user has provided or widely known facts
- If you need specific numbers, ask the user or suggest how to find them

SPECIFIC THINGS TO AVOID:
- Numbered lists of next steps
- Trying to solve everything at once  
- Hedging with "I also think" or "Additionally"
- Generic advice that any coach could give
- Making up statistics or "market research"

YOUR RESPONSE SHOULD:
- Make ONE strong argument
- Sound like YOUR unique voice
- Take a position that others might disagree with`;
    
    return round2Base;
  }
}

/**
 * End a ForReal conversation and clean up
 */
export async function endForRealConversation(channelId: string): Promise<boolean> {
  try {
    const state = activeConversations.get(channelId);
    if (!state) return false;
    
    // Clear timeouts if they exist
    if (state.timeoutHandle) {
      clearTimeout(state.timeoutHandle);
      state.timeoutHandle = null;
    }
    if (state.hangingTimeoutHandle) {
      clearTimeout(state.hangingTimeoutHandle);
      state.hangingTimeoutHandle = null;
    }
    
    state.active = false;
    
    // Clean up
    activeConversations.delete(channelId);
    
    return true;
  } catch (error) {
    console.error('[ForReal] Error ending conversation:', error);
    return false;
  }
}

/**
 * Handle "for real though" trigger messages
 */
export async function handleForRealTrigger(message: Message): Promise<void> {
  try {
    const content = message.content.trim();
    const contentLower = content.toLowerCase();
    
    // Determine which trigger was used and extract the question
    let afterTrigger: string;
    if (contentLower.startsWith('for real though')) {
      afterTrigger = content.substring('for real though'.length).trim();
    } else if (contentLower.startsWith('fr ')) {
      afterTrigger = content.substring('fr'.length).trim();
    } else {
      return; // Neither trigger found
    }
    
    // Check if it's just the trigger + less than 5 characters
    if (afterTrigger.length < 5) {
      // Use DiscordMessenger
      const { DiscordMessenger } = await import('./discordMessenger.js');
      const messenger = DiscordMessenger.getInstance();
      messenger.setDiscordClient(message.client);
      
      const sequence = {
        main: {
          sender: 'forealthough-mc',
          content: 'Type: `for real though: [your question]` or `fr [your question]`',
          channelId: message.channelId
        }
      };
      await messenger.executeMessageSequence(sequence);
      return;
    }
    
    // Extract the question (remove colon if present)
    let question = afterTrigger;
    if (question.startsWith(':')) {
      question = question.substring(1).trim();
    }
    
    if (question.length === 0) {
      // Use DiscordMessenger
      const { DiscordMessenger } = await import('./discordMessenger.js');
      const messenger = DiscordMessenger.getInstance();
      messenger.setDiscordClient(message.client);
      
      const sequence = {
        main: {
          sender: 'forealthough-mc',
          content: 'Type: `for real though: [your question]` or `fr [your question]`',
          channelId: message.channelId
        }
      };
      await messenger.executeMessageSequence(sequence);
      return;
    }
    
    // Store the trigger state with timeout
    const triggerState: ForRealTriggerState = {
      channelId: message.channelId,
      question: question,
      awaitingCoachSelection: true,
      timeoutHandle: null
    };
    
    forRealTriggerStates.set(message.channelId, triggerState);
    
    // Import DiscordMessenger
    const { DiscordMessenger } = await import('./discordMessenger.js');
    const messenger = DiscordMessenger.getInstance();
    messenger.setDiscordClient(message.client);
    
    try {
      // Send the coach selection prompt
      console.log('[ForRealTrigger] DEBUG: About to send coach selection prompt...');
      const coachSelectionResponse = `You've entered the spiral council. It's like a board meeting, but nobody's wearing shoes. Each coach brings a distinct strategic lens. You're not getting consensus — you're getting range.

**Donte** – The 0-to-1 Builder  
Focuses on early momentum, narrative velocity, and customer obsession. He's all about bold moves that get you noticed fast.  
*"What gets you 100 obsessed users in 30 days?"*

**Alex** – The Brand & Culture Architect  
Keeps you aligned with your values and story. She thinks emotional resonance and cultural fit are the real growth engines.  
*"What does your brand stand for beyond the product?"*

**Rohan** – The Scale & Systems Strategist  
Always thinking 10x. He focuses on competitive moats, unit economics, and whether your strategy can survive success.  
*"How do you win when this gets copied?"*

**Venus** – The Data & Optimization Realist  
She doesn't care how it feels — only what it proves. She pushes for decisions backed by hard numbers and measurable outcomes.  
*"What do the metrics actually say?"*

**Eljas** – The Timing & Sustainability Philosopher  
Believes in rhythm, not forcing it. He looks for natural timing, organic traction, and long-term resilience.  
*"What wants to emerge naturally here?"*

**Kailey** – The Execution & Resource Strategist  
Gets tactical, fast. She cares about what your team can actually deliver, with what resources, and on what timeline.  
*"How exactly does this get done with your current capacity?"*

Time to summon 3 coaches.
Tag them: \`@alex @donte @rohan\`  
Or type \`random\` to let the algo choose.`;
      
      const coachSequence = {
        main: {
          sender: 'forealthough-mc',
          content: coachSelectionResponse,
          channelId: message.channelId
        }
      };
      
      const success = await messenger.executeMessageSequence(coachSequence);
      console.log('[ForRealTrigger] DEBUG: coach selection prompt result:', success);
      if (!success) {
        console.warn('[ForRealTrigger] DiscordMessenger failed for coach selection prompt');
      }
      
             // Set up 2-minute timeout for coach selection
       triggerState.timeoutHandle = setTimeout(async () => {
         const currentState = forRealTriggerStates.get(message.channelId);
         if (currentState && currentState.awaitingCoachSelection) {
           console.log('[ForRealTrigger] 2-minute timeout reached for coach selection, ending trigger state');
           
           // Send timeout message first
           const messenger = DiscordMessenger.getInstance();
           try {
             const timeoutSequence = {
               main: {
                 sender: 'forealthough-mc',
                 content: "⏰ Coach selection timed out after 2 minutes. Feel free to start a new conversation when you're ready.",
                 channelId: message.channelId
               }
             };
             await messenger.executeMessageSequence(timeoutSequence);
           } catch (timeoutError) {
             console.error('[ForRealTrigger] Error sending timeout message:', timeoutError);
           }
           
           // Clean up the trigger state (but don't clear timeout since we're in the timeout callback)
           forRealTriggerStates.delete(message.channelId);
          
          // Send timeout message
          try {
            const timeoutSequence = {
              main: {
                sender: 'forealthough-mc',
                content: "⏰ Coach selection timed out after 2 minutes. Feel free to start a new conversation when you're ready.",
                channelId: message.channelId
              }
            };
            await messenger.executeMessageSequence(timeoutSequence);
          } catch (timeoutError) {
            console.error('[ForRealTrigger] Error sending timeout message:', timeoutError);
          }
        }
      }, 120000); // 2 minutes
      
    } catch (error) {
      console.warn('[ForRealTrigger] DiscordMessenger error:', error);
    }
    
  } catch (error) {
    console.error('[ForRealTrigger] Error handling trigger:', error);
    
    // Clean up any partial trigger state
    cleanupForRealTriggerState(message.channelId);
    
    // Use DiscordMessenger for error response
    try {
      const { DiscordMessenger } = await import('./discordMessenger.js');
      const messenger = DiscordMessenger.getInstance();
      messenger.setDiscordClient(message.client);
      
      const sequence = {
        main: {
          sender: 'forealthough-mc',
          content: 'Sorry, there was an error processing your request. Try: `for real though: [your question]` or `fr [your question]`',
          channelId: message.channelId
        }
      };
      await messenger.executeMessageSequence(sequence);
    } catch (fallbackError) {
      console.error('[ForRealTrigger] Fallback error:', fallbackError);
    }
  }
}

/**
 * Handle coach selection for ForReal conversations
 */
export async function handleForRealCoachSelection(message: Message, triggerState: ForRealTriggerState): Promise<boolean> {
  try {
    const content = message.content.toLowerCase().trim();
    
    // Handle "random" selection
    if (content === 'random') {
      const allCoaches = ['alex', 'donte', 'rohan', 'eljas', 'kailey', 'venus'];
      const selectedCoaches: string[] = [];
      
      // Randomly select 3 coaches
      while (selectedCoaches.length < 3) {
        const randomIndex = Math.floor(Math.random() * allCoaches.length);
        const coach = allCoaches[randomIndex];
        if (!selectedCoaches.includes(coach)) {
          selectedCoaches.push(coach);
        }
      }
      
      // Clean up the trigger state
      cleanupForRealTriggerState(message.channelId);
      
      // Start the conversation
      await startForRealConversation(message.channelId, message.client, selectedCoaches, triggerState.question);
      return true;
    }
    
    // Handle manual coach selection (look for @mentions)
    const mentions = content.match(/@(\w+)/g);
    if (mentions) {
      const selectedCoaches = mentions.map(mention => mention.substring(1).toLowerCase());
      const uniqueCoaches = [...new Set(selectedCoaches)];
      
      if (uniqueCoaches.length === 3) {
        // Validate coaches exist
        const validCoaches = uniqueCoaches.filter(coach => COACHES[coach]);
        if (validCoaches.length === 3) {
          // Clean up the trigger state
          cleanupForRealTriggerState(message.channelId);
          
          // Start the conversation
          await startForRealConversation(message.channelId, message.client, uniqueCoaches, triggerState.question);
          return true;
        }
      }
    }
    
    // Invalid selection - ask again
    try {
      const { DiscordMessenger } = await import('./discordMessenger.js');
      const messenger = DiscordMessenger.getInstance();
      messenger.setDiscordClient(message.client);
      
      const sequence = {
        main: {
          sender: 'forealthough-mc',
          content: 'Please select exactly 3 coaches by tagging them (e.g., @alex @donte @rohan) or type `random`.',
          channelId: message.channelId
        }
      };
      await messenger.executeMessageSequence(sequence);
    } catch (error) {
      console.error('[ForRealCoachSelection] Error sending selection prompt:', error);
    }
    
    return true;
  } catch (error) {
    console.error('[ForRealCoachSelection] Error handling coach selection:', error);
    try {
      const { DiscordMessenger } = await import('./discordMessenger.js');
      const messenger = DiscordMessenger.getInstance();
      messenger.setDiscordClient(message.client);
      
      const sequence = {
        main: {
          sender: 'forealthough-mc',
          content: 'Sorry, there was an error processing the coach selection.',
          channelId: message.channelId
        }
      };
      await messenger.executeMessageSequence(sequence);
    } catch (fallbackError) {
      console.error('[ForRealCoachSelection] Fallback error:', fallbackError);
    }
    return true;
  }
}

/**
 * Check if a message is a ForReal trigger and handle it
 */
export async function checkAndHandleForRealTrigger(message: Message): Promise<boolean> {
  const messageContent = message.content.toLowerCase();
  
  console.log('[ForRealTrigger] DEBUG: checkAndHandleForRealTrigger called with message:', messageContent.substring(0, 50));
  
  // Check for "for real though" or "fr" trigger
  if (messageContent.startsWith('for real though') || messageContent.startsWith('fr ')) {
    console.log('[ForRealTrigger] DEBUG: Detected ForReal trigger (for real though/fr), calling handleForRealTrigger...');
    await handleForRealTrigger(message);
    console.log('[ForRealTrigger] DEBUG: handleForRealTrigger completed, returning true');
    return true;
  }
  
  // Check for ForReal coach selection response
  const triggerState = forRealTriggerStates.get(message.channelId);
  if (triggerState && triggerState.awaitingCoachSelection) {
    console.log('[ForRealTrigger] DEBUG: Detected coach selection response, calling handleForRealCoachSelection...');
    const handled = await handleForRealCoachSelection(message, triggerState);
    console.log('[ForRealTrigger] DEBUG: handleForRealCoachSelection completed, returning:', handled);
    return handled;
  }
  
  console.log('[ForRealTrigger] DEBUG: No ForReal trigger detected, returning false');
  return false;
}

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
}

// Map to store active conversations by channel ID
const activeConversations = new Map<string, ForRealConversationState>();

// Delay function
function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
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
      timeoutHandle: null
    };

    // Store the conversation state
    activeConversations.set(channelId, state);

    // Get Discord messenger and set the client
    const messenger = DiscordMessenger.getInstance();
    messenger.setDiscordClient(client);

    // Send intro message
    await messenger.sendIntro(channelId, 'forreal');

    // If topic is provided, start Round 1 immediately
    if (topic) {
      const channel = await client.channels.fetch(channelId);
      if (channel?.isTextBased() && 'send' in channel) {
        await channel.send(`🧠 Topic: ${topic}`);
        await channel.send(`🎙️ Coaches: ${coaches.map(c => c.charAt(0).toUpperCase() + c.slice(1)).join(', ')}`);
        
        // Start Round 1 - coaches ask questions
        state.requiredCoachResponses = 3; // Only 3 responses needed for round 1
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
 * Handle user message in a ForReal conversation (ask.js logic)
 */
export async function handleForRealMessage(message: Message): Promise<boolean> {
  try {
    // Get the conversation state for this channel
    const state = activeConversations.get(message.channelId);
    if (!state || !state.active) return false;

    // Clear any existing timeout
    if (state.timeoutHandle) {
      clearTimeout(state.timeoutHandle);
      state.timeoutHandle = null;
    }

    const input = message.content.trim();

    // If no topic set, this message becomes the topic
    if (!state.topic) {
      state.topic = input;
      state.requiredCoachResponses = 3; // Start Round 1
      state.awaitingInput = false;

      await message.reply(`🧠 Topic: ${input}`);
      await message.reply(`🎙️ Coaches: ${state.coaches.map(c => c.charAt(0).toUpperCase() + c.slice(1)).join(', ')}`);

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
      // Do nothing — just proceed
    } else {
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
          sender: 'theaf',
          content: '\n🔄 Moving to Round 2. Coaches will now give their perspectives based on your answers.',
          channelId: state.channelId,
          useChannelMC: 'forealthough-mc'  // Use AF Mod webhook
        }
      };
      await messenger.executeMessageSequence(sequence);
      
      return await runNextCoach(state);
    }

    // Check if we're done with required responses
    if (state.requiredCoachResponses <= 0) {
      console.log('[ForReal] No more required responses. Waiting for user input.');
      state.awaitingInput = true;
      
      const messenger = DiscordMessenger.getInstance();
      await messenger.sendToChannel(state.channelId, '🟡 Type "go on", reply, or call on another coach.');
      
      // Set 90-second timeout
      state.timeoutHandle = setTimeout(async () => {
        if (state.awaitingInput && state.active) {
          console.log('[ForReal] 90-second timeout reached, ending conversation');
          const messenger = DiscordMessenger.getInstance();
          
          // Use AF Mod for timeout messages
          const timeoutSequence = {
            main: {
              sender: 'theaf',
              content: "⏰ Conversation timed out after 90 seconds. Feel free to start a new conversation when you're ready.",
              channelId: state.channelId,
              useChannelMC: 'forealthough-mc'  // Use AF Mod webhook
            }
          };
          await messenger.executeMessageSequence(timeoutSequence);
          await endForRealConversation(state.channelId);
        }
      }, 90000); // 90 seconds
      
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
      const maxTokens = state.currentRound === 1 ? 100 : 225;
      
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

      const reply = res.choices[0]?.message?.content?.trim() || '[No response generated]';
      
      // Add to conversation history
      state.messages.push({ speaker: coach.name, text: reply, round: state.currentRound });
      
      if (state.currentRound === 1) {
        state.round1Responses.push({ coach: coach.name, question: reply });
      }
      
      state.lastUserInput = null;
      state.requiredCoachResponses -= 1;

      // Send message via Discord
      const messenger = DiscordMessenger.getInstance();
      await messenger.sendAsCoach(state.channelId, coachKey, reply);

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
        
        // Use AF Mod for system prompts
        const sequence = {
          main: {
            sender: 'theaf',
            content: `💬 ${coach.name} has a question. Don't leave ${pronoun} hanging.`,
            channelId: state.channelId,
            useChannelMC: 'forealthough-mc'  // Use AF Mod webhook
          }
        };
        await messenger.executeMessageSequence(sequence);
        
        // Set 90-second timeout for Round 1 answers
        state.timeoutHandle = setTimeout(async () => {
          if (state.awaitingInput && state.active) {
            console.log('[ForReal] 90-second timeout in Round 1, ending conversation');
            
            // Use AF Mod for timeout messages
            const timeoutSequence = {
              main: {
                sender: 'theaf',
                content: "⏰ No answer received. Feel free to start a new conversation with more context when you're ready.",
                channelId: state.channelId,
                useChannelMC: 'forealthough-mc'  // Use AF Mod webhook
              }
            };
            await messenger.executeMessageSequence(timeoutSequence);
            await endForRealConversation(state.channelId);
          }
        }, 90000);
      } else {
        // Round 2+: ALWAYS wait for user input after each coach response (strict turn-based)
        state.awaitingInput = true;
        
        // Use AF Mod for system prompts
        const sequence = {
          main: {
            sender: 'theaf',
            content: `🟡 Type "go on", reply, or call on another coach.`,
            channelId: state.channelId,
            useChannelMC: 'forealthough-mc'  // Use AF Mod webhook
          }
        };
        await messenger.executeMessageSequence(sequence);
        
        // Set 90-second timeout for Round 2+ responses
        state.timeoutHandle = setTimeout(async () => {
          if (state.awaitingInput && state.active) {
            console.log('[ForReal] 90-second timeout in Round 2+, ending conversation');
            
            // Use AF Mod for timeout messages
            const timeoutSequence = {
              main: {
                sender: 'theaf',
                content: "⏰ Conversation timed out after 90 seconds. Feel free to start a new conversation when you're ready.",
                channelId: state.channelId,
                useChannelMC: 'forealthough-mc'  // Use AF Mod webhook
              }
            };
            await messenger.executeMessageSequence(timeoutSequence);
            await endForRealConversation(state.channelId);
          }
        }, 90000);
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
    const previousQuestions = state.round1Responses.map(r => `${r.coach}: "${r.question}"`).join('\n');
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
Your response must be 225 words or less. Get to your main point in the first sentence.

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
    
    // Clear timeout if it exists
    if (state.timeoutHandle) {
      clearTimeout(state.timeoutHandle);
      state.timeoutHandle = null;
    }
    
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

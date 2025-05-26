import { Client, TextChannel } from 'discord.js';
import { getCharacter, getCharacters } from './characters.js';
import { sendAsCharacter } from './webhooks.js';
import { generateCharacterResponse } from './ai.js';
import fs from 'fs';
import path from 'path';
import { PITCH_CHANNEL_ID } from './bot.js';
import { getRandomYCStartup, YCStartup } from './ycStartups.js';

// Track active pitch discussions by channel
type PitchState = {
  idea: string;
  round: number;
  responses: { character: string; message: string }[];
  votes: Record<string, string>;
  isActive: boolean;
  isYCStartup?: boolean;
  ycStartupData?: YCStartup;
  isShortIdea: boolean; // true if idea is < 10 words
};

const activePitches = new Map<string, PitchState>();

// Store a reference to the Discord client
let discordClient: Client | null = null;

// Function to get a random pitch idea from the file
function getRandomPitchIdea(): string {
  const pitchIdeasPath = process.env.PITCH_IDEAS_FILE || path.join(process.cwd(), 'data', 'pitch-ideas.txt');
  try {
    const ideas = fs.readFileSync(pitchIdeasPath, 'utf-8').split('\n').filter(line => line.trim());
    return ideas[Math.floor(Math.random() * ideas.length)];
  } catch (error) {
    console.error('Error reading pitch ideas:', error);
    return 'A new social network for connecting professionals';
  }
}

// Function to trigger pitch chat from scheduler
export async function triggerPitchChat(channelId: string, client: Client): Promise<void> {
  try {
    // Store the client reference for later use
    discordClient = client;
    
    // Use the PITCH_CHANNEL_ID instead of the passed channelId
    const targetChannelId = PITCH_CHANNEL_ID || channelId;
    console.log(`[PITCH DEBUG] Starting scheduled pitch chat for channel: ${targetChannelId} (originally requested for: ${channelId})`);
    console.log(`[PITCH DEBUG] PITCH_CHANNEL_ID value: ${PITCH_CHANNEL_ID || 'not set'}`);
    
    // Check if there's already an active pitch session in the target channel
    if (activePitches.has(targetChannelId)) {
      console.log('[PITCH DEBUG] Pitch chat already active in this channel');
      return;
    }
    
    // Randomly choose between fictional and YC startup pitches (50/50 chance)
    const useYCStartup = Math.random() < 0.5;
    let idea: string;
    let ycStartupData: YCStartup | undefined;
    
    if (useYCStartup) {
      // Use a YC startup pitch
      const startupData = getRandomYCStartup();
      if (!startupData) {
        // Fall back to fictional if no YC data is available
        idea = getRandomPitchIdea();
        console.log(`[PITCH DEBUG] No YC startup data available, using fictional pitch: "${idea}"`);
      } else {
        ycStartupData = startupData;
        idea = startupData.shortPitch;
        console.log(`[PITCH DEBUG] Using YC startup pitch: "${idea}" (${startupData.name})`);
      }
    } else {
      // Use a fictional pitch idea
      idea = getRandomPitchIdea();
      console.log(`[PITCH DEBUG] Using fictional pitch: "${idea}"`);
    }
    
    // Make sure we're getting the correct channel
    console.log(`[PITCH DEBUG] Fetching channel: ${targetChannelId}`);
    const channel = await client.channels.fetch(targetChannelId);
    if (!channel?.isTextBased()) {
      console.error(`[PITCH DEBUG] Channel ${targetChannelId} not found or not text-based`);
      return;
    }
    
    const textChannel = channel as TextChannel;
    console.log(`[PITCH DEBUG] Found text channel: ${textChannel.name}`);
    await textChannel.send(`Starting scheduled pitch discussion for: "${idea}"\nEach coach will give two rounds of feedback, followed by voting.`);
    console.log(`[PITCH DEBUG] Sent initial pitch message to channel`);
    
    const shortIdea = isShortIdea(idea);
    const state: PitchState = {
      idea,
      round: 1,
      responses: [],
      votes: {},
      isActive: true,
      isYCStartup: useYCStartup && !!ycStartupData,
      ycStartupData,
      isShortIdea: shortIdea
    };
    
    activePitches.set(targetChannelId, state);
    console.log(`[PITCH DEBUG] Created pitch state and set active in channel: ${targetChannelId}`);
    
    // Start the first round
    console.log(`[PITCH DEBUG] Starting first round of pitch discussion`);
    await continuePitchDiscussion(targetChannelId);
    
    return;
  } catch (error) {
    console.error('Error in scheduled pitch chat:', error);
    // Clean up state on error
    if (PITCH_CHANNEL_ID) {
      activePitches.delete(PITCH_CHANNEL_ID);
    }
    return;
  }
}

function isShortIdea(idea: string): boolean {
  return idea.trim().split(/\s+/).length < 10;
}

export async function handlePitchCommand(message: any, idea: string): Promise<void> {
  // For manual commands, use the PITCH_CHANNEL_ID if available
  const targetChannelId = PITCH_CHANNEL_ID || message.channelId;
  
  if (activePitches.has(targetChannelId)) {
    await message.reply('There is already an active pitch discussion in the pitch channel. Please wait for it to finish.');
    return;
  }
  
  const shortIdea = isShortIdea(idea);
  console.log(`[PITCH DEBUG] Short pitch detected: ${shortIdea} for idea: "${idea}" (${idea.trim().split(/\s+/).length} words)`);
  const state: PitchState = {
    idea,
    round: 1,
    responses: [],
    votes: {},
    isActive: true,
    isShortIdea: shortIdea
  };
  
  activePitches.set(targetChannelId, state);
  
  // Acknowledge the pitch
  await message.reply(`Starting pitch discussion for: "${idea}" in the pitch channel.\nEach coach will give two rounds of feedback, followed by voting.`);
  
  // If we have a dedicated pitch channel and it's different from the current channel,
  // also send a notification in the pitch channel
  if (PITCH_CHANNEL_ID && PITCH_CHANNEL_ID !== message.channelId) {
    try {
      const pitchChannel = await message.client.channels.fetch(PITCH_CHANNEL_ID) as TextChannel;
      if (pitchChannel) {
        await pitchChannel.send(`Starting pitch discussion for: "${idea}"\nRequested by ${message.author.username}.\nEach coach will give two rounds of feedback, followed by voting.`);
      }
    } catch (err) {
      console.error(`Error notifying pitch channel:`, err);
    }
  }
  
  // Start the first round
  await continuePitchDiscussion(targetChannelId);
}

// Add the new YC-specific pitch command
export async function handlePitchYCCommand(message: any): Promise<void> {
  // For manual commands, use the PITCH_CHANNEL_ID if available
  const targetChannelId = PITCH_CHANNEL_ID || message.channelId;
  
  if (activePitches.has(targetChannelId)) {
    await message.reply('There is already an active pitch discussion in the pitch channel. Please wait for it to finish.');
    return;
  }
  
  // Get a YC startup
  const ycStartupData = getRandomYCStartup();
  if (!ycStartupData) {
    await message.reply('Sorry, I couldn\'t find any YC startup data. Please try again later.');
    return;
  }
  
  // Use the long pitch for the dedicated YC command
  const idea = ycStartupData.longPitch;
  
  const state: PitchState = {
    idea,
    round: 1,
    responses: [],
    votes: {},
    isActive: true,
    isYCStartup: true,
    ycStartupData,
    isShortIdea: isShortIdea(idea)
  };
  
  activePitches.set(targetChannelId, state);
  
  // Acknowledge the pitch
  await message.reply(`Starting YC startup pitch discussion for: "${idea}" in the pitch channel.\nEach coach will give two rounds of feedback, followed by voting.`);
  
  // If we have a dedicated pitch channel and it's different from the current channel,
  // also send a notification in the pitch channel
  if (PITCH_CHANNEL_ID && PITCH_CHANNEL_ID !== message.channelId) {
    try {
      const pitchChannel = await message.client.channels.fetch(PITCH_CHANNEL_ID) as TextChannel;
      if (pitchChannel) {
        await pitchChannel.send(`Starting YC startup pitch discussion for: "${idea}"\nRequested by ${message.author.username}.\nEach coach will give two rounds of feedback, followed by voting.`);
      }
    } catch (err) {
      console.error(`Error notifying pitch channel:`, err);
    }
  }
  
  // Start the first round
  await continuePitchDiscussion(targetChannelId);
}

async function continuePitchDiscussion(channelId: string): Promise<void> {
  console.log(`[PITCH DEBUG] Continuing pitch discussion for channel: ${channelId}`);
  
  const state = activePitches.get(channelId);
  if (!state || !state.isActive) {
    console.log(`[PITCH DEBUG] No active pitch state found for channel: ${channelId}`);
    return;
  }

  const characters = getCharacters();
  console.log(`[PITCH DEBUG] Found ${characters.length} characters for discussion`);
  
  // Get responses for current round
  const currentRoundResponses = state.responses.filter((_, index) => 
    Math.floor(index / characters.length) === state.round - 1
  );
  console.log(`[PITCH DEBUG] Round ${state.round}: ${currentRoundResponses.length}/${characters.length} characters have responded`);
  console.log(`[PITCH DEBUG] Current responses:`, currentRoundResponses.map(r => r.character));

  // Check if round is complete
  if (currentRoundResponses.length === characters.length) {
    if (state.round === 2) {
      // All rounds complete, start voting
      console.log(`[PITCH DEBUG] All rounds complete, starting voting phase`);
      await startVoting(channelId);
      return;
    }
    // Move to next round
    state.round++;
    console.log(`[PITCH DEBUG] Moving to round ${state.round}`);
    // Add a small delay between rounds
    setTimeout(() => continuePitchDiscussion(channelId), 3000);
    return;
  }

  // Get the last speaker
  const lastSpeaker = state.responses[state.responses.length - 1]?.character;
  
  // Find characters who haven't spoken in this round
  const availableCharacters = characters.filter(char => {
    const hasSpokenInRound = currentRoundResponses.some(r => r.character === char.id);
    console.log(`[PITCH DEBUG] Character ${char.name} (${char.id}) has spoken in round ${state.round}: ${hasSpokenInRound}`);
    return !hasSpokenInRound;
  });

  // If no available characters, something went wrong
  if (availableCharacters.length === 0) {
    console.error('[PITCH DEBUG] No available characters to speak');
    return;
  }

  // Pick next character (avoid last speaker if possible)
  let nextCharacter = availableCharacters.find(c => c.id !== lastSpeaker);
  if (!nextCharacter) {
    nextCharacter = availableCharacters[0];
  }
  console.log(`[PITCH DEBUG] Selected ${nextCharacter.name} to speak next`);

  // Generate response based on whether it's a short or long idea
  console.log(`[PITCH DEBUG] Generating response. isShortIdea: ${state.isShortIdea}, round: ${state.round}, idea: "${state.idea}"`);
  let contextPrompt: string;
  
  if (state.isShortIdea) {
    console.log(`[PITCH DEBUG] Short pitch mode active for: "${state.idea}"`);
    // Short idea prompts (for ideas < 10 words)
    if (state.round === 1) {
      // Round 1: Chaotic, fun responses for short ideas
      // Add emoji requirement for Alex in round 1
      const emojiRequirement = nextCharacter.id === 'alex' ? ' USE AT LEAST 3 EMOJIS. This is required.' : '';
      
      contextPrompt = `You are ${nextCharacter.name}. A founder pitched: "${state.idea}". 

This is a short pitch (under 10 words). Keep it fun and chaotic. Stay in character but be playful.${emojiRequirement} Max 20 words.`;
    } else {
      // Special handling for Alex in short mode - require emojis
      const alexEnhancement = nextCharacter.id === 'alex' ? 
        ' YOU MUST USE AT LEAST 3 EMOJIS IN YOUR RESPONSE. This is required. Choose from: 🚀✨💡🔥💯👏🤔💭💬💭📈📱💻🍃🧘‍♀️' : '';
      
      contextPrompt = `You are ${nextCharacter.name}. Short pitch: "${state.idea}"

Previous comments:\n${currentRoundResponses.map(r => `${getCharacter(r.character)?.name}: "${r.message}"`).join('\n')}

Add your take (max 15 words). Be playful and in character.${alexEnhancement}`;
    }
  } else { // Long idea handling remains the same
    // Long idea prompts (for ideas >= 10 words)
    if (state.isShortIdea) {
      contextPrompt = state.round === 1
        ? `You are ${nextCharacter.name}. A founder has pitched their business idea: "${state.idea}".
           
This pitch is under 10 words — it's probably a joke, a vibe, or chaos bait. So skip the serious feedback. Stay in character, but go wild: spiral, joke, riff, be weird. No analysis. Max 20 words.`
        : `You are ${nextCharacter.name}. The pitch is: "${state.idea}".

This one's short, strange, or chaotic. Earlier comments:\n${currentRoundResponses.map(r => `${getCharacter(r.character)?.name}: ${r.message}`).join('\n')}

Now add your own weird or funny take. Be playful, absurd, or poetic. Max 15 words.`;
    } else {
      contextPrompt = state.round === 1 
        ? `You are ${nextCharacter.name}. A founder has pitched their business idea: "${state.idea}". 
           Give a brief, focused reaction (max 50 words). Be constructive but honest, speaking in your unique voice.
           Focus on a single specific aspect of the idea.`
        : `You are ${nextCharacter.name}. Continue the discussion about: "${state.idea}".
           Previous comments in this round:\n${currentRoundResponses.map(r => `${getCharacter(r.character)?.name}: ${r.message}`).join('\n')}
           Give a brief, focused follow-up comment (max 50 words). React to others' points while staying in character.
           Focus on a different aspect than what others have mentioned.`;
    }
  }

  try {
    console.log(`[PITCH DEBUG] Generating response for ${nextCharacter.name}`);
    const maxWords = state.isShortIdea ? (state.round === 1 ? 20 : 15) : 50;
    let response: string;
    
    // Special handling for Rohan in round 2 of short pitches
    if (state.isShortIdea && state.round === 2 && nextCharacter.name === 'Rohan Mehta') {
      const rohanResponses = [
        '🤯', 'Bruh.', 'LOL', 'Nope.', 'Yikes', '🔥', 'Wut.', 'LMAO', 'Sigh...', 'Oof.',
        'Nah.', 'Yup.', 'Hmm.', 'Sure.', 'Wild.', 'Yikes.', 'LOL', 'WTF', 'lol', 'k.'
      ];
      response = rohanResponses[Math.floor(Math.random() * rohanResponses.length)];
    } else {
      // Normal response generation for other cases
      response = await generateCharacterResponse(
        nextCharacter.prompt + '\n' + contextPrompt, 
        state.idea,
        maxWords
      );
      
      // Clean up the response - remove any surrounding quotes
      response = response.trim().replace(/^["']|["']$/g, '');
    }
    
    // Verify word count (skip for Rohan's one-word/emoji responses)
    if (!(state.isShortIdea && state.round === 2 && nextCharacter.name === 'Rohan Mehta')) {
      const wordCount = response.trim().split(/\s+/).length;
      console.log(`[PITCH DEBUG] Response word count: ${wordCount}/${maxWords}`);
    }
    
    // Store the response
    state.responses.push({ character: nextCharacter.id, message: response });
    console.log(`[PITCH DEBUG] Sending message as ${nextCharacter.name} to channel ${channelId}`);
    await sendAsCharacter(channelId, nextCharacter.id, response);
    console.log(`[PITCH DEBUG] Message sent successfully`);

    // Add varying delays between responses to feel more natural
    const delay = 2000 + Math.random() * 1000;
    console.log(`[PITCH DEBUG] Scheduling next speaker in ${Math.round(delay)}ms`);
    setTimeout(() => continuePitchDiscussion(channelId), delay);
  } catch (error) {
    console.error('[PITCH DEBUG] Error in pitch discussion:', error);
    activePitches.delete(channelId);
  }
}

async function startVoting(channelId: string): Promise<void> {
  const state = activePitches.get(channelId);
  if (!state) return;

  const characters = getCharacters();
  
  // Generate votes - for short ideas, make it more fun and less serious
  for (const character of characters) {
    const votePrompt = state.isShortIdea
      ? `You are ${character.name}. After this chaotic discussion about the short idea: "${state.idea}"
         Discussion history:\n${state.responses.map(r => `${getCharacter(r.character)?.name}: ${r.message}`).join('\n')}
         This is clearly not a serious pitch, so let's have fun with the voting. Vote either INVEST (if this chaotic energy deserves funding) or PASS (if it's too much even for you). Add a funny one-liner (max 15 words).`
      : `You are ${character.name}. After discussing this business idea: "${state.idea}"
         Discussion history:\n${state.responses.map(r => `${getCharacter(r.character)?.name}: ${r.message}`).join('\n')}
         Vote either INVEST or PASS, with a very brief reason (10 words max).`;
    
    try {
      // Enforce 15-word limit for short pitches, 10 for long ones
      const maxWords = state.isShortIdea ? 15 : 10;
      let vote = await generateCharacterResponse(
        character.prompt + '\n' + votePrompt, 
        state.idea,
        maxWords
      );
      
      // Clean up the vote message
      vote = vote.trim().replace(/^["']|["']$/g, '');
      
      // Ensure the vote starts with INVEST or PASS
      const votePrefix = vote.toUpperCase().startsWith('INVEST') ? 'INVEST' : 
                        vote.toUpperCase().startsWith('PASS') ? 'PASS' : '';
      
      // Clean up the rest of the message
      const voteMessage = vote.replace(/^(INVEST|PASS)[\s:]+/i, '').trim();
      
      // Format the final vote message
      const finalVote = votePrefix ? `${votePrefix}: ${voteMessage}` : vote;
      
      state.votes[character.id] = finalVote;
      await sendAsCharacter(channelId, character.id, `🗳️ ${finalVote}`);
      // Add a small delay between votes
      await new Promise(resolve => setTimeout(resolve, 1000));
    } catch (error) {
      console.error('Error during voting:', error);
    }
  }

  // Calculate and display results
  const investCount = Object.values(state.votes).filter(v => v.toLowerCase().includes('invest')).length;
  const passCount = Object.values(state.votes).filter(v => v.toLowerCase().includes('pass')).length;
  
  const resultMessage = `
📊 Final Vote Results:
INVEST: ${investCount} votes
PASS: ${passCount} votes
${investCount > passCount ? '✨ The coaches would invest!' : '🤔 The coaches would pass.'}`;

  // Use the first character to announce results
  await sendAsCharacter(channelId, characters[0].id, resultMessage);
  
  // If this was a YC startup, reveal the information
  if (state.isYCStartup && state.ycStartupData) {
    // Add a small delay before the reveal
    await new Promise(resolve => setTimeout(resolve, 2000));
    await sendAsCharacter(channelId, characters[0].id, state.ycStartupData.revealText);
  }
  
  // Send outro message
  try {
    console.log(`[PITCH DEBUG] Sending outro message for completed pitch in channel ${channelId}`);
    const channel = await discordClient?.channels.fetch(channelId) as TextChannel;
    if (channel) {
      // Import sendEventMessage to ensure consistent formatting
      const { sendEventMessage } = await import('./eventMessages.js');
      
      // Get current time for the outro message
      const now = new Date();
      const gmtHour = now.getUTCHours();
      const gmtMinutes = now.getUTCMinutes();
      
      // Send the outro message using the proper event message system
      await sendEventMessage(
        channel,
        'pitch',
        false, // isIntro = false for outro
        gmtHour,
        gmtMinutes
      );
      console.log(`[PITCH DEBUG] Sent pitch outro message`);
    }
  } catch (error) {
    console.error(`[PITCH DEBUG] Error sending pitch outro message:`, error);
  }
  
  // Cleanup
  state.isActive = false;
  setTimeout(() => activePitches.delete(channelId), 5000);
} 
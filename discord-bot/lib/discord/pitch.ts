import { Client, TextChannel } from 'discord.js';
import { getCharacter, getCharacters } from './characters.js';
import { sendAsCharacter } from './webhooks.js';
import { generateCharacterResponse } from './ai.js';
import fs from 'fs';
import path from 'path';
import { PITCH_CHANNEL_ID } from './bot.js';

// Track active pitch discussions by channel
type PitchState = {
  idea: string;
  round: number;
  responses: { character: string; message: string }[];
  votes: Record<string, string>;
  isActive: boolean;
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
    
    const idea = getRandomPitchIdea();
    console.log(`[PITCH DEBUG] Generated pitch idea: "${idea}"`);
    
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
    
    const state: PitchState = {
      idea,
      round: 1,
      responses: [],
      votes: {},
      isActive: true
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

export async function handlePitchCommand(message: any, idea: string): Promise<void> {
  // For manual commands, use the PITCH_CHANNEL_ID if available
  const targetChannelId = PITCH_CHANNEL_ID || message.channelId;
  
  if (activePitches.has(targetChannelId)) {
    await message.reply('There is already an active pitch discussion in the pitch channel. Please wait for it to finish.');
    return;
  }
  
  const state: PitchState = {
    idea,
    round: 1,
    responses: [],
    votes: {},
    isActive: true
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
  const currentRoundResponses = state.responses.filter(r => 
    state.responses.filter(x => x.character === r.character).length === state.round
  );
  console.log(`[PITCH DEBUG] Round ${state.round}: ${currentRoundResponses.length}/${characters.length} characters have responded`);

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
  const availableCharacters = characters.filter(char => 
    !currentRoundResponses.some(r => r.character === char.id)
  );

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

  // Generate response
  const contextPrompt = state.round === 1 
    ? `You are ${nextCharacter.name}. A founder has pitched their business idea: "${state.idea}". 
       Give a brief, focused reaction (max 50 words). Be constructive but honest, speaking in your unique voice.
       Focus on a single specific aspect of the idea.`
    : `You are ${nextCharacter.name}. Continue the discussion about: "${state.idea}".
       Previous comments in this round:\n${currentRoundResponses.map(r => `${getCharacter(r.character)?.name}: "${r.message}"`).join('\n')}
       Give a brief, focused follow-up comment (max 50 words). React to others' points while staying in character.
       Focus on a different aspect than what others have mentioned.`;

  try {
    console.log(`[PITCH DEBUG] Generating response for ${nextCharacter.name}`);
    const response = await generateCharacterResponse(nextCharacter.prompt + '\n' + contextPrompt, state.idea);
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
  
  // Generate votes
  for (const character of characters) {
    const votePrompt = `You are ${character.name}. After discussing this business idea: "${state.idea}"
      Discussion history:\n${state.responses.map(r => `${getCharacter(r.character)?.name}: "${r.message}"`).join('\n')}
      Vote either INVEST or PASS, with a very brief reason (10 words max).`;
    
    try {
      const vote = await generateCharacterResponse(character.prompt + '\n' + votePrompt, state.idea);
      state.votes[character.id] = vote;
      await sendAsCharacter(channelId, character.id, `🗳️ ${vote}`);
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
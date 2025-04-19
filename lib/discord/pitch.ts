import { Message, TextChannel } from 'discord.js';
import { getCharacter, getCharacters } from './characters.js';
import { sendAsCharacter } from './webhooks.js';
import { generateCharacterResponse } from './ai.js';
import { Client } from 'discord.js';
import fs from 'fs';
import path from 'path';
import { PitchAnalysis, analyzePitch } from './pitchAnalysis.js';

interface PitchState {
  idea: string;
  round: number;
  responses: Array<{character: string, message: string}>;
  votes: Record<string, string>;
  isActive: boolean;
  // New fields for enhanced pitch mode
  analysis?: PitchAnalysis;  // Optional to maintain backward compatibility
  pros?: string[];          // Optional: extracted pros from discussion
  cons?: string[];          // Optional: extracted cons from discussion
}

const activePitches = new Map<string, PitchState>();

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
    console.log('Starting scheduled pitch chat for channel:', channelId);
    
    // Check if there's already an active pitch session
    if (activePitches.has(channelId)) {
      console.log('Pitch chat already active in this channel');
      return;
    }

    // Get a random pitch idea
    const idea = getRandomPitchIdea();
    
    // Analyze the pitch
    const analysis = analyzePitch(idea);
    console.log(`[Pitch Analysis] ${idea}:`, analysis);
    
    // Create a fake message object
    const channel = await client.channels.fetch(channelId);
    if (!channel?.isTextBased()) {
      console.error('Channel not found or not text-based');
      return;
    }

    // Start the pitch discussion
    const textChannel = channel as TextChannel;
    
    // Customize message based on analysis
    const contextMessage = analysis.jokeScore > 7 
      ? `Starting scheduled pitch discussion for: "${idea}"\n(Note: This seems like a fun idea! The coaches will enjoy discussing it.)`
      : analysis.developmentScore > 7
      ? `Starting scheduled pitch discussion for: "${idea}"\n(Note: This idea could use more detail. The coaches will help explore it.)`
      : `Starting scheduled pitch discussion for: "${idea}"\nEach coach will give two rounds of feedback, followed by voting.`;
    
    await textChannel.send(contextMessage);
    
    // Initialize pitch state with analysis
    const state: PitchState = {
      idea,
      round: 1,
      responses: [],
      votes: {},
      isActive: true,
      analysis,
      pros: [],
      cons: []
    };
    activePitches.set(channelId, state);

    // Start the first round
    await continuePitchDiscussion(channelId);
  } catch (error) {
    console.error('Error in scheduled pitch chat:', error);
    // Clean up state on error
    activePitches.delete(channelId);
  }
}

export async function handlePitchCommand(message: Message, idea: string): Promise<void> {
  const channelId = message.channelId;
  
  // Check if there's already an active pitch session
  if (activePitches.has(channelId)) {
    await message.reply('There is already an active pitch discussion in this channel. Please wait for it to finish.');
    return;
  }

  // Analyze the pitch
  const analysis = analyzePitch(idea);
  console.log(`[Pitch Analysis] ${idea}:`, analysis);

  // Initialize pitch state with analysis
  const state: PitchState = {
    idea,
    round: 1,
    responses: [],
    votes: {},
    isActive: true,
    analysis,
    pros: [],
    cons: []
  };
  activePitches.set(channelId, state);

  // Acknowledge the pitch with analysis context
  const contextMessage = analysis.jokeScore > 7 
    ? `Starting pitch discussion for: "${idea}"\n(Note: This seems like a fun idea! The coaches will enjoy discussing it.)`
    : analysis.developmentScore > 7
    ? `Starting pitch discussion for: "${idea}"\n(Note: This idea could use more detail. The coaches will help explore it.)`
    : `Starting pitch discussion for: "${idea}"\nEach coach will give two rounds of feedback, followed by voting.`;

  await message.reply(contextMessage);

  // Start the first round
  await continuePitchDiscussion(channelId);
}

async function continuePitchDiscussion(channelId: string): Promise<void> {
  const state = activePitches.get(channelId);
  if (!state || !state.isActive) return;

  const characters = getCharacters();
  
  // Get responses for current round
  const currentRoundResponses = state.responses.filter(r => 
    state.responses.filter(x => x.character === r.character).length === state.round
  );

  // Check if round is complete
  if (currentRoundResponses.length === characters.length) {
    if (state.round === 2) {
      // All rounds complete, start voting
      await startVoting(channelId);
      return;
    }
    // Move to next round
    state.round++;
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
    console.error('No available characters to speak');
    return;
  }

  // Pick next character (avoid last speaker if possible)
  let nextCharacter = availableCharacters.find(c => c.id !== lastSpeaker);
  if (!nextCharacter) {
    nextCharacter = availableCharacters[0];
  }

  // Generate response based on analysis
  const analysis = state.analysis!; // We know analysis exists because we set it in handlePitchCommand/triggerPitchChat

  // Base prompt template
  let contextPrompt = `You are ${nextCharacter.name}. `;

  // Add analysis context
  if (analysis.jokeScore > 7) {
    contextPrompt += `This is clearly a fun/playful idea: "${state.idea}". `;
    contextPrompt += `Feel free to be creative and humorous in your response, but still provide some constructive feedback. `;
  } else if (analysis.developmentScore > 7) {
    contextPrompt += `This idea needs more development: "${state.idea}". `;
    contextPrompt += `Help explore and expand on the concept while staying in character. `;
  } else {
    contextPrompt += `A founder has pitched their business idea: "${state.idea}". `;
  }

  // Add round-specific context
  if (state.round === 1) {
    contextPrompt += `Give a brief, focused reaction (max 50 words). Be constructive but honest, speaking in your unique voice. `;
    if (analysis.feasibilityScore < 3) {
      contextPrompt += `Note: This idea has significant feasibility challenges. Address these while staying constructive. `;
    }
    if (analysis.noveltyScore > 7) {
      contextPrompt += `This is a particularly novel idea - highlight what makes it unique. `;
    }
  } else {
    contextPrompt += `Previous comments in this round:\n${currentRoundResponses.map(r => 
      `${getCharacter(r.character)?.name}: "${r.message}"`
    ).join('\n')}\n`;
    contextPrompt += `Give a brief, focused follow-up comment (max 50 words). React to others' points while staying in character. `;
  }

  try {
    const response = await generateCharacterResponse(nextCharacter.prompt + '\n' + contextPrompt, state.idea);
    state.responses.push({ character: nextCharacter.id, message: response });
    await sendAsCharacter(channelId, nextCharacter.id, response);

    // Add varying delays between responses to feel more natural
    const delay = 2000 + Math.random() * 1000;
    setTimeout(() => continuePitchDiscussion(channelId), delay);
  } catch (error) {
    console.error('Error in pitch discussion:', error);
    activePitches.delete(channelId);
  }
}

async function startVoting(channelId: string): Promise<void> {
  const state = activePitches.get(channelId);
  if (!state) return;

  const characters = getCharacters();
  
  // Generate votes based on analysis
  for (const character of characters) {
    const analysis = state.analysis!;
    
    // Base vote prompt with analysis context
    let votePrompt = `You are ${character.name}. After discussing this business idea: "${state.idea}"
      Discussion history:\n${state.responses.map(r => `${getCharacter(r.character)?.name}: "${r.message}"`).join('\n')}
      
      Analysis of the idea:
      - Novelty: ${analysis.noveltyScore}/10
      - Feasibility: ${analysis.feasibilityScore}/10
      - Development: ${analysis.developmentScore}/10
      - Joke Score: ${analysis.jokeScore}/10
      
      Vote either INVEST or PASS, with a very brief reason (10 words max). Consider:
      - Novel ideas (score > 7) are worth exploring even if risky
      - Highly feasible ideas (score > 7) are safer bets
      - Underdeveloped ideas (score > 7) need more work
      - Joke ideas (score > 7) should be evaluated for entertainment value`;
    
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

  // Calculate and display results with more context
  const investCount = Object.values(state.votes).filter(v => v.toLowerCase().includes('invest')).length;
  const passCount = Object.values(state.votes).filter(v => v.toLowerCase().includes('pass')).length;
  
  const analysis = state.analysis!;
  let resultContext = '';
  
  if (analysis.jokeScore > 7) {
    resultContext = 'Note: This was evaluated as a fun/entertaining idea.';
  } else if (analysis.developmentScore > 7) {
    resultContext = 'Note: This idea needs more development work.';
  } else if (analysis.feasibilityScore < 3) {
    resultContext = 'Note: This idea has significant feasibility challenges.';
  } else if (analysis.noveltyScore > 7) {
    resultContext = 'Note: This is a particularly novel/innovative idea.';
  }
  
  const resultMessage = `
📊 Final Vote Results:
INVEST: ${investCount} votes
PASS: ${passCount} votes
${resultContext}
${investCount > passCount ? '✨ The coaches would invest!' : '🤔 The coaches would pass.'}`;

  // Use the first character to announce results
  await sendAsCharacter(channelId, characters[0].id, resultMessage);
  
  // Cleanup
  state.isActive = false;
  setTimeout(() => activePitches.delete(channelId), 5000);
} 
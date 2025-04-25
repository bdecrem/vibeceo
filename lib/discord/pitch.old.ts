import { Message, TextChannel } from 'discord.js';
import { getCharacter, getCharacters } from './characters.js';
import { sendAsCharacter } from './webhooks.js';
import { generateCharacterResponse } from './ai.js';
import { Client } from 'discord.js';
import fs from 'fs';
import path from 'path';
import { PitchAnalysis, analyzePitch } from './pitchAnalysis.js';
import { generatePromptContext } from './context.js';
import OpenAI from 'openai';

// OpenAI configuration
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Set to true to skip Discord messages and reduce delays for testing
const TEST_MODE = false;

// Add timing utilities for test mode
interface TimingMetrics {
  analysisStart?: number;
  analysisEnd?: number;
  discussionStart?: number;
  discussionEnd?: number;
  votingStart?: number;
  votingEnd?: number;
}

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
  // Add timing metrics for test mode
  timing?: TimingMetrics;
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

// Helper function to get context message based on GPT analysis
function getContextMessage(idea: string, analysis: PitchAnalysis): string {
  const gptAnalysis = analysis.gptAnalysis;
  
  if (gptAnalysis) {
    if (gptAnalysis.joke_level > 7) {
      return `Starting pitch discussion for: "${idea}"\n(Note: This seems like a fun idea! The coaches will enjoy discussing it. Joke Level: ${gptAnalysis.joke_level}/10)`;
    } else if (gptAnalysis.development > 7) {
      return `Starting pitch discussion for: "${idea}"\n(Note: This idea could use more detail. The coaches will help explore it. Development: ${gptAnalysis.development}/10)`;
    } else if (gptAnalysis.quality < 3) {
      return `Starting pitch discussion for: "${idea}"\n(Note: This idea has significant quality challenges. Quality: ${gptAnalysis.quality}/10)`;
    } else if (gptAnalysis.novelty > 7) {
      return `Starting pitch discussion for: "${idea}"\n(Note: This is a particularly novel idea. Novelty: ${gptAnalysis.novelty}/10)`;
    }
  }
  
  // Fallback to original analysis
  if (analysis.jokeScore > 7) {
    return `Starting pitch discussion for: "${idea}"\n(Note: This seems like a fun idea! The coaches will enjoy discussing it.)`;
  } else if (analysis.developmentScore > 7) {
    return `Starting pitch discussion for: "${idea}"\n(Note: This idea could use more detail. The coaches will help explore it.)`;
  }
  return `Starting pitch discussion for: "${idea}"\nEach coach will give two rounds of feedback, followed by voting.`;
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
    const analysis = await analyzePitch(idea);
    console.log(`[Pitch Analysis] ${idea}:`, analysis);
    
    // Create a fake message object
    const channel = await client.channels.fetch(channelId);
    if (!channel?.isTextBased()) {
      console.error('Channel not found or not text-based');
      return;
    }

    // Start the pitch discussion
    const textChannel = channel as TextChannel;
    
    // Use the same context message function
    const contextMessage = getContextMessage(idea, analysis);
    
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
      cons: [],
      timing: {}
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

  // Initialize timing metrics
  const timing: TimingMetrics = {};
  
  if (TEST_MODE) {
    console.log('\n=== Starting Pitch Analysis ===');
    console.log(`Pitch: "${idea}"`);
    timing.analysisStart = Date.now();
  }

  // Analyze the pitch
  const analysis = await analyzePitch(idea);
  
  if (TEST_MODE) {
    timing.analysisEnd = Date.now();
    const analysisDuration = timing.analysisEnd - timing.analysisStart!;
    
    console.log('\n=== Analysis Results ===');
    console.log(`Analysis Duration: ${analysisDuration}ms`);
    
    const gptAnalysis = analysis.gptAnalysis;
    if (gptAnalysis) {
      console.log('\nGPT Analysis:');
      console.log(`Joke Level: ${gptAnalysis.joke_level}/10`);
      console.log(`└─ ${gptAnalysis.rationale.joke_level}`);
      console.log(`Development: ${gptAnalysis.development}/10`);
      console.log(`└─ ${gptAnalysis.rationale.development}`);
      console.log(`Quality: ${gptAnalysis.quality}/10`);
      console.log(`└─ ${gptAnalysis.rationale.quality}`);
      console.log(`Novelty: ${gptAnalysis.novelty}/10`);
      console.log(`└─ ${gptAnalysis.rationale.novelty}`);
    }
    
    // Generate and log context
    const context = generatePromptContext({
      isJoke: gptAnalysis ? gptAnalysis.joke_level > 7 : analysis.jokeScore > 7,
      isUnderdeveloped: gptAnalysis ? gptAnalysis.development < 5 : analysis.developmentScore < 5,
      pros: [],
      cons: [],
      originalMessage: null as any
    });
    
    console.log('\n=== Generated Context ===');
    console.log(context);
  }

  // Initialize pitch state with analysis and timing
  const state: PitchState = {
    idea,
    round: 1,
    responses: [],
    votes: {},
    isActive: true,
    analysis,
    pros: [],
    cons: [],
    timing
  };
  activePitches.set(channelId, state);

  if (TEST_MODE) {
    console.log('\n=== Starting Discussion ===');
    timing.discussionStart = Date.now();
    await startVoting(channelId);
  } else {
    // Normal flow
    const contextMessage = getContextMessage(idea, analysis);
    await message.reply(contextMessage);
    await continuePitchDiscussion(channelId);
  }
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
    // Extract pros and cons from the round's responses
    const roundResponses = state.responses.slice(-characters.length);
    state.pros = state.pros || [];
    state.cons = state.cons || [];
    
    // Use GPT to extract pros and cons from the discussion
    try {
      const discussionText = roundResponses.map(r => 
        `${getCharacter(r.character)?.name}: ${r.message}`
      ).join('\n');
      
      const response = await openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [
          {
            role: "system",
            content: "Extract key pros and cons from this pitch discussion. Return ONLY a JSON object in this format: {\"pros\": [\"pro1\", \"pro2\"], \"cons\": [\"con1\", \"con2\"]}"
          },
          {
            role: "user",
            content: discussionText
          }
        ],
        temperature: 0.3,
        max_tokens: 250
      });

      const content = response.choices[0]?.message?.content;
      if (content) {
        const extracted = JSON.parse(content);
        state.pros.push(...(extracted.pros || []));
        state.cons.push(...(extracted.cons || []));
      }
    } catch (error) {
      console.error('Error extracting pros/cons:', error);
    }

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

  // Generate response based on analysis and context
  const analysis = state.analysis!;
  const gptAnalysis = analysis.gptAnalysis;

  // Generate context for the prompt
  const context = generatePromptContext({
    isJoke: gptAnalysis ? gptAnalysis.joke_level > 7 : analysis.jokeScore > 7,
    isUnderdeveloped: gptAnalysis ? gptAnalysis.development < 5 : analysis.developmentScore < 5,
    pros: state.pros || [],
    cons: state.cons || [],
    originalMessage: null as any
  });

  // Base prompt template with context
  let contextPrompt = `You are ${nextCharacter.name}. 

${context}

The pitch: "${state.idea}"

Your task: ${state.round === 1 ? 
  "Give your initial reaction and analysis of this pitch." : 
  "Build on the discussion and address points raised by others."}

Guidelines:
- Keep your response focused (max 50 words)
- Stay in character and maintain your unique perspective
- Be constructive but honest
${gptAnalysis ? `
Analysis context:
- Joke Level: ${gptAnalysis.joke_level}/10 - ${gptAnalysis.rationale.joke_level}
- Development: ${gptAnalysis.development}/10 - ${gptAnalysis.rationale.development}
- Quality: ${gptAnalysis.quality}/10 - ${gptAnalysis.rationale.quality}
- Novelty: ${gptAnalysis.novelty}/10 - ${gptAnalysis.rationale.novelty}` : ''}

${state.round === 2 ? `Previous comments in this round:
${currentRoundResponses.map(r => `${getCharacter(r.character)?.name}: "${r.message}"`).join('\n')}` : ''}`;

  try {
    const response = await generateCharacterResponse(nextCharacter.prompt + '\n' + contextPrompt, state.idea);
    state.responses.push({ character: nextCharacter.id, message: response });
    
    if (TEST_MODE) {
      console.log(`\n${nextCharacter.name}:`);
      console.log(`└─ ${response}`);
      
      // Log pros and cons if available
      if (state.pros?.length || state.cons?.length) {
        console.log('\nExtracted Points:');
        if (state.pros?.length) {
          console.log('Pros:');
          state.pros.forEach(pro => console.log(`└─ ${pro}`));
        }
        if (state.cons?.length) {
          console.log('Cons:');
          state.cons.forEach(con => console.log(`└─ ${con}`));
        }
      }
    } else {
      await sendAsCharacter(channelId, nextCharacter.id, response);
    }

    // Add varying delays between responses
    const delay = TEST_MODE ? 500 : 2000 + Math.random() * 1000;
    setTimeout(() => continuePitchDiscussion(channelId), delay);
  } catch (error) {
    console.error('Error in pitch discussion:', error);
    activePitches.delete(channelId);
  }
}

async function startVoting(channelId: string): Promise<void> {
  const state = activePitches.get(channelId);
  if (!state) return;

  if (TEST_MODE) {
    state.timing!.votingStart = Date.now();
    console.log('\n=== Starting Voting ===');
  }

  const characters = getCharacters();
  
  // Generate votes based on GPT analysis
  for (const character of characters) {
    const analysis = state.analysis!;
    const gptAnalysis = analysis.gptAnalysis;
    
    // Base vote prompt with GPT analysis context
    let votePrompt = `You are ${character.name}. After analyzing this business idea: "${state.idea}"
      
      Analysis of the idea:
      - Joke Level: ${gptAnalysis?.joke_level || analysis.jokeScore}/10
      - Development: ${gptAnalysis?.development || analysis.developmentScore}/10
      - Quality: ${gptAnalysis?.quality || analysis.feasibilityScore}/10
      - Novelty: ${gptAnalysis?.novelty || analysis.noveltyScore}/10
      
      Rationale:
      ${gptAnalysis ? Object.entries(gptAnalysis.rationale).map(([key, value]) => `- ${key}: ${value}`).join('\n') : ''}
      
      Vote either INVEST or PASS, with a very brief reason (10 words max). Consider:
      - High quality ideas (score > 7) are safer bets
      - Novel ideas (score > 7) are worth exploring even if risky
      - Underdeveloped ideas (score > 7) need more work
      - Joke ideas (score > 7) should be evaluated for entertainment value`;
    
    try {
      const vote = await generateCharacterResponse(character.prompt + '\n' + votePrompt, state.idea);
      state.votes[character.id] = vote;
      
      // Only send to Discord if not in test mode
      if (!TEST_MODE) {
        await sendAsCharacter(channelId, character.id, `🗳️ ${vote}`);
      } else {
        console.log(`[TEST MODE] ${character.name} vote: ${vote}`);
      }
      
      // Add a small delay between votes
      await new Promise(resolve => setTimeout(resolve, TEST_MODE ? 200 : 1000));
    } catch (error) {
      console.error('Error during voting:', error);
    }
  }

  // Calculate and display results with GPT analysis context
  const investCount = Object.values(state.votes).filter(v => v.toLowerCase().includes('invest')).length;
  const passCount = Object.values(state.votes).filter(v => v.toLowerCase().includes('pass')).length;
  
  const analysis = state.analysis!;
  const gptAnalysis = analysis.gptAnalysis;
  
  let resultContext = '';
  if (gptAnalysis) {
    if (gptAnalysis.joke_level > 7) {
      resultContext = `Note: This was evaluated as a fun/entertaining idea (${gptAnalysis.joke_level}/10).`;
    } else if (gptAnalysis.development > 7) {
      resultContext = `Note: This idea needs more development work (${gptAnalysis.development}/10).`;
    } else if (gptAnalysis.quality < 3) {
      resultContext = `Note: This idea has significant quality/feasibility challenges (${gptAnalysis.quality}/10).`;
    } else if (gptAnalysis.novelty > 7) {
      resultContext = `Note: This is a particularly novel/innovative idea (${gptAnalysis.novelty}/10).`;
    }
  } else {
    // Fallback to original analysis
    if (analysis.jokeScore > 7) {
      resultContext = 'Note: This was evaluated as a fun/entertaining idea.';
    } else if (analysis.developmentScore > 7) {
      resultContext = 'Note: This idea needs more development work.';
    } else if (analysis.feasibilityScore < 3) {
      resultContext = 'Note: This idea has significant feasibility challenges.';
    } else if (analysis.noveltyScore > 7) {
      resultContext = 'Note: This is a particularly novel/innovative idea.';
    }
  }
  
  const resultMessage = `
📊 Final Vote Results:
INVEST: ${investCount} votes
PASS: ${passCount} votes
${resultContext}
${investCount > passCount ? '✨ The coaches would invest!' : '🤔 The coaches would pass.'}`;

  // Only send to Discord if not in test mode
  if (!TEST_MODE) {
    await sendAsCharacter(channelId, characters[0].id, resultMessage);
  } else {
    console.log(`[TEST MODE] Results: ${resultMessage}`);
  }
  
  if (TEST_MODE) {
    state.timing!.votingEnd = Date.now();
    state.timing!.discussionEnd = state.timing!.votingEnd;
    
    const timings = state.timing!;
    const analysisDuration = timings.analysisEnd! - timings.analysisStart!;
    const discussionDuration = timings.discussionEnd! - timings.discussionStart!;
    const votingDuration = timings.votingEnd! - timings.votingStart!;
    const totalDuration = timings.votingEnd! - timings.analysisStart!;
    
    console.log('\n=== Final Results ===');
    console.log(`INVEST: ${investCount} votes`);
    console.log(`PASS: ${passCount} votes`);
    console.log(`\n=== Performance Metrics ===`);
    console.log(`Analysis Time: ${analysisDuration}ms`);
    console.log(`Discussion Time: ${discussionDuration}ms`);
    console.log(`Voting Time: ${votingDuration}ms`);
    console.log(`Total Time: ${totalDuration}ms`);
  }

  // Cleanup
  state.isActive = false;
  setTimeout(() => activePitches.delete(channelId), 5000);
} 
import { Message } from 'discord.js';
import { getCharacter, getCharacters, setActiveCharacter, handleCharacterInteraction, formatCharacterList } from './characters.js';
import { initializeWebhooks, sendAsCharacter } from './webhooks.js';
import { generateCharacterResponse } from './ai.js';
import { WebhookClient } from 'discord.js';
import IORedis from 'ioredis';
import { handlePitchCommand } from './pitch.js';
import { scheduler } from './timer.js';
import { Client } from 'discord.js';
import { triggerNewsChat } from './news.js';
import { triggerTmzChat } from './tmz.js';
import { getNextMessage, handleAdminCommand } from './adminCommands.js';
import { getCurrentStoryInfo } from './bot.js';
import { validateStoryInfo, formatStoryInfo } from './sceneFramework.js';
import { getRandomCharactersWithPairConfig, setWatercoolerPairConfig } from './characterPairs.js';
import fs from 'fs';
import path from 'path';

// Message deduplication system
class MessageDeduplication {
  private redis: IORedis | null = null;
  private memoryCache: Map<string, number> = new Map();
  private readonly CACHE_EXPIRY = 300000; // 5 minutes in ms

  constructor() {
    // Initialize Redis if URL is provided
    if (process.env.REDIS_URL) {
      try {
        this.redis = new IORedis(process.env.REDIS_URL);
        console.log('Redis connected successfully');
      } catch (error) {
        console.error('Failed to connect to Redis:', error);
        console.log('Falling back to in-memory cache');
      }
    } else {
      console.log('No Redis URL provided, using in-memory cache');
    }
  }

  async isMessageProcessed(messageId: string): Promise<boolean> {
    try {
      if (this.redis) {
        // Try Redis first
        const key = `processed:${messageId}`;
        const result = await this.redis.set(key, '1', 'EX', 300, 'NX');
        return result === null; // If null, key already existed
      } else {
        // Use in-memory cache
        const now = Date.now();
        if (this.memoryCache.has(messageId)) {
          return true;
        }
        this.memoryCache.set(messageId, now);
        
        // Cleanup old entries
        for (const [key, timestamp] of this.memoryCache.entries()) {
          if (now - timestamp > this.CACHE_EXPIRY) {
            this.memoryCache.delete(key);
          }
        }
        return false;
      }
    } catch (error) {
      console.error('Error checking message status:', error);
      // On error, fall back to in-memory cache
      return this.memoryCache.has(messageId);
    }
  }

  async cleanup() {
    if (this.redis) {
      await this.redis.quit();
    }
    this.memoryCache.clear();
  }
}

// Initialize message deduplication
const messageDedup = new MessageDeduplication();

// Command prefix for bot commands
const PREFIX = '!';

// Natural language triggers for character selection
const NATURAL_TRIGGERS = ['hey', 'hi', 'hello', 'yo'];

// Track active group chats and their discussion states
interface GroupChatState {
  participants: string[];
  topic?: string;
  isDiscussing: boolean;
  messageCount: Record<string, number>;
  conversationHistory: Array<{character: string, message: string}>;
}

const activeGroupChats = new Map<string, GroupChatState>();

// Handle group chat interactions
async function handleGroupChat(message: Message, state: GroupChatState) {
  try {
    // If no topic set, this message becomes the topic
    if (!state.topic) {
      state.topic = message.content;
      state.isDiscussing = true;
      state.conversationHistory = [];
      await message.reply(`Great! The coaches will discuss: "${message.content}"`);
      
      // Start the discussion with a random character
      const firstCharacter = getCharacter(state.participants[0]);
      if (firstCharacter) {
        const contextPrompt = `You are starting a group discussion about: "${message.content}". 
        You are discussing this with ${state.participants.slice(1).map(id => getCharacter(id)?.name).join(' and ')}.
        Share your initial thoughts on this topic, speaking in your unique voice and style.`;
        
        const response = await generateCharacterResponse(firstCharacter.prompt + '\n' + contextPrompt, message.content);
        await sendAsCharacter(message.channelId, firstCharacter.id, response);
        state.messageCount[firstCharacter.id] = 1;
        state.conversationHistory.push({ character: firstCharacter.id, message: response });
        
        // Queue up next response
        setTimeout(() => continueDiscussion(message.channelId, state), 2000);
      }
      return;
    }

    // If already discussing and user sends a message, have a character respond if possible
    if (state.isDiscussing) {
      // Check if any character has messages left
      const totalMessages = Object.values(state.messageCount).reduce((a, b) => a + b, 0);
      if (totalMessages >= 9) {
        return; // All messages used up
      }

      // Find eligible characters (haven't spoken 3 times and weren't last to speak)
      const eligibleCharacters = state.participants.filter(id => 
        (state.messageCount[id] || 0) < 3 && 
        id !== state.conversationHistory[state.conversationHistory.length - 1]?.character
      );

      if (eligibleCharacters.length > 0) {
        // Pick random eligible character, preferring those who have spoken less
        const leastSpokenCount = Math.min(...eligibleCharacters.map(id => state.messageCount[id] || 0));
        const priorityCharacters = eligibleCharacters.filter(id => (state.messageCount[id] || 0) === leastSpokenCount);
        const respondingCharacter = getCharacter(priorityCharacters[Math.floor(Math.random() * priorityCharacters.length)]);

        if (respondingCharacter) {
          // Get context of recent messages including user's
          let contextMessages = [`User: "${message.content}"`];
          if (state.conversationHistory.length > 0) {
            const lastMessage = state.conversationHistory[state.conversationHistory.length - 1];
            contextMessages.unshift(`${getCharacter(lastMessage.character)?.name}: "${lastMessage.message}"`);
          }

          const contextPrompt = `You are ${respondingCharacter.name} in a group discussion about "${state.topic}".
          The user just said: "${message.content}"
          
          Recent messages:
          ${contextMessages.join('\n')}
          
          Respond briefly to the user's message while staying in character and on topic.
          Keep your response focused and concise (1-2 sentences).`;

          const response = await generateCharacterResponse(respondingCharacter.prompt + '\n' + contextPrompt, message.content);
          await sendAsCharacter(message.channelId, respondingCharacter.id, response);
          state.messageCount[respondingCharacter.id] = (state.messageCount[respondingCharacter.id] || 0) + 1;
          state.conversationHistory.push({ character: respondingCharacter.id, message: response });

          // Continue the discussion after responding to user
          const delay = 1500 + Math.random() * 1000;
          setTimeout(() => continueDiscussion(message.channelId, state), delay);
        }
      }
    }
  } catch (error) {
    console.error('Error in group chat:', error);
    await message.reply('Sorry, there was an error in the group chat.');
  }
}

// Continue the discussion among characters
async function continueDiscussion(channelId: string, state: GroupChatState) {
  try {
    // Check if discussion should continue
    const totalMessages = Object.values(state.messageCount).reduce((a, b) => a + b, 0);
    if (totalMessages >= 9) { // 3 messages each for 3 participants
      state.isDiscussing = false;
      activeGroupChats.delete(channelId);
      const client = new WebhookClient({ url: process.env.WEBHOOK_URL_SYSTEM || '' });
      await client.send('The discussion has concluded!');
      return;
    }

    // Find characters who haven't spoken enough
    const eligibleCharacters = state.participants.filter(id => 
      (state.messageCount[id] || 0) < 3 && 
      id !== state.conversationHistory[state.conversationHistory.length - 1]?.character
    );
    
    if (eligibleCharacters.length === 0) return;

    // Pick random eligible character, but prefer those who have spoken less
    const leastSpokenCount = Math.min(...eligibleCharacters.map(id => state.messageCount[id] || 0));
    const priorityCharacters = eligibleCharacters.filter(id => (state.messageCount[id] || 0) === leastSpokenCount);
    const nextCharacterId = priorityCharacters[Math.floor(Math.random() * priorityCharacters.length)];
    const nextCharacter = getCharacter(nextCharacterId);
    
    if (!nextCharacter) return;

    // Get more focused context - last message and one other relevant message
    let contextMessages = [];
    const lastMessage = state.conversationHistory[state.conversationHistory.length - 1];
    contextMessages.push(`${getCharacter(lastMessage.character)?.name}: "${lastMessage.message}"`);
    
    // Find one earlier message from another character that's most relevant
    for (let i = state.conversationHistory.length - 2; i >= 0; i--) {
      const msg = state.conversationHistory[i];
      if (msg.character !== lastMessage.character && msg.character !== nextCharacterId) {
        contextMessages.unshift(`${getCharacter(msg.character)?.name}: "${msg.message}"`);
        break;
      }
    }

    const contextPrompt = `You are ${nextCharacter.name} in a quick group discussion about "${state.topic}" with ${state.participants.filter(id => id !== nextCharacterId).map(id => getCharacter(id)?.name).join(' and ')}.
    
    Recent messages:
    ${contextMessages.join('\n')}
    
    Respond briefly and naturally to what was just said, adding your perspective while staying in character.
    Keep your response focused and concise (1-2 sentences).`;
    
    const response = await generateCharacterResponse(nextCharacter.prompt + '\n' + contextPrompt, lastMessage.message);
    await sendAsCharacter(channelId, nextCharacter.id, response);
    state.messageCount[nextCharacter.id] = (state.messageCount[nextCharacter.id] || 0) + 1;
    state.conversationHistory.push({ character: nextCharacter.id, message: response });

    // Vary the timing between responses to feel more natural
    if (Object.values(state.messageCount).reduce((a, b) => a + b, 0) < 9) {
      const delay = 1500 + Math.random() * 1000; // Random delay between 1.5-2.5 seconds
      setTimeout(() => continueDiscussion(channelId, state), delay);
    }
  } catch (error) {
    console.error('Error continuing discussion:', error);
  }
}

// Get tension context based on scene index
function getTensionContext(sceneIndex: number): { intensity: number; context: string; promptInjection: string } | null {
  try {
    const storyArcs = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'data', 'story-themes', 'story-arcs.json'), 'utf-8'));
    const donteKaileyArc = storyArcs.find((arc: any) => arc.id === 'getting_irritated_by_kailey');
    
    if (!donteKaileyArc) {
      console.error('Story arc not found in story-arcs.json');
      return null;
    }
    
    // For testing: Rapid tension increase over 5 scenes
    let timeOfDay: 'morning' | 'midday' | 'afternoon';
    if (sceneIndex < 2) timeOfDay = 'morning';      // Scenes 0-1: intensity 0.3
    else if (sceneIndex < 4) timeOfDay = 'midday';  // Scenes 2-3: intensity 0.5
    else timeOfDay = 'afternoon';                   // Scenes 4+: intensity 0.7
    
    const levelContext = donteKaileyArc.levelContexts[timeOfDay];
    return {
      intensity: levelContext.intensity,
      context: levelContext.context,
      promptInjection: donteKaileyArc.promptInjection
    };
  } catch (error) {
    console.error('Error reading tension context:', error);
    return null;
  }
}

// Initialize story arc configuration
export function initializeStoryArc() {
  try {
    const storyArcs = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'data', 'story-themes', 'story-arcs.json'), 'utf-8'));
    const donteKaileyArc = storyArcs.storyArcs.donte.getting_irritated_by_kailey;
    
    if (!donteKaileyArc) {
      console.error('Story arc not found in story-arcs.json');
      return;
    }

    const { requiredCharacters, probability, speakingOrder } = donteKaileyArc.watercoolerPresence;

    // Set up Donte and Kailey pair configuration from story arc data
    setWatercoolerPairConfig({
      coach1: requiredCharacters[0],
      coach2: requiredCharacters[1],
      probability: probability,
      order: {
        first: speakingOrder.first,
        second: speakingOrder.second
      }
    });
    console.log('Story arc configuration initialized:', {
      arc: 'getting_irritated_by_kailey',
      characters: requiredCharacters,
      probability,
      speakingOrder
    });
  } catch (error) {
    console.error('Error initializing story arc:', error);
  }
}

// Watercooler chat function that can be called directly or by timer
export async function triggerWatercoolerChat(channelId: string, client: Client) {
  try {
    console.log('Starting watercooler chat for channel:', channelId);
    const characters = getCharacters();
    console.log('Available characters:', characters.map(c => c.name).join(', '));
    
    // Check for admin message
    const adminMessage = getNextMessage('watercooler');
    
    // Pick 3 random unique coaches using our pair config system
    const selectedCharacterIds = getRandomCharactersWithPairConfig(3);
    const selectedCharacters = selectedCharacterIds.map(id => getCharacter(id)!);
    console.log('Selected characters:', selectedCharacters.map(c => c.name).join(', '));
    
    // Get current scene index from episode context
    const storyInfo = getCurrentStoryInfo();
    const sceneIndex = storyInfo?.sceneIndex ?? 0;
    
    // Get tension context if Donte and Kailey are present
    const tensionContext = selectedCharacterIds.includes('donte') && selectedCharacterIds.includes('kailey') 
      ? getTensionContext(sceneIndex)
      : null;
    
    // First coach shares something about their day
    console.log('Generating first message...');
    const firstPrompt = adminMessage 
      ? `You are ${selectedCharacters[0].name}. Share your thoughts about: "${adminMessage}". Keep it natural and in your voice (max 30 words).`
      : `You are ${selectedCharacters[0].name}. Share a brief, authentic update about something that happened today that relates to your background (${selectedCharacters[0].character}). For example, if you're Donte, maybe you just came from a failed startup's pivot meeting, or if you're Venus, maybe you just updated your apocalypse probability models. Keep it natural and in your voice (max 30 words).`;
    
    const firstMessage = await generateCharacterResponse(selectedCharacters[0].prompt + '\n' + firstPrompt, 'random_update');
    console.log('First message generated:', firstMessage.substring(0, 50) + '...');
    await sendAsCharacter(channelId, selectedCharacters[0].id, firstMessage);
    console.log('First message sent successfully');

    await new Promise(resolve => setTimeout(resolve, 2000));

    // Second coach responds
    console.log('Generating second message...');
    const secondPrompt = `You are ${selectedCharacters[1].name} (${selectedCharacters[1].character}). ${selectedCharacters[0].name} just said: "${firstMessage}". ${tensionContext ? `\n\n${tensionContext.promptInjection}\n\nCurrent context: ${tensionContext.context} (Tension level: ${tensionContext.intensity})` : ''} Respond to their update with your unique perspective and background. Stay true to your character's personality and interests. Keep it natural and in your voice (max 30 words).`;
    const secondMessage = await generateCharacterResponse(selectedCharacters[1].prompt + '\n' + secondPrompt, firstMessage);
    console.log('Second message generated:', secondMessage.substring(0, 50) + '...');
    await sendAsCharacter(channelId, selectedCharacters[1].id, secondMessage);
    console.log('Second message sent successfully');

    // Add another small delay
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Third coach responds
    console.log('Generating third message...');
    const thirdPrompt = `You are ${selectedCharacters[2].name} (${selectedCharacters[2].character}). Responding to this exchange:\n    ${selectedCharacters[0].name}: "${firstMessage}"\n    ${selectedCharacters[1].name}: "${secondMessage}"\n    ${tensionContext ? `\n\n${tensionContext.promptInjection}\n\nCurrent context: ${tensionContext.context} (Tension level: ${tensionContext.intensity})` : ''} Add your unique perspective based on your background and personality. Keep it authentic to your character and concise (max 30 words).`;
    const thirdMessage = await generateCharacterResponse(selectedCharacters[2].prompt + '\n' + thirdPrompt, firstMessage + ' ' + secondMessage);
    console.log('Third message generated:', thirdMessage.substring(0, 50) + '...');
    await sendAsCharacter(channelId, selectedCharacters[2].id, thirdMessage);
    console.log('Third message sent successfully');

    console.log('Watercooler chat completed successfully');
  } catch (error) {
    console.error('Error in watercooler chat:', error);
    throw error;
  }
}

// Initialize scheduled tasks when bot starts
export function initializeScheduledTasks(channelId: string, client: Client) {
  // (Disabled) Old timer-based scheduling is now handled by the centralized scheduler.
  // scheduler.addTask(
  //   'watercooler',  // taskId
  //   channelId,      // channelId
  //   60 * 60 * 1000, // intervalMs (60 minutes)
  //   () => triggerWatercoolerChat(channelId, client) // handler
  // );

  // scheduler.addTask(
  //   'newschat',     // taskId
  //   channelId,      // channelId
  //   4 * 60 * 1000,  // intervalMs (4 minutes)
  //   () => triggerNewsChat(channelId, client) // handler
  // );
}

// Handle incoming messages
export async function handleMessage(message: Message): Promise<void> {
  try {
    // Ignore messages from bots
    if (message.author.bot) {
      console.log('Ignoring bot message:', message.id);
      return;
    }

    // Check if message was already processed
    console.log('Checking if message was processed:', message.id);
    if (await messageDedup.isMessageProcessed(message.id)) {
      console.log(`Message ${message.id} was already processed, skipping`);
      return;
    }
    console.log('Message was not processed before, continuing');

    const content = message.content.toLowerCase();
    
    // Check for admin commands first
    if (content.startsWith('!') && 
        (content.includes('-admin') || content === '!help-admin')) {
      console.log('[ADMIN] Detected admin command:', message.content);
      await handleAdminCommand(message);
      return;
    }

    // Handle story-info command
    if (content === '!story-info') {
      console.log('[STORY] Story info requested by user:', message.author.tag);
      try {
        const storyInfo = getCurrentStoryInfo();
        
        if (!storyInfo) {
          console.log('[STORY] No active story arc found');
          await message.reply('No active story arc at the moment. The story will begin when the bot is fully initialized.');
          return;
        }

        const { episodeContext, currentEpisode, currentScene, sceneIndex } = storyInfo;
        console.log('[STORY] Retrieved story info:', {
          theme: episodeContext.theme,
          sceneIndex,
          sceneType: currentScene.type,
          activeCoaches: currentScene.coaches
        });
        
        // Validate the data
        if (!validateStoryInfo(episodeContext, currentEpisode, sceneIndex)) {
          console.error('[STORY] Invalid story info data detected:', {
            hasEpisodeContext: !!episodeContext,
            hasCurrentEpisode: !!currentEpisode,
            sceneIndex,
            hasCurrentScene: !!currentScene
          });
          await message.reply('Sorry, there was an error retrieving the story information. Please try again later.');
          return;
        }

        // Format and send the response
        const response = formatStoryInfo(episodeContext, currentEpisode, sceneIndex);
        console.log('[STORY] Sending story info response');
        await message.reply(response);
        console.log('[STORY] Story info response sent successfully');
        
      } catch (error) {
        console.error('[STORY] Error handling story info command:', error);
        console.error('[STORY] Error details:', {
          message: error instanceof Error ? error.message : 'Unknown error',
          stack: error instanceof Error ? error.stack : undefined
        });
        await message.reply('Sorry, there was an error retrieving the story information. Please try again later.');
      }
      return;
    }

    // Check for natural language triggers
    for (const trigger of NATURAL_TRIGGERS) {
      if (content.startsWith(trigger)) {
        const words = content.split(' ');
        if (words.length >= 2) {
          const potentialCharacterId = words[1];
          const character = getCharacter(potentialCharacterId);
          if (character) {
            console.log(`Natural trigger detected: ${trigger} ${potentialCharacterId}`);
            const selectedCharacter = setActiveCharacter(message.channelId, character.id);
            if (selectedCharacter) {
              await handleCharacterInteraction(message);
              return;
            }
          }
        }
      }
    }

    // Handle regular command prefix
    if (!content.startsWith(PREFIX)) {
      // If no prefix, check if we have an active group chat
      const groupChat = activeGroupChats.get(message.channelId);
      if (groupChat) {
        await handleGroupChat(message, groupChat);
        return;
      }
      
      // Otherwise check for individual character interaction
      const activeCharacter = getCharacter(message.channelId);
      if (activeCharacter) {
        await handleCharacterInteraction(message);
      }
      return;
    }

    const args = content.slice(PREFIX.length).trim().split(/\s+/);
    const command = args.shift()?.toLowerCase();

    if (command === 'help') {
      const helpMessage = `
Available commands:
- \`!help\`: Show this help message
- \`!character list\`: List all available characters
- \`!character select [name]\`: Select a character to talk to
- \`!group [char1] [char2] [char3]\`: Start a group discussion with 3 characters
- \`!pitch [your idea]\`: Present your business idea to all coaches for feedback and voting
- \`!hello\`: Get a random coach to greet you
- \`!watercooler\`: Listen in on a quick chat between three random coaches
- \`!newschat\`: Start a discussion about trending news relevant to the coaches
- \`!tmzchat\`: Start a discussion about trending news relevant to the coaches
- \`!story-info\`: Show information about the current story arc and scene

You can also start a conversation naturally by saying "hey [character]"!
For example: "hey alex" or "hi donte"
`;
      await message.reply(helpMessage);
      return;
    }

    if (command === 'character') {
      const subCommand = args[0]?.toLowerCase();

      if (subCommand === 'list') {
        const characterList = formatCharacterList();
        await message.reply(`Here are the available characters:\n\n${characterList}`);
        return;
      }

      if (subCommand === 'select' && args[1]) {
        const characterId = args[1].toLowerCase();
        const selectedCharacter = setActiveCharacter(message.channelId, characterId);
        
        if (selectedCharacter) {
          await message.reply(`Now talking to ${selectedCharacter.name}! How can I help you?`);
        } else {
          await message.reply(`Character "${args[1]}" not found. Use !character list to see available characters.`);
        }
        return;
      }

      await message.reply('Invalid character command. Use !help to see available commands.');
      return;
    }

    if (command === 'group') {
      if (args.length >= 3) {
        const characters = args.slice(0, 3).map(id => id.toLowerCase());
        const validCharacters = characters.every(id => getCharacter(id));
        
        if (validCharacters) {
          activeGroupChats.set(message.channelId, {
            participants: characters,
            isDiscussing: false,
            messageCount: {},
            conversationHistory: []
          });
          const characterNames = characters.map(id => getCharacter(id)?.name).join(', ');
          await message.reply(`Started a group chat with ${characterNames}! Please provide a topic for them to discuss.`);
        } else {
          await message.reply('One or more characters not found. Use !character list to see available characters.');
        }
        return;
      }

      await message.reply('Please specify 3 characters. Example: !group alex donte venus');
      return;
    }

    // Handle pitch command
    if (command === 'pitch') {
      const idea = args.join(' ').trim();
      if (!idea) {
        await message.reply('Please provide your business idea after the !pitch command.');
        return;
      }
      await handlePitchCommand(message, idea);
      return;
    }

    // Handle hello command
    if (command === 'hello') {
      const characters = getCharacters();
      const randomCharacter = characters[Math.floor(Math.random() * characters.length)];
      const greetingPrompt = `You are ${randomCharacter.name}. Give a brief, friendly greeting in your unique voice and style (max 20 words).`;
      const greeting = await generateCharacterResponse(randomCharacter.prompt + '\n' + greetingPrompt, 'greeting');
      await sendAsCharacter(message.channelId, randomCharacter.id, greeting);
      return;
    }

    // Handle watercooler command
    if (command === 'watercooler') {
      await triggerWatercoolerChat(message.channelId, message.client);
      return;
    }

    // Handle newschat command
    if (command === 'newschat') {
      await triggerNewsChat(message.channelId, message.client);
      return;
    }

    // Handle tmzchat command
    if (command === 'tmzchat') {
      await triggerTmzChat(message.channelId, message.client);
      return;
    }

    // Handle unknown commands
    await message.reply('Unknown command. Type !help to see available commands.');
  } catch (error) {
    console.error('Error in handleMessage:', error);
    throw error;
  }
}

// Export cleanup function for graceful shutdown
export async function cleanup() {
  await messageDedup.cleanup();
  scheduler.cleanup();
} 
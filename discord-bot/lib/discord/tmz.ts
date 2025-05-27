// TMZ Chat: Entertainment/Celebrity News Chat (copied from news.ts)
// TODO: Update NewsAPI query to use 'entertainment' category and rename functions/variables as needed.

// ... existing code from news.ts ... 

import { Client, Message } from 'discord.js';
import { getCharacters } from './characters.js';
import { sendAsCharacter } from './webhooks.js';
import { generateCharacterResponse } from './ai.js';
import axios from 'axios';
import { getNextMessage } from './adminCommands.js';

interface TmzStory {
  title: string;
  description: string;
  url: string;
  source: string;
  publishedAt: string;
}

interface TmzChatState {
  tmzStory: TmzStory;
  selectedCharacters: Array<{id: string, name: string}>;
  isActive: boolean;
  conversationHistory: Array<{character: string, message: string}>;
}

interface TmzCache {
  lastFetchTime: number;
  currentStories: TmzStory[];
  lastUsedIndex: number;
}

const activeTmzChats = new Map<string, TmzChatState>();
let tmzCache: TmzCache | null = null;
const FOUR_HOURS = 4 * 60 * 60 * 1000; // 4 hours in milliseconds

// Main function to trigger tmz chat
export async function triggerTmzChat(channelId: string, client: Client) {
  try {
    console.log('Starting TMZ chat for channel:', channelId);
    const characters = getCharacters();
    
    // Check for admin message
    const adminMessage = getNextMessage('tmzchat');
    
    // If no admin message, get a random entertainment news topic
    const relevantStory = adminMessage 
      ? (() => {
          const urlMatch = adminMessage.match(/(https?:\/\/\S+)/);
          const url = urlMatch ? urlMatch[1] : '';
          const title = adminMessage.replace(url, '').trim();
          return { title, description: '', url, source: 'Admin', publishedAt: new Date().toISOString() };
        })()
      : await getNextTmzStory();
    
    if (!relevantStory) {
      console.error('No relevant stories found');
      return;
    }



    // Check if there's already an active tmz chat
    if (activeTmzChats.has(channelId)) {
      console.log('TMZ chat already active in this channel');
      return;
    }

    // Select appropriate coaches
    const selectedCharacters = selectRelevantCoachesTmz(relevantStory);
    if (!selectedCharacters.length) {
      console.error('No relevant coaches found');
      return;
    }

    // Start discussion
    await startTmzDiscussion(channelId, relevantStory, selectedCharacters, adminMessage, client);
  } catch (error) {
    console.error('Error in TMZ chat:', error);
    throw error;
  }
}

// Helper functions
async function getNextTmzStory(): Promise<TmzStory | null> {
  const now = Date.now();
  
  // Check if we need to fetch new stories
  if (!tmzCache || (now - tmzCache.lastFetchTime) > FOUR_HOURS) {
    console.log('Fetching new TMZ stories...');
    const stories = await fetchTrendingTmz();
    if (stories.length === 0) return null;
    
    // Update cache
    tmzCache = {
      lastFetchTime: now,
      currentStories: stories,
      lastUsedIndex: -1  // Reset to -1 so next index will be 0
    };
    console.log(`Fetched ${stories.length} new TMZ stories`);
  }
  
  // Get next story in sequence
  const nextIndex = (tmzCache.lastUsedIndex + 1) % tmzCache.currentStories.length;
  tmzCache.lastUsedIndex = nextIndex;
  console.log(`Using TMZ story ${nextIndex + 1} of ${tmzCache.currentStories.length}`);
  
  return tmzCache.currentStories[nextIndex];
}

async function fetchTrendingTmz(): Promise<TmzStory[]> {
  try {
    const response = await axios.get('https://newsapi.org/v2/top-headlines', {
      params: {
        apiKey: process.env.NEWS_API_KEY,
        country: 'us',
        category: 'entertainment', // changed from 'technology'
        pageSize: 10
      }
    });

    return response.data.articles.map((article: any) => ({
      title: article.title,
      description: article.description,
      url: article.url,
      source: article.source.name,
      publishedAt: article.publishedAt
    }));
  } catch (error) {
    console.error('Error fetching TMZ news:', error);
    return [];
  }
}

function selectRelevantCoachesTmz(story: TmzStory) {
  const characters = getCharacters();
  // Select 4 random coaches
  return [...characters]
    .sort(() => Math.random() - 0.5)
    .slice(0, 4);
}

async function startTmzDiscussion(channelId: string, story: TmzStory, characters: any[], adminMessage: string | null, client?: Client) {
  try {
    console.log('Starting TMZ discussion for:', story.title);
    
    // Track this discussion
    const state: TmzChatState = {
      tmzStory: story,
      selectedCharacters: characters,
      isActive: true,
      conversationHistory: []
    };
    activeTmzChats.set(channelId, state);
    
    // Only use admin message if provided, otherwise skip the intro message entirely
    if (adminMessage && client) {
      await client.channels.fetch(channelId).then(async (channel: any) => {
        if (channel && channel.isTextBased()) {
          await channel.send(adminMessage);
        }
      });
    }
    
    // First response
    const firstPrompt = `You are ${characters[0].name}. Your voice is highly distinctive. Speak like ${characters[0].name} always does—lean into their quirks, language tics, emojis, obsessions, and pet theories. Do not sound like a journalist or professor. 
You just read this celebrity news story: "${story.title}". 
${story.description ? `Here's more context: ${story.description}` : ''}
Give a spicy or emotional take. What excites you or pisses you off? Be snappy, weird, or overconfident—but always yourself. Max 80 words.`;
    
    let firstMessage;
    try {
      firstMessage = await generateCharacterResponse(characters[0].prompt + '\n' + firstPrompt, story.title);
      const firstMessageWithLink = story.url 
        ? `${firstMessage}\n\n[Read the full story here](${story.url})`
        : firstMessage;
      await sendAsCharacter(channelId, characters[0].id, firstMessageWithLink);
      state.conversationHistory.push({ character: characters[0].id, message: firstMessage });
    } catch (error) {
      console.error('Error generating first message:', error);
      return; // Exit early if first message fails
    }

    // Second coach responds
    let secondMessage;
    try {
      const secondPrompt = `You are ${characters[1].name}. Your voice is highly distinctive. Speak like ${characters[1].name} always does—lean into their quirks, language tics, emojis, obsessions, and pet theories. Do not sound like a journalist or professor. 
You just read this celebrity news story: "${story.title}". 
${story.description ? `Here's more context: ${story.description}` : ''}
${characters[0].name} said: "${firstMessage}"
Don't just agree. Start drama or bring a wild theory. Max 30 words.`;
      
      secondMessage = await generateCharacterResponse(characters[1].prompt + '\n' + secondPrompt, firstMessage);
      await sendAsCharacter(channelId, characters[1].id, secondMessage);
      state.conversationHistory.push({ character: characters[1].id, message: secondMessage });
    } catch (error) {
      console.error('Error generating second message:', error);
      return; // Exit after first response if second fails
    }

    // Third coach responds
    let thirdMessage;
    try {
      const thirdPrompt = `You are ${characters[2].name}. Your voice is highly distinctive. Speak like ${characters[2].name} always does—lean into their quirks, language tics, emojis, obsessions, and pet theories. Do not sound like a journalist or professor. 
You just read this celebrity news story: "${story.title}". 
${story.description ? `Here's more context: ${story.description}` : ''}
${characters[0].name} said: "${firstMessage}"
${characters[1].name} said: "${secondMessage}"
Change the topic slightly or pivot the conversation with your own obsession. Max 30 words.`;
      
      thirdMessage = await generateCharacterResponse(characters[2].prompt + '\n' + thirdPrompt, firstMessage + ' ' + secondMessage);
      await sendAsCharacter(channelId, characters[2].id, thirdMessage);
      state.conversationHistory.push({ character: characters[2].id, message: thirdMessage });
    } catch (error) {
      console.error('Error generating third message:', error);
      return; // Exit after second response if third fails
    }

    // Fourth coach responds
    let fourthMessage;
    try {
      const fourthPrompt = `You are ${characters[3].name}. Your voice is highly distinctive. Speak like ${characters[3].name} always does—lean into their quirks, language tics, emojis, obsessions, and pet theories. Do not sound like a journalist or professor. 
You just read this celebrity news story: "${story.title}". 
${story.description ? `Here's more context: ${story.description}` : ''}
${characters[0].name} said: "${firstMessage}"
${characters[1].name} said: "${secondMessage}"
${characters[2].name} said: "${thirdMessage}"
Say the quiet part out loud. Be controversial or nihilistic. Max 30 words.`;
      
      fourthMessage = await generateCharacterResponse(characters[3].prompt + '\n' + fourthPrompt, firstMessage + ' ' + secondMessage + ' ' + thirdMessage);
      await sendAsCharacter(channelId, characters[3].id, fourthMessage);
      state.conversationHistory.push({ character: characters[3].id, message: fourthMessage });
    } catch (error) {
      console.error('Error generating fourth message:', error);
      return; // Exit after third response if fourth fails
    }

    // Follow-up messages with individual error handling
    try {
      // First follow-up
      const firstFollowUpPrompt = `You are ${characters[0].name}. Your voice is highly distinctive. Speak like ${characters[0].name} always does—lean into their quirks, language tics, emojis, obsessions, and pet theories. Do not sound like a journalist or professor. Continuing the discussion about "${story.title}":
      ${characters[1].name}: "${secondMessage}"
      ${characters[2].name}: "${thirdMessage}"
      ${characters[3].name}: "${fourthMessage}"
      Respond to the most controversial point made. Do you strongly agree or disagree? Keep your response focused and concise (max 30 words).`;
      
      const firstFollowUp = await generateCharacterResponse(characters[0].prompt + '\n' + firstFollowUpPrompt, secondMessage + ' ' + thirdMessage + ' ' + fourthMessage);
      await sendAsCharacter(channelId, characters[0].id, firstFollowUp);
      state.conversationHistory.push({ character: characters[0].id, message: firstFollowUp });

      // Second follow-up
      const secondFollowUpPrompt = `You are ${characters[1].name}. Your voice is highly distinctive. Speak like ${characters[1].name} always does—lean into their quirks, language tics, emojis, obsessions, and pet theories. Do not sound like a journalist or professor. Continuing the discussion about "${story.title}":
      ${characters[2].name}: "${thirdMessage}"
      ${characters[3].name}: "${fourthMessage}"
      ${characters[0].name}: "${firstFollowUp}"
      Challenge one specific point made by another coach. What's wrong with their argument? Keep your response focused and concise (max 30 words).`;
      
      const secondFollowUp = await generateCharacterResponse(characters[1].prompt + '\n' + secondFollowUpPrompt, thirdMessage + ' ' + fourthMessage + ' ' + firstFollowUp);
      await sendAsCharacter(channelId, characters[1].id, secondFollowUp);
      state.conversationHistory.push({ character: characters[1].id, message: secondFollowUp });

      // Third follow-up
      const thirdFollowUpPrompt = `You are ${characters[2].name}. Your voice is highly distinctive. Speak like ${characters[2].name} always does—lean into their quirks, language tics, emojis, obsessions, and pet theories. Do not sound like a journalist or professor. Continuing the discussion about "${story.title}":
      ${characters[3].name}: "${fourthMessage}"
      ${characters[0].name}: "${firstFollowUp}"
      ${characters[1].name}: "${secondFollowUp}"
      Find common ground between two opposing views. How can they both be right? Keep your response focused and concise (max 30 words).`;
      
      const thirdFollowUp = await generateCharacterResponse(characters[2].prompt + '\n' + thirdFollowUpPrompt, fourthMessage + ' ' + firstFollowUp + ' ' + secondFollowUp);
      await sendAsCharacter(channelId, characters[2].id, thirdFollowUp);
      state.conversationHistory.push({ character: characters[2].id, message: thirdFollowUp });

      // Final response
      const finalPrompt = `You are ${characters[3].name}. Your voice is highly distinctive. Speak like ${characters[3].name} always does—lean into their quirks, language tics, emojis, obsessions, and pet theories. Do not sound like a journalist or professor. Wrapping up the discussion about "${story.title}":
      ${characters[0].name}: "${firstFollowUp}"
      ${characters[1].name}: "${secondFollowUp}"
      ${characters[2].name}: "${thirdFollowUp}"
      Make a provocative final statement that challenges the group's consensus. Keep your response focused and concise (max 30 words).`;
      
      const finalMessage = await generateCharacterResponse(characters[3].prompt + '\n' + finalPrompt, firstFollowUp + ' ' + secondFollowUp + ' ' + thirdFollowUp);
      await sendAsCharacter(channelId, characters[3].id, finalMessage);
      state.conversationHistory.push({ character: characters[3].id, message: finalMessage });
    } catch (error) {
      console.error('Error in follow-up messages:', error);
      // Don't return here - let it proceed to cleanup
    }
  } catch (error) {
    console.error('Unexpected error in tmz discussion:', error);
  } finally {
    // Clean up state after discussion
    const currentState = activeTmzChats.get(channelId);
    if (currentState) {
      currentState.isActive = false;
      activeTmzChats.delete(channelId);
    }
  }
} 
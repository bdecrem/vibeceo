import { Client, Message } from 'discord.js';
import { getCharacters } from './characters.js';
import { sendAsCharacter } from './webhooks.js';
import { generateCharacterResponse } from './ai.js';
import axios from 'axios';
import { getNextMessage } from './adminCommands.js';

interface NewsStory {
  title: string;
  description: string;
  url: string;
  source: string;
  publishedAt: string;
}

interface NewsChatState {
  newsStory: NewsStory;
  selectedCharacters: Array<{id: string, name: string}>;
  isActive: boolean;
  conversationHistory: Array<{character: string, message: string}>;
}

interface NewsCache {
  lastFetchTime: number;
  currentStories: NewsStory[];
  lastUsedIndex: number;
}

const activeNewsChats = new Map<string, NewsChatState>();
let newsCache: NewsCache | null = null;
const FOUR_HOURS = 4 * 60 * 60 * 1000; // 4 hours in milliseconds

// Main function to trigger news chat
export async function triggerNewsChat(channelId: string, client: Client) {
  try {
    console.log('Starting news chat for channel:', channelId);
    const characters = getCharacters();
    
    // Check for admin message
    const adminMessage = getNextMessage('newschat');
    
    // If no admin message, get a random tech news topic
    const relevantStory = adminMessage 
      ? (() => {
          const urlMatch = adminMessage.match(/(https?:\/\/\S+)/);
          const url = urlMatch ? urlMatch[1] : '';
          const title = adminMessage.replace(url, '').trim();
          return { title, description: '', url, source: 'Admin', publishedAt: new Date().toISOString() };
        })()
      : await getNextNewsStory();
    
    if (!relevantStory) {
      console.error('No relevant stories found');
      return;
    }

    // Check if there's already an active news chat
    if (activeNewsChats.has(channelId)) {
      console.log('News chat already active in this channel');
      return;
    }

    // Select appropriate coaches
    const selectedCharacters = selectRelevantCoaches(relevantStory);
    if (!selectedCharacters.length) {
      console.error('No relevant coaches found');
      return;
    }

    // Start discussion
    await startNewsDiscussion(channelId, relevantStory, selectedCharacters, adminMessage, client);
  } catch (error) {
    console.error('Error in news chat:', error);
    throw error;
  }
}

// Helper functions
async function getNextNewsStory(): Promise<NewsStory | null> {
  const now = Date.now();
  
  // Check if we need to fetch new stories
  if (!newsCache || (now - newsCache.lastFetchTime) > FOUR_HOURS) {
    console.log('Fetching new news stories...');
    const stories = await fetchTrendingNews();
    if (stories.length === 0) return null;
    
    // Update cache
    newsCache = {
      lastFetchTime: now,
      currentStories: stories,
      lastUsedIndex: -1  // Reset to -1 so next index will be 0
    };
    console.log(`Fetched ${stories.length} new stories`);
  }
  
  // Get next story in sequence
  const nextIndex = (newsCache.lastUsedIndex + 1) % newsCache.currentStories.length;
  newsCache.lastUsedIndex = nextIndex;
  console.log(`Using story ${nextIndex + 1} of ${newsCache.currentStories.length}`);
  
  return newsCache.currentStories[nextIndex];
}

async function fetchTrendingNews(): Promise<NewsStory[]> {
  try {
    const response = await axios.get('https://newsapi.org/v2/top-headlines', {
      params: {
        apiKey: process.env.NEWS_API_KEY,
        country: 'us',
        category: 'technology',
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
    console.error('Error fetching news:', error);
    return [];
  }
}

function selectRelevantCoaches(story: NewsStory) {
  const characters = getCharacters();
  // Select 4 random coaches
  return [...characters]
    .sort(() => Math.random() - 0.5)
    .slice(0, 4);
}

async function startNewsDiscussion(channelId: string, story: NewsStory, characters: any[], adminMessage: string | null, client?: Client) {
  try {
    console.log('Starting news discussion for:', story.title);
    
    // Track this discussion
    const state: NewsChatState = {
      newsStory: story,
      selectedCharacters: characters,
      isActive: true,
      conversationHistory: []
    };
    activeNewsChats.set(channelId, state);
    
    // Only use admin message if provided, otherwise skip the intro message entirely
    if (adminMessage && client) {
      await client.channels.fetch(channelId).then(async (channel: any) => {
        if (channel && channel.isTextBased()) {
          await channel.send(adminMessage);
        }
      });
    }
    
    // First response
    let firstMessage = '';
    try {
      // Generate first response
      const firstPrompt = `You are ${characters[0].name}. Your voice is highly distinctive. Speak like ${characters[0].name} always does—lean into their quirks, language tics, emojis, obsessions, and pet theories. Do not sound like a journalist or professor. 
You just read this news story: "${story.title}". 
${story.description ? `Here's more context: ${story.description}` : ''}
Give your perspective on this tech news with substance and insight, but still with your unique voice. What implications might this have? Include both analysis and your emotional reaction. CRITICAL: YOUR RESPONSE MUST BE 100 WORDS OR FEWER. Count your words before submitting.`;
      
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

    // Start first follow-up message - using character[1]

    // Follow-up messages with individual error handling
    try {
      // First follow-up (character[1])
      const firstFollowUpPrompt = `You are ${characters[1].name}. Your voice is highly distinctive. Speak like ${characters[1].name} always does—lean into their quirks, language tics, emojis, obsessions, and pet theories. Do not sound like a journalist or professor. Continuing the discussion about "${story.title}":
      ${characters[0].name} said: "${firstMessage}"
      Build on or challenge the previous take with specific points. What technical or strategic angle are they missing? Still be yourself, but bring thoughtful analysis. CRITICAL: YOUR RESPONSE MUST BE 50 WORDS OR FEWER. Count your words before submitting.`;
      
      const firstFollowUp = await generateCharacterResponse(characters[1].prompt + '\n' + firstFollowUpPrompt, firstMessage);
      await sendAsCharacter(channelId, characters[1].id, firstFollowUp);
      state.conversationHistory.push({ character: characters[1].id, message: firstFollowUp });

      // Second follow-up (character[2])
      const secondFollowUpPrompt = `You are ${characters[2].name}. Your voice is highly distinctive. Speak like ${characters[2].name} always does—lean into their quirks, language tics, emojis, obsessions, and pet theories. Do not sound like a journalist or professor. Continuing the discussion about "${story.title}":
      ${characters[0].name} said: "${firstMessage}"
      ${characters[1].name} said: "${firstFollowUp}"
      Connect this to broader trends or historical context. How does this fit into the bigger picture of tech/business? Keep your distinctive voice while adding depth. CRITICAL: YOUR RESPONSE MUST BE 50 WORDS OR FEWER. Count your words before submitting.`;
      
      const secondFollowUp = await generateCharacterResponse(characters[2].prompt + '\n' + secondFollowUpPrompt, firstMessage + ' ' + firstFollowUp);
      await sendAsCharacter(channelId, characters[2].id, secondFollowUp);
      state.conversationHistory.push({ character: characters[2].id, message: secondFollowUp });

      // Third follow-up (character[3])
      const thirdFollowUpPrompt = `You are ${characters[3].name}. Your voice is highly distinctive. Speak like ${characters[3].name} always does—lean into their quirks, language tics, emojis, obsessions, and pet theories. Do not sound like a journalist or professor. Continuing the discussion about "${story.title}":
      ${characters[0].name} said: "${firstMessage}"
      ${characters[1].name} said: "${firstFollowUp}"
      ${characters[2].name} said: "${secondFollowUp}"
      Explore unexpected consequences or future implications. What's everyone overlooking? Be provocative but substantive. CRITICAL: YOUR RESPONSE MUST BE 50 WORDS OR FEWER. Count your words before submitting.`;
      
      const thirdFollowUp = await generateCharacterResponse(characters[3].prompt + '\n' + thirdFollowUpPrompt, firstMessage + ' ' + firstFollowUp + ' ' + secondFollowUp);
      await sendAsCharacter(channelId, characters[3].id, thirdFollowUp);
      state.conversationHistory.push({ character: characters[3].id, message: thirdFollowUp });

      // Final response (back to character[0])
      const finalPrompt = `You are ${characters[0].name}. Your voice is highly distinctive. Speak like ${characters[0].name} always does—lean into their quirks, language tics, emojis, obsessions, and pet theories. Do not sound like a journalist or professor. Wrapping up the discussion about "${story.title}":
      ${characters[1].name} said: "${firstFollowUp}"
      ${characters[2].name} said: "${secondFollowUp}"
      ${characters[3].name} said: "${thirdFollowUp}"
      Give a concluding thought that synthesizes the discussion. What key insight should people take away? CRITICAL: YOUR RESPONSE MUST BE 50 WORDS OR FEWER. Count your words before submitting.`;
      
      const finalMessage = await generateCharacterResponse(characters[0].prompt + '\n' + finalPrompt, firstFollowUp + ' ' + secondFollowUp + ' ' + thirdFollowUp);
      await sendAsCharacter(channelId, characters[0].id, finalMessage);
      state.conversationHistory.push({ character: characters[0].id, message: finalMessage });
    } catch (error) {
      console.error('Error in follow-up messages:', error);
      // Don't return here - let it proceed to cleanup
    }
  } catch (error) {
    console.error('Unexpected error in news discussion:', error);
  } finally {
    // Clean up state after discussion
    const currentState = activeNewsChats.get(channelId);
    if (currentState) {
      currentState.isActive = false;
      activeNewsChats.delete(channelId);
    }
  }
} 
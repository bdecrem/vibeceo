import { getCharacters } from './characters.js';
import { sendAsCharacter } from './webhooks.js';
import { generateCharacterResponse } from './ai.js';
import axios from 'axios';
import { getNextMessage } from './adminCommands.js';
const activeNewsChats = new Map();
let newsCache = null;
const FOUR_HOURS = 4 * 60 * 60 * 1000; // 4 hours in milliseconds
// Main function to trigger news chat
export async function triggerNewsChat(channelId, client) {
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
        await startNewsDiscussion(channelId, relevantStory, selectedCharacters, adminMessage);
    }
    catch (error) {
        console.error('Error in news chat:', error);
        throw error;
    }
}
// Helper functions
async function getNextNewsStory() {
    const now = Date.now();
    // Check if we need to fetch new stories
    if (!newsCache || (now - newsCache.lastFetchTime) > FOUR_HOURS) {
        console.log('Fetching new news stories...');
        const stories = await fetchTrendingNews();
        if (stories.length === 0)
            return null;
        // Update cache
        newsCache = {
            lastFetchTime: now,
            currentStories: stories,
            lastUsedIndex: -1 // Reset to -1 so next index will be 0
        };
        console.log(`Fetched ${stories.length} new stories`);
    }
    // Get next story in sequence
    const nextIndex = (newsCache.lastUsedIndex + 1) % newsCache.currentStories.length;
    newsCache.lastUsedIndex = nextIndex;
    console.log(`Using story ${nextIndex + 1} of ${newsCache.currentStories.length}`);
    return newsCache.currentStories[nextIndex];
}
async function fetchTrendingNews() {
    try {
        const response = await axios.get('https://newsapi.org/v2/top-headlines', {
            params: {
                apiKey: process.env.NEWS_API_KEY,
                country: 'us',
                category: 'technology',
                pageSize: 10
            }
        });
        return response.data.articles.map((article) => ({
            title: article.title,
            description: article.description,
            url: article.url,
            source: article.source.name,
            publishedAt: article.publishedAt
        }));
    }
    catch (error) {
        console.error('Error fetching news:', error);
        return [];
    }
}
function selectRelevantCoaches(story) {
    const characters = getCharacters();
    // Select 4 random coaches
    return [...characters]
        .sort(() => Math.random() - 0.5)
        .slice(0, 4);
}
async function startNewsDiscussion(channelId, story, characters, adminMessage) {
    // Initialize state
    const state = {
        newsStory: story,
        selectedCharacters: characters,
        isActive: true,
        conversationHistory: []
    };
    activeNewsChats.set(channelId, state);
    try {
        // First coach introduces the news
        const firstPrompt = adminMessage
            ? `You are ${characters[0].name}. Transform this tech news into a natural conversation starter, sharing your perspective: "${story.title}". 
      Share your thoughts about this tech news in a conversational way. Be empathetic and authentic while staying true to your personality. Keep your response under 150 words.`
            : `You are ${characters[0].name}. You just read this news story: "${story.title}". 
      ${story.description ? `Here's more context: ${story.description}` : ''}
      Share your strong opinion about this news. What's your take on it? Be bold and decisive in your perspective. Keep your response under 150 words.`;
        let firstMessage;
        try {
            firstMessage = await generateCharacterResponse(characters[0].prompt + '\n' + firstPrompt, story.title);
            const firstMessageWithLink = story.url
                ? `${firstMessage}\n\n[Read the full story here](${story.url})`
                : firstMessage;
            await sendAsCharacter(channelId, characters[0].id, firstMessageWithLink);
            state.conversationHistory.push({ character: characters[0].id, message: firstMessage });
        }
        catch (error) {
            console.error('Error generating first message:', error);
            return; // Exit early if first message fails
        }
        // Second coach responds
        let secondMessage;
        try {
            const secondPrompt = `You are ${characters[1].name}. ${characters[0].name} just shared this news story: "${story.title}" and said: "${firstMessage}".
      Respond to their perspective. Do you agree or disagree? Why? Take a strong position and explain your reasoning. Keep your response under 150 words.`;
            secondMessage = await generateCharacterResponse(characters[1].prompt + '\n' + secondPrompt, firstMessage);
            await sendAsCharacter(channelId, characters[1].id, secondMessage);
            state.conversationHistory.push({ character: characters[1].id, message: secondMessage });
        }
        catch (error) {
            console.error('Error generating second message:', error);
            return; // Exit after first response if second fails
        }
        // Third coach responds
        let thirdMessage;
        try {
            const thirdPrompt = `You are ${characters[2].name}. Responding to this exchange about the news story "${story.title}":
      ${characters[0].name}: "${firstMessage}"
      ${characters[1].name}: "${secondMessage}"
      What's your unique perspective on this? How does it differ from what's been said? Take a position that challenges or adds a new dimension to the discussion. Keep your response under 150 words.`;
            thirdMessage = await generateCharacterResponse(characters[2].prompt + '\n' + thirdPrompt, firstMessage + ' ' + secondMessage);
            await sendAsCharacter(channelId, characters[2].id, thirdMessage);
            state.conversationHistory.push({ character: characters[2].id, message: thirdMessage });
        }
        catch (error) {
            console.error('Error generating third message:', error);
            return; // Exit after second response if third fails
        }
        // Fourth coach responds
        let fourthMessage;
        try {
            const fourthPrompt = `You are ${characters[3].name}. Responding to this discussion about the news story "${story.title}":
      ${characters[0].name}: "${firstMessage}"
      ${characters[1].name}: "${secondMessage}"
      ${characters[2].name}: "${thirdMessage}"
      Take a strong position on this issue. What's your controversial take? Challenge the assumptions made by others. Keep your response under 150 words.`;
            fourthMessage = await generateCharacterResponse(characters[3].prompt + '\n' + fourthPrompt, firstMessage + ' ' + secondMessage + ' ' + thirdMessage);
            await sendAsCharacter(channelId, characters[3].id, fourthMessage);
            state.conversationHistory.push({ character: characters[3].id, message: fourthMessage });
        }
        catch (error) {
            console.error('Error generating fourth message:', error);
            return; // Exit after third response if fourth fails
        }
        // Follow-up messages with individual error handling
        try {
            // First follow-up
            const firstFollowUpPrompt = `You are ${characters[0].name}. Continuing the discussion about "${story.title}":
      ${characters[1].name}: "${secondMessage}"
      ${characters[2].name}: "${thirdMessage}"
      ${characters[3].name}: "${fourthMessage}"
      Respond to the most controversial point made. Do you strongly agree or disagree? Keep your response focused and concise (max 30 words).`;
            const firstFollowUp = await generateCharacterResponse(characters[0].prompt + '\n' + firstFollowUpPrompt, secondMessage + ' ' + thirdMessage + ' ' + fourthMessage);
            await sendAsCharacter(channelId, characters[0].id, firstFollowUp);
            state.conversationHistory.push({ character: characters[0].id, message: firstFollowUp });
            // Second follow-up
            const secondFollowUpPrompt = `You are ${characters[1].name}. Continuing the discussion about "${story.title}":
      ${characters[2].name}: "${thirdMessage}"
      ${characters[3].name}: "${fourthMessage}"
      ${characters[0].name}: "${firstFollowUp}"
      Challenge one specific point made by another coach. What's wrong with their argument? Keep your response focused and concise (max 30 words).`;
            const secondFollowUp = await generateCharacterResponse(characters[1].prompt + '\n' + secondFollowUpPrompt, thirdMessage + ' ' + fourthMessage + ' ' + firstFollowUp);
            await sendAsCharacter(channelId, characters[1].id, secondFollowUp);
            state.conversationHistory.push({ character: characters[1].id, message: secondFollowUp });
            // Third follow-up
            const thirdFollowUpPrompt = `You are ${characters[2].name}. Continuing the discussion about "${story.title}":
      ${characters[3].name}: "${fourthMessage}"
      ${characters[0].name}: "${firstFollowUp}"
      ${characters[1].name}: "${secondFollowUp}"
      Find common ground between two opposing views. How can they both be right? Keep your response focused and concise (max 30 words).`;
            const thirdFollowUp = await generateCharacterResponse(characters[2].prompt + '\n' + thirdFollowUpPrompt, fourthMessage + ' ' + firstFollowUp + ' ' + secondFollowUp);
            await sendAsCharacter(channelId, characters[2].id, thirdFollowUp);
            state.conversationHistory.push({ character: characters[2].id, message: thirdFollowUp });
            // Final response
            const finalPrompt = `You are ${characters[3].name}. Wrapping up the discussion about "${story.title}":
      ${characters[0].name}: "${firstFollowUp}"
      ${characters[1].name}: "${secondFollowUp}"
      ${characters[2].name}: "${thirdFollowUp}"
      Make a provocative final statement that challenges the group's consensus. Keep your response focused and concise (max 30 words).`;
            const finalMessage = await generateCharacterResponse(characters[3].prompt + '\n' + finalPrompt, firstFollowUp + ' ' + secondFollowUp + ' ' + thirdFollowUp);
            await sendAsCharacter(channelId, characters[3].id, finalMessage);
            state.conversationHistory.push({ character: characters[3].id, message: finalMessage });
        }
        catch (error) {
            console.error('Error in follow-up messages:', error);
            // Don't return here - let it proceed to cleanup
        }
    }
    catch (error) {
        console.error('Unexpected error in news discussion:', error);
    }
    finally {
        // Clean up state after discussion
        state.isActive = false;
        activeNewsChats.delete(channelId);
    }
}

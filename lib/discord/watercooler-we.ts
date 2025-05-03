import { Client, TextChannel } from 'discord.js';
import { getRandomCharactersWithPairConfig } from './characterPairs.js';
import { sendAsCharacter } from './webhooks.js';
import { generateCharacterResponse } from './ai.js';
import { getLocationAndTime } from './locationTime.js';
import { weekendPrompts } from './weekend-prompts.js';

/**
 * Weekend watercooler chat function
 * Similar interface to regular watercooler but with weekend-specific logic
 * No story arcs or irritation tracking on weekends
 */
export async function triggerWatercoolerChat(channelId: string, client: Client) {
  try {
    console.log('[WEEKEND] Starting weekend watercooler chat for channel:', channelId);
    
    // Get the channel
    const channel = await client.channels.fetch(channelId) as TextChannel;
    if (!channel) {
      throw new Error(`Channel ${channelId} not found`);
    }

    // Get random characters for the chat
    const characters = await getRandomCharactersWithPairConfig(2);
    if (!characters || characters.length < 2) {
      throw new Error('Failed to get random characters for weekend watercooler chat');
    }

    // Get location and time for context
    const { location, time } = await getLocationAndTime();

    // Get weekend-specific prompt
    const prompt = weekendPrompts.watercooler.intro;

    // Generate and send initial message
    const initialMessage = await generateCharacterResponse(
      characters[0],
      prompt,
      {
        location,
        time,
        otherCharacter: characters[1],
        context: 'weekend_watercooler'
      }
    );

    await sendAsCharacter(channel, characters[0], initialMessage);

    // Generate and send response
    const response = await generateCharacterResponse(
      characters[1],
      prompt,
      {
        location,
        time,
        otherCharacter: characters[0],
        context: 'weekend_watercooler',
        previousMessage: initialMessage
      }
    );

    await sendAsCharacter(channel, characters[1], response);

    console.log('[WEEKEND] Completed weekend watercooler chat');
  } catch (error) {
    console.error('[WEEKEND] Error in weekend watercooler chat:', error);
    throw error;
  }
} 
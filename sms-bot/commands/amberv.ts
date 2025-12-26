/**
 * Amber Voice (amberv) Command
 *
 * Simple test command for Hume EVI interactive voice mode.
 * No specific context - just raw voice chat.
 *
 * Usage: amberv
 */

import type { CommandContext, CommandHandler } from './types.js';

export const ambervCommandHandler: CommandHandler = {
  name: 'amberv',

  matches(context: CommandContext): boolean {
    const normalized = context.messageUpper.trim();
    return normalized === 'AMBERV' || normalized === 'AMBER V';
  },

  async handle(context: CommandContext): Promise<boolean> {
    const { from, twilioClient, sendSmsResponse, updateLastMessageDate, normalizedFrom } = context;

    // Direct link to the dedicated voice chat page
    const baseUrl = process.env.SHORTLINK_BASE_URL || 'https://kochi.to';
    const voiceChatUrl = `${baseUrl}/voice-chat`;

    await sendSmsResponse(
      from,
      `🎙️ Amber Voice\n\nTap to chat:\n${voiceChatUrl}`,
      twilioClient
    );

    await updateLastMessageDate(normalizedFrom);
    return true;
  },
};

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

    // Build a simple music player URL with no audio source - just interactive mode
    const baseUrl = process.env.SHORTLINK_BASE_URL || 'https://kochi.to';
    const playerUrl = `${baseUrl}/music-player?interactive=1&title=Amber%20Voice`;

    await sendSmsResponse(
      from,
      `🎙️ Amber Voice\n\nTap to chat:\n${playerUrl}`,
      twilioClient
    );

    await updateLastMessageDate(normalizedFrom);
    return true;
  },
};

import type { CommandHandler } from './types.js';

import { cryptoCommandHandler } from './crypto.js';
import { youtubeAgentHandler } from './youtube-agent.js';

export const commandHandlers: CommandHandler[] = [
  cryptoCommandHandler,
  youtubeAgentHandler,
];

import type { CommandHandler } from './types.js';

import { cryptoCommandHandler } from './crypto.js';
import { youtubeCommandHandler } from './youtube.js';

export const commandHandlers: CommandHandler[] = [
  cryptoCommandHandler,
  youtubeCommandHandler,
];

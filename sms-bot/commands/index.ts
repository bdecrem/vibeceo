import type { CommandHandler } from './types.js';

import { cryptoCommandHandler } from './crypto.js';

export const commandHandlers: CommandHandler[] = [cryptoCommandHandler];

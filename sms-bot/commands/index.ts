import type { CommandHandler } from './types.js';

import { cryptoCommandHandler } from './crypto.js';
import { medicalDailyCommandHandler } from './medical-daily.js';
import { peerReviewCommandHandler } from './peer-review.js';
import { youtubeAgentHandler } from './youtube-agent.js';

export const commandHandlers: CommandHandler[] = [
  cryptoCommandHandler,
  medicalDailyCommandHandler,
  peerReviewCommandHandler,
  youtubeAgentHandler,
];


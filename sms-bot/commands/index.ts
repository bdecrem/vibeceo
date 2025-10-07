import type { CommandHandler } from "./types.js";

import { audioTestCommandHandler } from './audio-test.js';
import { cryptoCommandHandler } from './crypto.js';
import { peerReviewCommandHandler } from './peer-review.js';
import { ticketmasterCommandHandler } from "./ticketmaster.js";
import { youtubeAgentHandler } from './youtube-agent.js';

export const commandHandlers: CommandHandler[] = [
  audioTestCommandHandler,
  cryptoCommandHandler,
  peerReviewCommandHandler,
  youtubeAgentHandler,
  ticketmasterCommandHandler,
];

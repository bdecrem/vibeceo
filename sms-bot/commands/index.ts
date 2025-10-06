import type { CommandHandler } from "./types.js";

import { cryptoCommandHandler } from "./crypto.js";
import { peerReviewCommandHandler } from "./peer-review.js";
import { youtubeAgentHandler } from "./youtube-agent.js";
import { ticketmasterCommandHandler } from "./ticketmaster.js";

export const commandHandlers: CommandHandler[] = [
  cryptoCommandHandler,
  peerReviewCommandHandler,
  youtubeAgentHandler,
  ticketmasterCommandHandler,
];

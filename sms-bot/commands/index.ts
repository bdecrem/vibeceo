import type { CommandHandler } from "./types.js";

import { audioTestCommandHandler } from "./audio-test.js";
import { cryptoCommandHandler } from "./crypto.js";
import { medicalDailyCommandHandler } from "./medical-daily.js";
import { peerReviewCommandHandler } from "./peer-review.js";
import { ticketmasterCommandHandler } from "./ticketmaster.js";
import { youtubeAgentHandler } from "./youtube-agent.js";
import { stockNewsCommandHandler } from "./stock-news.js";

export const commandHandlers: CommandHandler[] = [
  audioTestCommandHandler,
  cryptoCommandHandler,
  medicalDailyCommandHandler,
  peerReviewCommandHandler,
  ticketmasterCommandHandler,
  youtubeAgentHandler,
  stockNewsCommandHandler,
];

import type { CommandHandler } from "./types.js";

import { audioTestCommandHandler } from "./audio-test.js";
import { arxivGraphCommandHandler } from "./arxiv-graph.js";
import { arxivCommandHandler } from "./arxiv.js";
import { cryptoCommandHandler } from "./crypto.js";
import { medicalDailyCommandHandler } from "./medical-daily.js";
import { peerReviewCommandHandler } from "./peer-review.js";
import { ticketmasterCommandHandler } from "./ticketmaster.js";
import { youtubeAgentHandler } from "./youtube-agent.js";
import { stockNewsCommandHandler } from "./stock-news.js";

export const commandHandlers: CommandHandler[] = [
  audioTestCommandHandler,
  arxivGraphCommandHandler,
  arxivCommandHandler,
  cryptoCommandHandler,
  medicalDailyCommandHandler,
  peerReviewCommandHandler,
  ticketmasterCommandHandler,
  youtubeAgentHandler,
  stockNewsCommandHandler,
];

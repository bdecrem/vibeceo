import type { CommandHandler } from "./types.js";

import { aiDailyCommandHandler } from "./ai-daily.js";
import { airCommandHandler } from "./air.js";
import { audioTestCommandHandler } from "./audio-test.js";
import { arxivGraphCommandHandler } from "./arxiv-graph.js";
// import { arxivCommandHandler } from "./arxiv.js"; // DISABLED - arxiv-research agent retired
import { cryptoCommandHandler } from "./crypto.js";
import { gmailCommandHandler } from "./gmail.js";
import { kgCommandHandler } from "./kg.js";
import { medicalDailyCommandHandler } from "./medical-daily.js";
import { peerReviewCommandHandler } from "./peer-review.js";
import { personalizeCommandHandler } from "./personalize.js";
import { recruitCommandHandler } from "./recruit.js";
import { ticketmasterCommandHandler } from "./ticketmaster.js";
import { youtubeAgentHandler } from "./youtube-agent.js";
import { stockNewsCommandHandler } from "./stock-news.js";

export const commandHandlers: CommandHandler[] = [
  aiDailyCommandHandler, // AI DAILY RUN - generate combined AI Research Daily report (admin only)
  airCommandHandler, // AIR (AI Research) - personalized research reports
  audioTestCommandHandler,
  arxivGraphCommandHandler,
  // arxivCommandHandler, // DISABLED - arxiv-research agent retired
  cryptoCommandHandler,
  gmailCommandHandler, // GMAIL - Gmail integration for personalization
  kgCommandHandler,
  medicalDailyCommandHandler,
  peerReviewCommandHandler,
  personalizeCommandHandler, // PERSONALIZE - natural language personalization
  recruitCommandHandler, // RECRUIT - recruiting agent with AI learning
  ticketmasterCommandHandler,
  youtubeAgentHandler,
  stockNewsCommandHandler,
];

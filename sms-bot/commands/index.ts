import type { CommandHandler } from "./types.js";

import { aiDailyCommandHandler } from "./ai-daily.js";
import { airCommandHandler } from "./air.js";
import { aiTwitterCommandHandler } from "./ai-twitter.js";
import { amberxCommandHandler } from "./amberx.js";
import { ambervCommandHandler } from "./amberv.js";
import { announcementsCommandHandler } from "./announcements.js";
import { csCommandHandler } from "./cs.js";
import { audioTestCommandHandler } from "./audio-test.js";
import { arxivGraphCommandHandler } from "./arxiv-graph.js";
// import { arxivCommandHandler } from "./arxiv.js"; // DISABLED - arxiv-research agent retired
import { cryptoCommandHandler } from "./crypto.js";
import { driftCommandHandler } from "./drift.js";
import { gmailCommandHandler } from "./gmail.js";
import { kgCommandHandler } from "./kg.js";
import { medicalDailyCommandHandler } from "./medical-daily.js";
import { peerReviewCommandHandler } from "./peer-review.js";
import { personalizeCommandHandler } from "./personalize.js";
import { recruitCommandHandler } from "./recruit.js";
import { ticketmasterCommandHandler } from "./ticketmaster.js";
import { ttCommandHandler } from "./tt.js";
import { youtubeAgentHandler } from "./youtube-agent.js";
import { stockNewsCommandHandler } from "./stock-news.js";
import { tokenshotsCommandHandler } from "./tokenshots.js";

export const commandHandlers: CommandHandler[] = [
  aiDailyCommandHandler, // AI DAILY RUN - generate combined AI Research Daily report (admin only)
  airCommandHandler, // AIR (AI Research) - personalized research reports
  aiTwitterCommandHandler, // AIT - AI Twitter Daily digest
  amberxCommandHandler, // AMBERX - explain Twitter/YouTube content
  ambervCommandHandler, // AMBERV - simple voice chat test
  announcementsCommandHandler, // ANNOUNCEMENTS - opt-in to platform updates
  csCommandHandler, // CS - content sharing link feed
  audioTestCommandHandler,
  arxivGraphCommandHandler,
  // arxivCommandHandler, // DISABLED - arxiv-research agent retired
  cryptoCommandHandler,
  driftCommandHandler, // $DRIFT - Drift trading agent alerts
  gmailCommandHandler, // GMAIL - Gmail integration for personalization
  kgCommandHandler,
  medicalDailyCommandHandler,
  peerReviewCommandHandler,
  personalizeCommandHandler, // PERSONALIZE - natural language personalization
  recruitCommandHandler, // RECRUIT - recruiting agent with AI learning
  ticketmasterCommandHandler,
  ttCommandHandler, // TT - Token Tank daily updates
  youtubeAgentHandler,
  stockNewsCommandHandler,
  tokenshotsCommandHandler, // TOKENSHOTS - daily AI research podcast
];

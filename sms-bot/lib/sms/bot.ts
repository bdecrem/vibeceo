import express from "express";
import bodyParser from "body-parser";
import { setupTwilioWebhooks, setupWhatsAppWebhooks } from "./webhooks.js";
import { setupSupabaseWebhooks } from "./supabase-webhooks.js";
import { setupEmailWebhooks } from "./email-webhooks.js";
import { initializeMessageHandlers } from "./handlers.js";
import { registerAiDailyJob } from "./ai-daily-scheduler.js";
import { initializeTwilioClient } from "./webhooks.js";
import { initializeAI } from "./ai.js";
import { initializeScheduler } from "./stock-scheduler.js";
import { startScheduler } from "../scheduler/index.js";
import { registerCryptoDailyJob } from "../../agents/crypto-research/index.js";
import { registerMedicalDailyJob } from "../../agents/medical-daily/index.js";
import { registerPeerReviewJob } from "./peer-review-scheduler.js";
// import { registerArxivDailyJob } from "../../agents/arxiv-research/index.js"; // DISABLED - agent retired
import { registerArxivGraphCollectionJob, registerArxivGraphBroadcastJob } from "../../agents/arxiv-research-graph/index.js";
import { registerAIRDailyJob } from "../../agents/air-personalized/index.js";
import { registerRecruitingJob } from "./recruiting-scheduler.js"; // NEW channel-based recruiting with claude-agent-sdk

function isAutomationEnabled(): boolean {
  const override = process.env.ENABLE_SUBSCRIPTION_AUTOMATION;
  if (override) {
    return override.trim().toLowerCase() === "true";
  }
  return process.env.NODE_ENV === "production";
}

// Express server for webhook handling
let server: express.Application | null = null;

/**
 * Start the SMS bot service
 */
export async function startSmsBot(): Promise<void> {
  console.log("Starting SMS bot...");

  // Initialize AI client
  initializeAI();

  // Create Express server
  server = express();
  server.use(bodyParser.urlencoded({ extended: false }));
  server.use(bodyParser.json());

  // Initialize message handlers
  await initializeMessageHandlers();

  // Initialize Twilio client
  const twilioClient = initializeTwilioClient();

  if (isAutomationEnabled()) {
    console.log("✅ Subscription automation enabled – registering daily jobs.");
    registerAiDailyJob(twilioClient); // AI Daily: broadcast + generates combined AI Research Daily report at 7:00am PT
    registerCryptoDailyJob(twilioClient);
    registerMedicalDailyJob(twilioClient);
    registerPeerReviewJob(twilioClient);
    // registerArxivDailyJob(twilioClient); // DISABLED - arxiv-research agent retired
    registerArxivGraphCollectionJob(); // arXiv: collect papers & generate report at 3am PT
    registerArxivGraphBroadcastJob(twilioClient); // arXiv: broadcast report to subscribers at 7:30am PT
    registerAIRDailyJob(twilioClient); // AIR (AI Research) - personalized research reports
    registerRecruitingJob(twilioClient); // RECRUIT - NEW channel-based recruiting with daily candidate collection
  } else {
    console.log(
      "⚠️ Subscription automation disabled – daily broadcasts will not run on this instance."
    );
  }

  // Initialize stock scheduler service
  await initializeScheduler();

  startScheduler();

  // Setup Twilio webhooks
  setupTwilioWebhooks(server);

  // Setup WhatsApp webhooks (uses same infrastructure as SMS)
  setupWhatsAppWebhooks(server);

  // Setup Supabase webhooks
  setupSupabaseWebhooks(server, twilioClient);

  // Setup Email webhooks
  setupEmailWebhooks(server);

  // Health check endpoint
  server.get("/health", (req, res) => {
    res.status(200).send("OK");
  });

  // Debug endpoint to list all routes
  server.get("/routes", (req, res) => {
    // Type-safe implementation
    interface RouteInfo {
      path: string;
      methods: string[];
    }

    const routes: RouteInfo[] = [];

    if (server) {
      const stack = (server as any)._router.stack;
      stack.forEach((middleware: any) => {
        if (middleware.route) {
          routes.push({
            path: middleware.route.path,
            methods: Object.keys(middleware.route.methods),
          });
        }
      });
    }

    res.status(200).json(routes);
  });

  // Start the server
  const port = process.env.PORT || 3030;
  server.listen(port, () => {
    console.log(`SMS bot service listening on port ${port}`);
  });

  console.log("SMS bot started successfully");

  return Promise.resolve();
}


import express from 'express';
import bodyParser from 'body-parser';
import twilio from 'twilio';
import { setupTwilioWebhooks } from './webhooks.js';
import { setupSupabaseWebhooks } from './supabase-webhooks.js';
import { setupEmailWebhooks } from './email-webhooks.js';
import { initializeMessageHandlers } from './handlers.js';
import { SMS_CONFIG } from './config.js';
import { startDailyScheduler } from './scheduler.js';
import { initializeTwilioClient } from './webhooks.js';
import { initializeAI } from './ai.js';

// Express server for webhook handling
let server: express.Application | null = null;

/**
 * Start the SMS bot service
 */
export async function startSmsBot(): Promise<void> {
  console.log('Starting SMS bot...');
  
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
  
  // Start the daily scheduler
  await startDailyScheduler(twilioClient);
  
  // Setup Twilio webhooks
  setupTwilioWebhooks(server);
  
  // Setup Supabase webhooks
  setupSupabaseWebhooks(server, twilioClient);
  
  // Setup Email webhooks
  setupEmailWebhooks(server);
  
  // Health check endpoint
  server.get('/health', (req, res) => {
    res.status(200).send('OK');
  });
  
  // Debug endpoint to list all routes
  server.get('/routes', (req, res) => {
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
            methods: Object.keys(middleware.route.methods)
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
  
  console.log('SMS bot started successfully');
  
  return Promise.resolve();
}

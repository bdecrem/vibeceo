import express from 'express';
import bodyParser from 'body-parser';
import { setupTwilioWebhooks } from './webhooks.js';
import { initializeMessageHandlers } from './handlers.js';
// Express server for webhook handling
let server = null;
/**
 * Start the SMS bot service
 */
export async function startSmsBot() {
    console.log('Starting SMS bot service...');
    // Create Express server
    server = express();
    server.use(bodyParser.urlencoded({ extended: false }));
    server.use(bodyParser.json());
    // Initialize message handlers
    await initializeMessageHandlers();
    // Setup Twilio webhooks
    setupTwilioWebhooks(server);
    // Health check endpoint
    server.get('/health', (req, res) => {
        res.status(200).send('OK');
    });
    // Start the server
    const port = process.env.PORT || 3030;
    server.listen(port, () => {
        console.log(`SMS bot service listening on port ${port}`);
    });
    return Promise.resolve();
}

/**
 * Manual AIR Report Generator
 * Generates and sends a personalized AIR report for a specific subscriber
 */

// Load env before any imports
import { config } from 'dotenv';
config({ path: '.env.local' });

// Now safe to import modules that depend on env
import twilio from 'twilio';
import {
  generatePersonalizedReport,
  storePersonalizedReport,
  buildAIRReportMessage,
  AIR_AGENT_SLUG
} from '../dist/agents/air-personalized/index.js';
import { getAgentSubscribers, markAgentReportSent } from '../dist/lib/agent-subscriptions.js';

const twilioClient = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

async function generateAndSendReport() {
  console.log('[Manual AIR] Starting report generation...');

  try {
    // Get all AIR subscribers
    const subscribers = await getAgentSubscribers(AIR_AGENT_SLUG);

    console.log(`[Manual AIR] Found ${subscribers.length} subscriber(s)`);

    if (subscribers.length === 0) {
      console.log('[Manual AIR] No subscribers found');
      return;
    }

    // Process each subscriber
    for (const subscriber of subscribers) {
      console.log(`[Manual AIR] Processing ${subscriber.phone_number}...`);
      console.log(`[Manual AIR] Query: "${subscriber.preferences?.natural_language_query}"`);

      try {
        const preferences = subscriber.preferences;

        if (!preferences?.natural_language_query) {
          console.log(`[Manual AIR] Skipping - no query set`);
          continue;
        }

        // Generate report
        const result = await generatePersonalizedReport(subscriber, preferences);

        if (!result) {
          console.log(`[Manual AIR] No report generated (no matches, strategy=skip)`);
          continue;
        }

        const { markdown, audioUrl } = result;

        // Store report
        const report = await storePersonalizedReport(
          subscriber.id,
          new Date(),
          markdown,
          audioUrl,
          preferences.natural_language_query
        );

        console.log(`[Manual AIR] Report stored: ${report.id}`);

        // Build SMS message
        const shortLink = null; // TODO: Generate short link
        const smsMessage = buildAIRReportMessage(report, shortLink);

        // Send SMS
        await twilioClient.messages.create({
          to: subscriber.phone_number,
          from: process.env.TWILIO_PHONE_NUMBER,
          body: smsMessage,
        });

        // Mark as sent
        await markAgentReportSent(subscriber.phone_number, AIR_AGENT_SLUG);

        console.log(`[Manual AIR] ✓ Sent to ${subscriber.phone_number}`);
      } catch (error) {
        console.error(`[Manual AIR] ✗ Failed for ${subscriber.phone_number}:`, error);
      }
    }

    console.log('[Manual AIR] Complete!');
  } catch (error) {
    console.error('[Manual AIR] Fatal error:', error);
    process.exit(1);
  }
}

// Run it
generateAndSendReport();

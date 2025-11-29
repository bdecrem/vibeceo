/**
 * Queue Processor Scheduler
 * 
 * Processes queued messages periodically and when conversations end
 */

import { registerDailyJob } from '../scheduler/index.js';
import { processAllQueuedMessages } from '../sms/message-queue.js';
import type { TwilioClient } from '../sms/webhooks.js';

/**
 * Register queue processor job
 * Runs every minute to process queued messages
 */
export function registerQueueProcessorJob(twilioClient: TwilioClient): void {
  // Process queue every minute (not a daily job, but uses the scheduler infrastructure)
  // We'll use a custom interval for this since it needs to run frequently
  const QUEUE_CHECK_INTERVAL_MS = 60 * 1000; // 1 minute

  let queueProcessorTimer: ReturnType<typeof setInterval> | null = null;

  async function processQueue(): Promise<void> {
    try {
      const processed = await processAllQueuedMessages(twilioClient, 50);
      if (processed > 0) {
        console.log(`[Queue Processor] Processed ${processed} queued message(s)`);
      }
    } catch (error) {
      console.error('[Queue Processor] Error processing queue:', error);
    }
  }

  // Start processing queue
  queueProcessorTimer = setInterval(() => {
    void processQueue();
  }, QUEUE_CHECK_INTERVAL_MS);

  // Process immediately on startup (after a short delay)
  setTimeout(() => {
    void processQueue();
  }, 5000); // 5 second delay on startup

  console.log(`[Queue Processor] Registered queue processor (runs every ${QUEUE_CHECK_INTERVAL_MS / 1000} seconds)`);
}

/**
 * Process queued messages for a specific subscriber
 * Called when a conversation ends
 */
export async function processQueueForSubscriber(
  subscriberId: string,
  phoneNumber: string,
  twilioClient: TwilioClient
): Promise<void> {
  const { processQueuedMessagesForSubscriber } = await import('../sms/message-queue.js');
  
  try {
    const processed = await processQueuedMessagesForSubscriber(subscriberId, twilioClient, 10);
    if (processed > 0) {
      console.log(`[Queue Processor] Processed ${processed} queued message(s) for ${phoneNumber} after conversation ended`);
    }
  } catch (error) {
    console.error(`[Queue Processor] Error processing queue for subscriber ${subscriberId}:`, error);
  }
}


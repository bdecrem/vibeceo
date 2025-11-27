/**
 * Push Notification Output Handler
 * Send push notifications via Firebase Cloud Messaging (FCM)
 */

import type { NormalizedItem, AgentMetadata, OutputConfig } from '@vibeceo/shared-types';

/**
 * Send push notifications to device tokens
 */
export async function sendPushNotification(
  items: NormalizedItem[],
  config: OutputConfig['notification'],
  agentMetadata: AgentMetadata
): Promise<boolean> {
  if (!config || !config.enabled) {
    console.log('   Push notification output is disabled');
    return false;
  }

  const deviceCount = config.deviceTokens?.length || 0;
  console.log(`📱 Sending push notification to ${deviceCount} device(s)...`);

  // Check for required credentials
  const fcmServerKey = process.env.FCM_SERVER_KEY;
  if (!fcmServerKey) {
    console.log('   ⚠️  Missing FCM_SERVER_KEY environment variable');
    return false;
  }

  if (!config.deviceTokens || config.deviceTokens.length === 0) {
    console.log('   ⚠️  No device tokens provided');
    return false;
  }

  try {
    // Prepare notification payload
    const notification = {
      title: config.title,
      body: config.body,
      icon: agentMetadata.icon || 'default-icon',
      badge: String(items.length),
    };

    // Send to each device token
    const results = await Promise.allSettled(
      config.deviceTokens.map(token =>
        sendFCMNotification(fcmServerKey, token, notification)
      )
    );

    // Count successes
    const successful = results.filter(r => r.status === 'fulfilled').length;
    const failed = results.filter(r => r.status === 'rejected').length;

    if (failed > 0) {
      console.log(`   ⚠️  Sent to ${successful}/${config.deviceTokens.length} devices (${failed} failed)`);
    } else {
      console.log(`   ✅ Push notification sent to ${successful} device(s)`);
    }

    return successful > 0;

  } catch (error: any) {
    console.error(`   ❌ Push notification failed: ${error.message}`);
    return false;
  }
}

/**
 * Send FCM notification to a single device
 */
async function sendFCMNotification(
  serverKey: string,
  deviceToken: string,
  notification: { title: string; body: string; icon?: string; badge?: string }
): Promise<void> {
  const response = await fetch('https://fcm.googleapis.com/fcm/send', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `key=${serverKey}`,
    },
    body: JSON.stringify({
      to: deviceToken,
      notification,
      priority: 'high',
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`FCM error: ${error}`);
  }

  const result = await response.json();
  if (result.failure > 0) {
    throw new Error(`FCM delivery failed: ${JSON.stringify(result)}`);
  }
}

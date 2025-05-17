# Channel Routing Implementation

## Overview
This implementation moves coach conversations and bot posts from #general to #thelounge, while keeping staff meetings and microposts in the #general channel. This document outlines the changes made to achieve this.

## Changes Made

### 1. Environment Variables
- Added support for `LOUNGE_WEBHOOK_URL_*` environment variables for each coach
- Added new `THELOUNGE_CHANNEL_ID` environment variable

### 2. Webhook Configuration (`config.ts`)
- Added support for parsing and storing lounge webhook URLs
- Maintained backwards compatibility with existing general and staff webhook URLs

### 3. Bot Initialization (`bot.ts`)
- Added constant for channel IDs (`GENERAL_CHANNEL_ID` and `THELOUNGE_CHANNEL_ID`)
- Modified webhook initialization to organize webhooks by channel type
  - Preserves webhook URL prefixes (`general_`, `lounge_`, `staff_`) for proper lookup
- Updated welcome message to send to #thelounge instead of #general
- Added separate initialization for each channel's webhooks

### 4. Scheduler Updates (`scheduler.ts`)
- Added a helper function `getChannelForService` that routes each service to the appropriate channel
- Defined `STAFF_MEETING_SERVICES` list to specify which services should go to #general
  - Added micropost services (coachquotes, crowdfaves, microclass, upcomingevent) to this list
- Modified `runServiceWithMessages` to determine the target channel dynamically
- Updated channel targeting in all scheduler functions
- Implemented a `channelRedirectWrapper` function to ensure service functions use the correct channel ID

### 5. Webhook Logic (`webhooks.ts`)
- Updated `sendAsCharacter` to support #thelounge webhooks
- Implemented channel-specific webhook key determination

### 6. Testing
- Created a test script (`test-scripts/test-channel-routing.js`) to verify routing behavior

## How the Routing Works

1. Each scheduled event in the bot is classified:
   - Staff meetings go to #general
   - Microposts (coachquotes, crowdfaves, microclass, upcomingevent) go to #general
   - All other activities (watercooler, news, etc.) go to #thelounge

2. When any message needs to be sent, the system:
   - Determines which channel it should go to using `getChannelForService`
   - Wraps service functions to ensure they send messages to the correct channel using `channelRedirectWrapper`
   - Selects the appropriate webhook based on the channel and character
   - Sends the message to the correct channel

3. Webhook selection logic:
   - For #general: Uses `general_*` or `staff_*` webhook prefixes
   - For #thelounge: Uses `lounge_*` webhook prefixes

## Service Function Redirection

A key part of the implementation is the `channelRedirectWrapper` function that ensures all service functions use the correct channel ID:

```typescript
function channelRedirectWrapper(
    serviceFn: (channelId: string, client: Client, ...args: any[]) => Promise<any>,
    serviceName: string
) {
    return async (channelId: string, client: Client, ...args: any[]) => {
        // Get the correct channel ID for this service
        const targetChannelId = getChannelForService(serviceName);
        console.log(`[Scheduler] Redirecting ${serviceName} from ${channelId} to ${targetChannelId}`);
        
        // Call the original function with the correct channel ID
        return serviceFn(targetChannelId, client, ...args);
    };
}
```

This wrapper intercepts service function calls and ensures they use the channel ID determined by `getChannelForService`, regardless of the channel ID passed to them by the scheduler.

## Webhook Prefix Handling

It's important to maintain the webhook prefixes throughout the system:

1. In `config.ts`, webhooks are defined with prefixes:
   ```
   LOUNGE_WEBHOOK_URL_DONTE -> 'lounge_donte'
   ```

2. In `bot.ts`, these prefixes are preserved when organizing webhooks:
   ```typescript
   Object.entries(webhookUrls).forEach(([key, url]) => {
     if (key.startsWith('lounge_')) {
       loungeWebhookUrls[key] = url;  // Keep the 'lounge_' prefix
     }
   });
   ```

3. In `webhooks.ts`, lookup is done using the same prefixes:
   ```typescript
   if (channelId === THELOUNGE_CHANNEL_ID) {
     possibleKeys.push(
       `lounge_${normalizedCharId}`,
       `lounge_${characterId}`
     );
   }
   ```

This ensures that webhooks are correctly found when messages are sent to each channel.

## Required Environment Variables

Make sure these environment variables are set:
```
# General channel webhooks
GENERAL_WEBHOOK_URL_DONTE=...
GENERAL_WEBHOOK_URL_ALEX=...
GENERAL_WEBHOOK_URL_ROHAN=...
GENERAL_WEBHOOK_URL_VENUS=...
GENERAL_WEBHOOK_URL_ELJAS=...
GENERAL_WEBHOOK_URL_KAILEY=...

# Staff meetings channel webhooks
STAFF_WEBHOOK_URL_DONTE=...
STAFF_WEBHOOK_URL_ALEX=...
STAFF_WEBHOOK_URL_ROHAN=...
STAFF_WEBHOOK_URL_VENUS=...
STAFF_WEBHOOK_URL_ELJAS=...
STAFF_WEBHOOK_URL_KAILEY=...

# The Lounge channel webhooks
LOUNGE_WEBHOOK_URL_DONTE=...
LOUNGE_WEBHOOK_URL_ALEX=...
LOUNGE_WEBHOOK_URL_ROHAN=...
LOUNGE_WEBHOOK_URL_VENUS=...
LOUNGE_WEBHOOK_URL_ELJAS=...
LOUNGE_WEBHOOK_URL_KAILEY=...

# Channel IDs
THELOUNGE_CHANNEL_ID=...
# GENERAL_CHANNEL_ID is hardcoded as 1354474492629618831
```

## Testing the Implementation

1. Set the required environment variables
2. Run the debug script:
   ```
   ./start-debug.sh
   ```
3. Verify the routing logic outputs:
   - Staff meetings go to #general
   - Microposts go to #general
   - Watercooler conversations go to #thelounge

## Fallback Behavior

If `THELOUNGE_CHANNEL_ID` is not set:
- All activities will fall back to #general
- A warning will be logged 
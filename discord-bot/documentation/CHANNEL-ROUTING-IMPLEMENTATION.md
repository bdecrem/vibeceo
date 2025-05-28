# Channel Routing and Configuration Implementation

## Overview
This document outlines the implementation details for how the Discord bot handles environment variables, loads configuration for channel IDs and webhook URLs, and routes messages and activities to specific channels like #general, #thelounge, #pitch, and #staffmeetings.

## Changes Made (Recent Major Update)

The system has undergone a significant refactor in how environment variables are defined and how configuration is loaded and validated. This has led to a more robust and clear setup.

### 1. Environment Variables
The way channel IDs and webhook URLs are defined has been standardized. All required variables **must** be set in the environment. Hardcoded fallbacks have been removed.

**Required Channel ID Variables:**
*   `GENERAL_CHANNEL_ID`: The ID for the #general channel.
*   `THELOUNGE_CHANNEL_ID`: The ID for the #thelounge channel.
*   `PITCH_CHANNEL_ID`: The ID for the #pitch channel.
*   `STAFFMEETINGS_CHANNEL_ID`: The ID for the #staffmeetings channel.

**Required Webhook URL Variables:**
Webhook URLs now follow a strict `CHANNELNAME_CHARACTERNAME_WEBHOOK_URL` format. For each of the 6 characters (Donte, Alex, Rohan, Venus, Eljas, Kailey) and for each of the 4 channels mentioned above, a specific webhook URL must be provided. This means a total of 24 webhook URL environment variables are required.

*Examples:*
*   `GENERAL_DONTE_WEBHOOK_URL=...`
*   `THELOUNGE_ALEX_WEBHOOK_URL=...`
*   `PITCH_ROHAN_WEBHOOK_URL=...`
*   `STAFFMEETINGS_VENUS_WEBHOOK_URL=...`
*   `(and so on for all character-channel combinations)`

**Deprecated Formats:**
Older formats like `WEBHOOK_URL_DONTE` or `LOUNGE_WEBHOOK_URL_DONTE` are no longer used.

### 2. Webhook Configuration (`config.ts`)
-   `config.ts` is responsible for loading all required channel IDs and webhook URLs from the environment variables.
-   It parses the `CHANNELNAME_CHARACTERNAME_WEBHOOK_URL` variables and organizes them into a structured map: `webhookUrls[channelType][characterName]`. For example, `webhookUrls.general.donte` would hold Donte's webhook URL for the #general channel.
-   **Stricter Validation**: The `validateConfig()` function now ensures that `DISCORD_BOT_TOKEN`, all 4 channel IDs, and all 24 webhook URLs are present and correctly named in the environment. If any of these are missing, the bot will log a comprehensive error and refuse to start.

### 3. Bot Initialization (`bot.ts`)
-   `bot.ts` now calls `validateConfig()` from `config.ts` at startup to get the Discord token, the map of channel IDs, and the structured map of webhook URLs.
-   It no longer contains any hardcoded fallback channel IDs.
-   The previous incorrect behavior of copying general webhooks to other channels (if specific ones weren't found) has been removed.
-   `initializeWebhooks` (from `webhooks.ts`) is now called with the distinct and appropriate set of character webhooks for each specific channel (e.g., `initializeWebhooks(channelIds.thelounge, webhookUrls.thelounge)`).

### 4. Scheduler Updates (`scheduler.ts`)
- This section remains largely the same in its core logic.
- Added a helper function `getChannelForService` that routes each service to the appropriate channel.
- Defined `STAFF_MEETING_SERVICES` list to specify which services should go to #general.
- Micropost services (coachquotes, crowdfaves, microclass, upcomingevent) are also routed to #general.
- Modified `runServiceWithMessages` to determine the target channel dynamically based on `getChannelForService`.
- Implemented a `channelRedirectWrapper` function to ensure service functions use the correct channel ID.

### 5. Webhook Logic (`webhooks.ts`)
-   `initializeWebhooks(channelId, characterWebhookUrls)` now expects the `characterWebhookUrls` parameter to be a simple map of character names to their URLs for that specific channel (e.g., `{ donte: "url1", alex: "url2" }`). It stores these in a per-channel map accessible by the simple character name.
-   `sendAsCharacter(channelId, characterId, message)` has been greatly simplified. It now performs a direct lookup for the character's webhook.
    -   It takes the `channelId` and the simple `characterId` (e.g., "donte").
    -   It retrieves the map of webhooks for the given `channelId`.
    -   It then directly looks up the `WebhookClient` using the (normalized) `characterId` from that map.
    -   The complex `possibleKeys` logic and attempts to find webhooks using various prefixed keys are completely gone.

### 6. Testing
- The test script (`test-scripts/test-channel-routing.js`) should be updated or reviewed to ensure it aligns with the new environment variable requirements if it's used for local testing.

## How the Routing Works (Service to Channel)

The core logic for routing *scheduled services* to different channels remains:

1.  Each scheduled event/service in the bot is classified:
    *   Staff meetings are intended for `#staffmeetings`.
    *   Microposts (coachquotes, crowdfaves, microclass, upcomingevent) are intended for `#general`.
    *   All other activities (watercooler, news, etc.) are intended for `#thelounge`.
    *   Pitches and related discussions are for `#pitch`.

2.  When any message needs to be sent by a scheduled service, the system:
    *   Determines which channel it should go to using `getChannelForService` (in `scheduler.ts`).
    *   Wraps service functions (using `channelRedirectWrapper`) to ensure they send messages to the correct channel ID obtained from `getChannelForService`.
    *   `sendAsCharacter` (in `webhooks.ts`) then selects the appropriate webhook based on the (now correct) `channelId` and the `characterId`.

## Service Function Redirection

The `channelRedirectWrapper` function in `scheduler.ts` remains crucial for ensuring service functions use the correct channel ID for their output:

```typescript
function channelRedirectWrapper(
    serviceFn: (channelId: string, client: Client, ...args: any[]) => Promise<any>,
    serviceName: string
) {
    return async (channelId: string, client: Client, ...args: any[]) => {
        // Get the correct channel ID for this service
        const targetChannelId = getChannelForService(serviceName); // e.g., get 'thelounge' ID
        console.log(`[Scheduler] Redirecting ${serviceName} from default/scheduled ${channelId} to ${targetChannelId}`);
        
        // Call the original function with the correct target channel ID
        return serviceFn(targetChannelId, client, ...args);
    };
}
```
This wrapper intercepts service function calls and ensures they use the channel ID determined by `getChannelForService`.

## Webhook Environment Variable and Configuration Flow

The previous "Webhook Prefix Handling" is now better described as an end-to-end flow:

1.  **Environment Variables**: Webhook URLs are defined in the environment using the strict `CHANNELNAME_CHARACTERNAME_WEBHOOK_URL` format (e.g., `THELOUNGE_DONTE_WEBHOOK_URL`). Channel IDs are also defined (e.g., `THELOUNGE_CHANNEL_ID`).

2.  **Configuration Loading (`config.ts`)**:
    *   `validateConfig()` reads these environment variables.
    *   It populates a `channelIds` map: `{ general: "id1", thelounge: "id2", ... }`.
    *   It populates a structured `webhookUrls` map:
        ```typescript
        {
          general: {
            donte: "url_general_donte",
            alex: "url_general_alex",
            // ...
          },
          thelounge: {
            donte: "url_thelounge_donte",
            alex: "url_thelounge_alex",
            // ...
          },
          // ... and so on for pitch, staffmeetings
        }
        ```

3.  **Bot Initialization (`bot.ts`)**:
    *   `bot.ts` receives the `channelIds` and `webhookUrls` maps from `validateConfig()`.
    *   For each channel, it calls `initializeWebhooks` from `webhooks.ts`. For example:
        `await initializeWebhooks(channelIds.thelounge, webhookUrls.thelounge);`
        Here, `webhookUrls.thelounge` would be `{ donte: "url_thelounge_donte", alex: "url_thelounge_alex", ... }`.

4.  **Webhook Initialization (`webhooks.ts`)**:
    *   `initializeWebhooks(channelId, characterUrls)` receives the specific channel's ID and its map of character webhooks.
    *   It stores these webhooks in `channelWebhooks` (a `Map<string, Map<string, WebhookClient>>`). The outer map is keyed by `channelId`, and the inner map is keyed by the simple `characterName` (e.g., "donte").

5.  **Sending a Message (`webhooks.ts`)**:
    *   `sendAsCharacter(channelId, characterId, message)` uses the `channelId` to get the inner map of character webhooks for that channel.
    *   It then uses the (normalized) `characterId` (e.g., "donte") to directly retrieve the specific `WebhookClient` from that inner map.

This new flow ensures a clear and direct path from environment variable definition to webhook usage, eliminating the ambiguity of the old prefix-based system.

## Required Environment Variables (Summary)

Ensure these environment variables are set in your deployment environment (e.g., Railway):

```
# Discord Bot Token
DISCORD_BOT_TOKEN=your_bot_token_here

# Channel IDs (Must be set)
GENERAL_CHANNEL_ID=...
THELOUNGE_CHANNEL_ID=...
PITCH_CHANNEL_ID=...
STAFFMEETINGS_CHANNEL_ID=...

# Standardized Webhook URLs (All 24 must be set)
# Format: CHANNELNAME_CHARACTERNAME_WEBHOOK_URL

# Examples for GENERAL channel
GENERAL_DONTE_WEBHOOK_URL=...
GENERAL_ALEX_WEBHOOK_URL=...
# ... (for Rohan, Venus, Eljas, Kailey in GENERAL)

# Examples for THELOUNGE channel
THELOUNGE_DONTE_WEBHOOK_URL=...
THELOUNGE_ALEX_WEBHOOK_URL=...
# ... (for Rohan, Venus, Eljas, Kailey in THELOUNGE)

# Examples for PITCH channel
PITCH_DONTE_WEBHOOK_URL=...
PITCH_ALEX_WEBHOOK_URL=...
# ... (for Rohan, Venus, Eljas, Kailey in PITCH)

# Examples for STAFFMEETINGS channel
STAFFMEETINGS_DONTE_WEBHOOK_URL=...
STAFFMEETINGS_ALEX_WEBHOOK_URL=...
# ... (for Rohan, Venus, Eljas, Kailey in STAFFMEETINGS)
```

## Testing the Implementation
1.  Ensure all 29 required environment variables (token, 4 channel IDs, 24 webhook URLs) are correctly set.
2.  Start the bot. Check startup logs for any errors from `validateConfig()`.
3.  Verify that scheduled activities and commands requiring character impersonation occur in the correct channels.

## Fallback Behavior
There is no longer fallback behavior for missing channel IDs or webhook URLs. If any of क्वrequired environment variables are not set, `validateConfig()` will throw an error, and the bot will not start. This ensures a more predictable and correctly configured deployment.
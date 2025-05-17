# Pitch Channel Implementation

## Overview
This implementation adds a dedicated channel for pitch-related conversations, separate from #general and #thelounge. This document outlines the changes made to support this feature.

## Changes Made

### 1. Environment Variables
- Added support for `PITCH_WEBHOOK_URL_*` environment variables for each coach
- Added new `PITCH_CHANNEL_ID` environment variable

### 2. Webhook Configuration (`config.ts`)
- Added support for parsing and storing pitch webhook URLs with the 'pitch_' prefix 
- Added pitch webhooks to the `getWebhookUrls` function

### 3. Bot Initialization (`bot.ts`)
- Added `PITCH_CHANNEL_ID` constant
- Modified webhook initialization to categorize pitch webhooks
- Added separate initialization for pitch channel webhooks
- Updated exports to include `PITCH_CHANNEL_ID`

### 4. Scheduler Updates (`scheduler.ts`)
- Added a `PITCH_SERVICES` array to list services that should go to the pitch channel
- Updated `getChannelForService` to route pitch services to the pitch channel
- Added better fallback logic when channels aren't configured

### 5. Webhook Logic (`webhooks.ts`)
- Updated `sendAsCharacter` to support pitch channel webhooks
- Added pitch-specific webhook key determination

## How the Routing Works

1. Each scheduled event in the bot is now classified into one of three channels:
   - Staff meetings and microposts go to #general (via `STAFF_MEETING_SERVICES`)
   - Pitch-related activities go to #pitch (via `PITCH_SERVICES`)
   - All other activities go to #thelounge

2. The `getChannelForService` function determines which channel a service should use:
   - Checks if the service is in `STAFF_MEETING_SERVICES` → routes to #general
   - Checks if the service is in `PITCH_SERVICES` → routes to #pitch
   - Otherwise routes to #thelounge
   - Falls back to #general if needed channels aren't configured

3. Webhook selection logic now includes pitch channel:
   - For #general: Uses `general_*` or `staff_*` webhook prefixes
   - For #thelounge: Uses `lounge_*` webhook prefixes
   - For #pitch: Uses `pitch_*` webhook prefixes

## Required Environment Variables

The following new environment variables need to be set:
```
# Pitch channel webhooks
PITCH_WEBHOOK_URL_DONTE=...
PITCH_WEBHOOK_URL_ALEX=...
PITCH_WEBHOOK_URL_ROHAN=...
PITCH_WEBHOOK_URL_VENUS=...
PITCH_WEBHOOK_URL_ELJAS=...
PITCH_WEBHOOK_URL_KAILEY=...

# Pitch channel ID
PITCH_CHANNEL_ID=...
```

## Testing the Implementation

1. Set the required environment variables
2. Check that pitch events in the schedule (pitchchat) are correctly routed to #pitch
3. Verify that the other channels continue to work as expected 
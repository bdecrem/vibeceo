# Micro-Post Feature for Discord Bot

This document explains the new micro-post feature implemented for the Discord bot. Unlike the argument-based conversations where multiple coaches talk to each other, micro-posts are single messages posted by "The Foundry Heat" account.

## Setup

1. Make sure your `.env.local` file includes the webhook URL for The Foundry Heat:
   ```
   GENERAL_WEBHOOK_URL_FOUNDRYHEAT=https://discord.com/api/webhooks/your-webhook-url
   ```

2. The following files have been added/modified:
   - `/data/micro-posts.json` - Stores prompts for different micro-post types
   - `/lib/discord/microPosts.ts` - Core implementation of micro-post generation
   - `/lib/discord/scheduler.ts` - Updated to include micro-post services
   - `/test-micro-post.js` - Testing script
   - `/data/schedule.txt` - Updated with micro-post events
   - `/data/weekend-schedule.txt` - Updated with micro-post events

3. Build the project to compile TypeScript files:
   ```
   npm run build:bot
   ```

## Micro-Post Types

Four types of micro-posts have been implemented:

1. **Coach Quotes** (scheduleCommand: `coachquotes`)
   - One-line quotes from various coaches that sound like gospel
   - Scheduled at 7:00 in both weekday and weekend schedules

2. **Crowd Favorites** (scheduleCommand: `crowdfaves`)
   - Meme-worthy one-liners that get tattooed on founders' arms
   - Scheduled at 11:00 in both weekday and weekend schedules

3. **Micro-Masterclass** (scheduleCommand: `microclass`)
   - Short, strange but useful coaching tips from each coach
   - Scheduled at 15:00 in both weekday and weekend schedules

4. **Upcoming Events** (scheduleCommand: `upcomingevent`)
   - Fictional upcoming events for the Discord community
   - Scheduled at 20:00 in both weekday and weekend schedules

## Testing

To test a specific micro-post type, run:

```
node test-micro-post.js <prompt-id>
```

Where `<prompt-id>` is one of:
- `coach-quotes`
- `crowd-faves`
- `microclass`
- `upcoming-events`

Example:
```
node test-micro-post.js coach-quotes
```

This will generate a post and send it to the Discord channel using The Foundry Heat webhook.

## How It Works

1. The scheduler calls the appropriate function at the scheduled time
2. The function calls OpenAI with the prompt for that micro-post type
3. The generated text is formatted with the intro and outro from the prompt
4. The message is posted to Discord using The Foundry Heat webhook

## Customization

To add new micro-post types:

1. Add a new entry to `/data/micro-posts.json`
2. Add a new function in `/lib/discord/microPosts.ts`
3. Add the function to the serviceMap in `/lib/discord/scheduler.ts`
4. Update the schedule files to include the new service

## Troubleshooting

- If the webhook isn't working, check the `.env.local` file for the correct URL
- Check the logs for error messages
- Ensure the webhook has the right permissions in the Discord server
- Verify the TypeScript files have been compiled properly 
# System Announcement Feature

The System Announcement feature automatically posts updates about coach dynamics to the Discord channel during regular scene progressions. Announcements occur at key scene transition points (after scenes 5, 11, 17, and 23).

## Key Components

### 1. System Announcement Implementation (`systemAnnouncement.ts`)

- Core function: `postSystemAnnouncement(client, sceneIndex)`
- Reads coach irritation data from `data/story-themes/story-arcs.json`
- Formats and posts a standardized announcement message
- Handles error conditions and reports success/failure

### 2. Scene Progression Integration

The system announcement feature is integrated into the bot's scene progression in two places:

#### In `eventMessages.ts`

When a scene intro is processed:
- Scene indices are incremented (`storyInfoSceneIndex++`)
- If the new scene index matches a trigger point (5, 11, 17, or 23)
- `postSystemAnnouncement()` is called with the current Discord client and scene index

```typescript
// Trigger system announcement for specific scene indexes
if (storyInfoSceneIndex === 5 || storyInfoSceneIndex === 11 || 
    storyInfoSceneIndex === 17 || storyInfoSceneIndex === 23) {
    try {
        console.log(`Triggering system announcement after scene ${storyInfoSceneIndex}`);
        await postSystemAnnouncement(client, storyInfoSceneIndex);
    } catch (error) {
        console.error(`Error posting system announcement for scene ${storyInfoSceneIndex}:`, error);
    }
}
```

#### In `sceneFramework.ts` (Backup Implementation)

In the `playEpisode` function:
- Similar check for specific scene indices (5, 11, 17, 23)
- Calls `postSystemAnnouncement()` at these trigger points
- Provides redundancy for the announcement system

### 3. Message Format

```
📢 The AF System Update
Welcome to the AF. Over in #thelounge: Someone started mocking [Coach]'s [incident]. 
[Pronoun]'s still salty with [Target] after bringing it up in chat and not loving 
how the convo went.

Type !help to see just how triggered [pronoun] is—and for how to pitch your $B idea, 
summon a coach, or stir more chaos.

Carry on accordingly. 🌀
```

## How It Works

1. The bot follows the schedule defined in `schedule.txt`
2. Each hour, it runs a designated service (watercooler, waterheater, etc.)
3. When processing scene intros:
   - Scene indices are incremented
   - At specific scene indices (5, 11, 17, 23), system announcements are triggered
   - The announcement reads current irritation data and formats a message
   - The message is posted to the general channel

## Testing

You can test system announcements with:
```bash
node test-scripts/test-system-announcement.js
```

Or the more direct implementation:
```bash
node test-scripts/test-system-announcement-direct.js
```

## Troubleshooting

If system announcements aren't appearing:

1. Verify story arc data exists in `data/story-themes/story-arcs.json`
2. Check that scene transitions are incrementing `storyInfoSceneIndex` in `eventMessages.ts`
3. Ensure the Discord client has proper permissions in the target channel
4. Review logs for any errors during the announcement process

## Channel Configuration

By default, announcements are posted to the GENERAL_CHANNEL_ID, which is hardcoded as '1354474492629618831'. 
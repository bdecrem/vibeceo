# System Announcement Feature

## Quick Start
The System Announcement feature automatically posts updates about coach dynamics to the #general channel during episode playback. To test this feature:

```bash
node test-scripts/test-system-announcement.js
```

## Key Components
- `systemAnnouncement.js` - Core implementation for creating and sending announcements
- `sceneFramework.js` - Integration with episode playback
- `test-system-announcement.js` - Test script for manual testing

## Schedule
Announcements are posted every 6 scenes (after scenes 5, 11, 17, 23)

## Message Format
```
📢 The AF System Update
Welcome to the AF. Over in #thelounge: Someone started mocking [Coach]'s [incident]. 
[Pronoun]'s still salty with [Target] after bringing it up in chat and not loving 
how the convo went.

Type !help to see just how triggered [pronoun] is—and for how to pitch your $B idea, 
summon a coach, or stir more chaos.

Carry on accordingly. 🌀
```

## Data Source
Announcement content is based on the current coach irritation data from:
`data/story-themes/story-arcs.json`

## Channel Configuration
By default, announcements are posted to the GENERAL_CHANNEL_ID in .env.local, 
or fallback to '1354474492629618831' if not set.

## Detailed Documentation
For full implementation details, see:
`documentation/system-announcement.md` 
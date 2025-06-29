# Disabled Discord Bot Features

This document explains the automated features that have been disabled in the Discord bot system while preserving all code for future re-enabling.

## 🚫 Disabled Features

### 1. System Announcements

**What was disabled:**
- Automated system announcements about coach dynamics and irritation levels
- Posted to #general channel with coach relationship updates
- Triggered during episode scene progression

**Schedule that was disabled:**
- **After scenes 5, 11, 17, and 23** (every 6 scenes)
- Announcements included coach irritation data from `story-arcs.json`
- Format: "📢 The AF System Update" with coach dynamics

**Files modified:**
- `lib/discord/eventMessages.ts` - Lines 378-386: Commented out system announcement triggers
- `lib/discord/sceneFramework.ts` - Lines 1196-1209: Commented out system announcement calls

### 2. ForReal Announcements  

**What was disabled:**
- Automated announcements explaining the ForReal feature
- Posted to #forreal channel with usage instructions
- Triggered twice per episode cycle

**Schedule that was disabled:**
- **After scenes 1 and 12** (twice per 24-scene episode)  
- Content explained "for real though:" command usage
- Format: "FOR REAL THOUGH" with feature instructions

**Files modified:**
- `lib/discord/eventMessages.ts` - Lines 388-396: Commented out ForReal announcement triggers

### 3. Episode Scene Progression

**What still works:**
- Episode generation and scene playback continue normally
- Watercooler chats every 15 minutes
- Coach interactions and conversations
- All manual commands (!help, !forreal, etc.)

## ✅ Still Working

### Discord Bot Features that remain active:
- **Watercooler chats** - Automated every 15 minutes
- **Manual coach interactions** - All !commands work
- **ForReal conversations** - Feature works, just no auto-announcements
- **Episode generation** - Story progression continues
- **Coach personalities** - All AI responses functional
- **Administrative commands** - All management features active

### Schedule files:
- `data/schedule.txt` - Minimal hourly schedule for basic services
- `data/weekend-schedule.txt` - Minimal weekend schedule

## 📅 Current Minimal Schedules

### Weekday Schedule (`data/schedule.txt`):
```
00:00 
01:00
02:00 coachquotes
03:00 
04:00 
05:00 
06:00 
07:00 watercooler
08:00 
09:00 newschat
10:00 
11:00 
12:00 
13:00 
14:00 microclass
15:00 
16:00 
17:00 
18:00 
19:00 
20:00 upcomingevent
21:00 
22:00 
23:00 
```

### Weekend Schedule (`data/weekend-schedule.txt`):
```
00:00 
01:00 
02:00 
03:00 watercooler
04:00 
05:00
06:00 
07:00 
08:00 
09:00 
10:00 microclass-v2
11:00 
12:00 
13:00 
14:00 upcomingevent-v2
15:00 
16:00 
17:00 
18:00 crowdfaves-v2
19:00 
20:00 
21:00 
22:00 coachquotes-v2
23:00 
```

## 🔄 How to Re-enable

### System Announcements:
1. **Uncomment in eventMessages.ts**:
   ```typescript
   // Remove /* and */ around lines 378-386:
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

2. **Uncomment in sceneFramework.ts**:
   ```typescript
   // Remove /* and */ around lines 1196-1209
   if (i === 5 || i === 11 || i === 17 || i === 23) {
     // ... system announcement logic
   }
   ```

### ForReal Announcements:
1. **Uncomment in eventMessages.ts**:
   ```typescript
   // Remove /* and */ around lines 388-396:
   if (storyInfoSceneIndex === 1 || storyInfoSceneIndex === 12) {
     try {
       console.log(`Triggering ForReal system announcement after scene ${storyInfoSceneIndex}`);
       await postForRealSystemAnnouncement();
     } catch (error) {
       console.error(`Error posting ForReal system announcement for scene ${storyInfoSceneIndex}:`, error);
     }
   }
   ```

## 📝 Implementation Details

### System Announcement Flow (when enabled):
1. **Scene progression** triggers at specific indices (5, 11, 17, 23)
2. **Read irritation data** from `data/story-themes/story-arcs.json`
3. **Format message** with coach dynamics and relationships
4. **Post to #general** channel with current coach tensions
5. **Include help text** about commands and features

### ForReal Announcement Flow (when enabled):
1. **Scene progression** triggers at indices 1 and 12
2. **Generate explanation** of ForReal feature usage
3. **Post to #forreal** channel with instructions
4. **Include examples** of "for real though:" syntax

### Episode Scene System:
- **24 scenes per episode** with various event types
- **15-minute intervals** for watercooler chats (still active)
- **Scene indices** track progression for announcement triggers
- **Coach irritation** data influences scene content

## 🛠️ Configuration Files

### Key files that remain functional:
- `lib/discord/systemAnnouncement.ts` - System announcement logic (preserved)
- `lib/discord/eventMessages.ts` - Event and announcement handlers (partially disabled)
- `lib/discord/sceneFramework.ts` - Episode scene progression (partially disabled)
- `data/story-themes/story-arcs.json` - Coach irritation data (still used by other features)

### Environment variables still in use:
- `DISCORD_BOT_TOKEN` - Bot authentication
- `OPENAI_API_KEY` - AI response generation
- Various webhook URLs for coach personalities

## 📊 Impact

**Before disabling:**
- Regular system announcements about coach dynamics
- ForReal feature promotion every episode
- Higher Discord channel activity

**After disabling:**
- Quieter bot focused on core functionality
- Manual feature discovery for ForReal
- Preserved episode progression without announcement spam

**Services still running:**
- Watercooler chats continue every 15 minutes
- News discussions and microclasses
- Coach quotes and upcoming events
- All manual commands and features

---

*Last updated: January 2025*
*Status: Announcements disabled, core functionality preserved*
*Schedule files: Minimized to essential services only* 
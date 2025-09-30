# SMS Bot Agents

This directory contains specialized agents that extend the SMS bot's capabilities beyond basic messaging.

## YouTube Agent

**File:** `youtube-agent.ts`

**Purpose:** Smart YouTube video discovery via SMS

**Usage:**
```
YT [search topic]
```

**Flow:**
1. User texts: `YT bitcoin trading`
2. Agent asks follow-up question to refine search (e.g., "Looking for technical analysis, market news, educational content, or live trading?")
3. User responds with preference (or "skip")
4. Agent returns list of recent YouTube videos with:
   - Time published (e.g., "3h 15m ago")
   - Video title
   - Channel name
   - Direct link

**Features:**
- Searches videos from last 24 hours by default
- User can specify time ranges: "last hour", "2 hours", "today", "this week"
- Claude AI generates smart follow-up questions based on search topic
- Returns top 10 results, displays 5 in SMS for brevity

**Requirements:**
- `YOUTUBE_API_KEY` - Google YouTube Data API v3 key
- `ANTHROPIC_API_KEY` - For Claude AI follow-up questions

**Implementation:**
- Integrated into `lib/sms/handlers.ts`
- Command: `YT [topic]`
- Conversational state managed via `youtubeSearchStates` Map
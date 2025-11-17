# Recruiting Agent Architecture Summary

## Overview

The recruiting agent in `sms-bot/agents/recruiting/` is an SMS-based talent sourcing system called "Talent Radar" that helps users find candidates for positions through a conversational, AI-powered workflow. The agent discovers sources, collects candidates, learns from user feedback, and sends daily candidate recommendations.

---

## Core Flow

### 1. User Initiates Search
```
User sends: "RECRUIT motion designer students at School of Visual Arts"
```

### 2. Three-Phase Setup Process

#### **Phase 1: Exploration (Query Refinement)**
- **File**: `source-discovery-agent.ts::exploreChannelIdeas()`
- **Rounds**: Up to 2 conversational rounds
- **Goal**: Understand what kind of person the user is looking for
- **Process**:
  1. AI asks clarifying questions (1-2 per round)
  2. User provides additional context
  3. Full Q&A saved to `project.explorationHistory[]`
  4. After round 2, AI proposes a **detailed refined query**
  5. User must reply "APPROVE" to proceed

**Example refined query**:
> "Computer Science students in USA/Canada for part-time coding on AI SMS agent project - must have shipped at least one software project, actively coding (any stack), genuinely excited about AI/LLMs, willing to learn our codebase"

#### **Phase 2: Channel Discovery (Source Finding)**
- **File**: `discover-channels-agent.py` (Python autonomous agent)
- **Uses**: Claude Agent SDK + WebSearch tool
- **Goal**: Find 3-5 specific mineable channels with **real verified examples**
- **Process**:
  1. Python agent searches the web for actual candidates
  2. Returns channels with REAL example profiles (name, URL, description)
  3. User can approve/reject channels: "YES" or "1:yes 2:no 3:yes"
  4. Approved channels saved to `project.channels[]`

**Example channel**:
```json
{
  "channelType": "twitter-search",
  "name": "Twitter #buildinpublic + AI",
  "searchQuery": "#buildinpublic AI agents",
  "description": "People building AI products publicly on Twitter",
  "example": {
    "name": "@real_person",
    "url": "https://twitter.com/real_person",
    "description": "AI engineer, built 3 LLM products"
  },
  "score": 9,
  "reason": "High concentration of builders"
}
```

#### **Phase 3: Candidate Collection**
- **File**: `index.ts::runCandidateCollection()`
- **Goal**: Find 10 initial diverse candidates from approved channels
- **Process**:
  1. Collects candidates from all approved channels in parallel (GitHub, Twitter, RSS, YouTube)
  2. AI scores and selects top 10 diverse candidates
  3. Stores in `recruiting_candidates` table
  4. Generates HTML report with shortlink
  5. Sends SMS with **only #1 candidate + shortlink** (stays under 670 code units)

---

## Daily Candidate Flow

**Scheduler**: `talent-radar-scheduler.ts::registerTalentRadarDailyJob()`
**Time**: 9:00 AM PT daily

### Daily Process:
1. **Analyze Scores**: `analyzeProjectScores()` uses Claude to extract learned preferences
   - Separates high scores (4-5) vs low scores (1-2)
   - Identifies patterns: seniority, company size, skills, backgrounds
   - Stores in `project.learnedProfile`

2. **Find New Candidates**: `findDailyCandidates()`
   - Collects candidates from stored channels
   - Uses AI to select 3 candidates matching learned profile
   - Filters out duplicates (already shown candidates)

3. **Store & Send**:
   - Stores in `recruiting_candidates` table with `report_type='daily'`
   - Generates report with shortlink
   - Sends SMS with top candidate + link to all candidates

4. **30-Day Refresh**:
   - Every 30 days, `shouldRefreshSources()` returns true
   - Re-runs channel discovery to find new sources
   - Merges with existing channels

5. **Duration Tracking**:
   - Default: 7 days of daily reports
   - On day 7, sends continuation prompt
   - After 7 days, project pauses until user sends "RECRUIT CONTINUE"

---

## Architecture Components

### 1. Source Discovery Agent
**File**: `source-discovery-agent.ts`

**Key Functions**:
- `exploreChannelIdeas()` - Phase 1: Conversational query refinement (2 rounds max)
- `proposeSpecificChannels()` - Phase 2: Calls Python agent to find channels with web search
- `runChannelDiscoveryAgent()` - Spawns Python subprocess for autonomous web search

**Python Agent**:
- **File**: `discover-channels-agent.py`
- **Tools**: WebSearch (Claude Agent SDK)
- **Output**: 3-5 channels, each with a REAL verified candidate example
- **Critical**: No made-up URLs - every example is verified via web search

### 2. Candidate Collectors
**Directory**: `collectors/`

Four parallel collectors:
- **`github-collector.ts`**: GitHub users from repos/contributors
- **`twitter-collector.ts`**: Twitter profiles via search
- **`rss-collector.ts`**: RSS feed authors/contributors
- **`youtube-collector.ts`**: YouTube channel creators

Each collector:
- Takes discovered sources (e.g., GitHub repos, Twitter handles)
- Fetches up to 20 candidates per source
- Returns standardized format with bio, links, activity

### 3. Candidate Scorer
**File**: `candidate-scorer.ts`

**Function**: `scoreAndSelectCandidates()`
- **Input**: Collected candidates from all sources
- **Process**:
  - Sends all candidates to Claude
  - Provides query + learned preferences
  - Asks Claude to select top N diverse candidates
- **Output**: Scored candidates with match reasons
- **Fallback**: If Claude fails, uses simple diversity selection

### 4. Report Generator
**File**: `report-generator.ts`

**Function**: `generateAndStoreRecruitingReport()`
- **Input**: Project data, candidates, date, report type
- **Process**:
  1. Generate markdown report with position overview, search focus, channels, candidates
  2. Store in Supabase storage (`agents/recruiting/{date}/report.md`)
  3. Create short link to report viewer
- **Output**: Markdown, summary, metadata, shortlink

**Report Contents**:
- Position Overview (query + refined spec)
- Search Focus (learned profile if available)
- Channels Searched (approved channels with examples)
- Candidates (with bio, links, AI score, match reason, user score if provided)

### 5. Data Storage
**Supabase Tables**:

**`agent_subscriptions`**:
```sql
{
  subscriber_id: uuid,
  agent_slug: 'recruiting',
  active: boolean,
  preferences: {
    projects: {
      [projectId]: {
        query: string,
        explorationHistory: [...],
        refinedSpec: {...},
        userRefinements: [...],
        channels: [...],
        approvedChannels: [...],
        candidateFeedback: {...},
        learnedProfile: {...},
        setupComplete: boolean,
        active: boolean,
        durationDays: 7,
        startedAt: timestamp
      }
    },
    activeProjectId: uuid
  }
}
```

**`recruiting_candidates`**:
```sql
{
  id: uuid,
  subscriber_id: uuid,
  project_id: uuid,
  name: string,
  title: string,
  company: string,
  company_size: string,
  location: string,
  linkedin_url: string,
  twitter_handle: string,
  github_url: string,
  youtube_url: string,
  match_reason: string,
  recent_activity: string,
  source: string,
  raw_profile: jsonb,
  report_type: 'setup' | 'daily',
  report_date: date,
  position_in_report: integer,
  user_score: integer (1-5),
  scored_at: timestamp
}
```

---

## SMS Commands

**File**: `commands/recruit.ts`

### Available Commands:
```
RECRUIT {criteria}          → Start new recruiting project
RECRUIT                     → Show today's candidates
SCORE 1:5 2:3 3:4...       → Score candidates (triggers learning)
RECRUIT LIST               → List all projects
RECRUIT SWITCH {project#}  → Switch active project
RECRUIT SETTINGS           → View current project settings
RECRUIT STOP               → Stop daily reports
RECRUIT CONTINUE           → Extend project duration by 7 days
```

### Command Flow:
1. **RECRUIT {criteria}**:
   - Creates new project with UUID
   - Stores active thread for conversational context
   - Starts Phase 1 exploration

2. **User responses during setup**:
   - Thread system (`context-loader.ts`) maintains conversation state
   - Each response continues the appropriate phase
   - "APPROVE" advances to next phase

3. **SCORE {scores}**:
   - Parses `1:5 2:3` → candidate 1 gets score 5, candidate 2 gets score 3
   - Stores scores in `recruiting_candidates.user_score`
   - Triggers `analyzeProjectScores()` for learning

---

## Continuous Learning System

### 1. **Exploration History** (Phase 1)
- Stores full Q&A during initial setup
- Used to refine the recruiting spec
- Saved in `project.explorationHistory[]`

### 2. **Refined Spec** (AI-Generated)
- Detailed recruiting specification created from exploration
- Can be updated based on user refinements
- Saved in `project.refinedSpec.specText`

### 3. **User Refinements** (Ongoing)
- Any user feedback during setup or candidate review
- Saved with context: exploration, channel approval, candidate feedback
- Can trigger spec updates
- Saved in `project.userRefinements[]`

### 4. **Channel Performance Tracking**
- Each channel tracks:
  - `candidatesFound` - How many candidates discovered
  - `candidatesScored` - How many candidates user scored
  - `avgCandidateScore` - Average user score (which channels work best?)
- Low-performing channels can be replaced in future iterations

### 5. **Learned Profile** (AI-Extracted)
Created by `analyzeProjectScores()`:
```json
{
  "preferred_seniority": ["senior", "lead"],
  "preferred_company_sizes": ["startup", "midsize"],
  "preferred_skills": ["React", "TypeScript"],
  "preferred_backgrounds": ["Full-stack with strong frontend"],
  "avoid": ["Pure backend", "Enterprise only"]
}
```

Used by `scoreAndSelectCandidates()` to match future candidates.

---

## SMS Length Constraints

**CRITICAL**: All SMS messages MUST stay under 670 UCS-2 code units (10 segments)

**File**: `lib/utils/sms-length.ts`

### Counting Function:
```typescript
function countUCS2CodeUnits(text) {
  return [...text].reduce((count, char) => {
    const code = char.codePointAt(0);
    return count + (code > 0xFFFF ? 2 : 1);
  }, 0);
}
```

### Implementation:
- **Setup SMS**: Only 1 top candidate + shortlink to full report
- **Daily SMS**: Only 1 top candidate + shortlink to full report
- **Channel proposals**: Max 3-5 channels with SHORT names/descriptions
- **Exploration responses**: Max 500 characters with complete sentences

---

## Error Handling & Fallbacks

### 1. **Claude Selection Fails**
- **File**: `candidate-scorer.ts::buildFallbackCandidates()`
- Simple diversity selection: take candidates round-robin from each source

### 2. **No Candidates Found**
- **Setup**: Send error SMS explaining issue (API limits, no sources, etc.)
- **Daily**: Skip that day, try again next day

### 3. **Web Search Fails** (Python Agent)
- **File**: `source-discovery-agent.ts::runChannelDiscoveryAgent()`
- Catches stderr, returns error status
- Falls back to old non-agentic version (if needed)

### 4. **Missing Data** (Collectors)
- Each collector has `.catch()` that logs error and returns empty array
- Allows other collectors to succeed even if one fails

---

## Integration with SMS Bot

### 1. **Command Registration**
- **File**: `commands/index.ts`
- `recruit.ts` is auto-imported and registered
- Handles RECRUIT and SCORE prefixes

### 2. **Thread System**
- **File**: `lib/context-loader.ts`
- Stores active conversation state in `sms_conversation_threads`
- Allows multi-turn conversations (Phase 1 exploration, Phase 2 approval)
- Cleared after setup complete

### 3. **Agent Subscriptions**
- **File**: `lib/agent-subscriptions.ts`
- Creates subscription record when project starts
- Stores all project data in nested `preferences.projects[projectId]`
- Multiple projects per user supported

### 4. **Scheduler Integration**
- **File**: `lib/scheduler/index.ts`
- Registers daily job via `registerRecruitingDailyJob()`
- Runs at 9 AM PT daily
- Processes all active recruiting projects

---

## Key Design Patterns

### 1. **Conversational Setup with Phases**
- Phase 1: Understand requirements (explore)
- Phase 2: Find sources (discover channels with web search)
- Phase 3: Collect candidates (mine channels)
- Explicit approval gates ("APPROVE", "YES")

### 2. **Autonomous Python Agent**
- Uses Claude Agent SDK for web search capabilities
- Returns structured JSON output
- Validates all examples are REAL (not made-up URLs)

### 3. **Multi-Source Collection**
- Parallel collection from GitHub, Twitter, RSS, YouTube
- Standardized candidate format from all sources
- AI-powered scoring and selection

### 4. **Continuous Learning**
- Stores ALL user interactions (Q&A, refinements, scores)
- AI analyzes patterns to extract preferences
- Uses learned profile to improve future selections

### 5. **Report Generation with Short Links**
- Full candidate reports stored in Supabase
- Short links for easy SMS sharing
- Keeps SMS under length limits

### 6. **Duration-Based Subscriptions**
- Default 7-day projects
- Automatic pause after duration
- User can extend with "RECRUIT CONTINUE"

---

## Files Overview

```
sms-bot/agents/recruiting/
├── index.ts                          # Main entry point, setup & daily flows
├── talent-radar-scheduler.ts         # Daily job registration
├── source-discovery-agent.ts         # Phase 1 & 2: Exploration and channel discovery
├── discover-channels-agent.py        # Python agent for web-based channel discovery
├── candidate-scorer.ts               # AI-powered candidate selection
├── report-generator.ts               # Markdown report generation
├── apify-client.ts                   # Legacy LinkedIn scraping (unused in new flow)
├── proxycurl-client.ts               # LinkedIn enrichment (optional)
├── collectors/
│   ├── github-collector.ts           # Collect from GitHub repos/users
│   ├── twitter-collector.ts          # Collect from Twitter searches
│   ├── rss-collector.ts              # Collect from RSS feeds
│   └── youtube-collector.ts          # Collect from YouTube channels
└── DIAGNOSTIC-RESULTS.md             # Debugging notes

sms-bot/commands/
└── recruit.ts                        # Command handler for RECRUIT/SCORE

sms-bot/lib/
├── agent-subscriptions.ts            # Agent subscription management
├── context-loader.ts                 # Thread/conversation state
├── scheduler/index.ts                # Daily job scheduler
└── utils/
    ├── sms-length.ts                 # SMS length counting
    ├── shortlink-service.ts          # URL shortening
    └── report-viewer-link.ts         # Report viewer URL builder
```

---

## Example User Journey

### Day 0: Setup
```
User: RECRUIT motion designer students at School of Visual Arts

Bot: For motion designers at SVA, I'd look at Behance student work, Vimeo schools showcase.
     Two quick questions: (1) Focus on current students or recent grads too?
     (2) Particular motion specialties (3D, 2D, typography)?

User: Current students only, focus on 3D motion graphics

Bot: Based on our chat: Motion designer students currently enrolled at School of Visual Arts
     or similar art schools, specializing in 3D motion graphics with Cinema 4D/Blender,
     portfolio showing character animation or product visualization work.
     Reply APPROVE to find channels, or tell me what to adjust.

User: APPROVE

Bot: [Python agent searches web for real examples]
     Found 3 channels where motion designers showcase work:

     1. Behance Student Gallery - SVA (behance.net/galleries/school/106)
        Example: Jane Doe (link) - 3D product animations

     2. Vimeo Schools - Motion Design (vimeo.com/groups/motiondesign)
        Example: John Smith (link) - Character animation reel

     3. Instagram #sva3dmotion
        Example: @motionbyalex (link) - Weekly 3D loops

     Reply: YES (approve all), 1:yes 2:no (select specific), or provide feedback

User: 1:yes 3:yes

Bot: [Collects candidates from Behance & Instagram]
     🎯 Talent Radar: Found 10 candidates!

     Top Match:
     Sarah Johnson
     Motion Designer @ Freelance
     3D specialist with strong Cinema 4D work, recent SVA grad showing product viz...

     View all 10: [shortlink]

     Score: SCORE 1:5 2:3 ...
```

### Day 1-7: Daily Candidates
```
Bot: [9 AM PT]
     🎯 Talent Radar: Found 3 new candidates!

     Top Match:
     Alex Chen
     Motion Design Student @ SVA
     Specializes in 3D character animation, active on Instagram with weekly posts...

     View all 3: [shortlink]

     Score: SCORE 1:5 2:3 ...

User: SCORE 1:5 2:4 3:2

Bot: [Learns from scores, updates preferences]
     ✅ Scores saved! Daily search will adapt to your preferences.
```

### Day 7: Continuation Prompt
```
Bot: 📅 This is your final daily report for this search.

     Want to keep receiving candidates? Reply:

     RECRUIT CONTINUE

     ...to get another week of daily matches.
```

---

## Technical Notes

### 1. **Python Agent Setup**
Requires:
- Python 3.10+
- `claude-agent-sdk` installed
- `ANTHROPIC_API_KEY` environment variable
- Claude Code CLI with `CLAUDE_CODE_OAUTH_TOKEN`

Located: `sms-bot/agents/recruiting/discover-channels-agent.py`

### 2. **WebSearch Access**
- Python agent uses WebSearch tool from Agent SDK
- Only available in US
- Searches for real candidate profiles to populate examples

### 3. **SMS Length Calculation**
- Uses UCS-2 encoding (not UTF-8)
- Emojis count as 2+ code units
- Max 670 code units = 10 SMS segments
- See: `sms-bot/lib/utils/sms-length.ts`

### 4. **Database Schema**
- **`agent_subscriptions`**: Nested JSON structure for multi-project support
- **`recruiting_candidates`**: Flat candidate records with scores
- **`sms_conversation_threads`**: Active conversation state for setup flow

### 5. **Legacy Code**
- `apify-client.ts`: Old LinkedIn scraping approach (not used in new flow)
- `proxycurl-client.ts`: LinkedIn enrichment (optional enhancement)
- Old source format: `youtube[]`, `twitter[]`, etc. (legacy compatibility maintained)

---

## Future Enhancements (Documented in Code)

1. **Automatic Channel Replacement**
   - Track `avgCandidateScore` per channel
   - Replace low-performing channels automatically

2. **More Sophisticated Deduplication**
   - Check URLs/handles, not just names
   - Cross-reference LinkedIn/GitHub/Twitter profiles

3. **User Notes on Candidates**
   - `RECRUIT NOTE {candidate#} {text}` command
   - Store in `project.candidateFeedback.candidateNotes`

4. **Feedback-Driven Spec Updates**
   - User provides feedback anytime
   - AI updates refined spec automatically
   - Next search uses updated spec

5. **Multi-Project Management**
   - Better UI for switching projects
   - Consolidated daily reports for multiple projects

---

## Debugging

### Diagnostic Results
**File**: `DIAGNOSTIC-RESULTS.md`

Documents previous debugging:
- Claude selection returning 0 candidates
- Data format mismatch issues
- LinkedIn cookie expiration
- Enhanced logging locations

### Key Logging Points:
```typescript
// Source discovery
console.log('[Channel Discovery] Phase 1 - Round 1 for: "{query}"');
console.log('[Channel Discovery Agent] Running: {command}');

// Candidate collection
console.log('[Recruiting] Collected {total} total candidates from {sources} sources');

// Candidate scoring
console.log('[Candidate Scorer] Scoring candidates from all sources...');
console.log('[Candidate Scorer] Successfully parsed {count} candidates');

// Daily job
console.log('[Recruiting] Running Talent Radar daily job');
console.log('[Recruiting] Processing {count} recruiting subscriptions');
```

---

## Summary

The recruiting agent is a sophisticated, multi-phase talent sourcing system that:

1. **Learns conversationally** through exploration Q&A
2. **Discovers real sources** using autonomous web search
3. **Collects candidates** from multiple platforms in parallel
4. **Scores with AI** to match user preferences
5. **Learns continuously** from user scores and feedback
6. **Sends daily updates** with new matches
7. **Stays under SMS limits** with shortlinks and summaries
8. **Tracks performance** to improve channel selection over time

The system is designed for SMS constraints while providing a rich, intelligent recruiting experience that improves with use.

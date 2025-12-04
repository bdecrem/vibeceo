# Recruiting Agent Data Flow & Testing Guide

## Data Storage in Supabase

### Phase 1: Exploration & Refinement

**Table:** `agent_subscriptions`
- **Filter:** `agent_slug = 'recruiting'`
- **Location:** `preferences.projects[projectId]`

**Key Fields:**
```json
{
  "projects": {
    "project-uuid": {
      "query": "original user query",
      "explorationHistory": [
        {"role": "user", "content": "...", "timestamp": "..."},
        {"role": "assistant", "content": "...", "timestamp": "..."}
      ],
      "refinedSpec": {
        "specText": "detailed spec after approval",
        "createdAt": "...",
        "lastUpdatedAt": "..."
      },
      "userRefinements": [
        {
          "feedback": "user feedback text",
          "timestamp": "...",
          "context": "exploration|channel_approval|candidate_feedback|general",
          "appliedToSpecAt": "..."
        }
      ]
    }
  }
}
```

**Supabase Query:**
```sql
SELECT 
  subscriber_id,
  preferences->'projects' as projects
FROM agent_subscriptions
WHERE agent_slug = 'recruiting';
```

### Phase 2: Channel Discovery & Approval

**Table:** `agent_subscriptions` (same table)
- **Location:** `preferences.projects[projectId].channels[]`

**Key Fields:**
```json
{
  "channels": [
    {
      "name": "GitHub Go developers",
      "channelType": "platform",
      "description": "...",
      "example": {
        "name": "Real Person Name",
        "url": "https://github.com/username",
        "description": "..."
      },
      "score": 9,
      "reason": "...",
      "addedAt": "2024-01-01T00:00:00Z",
      "candidatesFound": 0,
      "candidatesScored": 0,
      "avgCandidateScore": null,
      "userApproved": true,
      "userRejected": false
    }
  ],
  "approvedChannels": [...],  // Filtered list of approved channels
  "channelsApproved": true
}
```

**Supabase Query:**
```sql
SELECT 
  subscriber_id,
  preferences->'projects'->'project-uuid'->'channels' as channels,
  preferences->'projects'->'project-uuid'->'approvedChannels' as approved_channels
FROM agent_subscriptions
WHERE agent_slug = 'recruiting';
```

### Phase 3: Initial Candidate Collection

**Current Implementation:**
- After channel approval, candidates are collected **immediately** via `runCandidateCollectionAgent()`
- Candidates are stored in `project.candidates[]` and `project.pendingCandidates[]`
- Initial candidates are sent via SMS immediately (first candidate + shortlink)
- `setupComplete = true` and `active = true` are set to activate daily scheduler
- `startedAt` timestamp is set to track when daily collection begins

**Flow:**
1. User approves channels → `handleRecruitConfirmation()` in `commands/recruit.ts:1272`
2. Python agent collects candidates → `runCandidateCollectionAgent()` (line 1280)
3. Candidates stored in project preferences (lines 1289-1290)
4. SMS sent immediately with first candidate (lines 1327-1338)
5. Project activated for daily scheduler (lines 1291-1293)

**Table:** `agent_subscriptions` (same table)
- **Location:** `preferences.projects[projectId]`

**Key Fields:**
```json
{
  "candidates": [...],  // All collected candidates
  "pendingCandidates": [...],  // Candidates awaiting scoring
  "setupComplete": true,
  "startedAt": "2024-01-01T00:00:00Z",  // When daily collection starts
  "active": true,
  "lastCandidateSentAt": "2024-01-01T00:00:00Z",  // Last time candidates were sent
  "lastReportUrl": "https://...",
  "lastReportShortLink": "https://..."
}
```

**Also stored in:** `recruiting_candidates` table (legacy, may not be used in new flow)
- Individual candidate records with scores
- Links to project via `project_id` (UUID)

**Supabase Query:**
```sql
-- Project state
SELECT 
  subscriber_id,
  preferences->'projects'->'project-uuid'->'setupComplete' as setup_complete,
  preferences->'projects'->'project-uuid'->'startedAt' as started_at,
  preferences->'projects'->'project-uuid'->'active' as active,
  preferences->'projects'->'project-uuid'->'lastCandidateSentAt' as last_sent
FROM agent_subscriptions
WHERE agent_slug = 'recruiting';

-- Candidates (if using database table)
SELECT * FROM recruiting_candidates
WHERE project_id = 'project-uuid'
ORDER BY created_at DESC;
```

### Phase 4: Daily Candidate Collection (Scheduler)

**Scheduler System:** `lib/sms/recruiting-scheduler.ts`

#### How the Scheduler Works

**1. Registration & Timing:**
- Registered in `lib/sms/bot.ts:62` when SMS bot starts
- Uses `lib/scheduler/index.ts` which checks every minute
- Runs at **11:00 AM PT** (configurable via `RECRUITING_SEND_HOUR` env var)
- Timezone-aware: Uses Pacific Time for date calculations

**2. Daily Job Execution Flow:**

When the scheduler runs (at 11am PT), it executes `runRecruitingBroadcast()`:

```
For each active subscriber:
  ├─ Load recruiting preferences
  ├─ For each project in preferences.projects:
  │   ├─ Check: setupComplete === true? (skip if false)
  │   ├─ Check: approvedChannels exists? (skip if empty)
  │   ├─ Check: lastCandidateSentAt is today? (skip if already sent)
  │   ├─ Check: Days remaining > 0? (skip if expired)
  │   │
  │   └─ If all checks pass:
  │       ├─ Collect NEW candidates from approvedChannels
  │       │   └─ Calls collectNewCandidatesForProject()
  │       │       └─ Spawns Python agent: collect-candidates-agent.py
  │       │           └─ Returns 3-5 new candidates
  │       │
  │       ├─ Merge with existing candidates
  │       │   └─ existingCandidates + newCandidates → allCandidates
  │       │
  │       ├─ Generate daily report
  │       │   └─ Creates HTML report, stores in Supabase Storage
  │       │   └─ Generates shortlink
  │       │
  │       ├─ Format SMS message
  │       │   └─ Top candidate + shortlink (stays under 670 code units)
  │       │
  │       ├─ Send SMS via Twilio
  │       │
  │       └─ Update project state
  │           ├─ candidates = allCandidates (accumulated)
  │           ├─ pendingCandidates = newCandidates (for scoring)
  │           └─ lastCandidateSentAt = now (prevents duplicate sends)
```

**3. Key Scheduler Checks:**

**Check 1: Setup Complete**
```typescript
if (!typedProject.setupComplete || !typedProject.approvedChannels || typedProject.approvedChannels.length === 0) {
  continue; // Skip this project
}
```

**Check 2: Already Sent Today**
```typescript
if (hasReceivedToday(typedProject.lastCandidateSentAt, todayKey)) {
  continue; // Skip - already sent today
}
```
- Uses Pacific Time date comparison
- Prevents duplicate sends if scheduler runs multiple times

**Check 3: Days Remaining**
```typescript
const daysElapsed = Math.floor((now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
const daysRemaining = (typedProject.durationDays || 7) - daysElapsed;

if (daysRemaining <= 0) {
  continue; // Skip - project expired
}
```
- Calculates from `startedAt` timestamp
- Default duration: 7 days

**4. Candidate Collection:**

The scheduler collects **NEW** candidates each day:
- Uses same Python agent as initial collection: `collect-candidates-agent.py`
- Inputs: `refinedSpec` + `approvedChannels[]`
- Output: 3-5 fresh candidates matching the spec
- These are **added** to existing candidates (not replaced)

**5. Report Generation:**

Each daily batch gets its own report:
- Report type: `'daily'` (vs `'setup'` for initial)
- Date: Today's date (Pacific Time)
- Stored in Supabase Storage
- Shortlink generated for SMS

**6. SMS Format:**

Sends only top candidate to stay under SMS limits:
- Top candidate name, location, bio (truncated)
- Shortlink to full report with all candidates
- Scoring instructions

**7. State Updates:**

After sending:
- `candidates[]` - All candidates (accumulated over time)
- `pendingCandidates[]` - New candidates from today (awaiting scoring)
- `lastCandidateSentAt` - Timestamp to prevent duplicates
- `lastReportUrl` / `lastReportShortLink` - Latest report links

**Important Notes:**
- Scheduler does NOT handle initial candidates - those are sent immediately in Phase 3
- Scheduler only handles daily collection after setup is complete
- Each day collects fresh candidates (doesn't re-send old ones)
- Candidates accumulate in `project.candidates[]` over time

#### Scheduler Infrastructure (`lib/scheduler/index.ts`)

The scheduler uses a polling-based system:

**1. Job Registration:**
```typescript
registerDailyJob({
  name: 'recruiting-daily-candidates',
  hour: 11,  // 11am
  minute: 0,
  timezone: 'America/Los_Angeles',
  run: () => runRecruitingBroadcast(twilioClient)
});
```

**2. Polling Loop:**
- Checks every **60 seconds** (1 minute)
- Compares current time (Pacific Timezone) with job's scheduled time
- Only runs once per day (tracks `lastRunDateKey`)

**3. Time Matching:**
```typescript
if (
  zonedNow.getHours() === job.hour &&      // 11
  zonedNow.getMinutes() === job.minute &&  // 0
  job.lastRunDateKey !== dateKey           // Not run today yet
) {
  // Execute job
}
```

**4. Non-Blocking Execution:**
- Jobs run asynchronously (don't block other jobs)
- Errors are caught and logged via `onError` callback
- Multiple jobs can run simultaneously

**5. Date Key Tracking:**
- Uses `'en-CA'` date format: `YYYY-MM-DD`
- Prevents duplicate runs on the same day
- Resets automatically at midnight PT

**Table:** `agent_subscriptions` (same table)
- **Location:** `preferences.projects[projectId]`

**Key Fields:**
```json
{
  "candidates": [...],  // All candidates (accumulated)
  "pendingCandidates": [...],  // New candidates from today
  "lastCandidateSentAt": "2024-01-02T00:00:00Z",
  "lastReportUrl": "https://...",
  "lastReportShortLink": "https://...",
  "durationDays": 7,  // How many days to run
  "startedAt": "2024-01-01T00:00:00Z"  // For calculating days remaining
}
```

**Supabase Query:**
```sql
-- Check active projects ready for daily collection
SELECT 
  subscriber_id,
  jsonb_object_keys(preferences->'projects') as project_id,
  preferences->'projects'->jsonb_object_keys(preferences->'projects')->>'setupComplete' as setup_complete,
  preferences->'projects'->jsonb_object_keys(preferences->'projects')->>'active' as active,
  preferences->'projects'->jsonb_object_keys(preferences->'projects')->>'lastCandidateSentAt' as last_sent,
  preferences->'projects'->jsonb_object_keys(preferences->'projects')->>'startedAt' as started_at
FROM agent_subscriptions
WHERE agent_slug = 'recruiting'
  AND preferences->'projects' IS NOT NULL;
```

### Phase 5: Scoring & Learning

**Table:** `agent_subscriptions` (same table)
- **Location:** `preferences.projects[projectId]`

**Key Fields:**
```json
{
  "candidateFeedback": {
    "scorePatterns": {
      "highScoreReasons": ["..."],
      "lowScoreReasons": ["..."]
    },
    "candidateNotes": [
      {
        "candidateId": "...",
        "candidateName": "...",
        "note": "...",
        "timestamp": "..."
      }
    ]
  },
  "learnedProfile": {
    "preferred_seniority": ["senior", "lead"],
    "preferred_company_sizes": ["startup", "midsize"],
    "preferred_skills": ["React", "TypeScript"],
    "preferred_backgrounds": ["..."],
    "avoid": ["..."]
  }
}
```

**Also stored in:** `recruiting_candidates` table
- `user_score` (1-5)
- `scored_at` timestamp

**Supabase Query:**
```sql
-- Learned profile
SELECT 
  subscriber_id,
  preferences->'projects'->'project-uuid'->'learnedProfile' as learned_profile
FROM agent_subscriptions
WHERE agent_slug = 'recruiting';

-- Scored candidates
SELECT 
  name,
  user_score,
  scored_at,
  match_reason
FROM recruiting_candidates
WHERE project_id = 'project-uuid'
  AND user_score IS NOT NULL
ORDER BY scored_at DESC;
```

## Current Flow Issues

### Issue 1: No 1-Day Wait
**Current:** Candidates are collected immediately after channel approval (in `handleRecruitConfirmation()`)
**Expected:** User should wait 1 day before first candidates

**Location:** `commands/recruit.ts:1272-1296`
- After channel approval, `runCandidateCollectionAgent()` is called immediately
- `setupComplete = true` and `active = true` are set immediately
- Daily scheduler will send candidates the next day at 11am PT

**Fix Needed:** Don't set `setupComplete = true` immediately. Set it after 1 day delay, or modify scheduler to check `startedAt` date.

### Issue 2: Hard to Test Daily Collection
**Problem:** Must wait until 11am PT or manually trigger scheduler

**Solution:** Create test script (see below)

## Testing Workflow Improvements

### Test Scripts Created

#### 1. Manual Daily Collection Trigger

**File:** `scripts/test-recruiting-daily.ts`

**Usage:**
```bash
# Test all active projects
npx tsx scripts/test-recruiting-daily.ts

# Test specific subscriber
npx tsx scripts/test-recruiting-daily.ts +1234567890
```

**What it does:**
- Manually triggers the daily candidate collection
- Bypasses the scheduled time (11am PT)
- Shows full logs of the collection process
- Useful for testing steps 3-4 without waiting

#### 2. Reset Project State

**File:** `scripts/reset-recruiting-project.ts`

**Usage:**
```bash
# Reset all projects for a subscriber
npx tsx scripts/reset-recruiting-project.ts +1234567890

# Reset specific project
npx tsx scripts/reset-recruiting-project.ts +1234567890 project-uuid-here
```

**What it does:**
- Clears `lastCandidateSentAt` so you can test daily collection multiple times
- Shows project details before resetting
- Essential for iterative testing

**Testing Workflow:**
```bash
# 1. Reset project state
npx tsx scripts/reset-recruiting-project.ts +1234567890

# 2. Trigger daily collection
npx tsx scripts/test-recruiting-daily.ts +1234567890

# 3. Check SMS and Supabase
# 4. Score candidates: SCORE 1:5 2:3 ...

# 5. Repeat steps 1-4 to test learning
```

### Quick Database Queries

**View all recruiting projects:**
```sql
SELECT 
  s.phone_number,
  s.id as subscriber_id,
  jsonb_object_keys(asub.preferences->'projects') as project_id,
  asub.preferences->'projects'->jsonb_object_keys(asub.preferences->'projects')->>'query' as query,
  asub.preferences->'projects'->jsonb_object_keys(asub.preferences->'projects')->>'setupComplete' as setup_complete,
  asub.preferences->'projects'->jsonb_object_keys(asub.preferences->'projects')->>'active' as active
FROM agent_subscriptions asub
JOIN sms_subscribers s ON s.id = asub.subscriber_id
WHERE asub.agent_slug = 'recruiting';
```

**View project details:**
```sql
SELECT 
  preferences->'projects'->'YOUR-PROJECT-ID' as project
FROM agent_subscriptions
WHERE agent_slug = 'recruiting'
  AND subscriber_id = 'YOUR-SUBSCRIBER-ID';
```

**Reset project for testing:**
```sql
-- Clear lastCandidateSentAt to allow immediate re-send
UPDATE agent_subscriptions
SET preferences = jsonb_set(
  preferences,
  '{projects,YOUR-PROJECT-ID,lastCandidateSentAt}',
  'null'::jsonb
)
WHERE agent_slug = 'recruiting'
  AND subscriber_id = 'YOUR-SUBSCRIBER-ID';
```

## Thread State (Multi-turn Conversations)

**Table:** `thread_states`
- Tracks active conversations during exploration/channel approval

**Key Fields:**
- `handler`: `'recruit-exploration'` or `'recruit-source-approval'`
- `fullContext`: Contains projectId, query, channels, conversationHistory

**Query:**
```sql
SELECT * FROM thread_states
WHERE handler LIKE 'recruit%'
ORDER BY started_at DESC;
```


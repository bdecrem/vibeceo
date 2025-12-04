# Recruiting Agent - Quick Reference

## Where Data is Stored in Supabase

### Phase 1: Exploration & Role Refinement
**Table:** `agent_subscriptions`
- **Filter:** `WHERE agent_slug = 'recruiting'`
- **Path:** `preferences.projects[projectId]`
- **Fields:**
  - `query` - Original user query
  - `explorationHistory[]` - Full Q&A conversation
  - `refinedSpec` - Final approved spec

**Query:**
```sql
SELECT 
  subscriber_id,
  preferences->'projects' as projects
FROM agent_subscriptions
WHERE agent_slug = 'recruiting';
```

### Phase 2: Channel Approval
**Table:** `agent_subscriptions` (same table)
- **Path:** `preferences.projects[projectId].channels[]`
- **Fields:**
  - `channels[]` - All discovered channels with examples
  - `approvedChannels[]` - User-approved channels
  - `channelsApproved: true` - Approval flag

**Query:**
```sql
SELECT 
  preferences->'projects'->'project-id'->'channels' as channels,
  preferences->'projects'->'project-id'->'approvedChannels' as approved
FROM agent_subscriptions
WHERE agent_slug = 'recruiting';
```

### Phase 3: Initial Candidates
**Current:** Candidates collected and sent **immediately** after approval
- Initial batch sent right away via SMS
- Project activated for daily scheduler

**Table:** `agent_subscriptions` (same table)
- **Path:** `preferences.projects[projectId]`
- **Fields:**
  - `candidates[]` - All collected candidates
  - `pendingCandidates[]` - Awaiting scoring
  - `setupComplete: true` - Set immediately (should be delayed)
  - `startedAt` - When daily collection starts
  - `active: true` - Project is active

**Issue:** `commands/recruit.ts:1272-1296` collects candidates immediately

### Phase 4: Daily Candidate Collection (Scheduler)
**Scheduler:** Runs daily at **11:00 AM PT**
**File:** `lib/sms/recruiting-scheduler.ts`
**Infrastructure:** `lib/scheduler/index.ts` (polling every 60 seconds)

**How It Works:**
1. Scheduler checks every minute if it's 11:00 AM PT
2. For each active project:
   - Checks: `setupComplete === true`, has `approvedChannels`, not sent today, days remaining > 0
   - Collects NEW candidates from channels (Python agent)
   - Generates daily report with shortlink
   - Sends SMS with top candidate + shortlink
   - Updates `lastCandidateSentAt` to prevent duplicates
3. Candidates accumulate in `project.candidates[]` over time

**Table:** `agent_subscriptions` (same table)
- **Path:** `preferences.projects[projectId]`
- **Fields:**
  - `lastCandidateSentAt` - Prevents duplicate sends
  - `durationDays: 7` - How many days to run
  - `startedAt` - Used to calculate days remaining

**How it works:**
1. Checks all active projects (`active = true` and `setupComplete = true`)
2. Skips if `lastCandidateSentAt` is today
3. Calculates days remaining from `startedAt`
4. Collects 3 new candidates from `approvedChannels`
5. Sends SMS with top candidate + shortlink
6. Updates `lastCandidateSentAt` to prevent duplicates

### Phase 5: Scoring & Learning
**Table:** `agent_subscriptions` (same table)
- **Path:** `preferences.projects[projectId]`
- **Fields:**
  - `learnedProfile` - AI-extracted preferences
  - `candidateFeedback.scorePatterns` - High/low score reasons

**Also:** `recruiting_candidates` table
- `user_score` (1-5)
- `scored_at` timestamp

## Testing Workflow

### Quick Test Commands

```bash
# 1. Reset project to allow re-testing
# npx tsx scripts/reset-recruiting-project.ts +1234567890

# 2. Manually trigger daily collection (bypasses 11am PT)
npx tsx scripts/test-recruiting-daily.ts +15555551234

# 3. Check Supabase
# Run SQL queries from documentation

# 4. Score candidates via SMS
# SCORE 1:5 2:3 3:4 ...

# 5. Repeat to test learning
```

### View Project State in Supabase

```sql
-- All projects
SELECT 
  s.phone_number,
  jsonb_object_keys(asub.preferences->'projects') as project_id,
  asub.preferences->'projects'->jsonb_object_keys(asub.preferences->'projects')->>'query' as query,
  asub.preferences->'projects'->jsonb_object_keys(asub.preferences->'projects')->>'setupComplete' as setup_complete,
  asub.preferences->'projects'->jsonb_object_keys(asub.preferences->'projects')->>'active' as active,
  asub.preferences->'projects'->jsonb_object_keys(asub.preferences->'projects')->>'lastCandidateSentAt' as last_sent
FROM agent_subscriptions asub
JOIN sms_subscribers s ON s.id = asub.subscriber_id
WHERE asub.agent_slug = 'recruiting';

-- Specific project details
SELECT 
  preferences->'projects'->'YOUR-PROJECT-ID' as project
FROM agent_subscriptions
WHERE agent_slug = 'recruiting'
  AND subscriber_id = 'YOUR-SUBSCRIBER-ID';
```

## Scheduler Details

**Registration:** `lib/sms/bot.ts:62` - Registered when SMS bot starts
**Timing:** Checks every 60 seconds, runs at 11:00 AM PT
**Prevents Duplicates:** Uses `lastCandidateSentAt` date comparison (Pacific Time)
**Non-Blocking:** Jobs run asynchronously, errors logged via callback

2. **Hard to Test:** Must wait for 11am PT or manually trigger
   - **Solution:** Use `scripts/test-recruiting-daily.ts`

## File Locations

- **Command Handler:** `commands/recruit.ts`
- **Daily Scheduler:** `lib/sms/recruiting-scheduler.ts`
- **Agent Logic:** `agents/recruiting/index.ts`
- **Channel Discovery:** `agents/recruiting/discover-channels-agent.py`
- **Candidate Collection:** `agents/recruiting/collect-candidates-agent.py`
<!-- - **Test Scripts:** `scripts/test-recruiting-daily.ts`, `scripts/reset-recruiting-project.ts` -->


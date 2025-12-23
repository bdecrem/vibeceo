# Progressive Search Agent System

## Overview

A modular, category-agnostic search system that refines queries through conversation, discovers relevant channels, and executes searches with continuous learning from user feedback.

**Use Cases:**
- Lead generation (finding customers)
- Candidate search (finding hires)
- Job search (finding jobs to apply to)
- Pet adoption (finding dogs/cats)
- Any "search for X" workflow

**Key Design Principles:**
- **Modular**: 3 independent steps with clear boundaries
- **Category-agnostic**: Same pipeline + different system prompts = different search types
- **Database-backed**: All state persisted for resumable workflows
- **CLI-driven**: Python scripts callable by humans or AI agents
- **Structured responses**: Agents emit commands that get parsed and executed
- **Context-aware**: Always loads full conversation history before responding

---

## Architecture

```
Step 1: Clarify Subject
   ↓
   Database: ps_clarified_subjects
   ↓
Step 2: Discover Channels
   ↓
   Database: ps_discovery_channels
   ↓
Step 3: Execute Search
   ↓
   Database: ps_search_results, favorites
```

Each step is an independent Python script that:
1. Loads project state from database
2. Loads conversation history for that step
3. Sends context + user message to AI agent
4. Parses agent response for commands
5. Executes commands (save to DB, update ratings, etc.)
6. Updates conversation history
7. Returns agent response to user

---

## Database Schema

### Table: `progressive_search_projects`

Core project record.

```sql
CREATE TABLE progressive_search_projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Category & Status
  category VARCHAR(50) NOT NULL,  -- 'leadgen', 'recruiting', 'job_search', 'pet_adoption', etc.
  status VARCHAR(20) DEFAULT 'clarifying',  -- 'clarifying', 'discovering', 'searching', 'completed'

  -- Search Subject
  initial_subject TEXT NOT NULL,  -- What user first asked for
  clarified_subject TEXT,  -- Refined subject after Step 1
  clarified_at TIMESTAMPTZ,

  -- Completion
  is_complete BOOLEAN DEFAULT false,
  winner_result_id UUID,  -- Reference to ps_search_results.id
  completed_at TIMESTAMPTZ,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by VARCHAR(100),  -- User ID or 'system'

  CONSTRAINT valid_status CHECK (status IN ('clarifying', 'discovering', 'searching', 'completed'))
);

CREATE INDEX idx_progressive_projects_status ON progressive_search_projects(status);
CREATE INDEX idx_progressive_projects_category ON progressive_search_projects(category);
```

### Table: `ps_conversation`

Conversation history for each step. Each message is stored as a separate row, allowing flexible querying and per-message metadata.

```sql
CREATE TABLE ps_conversation (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES ps_projects(id) ON DELETE CASCADE,

  -- Step tracking
  step INTEGER NOT NULL,  -- 1 (clarify), 2 (discover), 3 (search)

  -- Message
  role VARCHAR(20) NOT NULL,  -- 'user', 'assistant'
  content TEXT NOT NULL,      -- Cleaned text for context (commands removed)
  raw_response TEXT,          -- Full unprocessed agent output (for debugging, not in context)

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT valid_step CHECK (step IN (1, 2, 3)),
  CONSTRAINT valid_role CHECK (role IN ('user', 'assistant'))
);

CREATE INDEX idx_ps_conversation_project ON ps_conversation(project_id, step, created_at);
```

### Table: `ps_channels`

Discovered channels (websites/sources) with ratings.

```sql
CREATE TABLE ps_channels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES ps_projects(id) ON DELETE CASCADE,

  -- Channel info
  name VARCHAR(200) NOT NULL,  -- "LinkedIn Jobs", "Indeed", "GitHub", etc.
  url TEXT,  -- Base URL or search URL template
  description TEXT,
  channel_type VARCHAR(50),  -- 'job_board', 'professional_network', 'code_repo', etc.

  -- Rating (agent sets initially, user can update)
  rating INTEGER NOT NULL DEFAULT 5,  -- 1-10

  -- Status
  is_approved BOOLEAN DEFAULT false,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT valid_rating CHECK (rating >= 1 AND rating <= 10)
);

CREATE INDEX idx_ps_channels_project ON ps_channels(project_id);
CREATE INDEX idx_ps_channels_approved ON ps_channels(project_id, is_approved) WHERE is_approved = true;
```

### Table: `ps_results`

Search results (leads, candidates, jobs, listings). Agent is responsible for avoiding duplicates by checking previous results in conversation context.

```sql
CREATE TABLE ps_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES ps_projects(id) ON DELETE CASCADE,
  channel_id UUID REFERENCES ps_channels(id) ON DELETE SET NULL,

  -- Result data
  title VARCHAR(500) NOT NULL,  -- Person name, job title, company name, etc.
  subtitle VARCHAR(500),  -- Location, company, role, etc.
  description TEXT,  -- Bio, job description, details
  url TEXT NOT NULL,  -- Link to profile, listing, posting

  -- Additional fields (flexible JSON for category-specific data)
  metadata JSONB DEFAULT '{}',  -- Email, phone, salary, experience, etc.

  -- Dates (nullable - not all categories need these)
  deadline TIMESTAMPTZ,  -- For job postings, application deadlines, etc.
  last_updated TIMESTAMPTZ,  -- When listing was last updated on source site
  found_at TIMESTAMPTZ DEFAULT NOW(),  -- When agent found this

  -- User feedback
  user_rating INTEGER,  -- 1-10
  user_notes TEXT,
  is_favorite BOOLEAN DEFAULT false,
  is_contacted BOOLEAN DEFAULT false,
  is_winner BOOLEAN DEFAULT false,  -- Final selection

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT valid_user_rating CHECK (user_rating IS NULL OR (user_rating >= 1 AND user_rating <= 10))
);

CREATE INDEX idx_ps_results_project ON ps_results(project_id, created_at DESC);
CREATE INDEX idx_ps_results_favorites ON ps_results(project_id, is_favorite) WHERE is_favorite = true;
CREATE INDEX idx_ps_results_winner ON ps_results(project_id, is_winner) WHERE is_winner = true;
```

---

## Step 1: Clarify Subject

**Script:** `progressive-search/step1-clarify.py`

### Purpose
Refine the initial search subject through conversational clarification.

### Usage

**Create new project:**
```bash
python step1-clarify.py --new -m "Find senior backend engineers in SF"
```

**Continue existing project:**
```bash
python step1-clarify.py <uuid> -m "Actually, make it remote-friendly"
```

**Check current state (no message):**
```bash
python step1-clarify.py <uuid>
```

### Parameters

| Parameter | Required | Description |
|-----------|----------|-------------|
| `<uuid>` | Yes* | Project UUID (*unless `--new` is used) |
| `-n, --new` | No | Create new project (mutually exclusive with UUID) |
| `-m, --msg` | No | User message to send to agent |
| `-c, --category` | No | Category: `leadgen`, `recruiting`, `job_search`, etc. (default: `general`) |

### Input Validation

**Errors:**
- UUID + `--new` flag: `Error: Cannot specify both UUID and --new flag`
- No UUID and no `--new`: `Error: Must provide either project UUID or --new flag`
- Invalid UUID: `Error: Project not found: <uuid>`

### Agent Behavior

**First message (new project):**
- Ask 2-3 clarifying questions about:
  - Location/geography (if applicable)
  - Experience level/seniority (for people)
  - Budget/price range (for products/services)
  - Specific requirements (breed, tech stack, company size, etc.)

**Successive messages:**
- Refine understanding based on user responses
- After 2-3 exchanges, propose clarified subject
- Always show current clarified subject in response
- Prompt user to move to next step or continue refining

**When user affirms satisfaction:**
- Agent responds with structured command to save

### Structured Commands

Agent responses are parsed for embedded commands:

**SAVE_SUBJECT**
```json
{
  "command": "SAVE_SUBJECT",
  "clarified_subject": "Senior backend engineers (Python/Go) at seed-stage startups in SF Bay Area or remote, 5+ years experience, $150-200k salary"
}
```

**UPDATE_SUBJECT**
```json
{
  "command": "UPDATE_SUBJECT",
  "clarified_subject": "Updated text here"
}
```

### Outputs

**On first call with `--new`:**
```json
{
  "success": true,
  "project_id": "550e8400-e29b-41d4-a716-446655440000",
  "category": "recruiting",
  "status": "refining_query",
  "agent_response": "I'll help you find senior backend engineers! A few questions to refine the search:\n\n1. Location: Are you open to remote candidates, or specific to SF Bay Area?\n2. Experience: How many years of experience are you looking for?\n3. Tech stack: Any specific languages/frameworks required?\n\nLet me know and I'll refine the search!",
  "clarified_subject": null,
  "next_step": "Continue clarifying by running: python step1-clarify.py 550e8400-e29b-41d4-a716-446655440000 -m 'your response'"
}
```

**After clarification is complete:**
```json
{
  "success": true,
  "project_id": "550e8400-e29b-41d4-a716-446655440000",
  "status": "refining_query",
  "agent_response": "Perfect! Here's your refined search:\n\n**Clarified Subject:**\nSenior backend engineers (Python/Go) at seed-stage startups in SF Bay Area or remote, 5+ years experience, $150-200k salary\n\nThis looks good? Reply YES to save and move to channel discovery, or let me know any changes.",
  "clarified_subject": "Senior backend engineers (Python/Go) at seed-stage startups in SF Bay Area or remote, 5+ years experience, $150-200k salary",
  "is_confirmed": false,
  "next_step": "Reply with confirmation or changes"
}
```

**After user confirms (agent saves):**
```json
{
  "success": true,
  "project_id": "550e8400-e29b-41d4-a716-446655440000",
  "status": "discovering_channels",
  "agent_response": "✅ Saved! Your search is now ready.\n\nNext step: Discover channels by running:\npython step2-channels.py 550e8400-e29b-41d4-a716-446655440000",
  "clarified_subject": "Senior backend engineers (Python/Go) at seed-stage startups in SF Bay Area or remote, 5+ years experience, $150-200k salary",
  "is_confirmed": true,
  "next_step": "Run step 2: python step2-channels.py 550e8400-e29b-41d4-a716-446655440000"
}
```

### System Prompts

Two-layer prompt architecture: **base prompts** (shared across all categories) + **category-specific prompts** (fine-tuning):

```
progressive-search/prompts/
├── base_step1.txt          # Shared Step 1 instructions for ALL categories
├── base_step2.txt          # Shared Step 2 instructions for ALL categories
├── base_step3.txt          # Shared Step 3 instructions for ALL categories
├── step1/
│   ├── leadgen.txt         # Category-specific additions for leadgen
│   ├── recruiting.txt      # Category-specific additions for recruiting
│   ├── job_search.txt      # Category-specific additions for job search
│   ├── pet_adoption.txt    # Category-specific additions for pet adoption
│   └── general.txt         # Default fallback additions
├── step2/
│   └── [same categories]
└── step3/
    └── [same categories]
```

**Final prompt construction:**
```python
final_prompt = load_prompt('base_step1.txt') + "\n\n" + load_prompt(f'step1/{category}.txt')
```

This architecture allows shared instructions (command format, error handling, tone) in base files, while category-specific nuances (what questions to ask, what signals matter) live in category files.

---

## Step 2: Discover Channels

**Script:** `progressive-search/step2-channels.py`

### Purpose
Discover and rate relevant channels (websites/sources) to search.

### Usage

**Start channel discovery:**
```bash
python step2-channels.py <uuid>
```

**Respond to agent:**
```bash
python step2-channels.py <uuid> -m "Remove Indeed, add AngelList"
```

**Update channel ratings:**
```bash
python step2-channels.py <uuid> -m "Rate LinkedIn 9/10, GitHub 8/10"
```

### Parameters

| Parameter | Required | Description |
|-----------|----------|-------------|
| `<uuid>` | Yes | Project UUID |
| `-m, --msg` | No | User message to send to agent |

### Input Validation

**Errors:**
- No UUID: `Error: Project UUID required`
- Invalid UUID: `Error: Project not found: <uuid>`
- No clarified subject: `Error: Must complete Step 1 first (no clarified subject found)`

### Agent Behavior

**First call (no context):**
- Use Claude WebSearch to find 3-5 relevant channels
- Search query: "What are the best websites to search for [clarified_subject]?"
- Research and rate each channel 1-10 based on relevance
- Present list with rationale for each rating

**Successive calls:**
- Accept user feedback to add/remove/re-rate channels
- Always show current channel list with ratings
- Prompt user to confirm when satisfied

**When user confirms:**
- Agent responds with structured command to save

### Structured Commands

**SAVE_CHANNELS**
```json
{
  "command": "SAVE_CHANNELS",
  "channels": [
    {
      "name": "LinkedIn Jobs",
      "url": "https://linkedin.com/jobs",
      "description": "Professional network with strong startup presence in SF Bay Area",
      "channel_type": "professional_network",
      "rating": 9
    },
    {
      "name": "GitHub Jobs",
      "url": "https://github.com/jobs",
      "description": "Developer-focused job board, good for backend roles",
      "channel_type": "job_board",
      "rating": 8
    }
  ]
}
```

**UPDATE_CHANNELS**
```json
{
  "command": "UPDATE_CHANNELS",
  "updates": [
    {"name": "LinkedIn Jobs", "rating": 10},
    {"name": "GitHub Jobs", "rating": 3}
  ],
  "new_channels": [
    {
      "name": "AngelList",
      "url": "https://angel.co",
      "description": "Startup job board",
      "channel_type": "job_board",
      "rating": 7
    }
  ]
}
```

### Outputs

**Initial discovery:**
```json
{
  "success": true,
  "project_id": "550e8400-e29b-41d4-a716-446655440000",
  "status": "discovering_channels",
  "agent_response": "I found 4 great channels for finding senior backend engineers:\n\n1. **LinkedIn Jobs** (9/10)\n   Professional network with strong startup presence in SF Bay Area\n   \n2. **GitHub Jobs** (8/10)\n   Developer-focused job board, great for backend roles\n   \n3. **AngelList** (8/10)\n   Startup-specific job board\n   \n4. **YC Work at a Startup** (7/10)\n   Y Combinator's job board for their portfolio companies\n\nWould you like to add/remove any channels or adjust ratings?",
  "channels": [],
  "is_approved": false,
  "next_step": "Reply with changes or confirm to save"
}
```

**After approval:**
```json
{
  "success": true,
  "project_id": "550e8400-e29b-41d4-a716-446655440000",
  "status": "searching",
  "agent_response": "✅ Channels saved! Ready to search.\n\nNext step: Execute search by running:\npython step3-search.py 550e8400-e29b-41d4-a716-446655440000",
  "channels": [
    {
      "id": "...",
      "name": "LinkedIn Jobs",
      "rating": 9,
      "is_approved": true
    }
  ],
  "is_approved": true,
  "next_step": "Run step 3: python step3-search.py 550e8400-e29b-41d4-a716-446655440000"
}
```

### System Prompts

```
progressive-search/prompts/
├── step2/
│   ├── leadgen.txt
│   ├── recruiting.txt
│   ├── job_search.txt
│   └── general.txt
```

---

## Step 3: Execute Search

**Script:** `progressive-search/step3-search.py`

### Purpose
Search approved channels and return 5-10 results with continuous learning from user feedback.

### Usage

**Execute search:**
```bash
python step3-search.py <uuid>
```

**Rate results:**
```bash
python step3-search.py <uuid> -m "Rate #1: 9/10 (strong match), #2: 3/10 (not enough experience)"
```

**Request more results:**
```bash
python step3-search.py <uuid> -m "Show me 10 more"
```

**Add to favorites:**
```bash
python step3-search.py <uuid> -m "Add #1 and #3 to favorites"
```

**Mark winner:**
```bash
python step3-search.py <uuid> -m "Mark #1 as winner - we're hiring them!"
```

### Parameters

| Parameter | Required | Description |
|-----------|----------|-------------|
| `<uuid>` | Yes | Project UUID |
| `-m, --msg` | No | User message to send to agent |

### Input Validation

**Errors:**
- No UUID: `Error: Project UUID required`
- Invalid UUID: `Error: Project not found: <uuid>`
- No approved channels: `Error: Must complete Step 2 first (no approved channels found)`

### Agent Behavior

**First call:**
- Search approved channels (weighted by rating)
- Return 5 results by default (agent can return up to 10 if user explicitly asks)
- Include link, description, last updated date
- Check previous results in context to avoid duplicates

**Learning from feedback:**
- User rates results 1-10
- User adds notes (optional)
- Agent learns patterns:
  - What characteristics correlate with high ratings?
  - Which channels produce better results?
  - What keywords/filters improve matches?

**Successive searches:**
- Use learned preferences to refine
- Adjust channel weights based on result quality
- Agent checks previous results in context to avoid showing duplicates

### Structured Commands

**SAVE_RESULTS**
```json
{
  "command": "SAVE_RESULTS",
  "results": [
    {
      "title": "Senior Backend Engineer - Acme Corp",
      "subtitle": "San Francisco, CA - Remote OK",
      "description": "We're looking for a senior backend engineer with 5+ years Python/Go experience...",
      "url": "https://linkedin.com/jobs/view/123456",
      "channel_name": "LinkedIn Jobs",
      "metadata": {
        "company": "Acme Corp",
        "salary_range": "$160k-$200k",
        "experience": "5+ years",
        "tech_stack": ["Python", "Go", "PostgreSQL"]
      },
      "last_updated": "2025-12-18T10:00:00Z"
    }
  ]
}
```

**UPDATE_RESULTS**
```json
{
  "command": "UPDATE_RESULTS",
  "updates": [
    {
      "result_index": 1,
      "user_rating": 9,
      "user_notes": "Perfect match! Strong Python background and startup experience."
    },
    {
      "result_index": 2,
      "user_rating": 3,
      "user_notes": "Only 3 years experience, looking for more senior."
    }
  ]
}
```

**ADD_TO_FAVORITES**
```json
{
  "command": "ADD_TO_FAVORITES",
  "result_indices": [1, 3]
}
```

**MARK_WINNER**
```json
{
  "command": "MARK_WINNER",
  "result_index": 1
}
```

### Outputs

**Initial search:**
```json
{
  "success": true,
  "project_id": "550e8400-e29b-41d4-a716-446655440000",
  "status": "searching",
  "agent_response": "Found 5 candidates matching your search:\n\n1. **Senior Backend Engineer - Acme Corp**\n   San Francisco, CA - Remote OK\n   5+ years Python/Go, $160k-$200k\n   Posted 2 days ago\n   https://linkedin.com/jobs/view/123456\n\n2. **Backend Engineer - TechStart**\n   Remote (US)\n   7 years Python, $150k-$180k\n   Posted 1 week ago\n   https://github.com/jobs/456\n\n[3 more...]\n\nRate each candidate 1-10 and add notes if you'd like. I'll learn from your feedback!",
  "results": [
    {
      "id": "...",
      "title": "Senior Backend Engineer - Acme Corp",
      "url": "https://linkedin.com/jobs/view/123456",
      "user_rating": null,
      "is_favorite": false
    }
  ],
  "has_more": true,
  "next_step": "Rate results or request more"
}
```

**After ratings:**
```json
{
  "success": true,
  "project_id": "550e8400-e29b-41d4-a716-446655440000",
  "status": "searching",
  "agent_response": "✅ Saved your ratings!\n\nI noticed you prefer:\n- Candidates with 5+ years experience (not 3-4)\n- Startup experience is a plus\n- Python + Go combo is ideal\n\nI'll use this to improve future searches. Want to see more results?",
  "results": [
    {
      "id": "...",
      "title": "Senior Backend Engineer - Acme Corp",
      "user_rating": 9,
      "user_notes": "Perfect match! Strong Python background and startup experience.",
      "is_favorite": false
    }
  ],
  "learned_patterns": [
    "Prefer 5+ years experience",
    "Startup experience valued",
    "Python + Go combo ideal"
  ],
  "next_step": "Request more results or mark winner"
}
```

**After marking winner:**
```json
{
  "success": true,
  "project_id": "550e8400-e29b-41d4-a716-446655440000",
  "status": "completed",
  "agent_response": "🎉 Marked as winner! Project complete.\n\nYou can still search for more candidates by running:\npython step3-search.py 550e8400-e29b-41d4-a716-446655440000 -m 'find 5 more'",
  "winner": {
    "id": "...",
    "title": "Senior Backend Engineer - Acme Corp",
    "url": "https://linkedin.com/jobs/view/123456"
  },
  "is_complete": true
}
```

### System Prompts

```
progressive-search/prompts/
├── step3/
│   ├── leadgen.txt
│   ├── recruiting.txt
│   ├── job_search.txt
│   └── general.txt
```

---

## Command Parser

**File:** `progressive-search/lib/command_parser.py`

All agent responses are scanned for embedded JSON commands:

```python
def check_response_for_commands(response: str, project_id: str, step: int) -> dict:
    """
    Parse agent response for embedded commands.

    Returns:
        {
            "commands": [<list of parsed commands>],
            "clean_response": "<response with commands stripped>"
        }
    """
    # Look for JSON blocks in markdown code fences or inline
    # Execute each command found
    # Return cleaned response (without command JSON)
```

**Supported Commands:**

| Command | Step | Action |
|---------|------|--------|
| `SAVE_SUBJECT` | 1 | Save clarified subject to DB |
| `UPDATE_SUBJECT` | 1 | Update existing clarified subject |
| `SAVE_CHANNELS` | 2 | Save channel list to DB |
| `UPDATE_CHANNELS` | 2 | Update channel ratings/status |
| `SAVE_RESULTS` | 3 | Save search results to DB |
| `UPDATE_RESULTS` | 3 | Update result ratings/notes |
| `ADD_TO_FAVORITES` | 3 | Mark results as favorites |
| `MARK_WINNER` | 3 | Mark result as winner (complete project) |

---

## Implementation Plan

### Phase 1: Database Setup ✅ NEXT
1. ✅ Create migration file: `001_initial_schema.sql`
2. Run migration on Supabase (via browser admin SQL editor)
3. Test tables with sample data

### Phase 2: Shared Libraries
1. `lib/db.py` - Database client (Supabase via supabase-py)
2. `lib/command_parser.py` - Command parsing logic
3. `lib/context_builder.py` - Build context from DB
4. `lib/system_prompts.py` - Load base + category-specific prompts

### Phase 3: Step 1 - Clarify Subject
1. Create `step1-clarify.py` with `#!/usr/bin/env python3`
2. Implement argument parsing (-n/--new, -m/--msg, -c/--category)
3. Implement agent call with context
4. Implement command parsing (SAVE_SUBJECT, UPDATE_SUBJECT)
5. Create base_step1.txt + category-specific prompts
6. Test with sample queries

### Phase 4: Step 2 - Discover Channels
1. Create `step2-channels.py`
2. Implement Claude WebSearch for channel discovery (same pattern as Step 3)
3. Implement channel rating logic
4. Add command parsing for channel commands (SAVE_CHANNELS, UPDATE_CHANNELS)
5. Create base_step2.txt + category-specific prompts
6. Test with Step 1 output

### Phase 5: Step 3 - Execute Search
1. Create `step3-search.py`
2. Implement Claude WebSearch for executing searches across channels
3. Implement agent context with previous results (for deduplication)
4. Implement learning from ratings
5. Add favorites and winner marking commands
6. Create base_step3.txt + category-specific prompts
7. Test end-to-end workflow

Note: Steps 2 and 3 both use Claude WebSearch - consistent pattern, simple implementation

### Phase 6: Integration
1. Test full workflow (all 3 steps)
2. Add error handling and retries
3. Document common issues
4. Create usage examples for each category

### Phase 7: Authentication & API (Future)
1. Add user authentication system
2. Associate projects with authenticated users
3. Create REST API endpoints for each step
4. Enable AI agents to call via HTTP

---

## Usage Examples

### Example 1: Lead Generation

```bash
# Step 1: Clarify
python step1-clarify.py --new -c leadgen -m "Find customers for project management tool"
# UUID: abc-123

python step1-clarify.py abc-123 -m "Focus on seed-stage startups, 5-20 employees"
python step1-clarify.py abc-123 -m "YES, looks good"

# Step 2: Channels
python step2-channels.py abc-123
python step2-channels.py abc-123 -m "YES, approved"

# Step 3: Search
python step3-search.py abc-123
python step3-search.py abc-123 -m "Rate #1: 8/10, #2: 9/10, add #2 to favorites"
python step3-search.py abc-123 -m "Show 5 more"
```

### Example 2: Recruiting (Finding Hires)

```bash
# Step 1: Clarify
python step1-clarify.py --new -c recruiting -m "Find backend engineers"
# UUID: def-456

python step1-clarify.py def-456 -m "5+ years, Python/Go, SF or remote"
python step1-clarify.py def-456 -m "Approved"

# Step 2: Channels
python step2-channels.py def-456
python step2-channels.py def-456 -m "Add AngelList, rate it 8/10"
python step2-channels.py def-456 -m "Approved"

# Step 3: Search
python step3-search.py def-456
python step3-search.py def-456 -m "Rate #1: 9/10 - perfect fit!"
python step3-search.py def-456 -m "Mark #1 as winner"
```

### Example 3: Job Search (Finding Jobs)

```bash
# Step 1: Clarify
python step1-clarify.py --new -c job_search -m "Find product manager roles"
# UUID: ghi-789

python step1-clarify.py ghi-789 -m "3-5 years exp, B2B SaaS, $120k+, NYC or remote"
python step1-clarify.py ghi-789 -m "SAVE"

# Step 2: Channels
python step2-channels.py ghi-789
# ... continue workflow
```

---

## Files Structure

```
progressive-search/              # Lives in repository root
├── step1-clarify.py             # Step 1 script
├── step2-channels.py            # Step 2 script
├── step3-search.py              # Step 3 script
├── lib/
│   ├── __init__.py
│   ├── db.py                    # Database client (supabase-py)
│   ├── command_parser.py        # Command parsing
│   ├── context_builder.py       # Context construction
│   └── system_prompts.py        # Prompt loading (base + category)
├── prompts/
│   ├── base_step1.txt           # Shared Step 1 instructions
│   ├── base_step2.txt           # Shared Step 2 instructions
│   ├── base_step3.txt           # Shared Step 3 instructions
│   ├── step1/
│   │   ├── leadgen.txt          # Category-specific additions
│   │   ├── recruiting.txt
│   │   ├── job_search.txt
│   │   ├── pet_adoption.txt
│   │   └── general.txt
│   ├── step2/
│   │   └── [same categories]
│   └── step3/
│       └── [same categories]
├── migrations/
│   └── 001_initial_schema.sql  # ✅ Created - ready to run on Supabase
├── tests/
│   ├── test_step1.py
│   ├── test_step2.py
│   └── test_step3.py
├── requirements.txt             # Python dependencies
└── README.md                    # Usage documentation
```

---

## Todo Checklist

### Database ✅ COMPLETE
- [x] Write SQL migration file (`001_initial_schema.sql`)
- [x] Run migration on Supabase (via browser SQL editor)
- [x] Test table structure with sample inserts (test_db_connection.py passed)
- [ ] Add RLS policies (TODO: when adding user authentication)

### Library Code ✅ COMPLETE
- [x] `lib/db.py` - Supabase client + CRUD functions (434 lines)
- [x] `lib/command_parser.py` - Command extraction and execution
- [x] `lib/context_builder.py` - Build agent context from DB
- [x] `lib/system_prompts.py` - Load prompts by category

### Scripts
- [x] `step1-clarify.py` - Full implementation ✅ TESTED
- [x] `step2-channels.py` - Full implementation ✅ TESTED (requires CLAUDE_CODE_OAUTH_TOKEN for web search)
- [ ] `step3-search.py` - Full implementation ⏭️ NEXT

### System Prompts
- [x] Write base_step1.txt (shared across all categories)
- [x] Write base_step2.txt (shared across all categories)
- [ ] Write base_step3.txt (shared across all categories) ⏭️ NEEDED FOR STEP 3
- [x] Write category-specific prompts for leadgen (steps 1-2)
- [x] Write category-specific prompts for recruiting (steps 1-2)
- [ ] Write category-specific prompts for job_search (step 1 only)
- [x] Write category-specific prompts for general (steps 1-2)
- [ ] Write category-specific prompts for all categories (step 3)

### Testing
- [x] Test Step 1 end-to-end ✅ PASSED
  - Test Project ID: `95aa3677-a44a-4db9-b99a-b1921d76b207`
  - Status: `discovering_channels`
  - Ready for Step 2 testing
- [x] Test Step 2 structure ✅ VALIDATED
  - Script runs correctly
  - Validates project status
  - Detects missing OAuth token (expected)
  - Ready for OAuth token setup
- [ ] Test Step 3 end-to-end ⏭️ NEXT
- [ ] Test full workflow (all 3 steps)
- [ ] Test error cases (bad UUIDs, missing data, etc.)

### Documentation
- [x] Add inline code comments (done for all library modules)
- [x] Create usage examples (in lib/README.md)
- [ ] Document common issues
- [ ] Create video walkthrough (optional)

### Code Cleanup & Improvements
- [x] **Clean up agent response parsing** - Step 2 & 3 scripts now extract only final ResultMessage text ✅
- [x] **Fix duplicate channel saves** - Now only keeps final ResultMessage, prevents duplicate commands ✅
- [x] **Add raw_response storage** - Full agent output stored in separate column for debugging (not in context) ✅
- [ ] Add better error handling for malformed JSON commands
- [ ] Add retry logic for database operations
- [ ] Improve command parser error messages
- [ ] Remove unused APPROVE_CHANNELS command (replaced by UPDATE_CHANNELS with is_approved field)

### Integration (Future)
- [ ] Add user authentication system
- [ ] Create REST API wrapper
- [ ] Integrate with leadgen agent (i6)
- [ ] Integrate with recruiting agent
- [ ] Add webhook support

---

## Design Decisions Summary

### Database & Architecture ✅

1. ✅ **Table naming**: All tables prefixed with `ps_` (ps_projects, ps_conversation, ps_channels, ps_results)
2. ✅ **Status values**: 'refining_query', 'discovering_channels', 'searching', 'completed'
3. ✅ **Conversation storage**: One row per message (not JSON array) for flexibility and debugging
4. ✅ **Channel ratings**: Single `rating` column (agent sets, user updates)
5. ✅ **Channel approval**: Just `is_approved` boolean (no is_active field)
6. ✅ **Result dates**: `deadline` and `last_updated` are nullable (not all categories need them)
7. ✅ **Deduplication**: No database constraints - agent checks previous results in context to avoid duplicates

### Implementation Choices ✅

8. ✅ **Database**: Use existing Supabase instance (run migration in browser admin)
9. ✅ **Python version**: 3.10+ (matches existing agents with `#!/usr/bin/env python3`)
10. ✅ **Dependencies**:
    - `anthropic` - For AI agent responses
    - `supabase-py` - Clean database operations
    - `claude-agent-sdk` - Autonomous web search (Steps 2 & 3)
11. ✅ **Step 2 channel discovery**: Claude WebSearch to find relevant channels (same as Step 3)
12. ✅ **Step 3 search execution**: Claude WebSearch with autonomous research
13. ✅ **Authentication**: Environment variables for now (TODO: add user auth later)
14. ✅ **Location**: `progressive-search/` in repository root directory
15. ✅ **System prompts**: Two-layer architecture (base + category-specific)
16. ✅ **Step 3 results**: Default 5, up to 10 if user asks (no --limit flag)
17. ✅ **Channel approval workflow**:
    - Agent discovers channels (all start as `is_approved=false`)
    - User reviews and approves individual channels via UPDATE_CHANNELS
    - Step 3 only searches approved channels (can be subset, not all)
    - Project status changes to 'searching' when Step 3 script runs (not when channels approved)
    - APPROVE_CHANNELS command not needed (UPDATE_CHANNELS handles individual approvals)

---

## Progress Summary

### ✅ Completed (Phase 1-4)
- **Phase 1**: Database schema created and tested
- **Phase 2**: All library modules implemented (db, command_parser, context_builder, system_prompts)
- **Phase 3**: Step 1 script fully implemented and tested
  - Base system prompt + 3 category prompts (general, recruiting, leadgen)
  - Test project ready: `95aa3677-a44a-4db9-b99a-b1921d76b207`
- **Phase 4**: Step 2 script fully implemented and tested
  - `step2-channels.py` script created
  - `prompts/base_step2.txt` system prompt
  - Category-specific prompts for Step 2 (general, recruiting, leadgen)
  - Uses claude-agent-sdk with WebSearch
  - Validates correctly, detects missing OAuth token

### ⏭️ Next: Phase 5 - Step 3 (Execute Search)

**What Needs to be Built:**
1. `step3-search.py` script
2. `prompts/base_step3.txt` system prompt
3. Category-specific prompts for Step 3 (at minimum: general, recruiting, leadgen)

**Implementation Approach:**
- Use same pattern as Steps 1 & 2 (argument parsing, context building, command parsing)
- Use **Claude WebSearch** for autonomous searching
- Agent searches approved channels and returns 5 relevant results per iteration
- Includes deduplication (agent sees previous results in context)
- Learns from user ratings (shows high/low rated examples to agent)
- Commands: `SAVE_RESULTS`, `UPDATE_RESULTS`, `ADD_TO_FAVORITES`, `MARK_WINNER`

**Key Requirements:**
- Must include previous results in context for deduplication
- Must surface user ratings/notes to agent for learning
- Agent should adapt search strategy based on feedback

---

## Questions Previously Clarified

### 1. ✅ ANSWERED: Claude WebSearch vs Google Search API
**Decision:** Use Claude WebSearch (claude-agent-sdk) for both Steps 2 & 3
- Simpler implementation (one pattern for both steps)
- No additional API keys needed
- More flexible (agent can adapt search strategy)

### 2. 🤔 PENDING: Claude OAuth Token

**Question:** What is `CLAUDE_CODE_OAUTH_TOKEN` and when do we need it?

**Answer:**

There are **two ways to use Claude**:

#### Option A: Direct API Calls (What we use in Step 1)
- **Uses:** `ANTHROPIC_API_KEY`
- **How it works:** You call Claude's API directly with messages
- **What Claude can do:** Answer questions, follow instructions, return text
- **What Claude CANNOT do:** Browse the web, search Google, read external files

```python
# Step 1 uses this approach
client = Anthropic(api_key=os.getenv('ANTHROPIC_API_KEY'))
response = client.messages.create(
    model="claude-sonnet-4-20250514",
    messages=[{"role": "user", "content": "Refine this search query"}]
)
```

#### Option B: Autonomous Agents (What we need for Steps 2 & 3)
- **Uses:** `CLAUDE_CODE_OAUTH_TOKEN`
- **How it works:** Creates an agent with access to tools (WebSearch, Read, Write, etc.)
- **What Claude can do:** Everything from Option A PLUS:
  - 🔍 Search the web autonomously
  - 📄 Read web pages
  - 💾 Write to files
  - 🤖 Use other tools

```python
# Steps 2 & 3 will use this approach
from anthropic import Anthropic
agent = Anthropic().beta.agents.create(
    model="claude-sonnet-4-20250514",
    tools=["WebSearch"]  # Agent can now search the web!
)
```

**When do you need the OAuth token?**
- Only if you want the agent to **autonomously search the web**
- For Step 2 (discovering channels) and Step 3 (searching for results)
- NOT needed for Step 1 (just conversation refinement)

**Can we skip it?**
- Yes, temporarily! We can build Steps 2 & 3 without it
- They'll work but won't be able to actually search the web
- You'd need to manually provide channel/result data

**How to get it:**
- It's generated by the Claude Code CLI
- Part of the claude-agent-sdk authentication
- See: https://github.com/anthropics/claude-agent-sdk

### 3. 🔍 QUESTION: Do we want to build Step 2 with or without WebSearch initially?

**Option A:** Build full version with WebSearch
- Requires setting up `CLAUDE_CODE_OAUTH_TOKEN`
- Agent can autonomously discover channels
- Complete end-to-end functionality

**Option B:** Build mock version without WebSearch first
- Test the script structure and command parsing
- Manually provide mock channel data for testing
- Add WebSearch functionality later

**Recommendation:** Option B (mock first) - get the script structure working, then add WebSearch once OAuth is set up.

---

## Ready to Start Step 2?

Once you decide on the WebSearch approach, we can:
1. Create system prompts for Step 2
2. Build `step2-channels.py` script
3. Test with the existing project from Step 1

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

### Table: `progressive_search_conversation`

Conversation history for each step.

```sql
CREATE TABLE progressive_search_conversation (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES progressive_search_projects(id) ON DELETE CASCADE,

  -- Step tracking
  step INTEGER NOT NULL,  -- 1 (clarify), 2 (discover), 3 (search)

  -- Message
  role VARCHAR(20) NOT NULL,  -- 'user', 'assistant'
  content TEXT NOT NULL,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT valid_step CHECK (step IN (1, 2, 3)),
  CONSTRAINT valid_role CHECK (role IN ('user', 'assistant'))
);

CREATE INDEX idx_progressive_conversation_project ON progressive_search_conversation(project_id, step, created_at);
```

### Table: `progressive_search_channels`

Discovered channels (websites/sources) with ratings.

```sql
CREATE TABLE progressive_search_channels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES progressive_search_projects(id) ON DELETE CASCADE,

  -- Channel info
  name VARCHAR(200) NOT NULL,  -- "LinkedIn Jobs", "Indeed", "GitHub", etc.
  url TEXT,  -- Base URL or search URL template
  description TEXT,
  channel_type VARCHAR(50),  -- 'job_board', 'professional_network', 'code_repo', etc.

  -- Ratings
  agent_rating INTEGER NOT NULL,  -- 1-10, agent's initial rating
  user_rating INTEGER,  -- 1-10, user can override
  effective_rating INTEGER GENERATED ALWAYS AS (COALESCE(user_rating, agent_rating)) STORED,

  -- Status
  is_approved BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,  -- Can be disabled without deleting

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT valid_agent_rating CHECK (agent_rating >= 1 AND agent_rating <= 10),
  CONSTRAINT valid_user_rating CHECK (user_rating IS NULL OR (user_rating >= 1 AND user_rating <= 10))
);

CREATE INDEX idx_progressive_channels_project ON progressive_search_channels(project_id);
CREATE INDEX idx_progressive_channels_approved ON progressive_search_channels(project_id, is_approved, is_active);
```

### Table: `progressive_search_results`

Search results (leads, candidates, jobs, listings).

```sql
CREATE TABLE progressive_search_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES progressive_search_projects(id) ON DELETE CASCADE,
  channel_id UUID REFERENCES progressive_search_channels(id) ON DELETE SET NULL,

  -- Result data
  title VARCHAR(500) NOT NULL,  -- Person name, job title, company name, etc.
  subtitle VARCHAR(500),  -- Location, company, role, etc.
  description TEXT,  -- Bio, job description, details
  url TEXT NOT NULL,  -- Link to profile, listing, posting

  -- Additional fields (flexible JSON for category-specific data)
  metadata JSONB DEFAULT '{}',  -- Email, phone, salary, deadline, etc.

  -- Dates
  deadline TIMESTAMPTZ,  -- For job postings, application deadlines
  last_updated TIMESTAMPTZ,  -- When listing was last updated on source site
  found_at TIMESTAMPTZ DEFAULT NOW(),  -- When agent found this

  -- User feedback
  user_rating INTEGER,  -- 1-10
  user_notes TEXT,
  is_favorite BOOLEAN DEFAULT false,
  is_contacted BOOLEAN DEFAULT false,
  is_winner BOOLEAN DEFAULT false,  -- Final selection

  -- Deduplication
  external_id VARCHAR(200),  -- ID from source site (to prevent duplicates)

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT valid_user_rating CHECK (user_rating IS NULL OR (user_rating >= 1 AND user_rating <= 10)),
  CONSTRAINT unique_external_id UNIQUE (project_id, channel_id, external_id)
);

CREATE INDEX idx_progressive_results_project ON progressive_search_results(project_id, created_at DESC); 
CREATE INDEX idx_progressive_results_favorites ON progressive_search_results(project_id, is_favorite) WHERE is_favorite = true;
CREATE INDEX idx_progressive_results_winner ON progressive_search_results(project_id, is_winner) WHERE is_winner = true;
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
  "status": "clarifying",
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
  "status": "clarifying",
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
  "status": "discovering",
  "agent_response": "✅ Saved! Your search is now ready.\n\nNext step: Discover channels by running:\npython step2-channels.py 550e8400-e29b-41d4-a716-446655440000",
  "clarified_subject": "Senior backend engineers (Python/Go) at seed-stage startups in SF Bay Area or remote, 5+ years experience, $150-200k salary",
  "is_confirmed": true,
  "next_step": "Run step 2: python step2-channels.py 550e8400-e29b-41d4-a716-446655440000"
}
```

### System Prompts

Category-specific system prompts stored in:
```
progressive-search/prompts/
├── step1/
│   ├── leadgen.txt       # For finding customers
│   ├── recruiting.txt    # For finding candidates
│   ├── job_search.txt    # For finding jobs
│   ├── pet_adoption.txt  # For finding pets
│   └── general.txt       # Default fallback
```

Each prompt file contains category-specific guidance for the agent.

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
- Use web search to find 3-5 relevant channels
- Research query: "What are the best websites to search for [clarified_subject]?"
- Rate each channel 1-10 based on relevance
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
      "agent_rating": 9
    },
    {
      "name": "GitHub Jobs",
      "url": "https://github.com/jobs",
      "description": "Developer-focused job board, good for backend roles",
      "channel_type": "job_board",
      "agent_rating": 8
    }
  ]
}
```

**UPDATE_CHANNELS**
```json
{
  "command": "UPDATE_CHANNELS",
  "updates": [
    {"name": "LinkedIn Jobs", "user_rating": 10},
    {"name": "GitHub Jobs", "is_active": false}
  ],
  "new_channels": [
    {
      "name": "AngelList",
      "url": "https://angel.co",
      "description": "Startup job board",
      "channel_type": "job_board",
      "agent_rating": 7
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
  "status": "discovering",
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
      "agent_rating": 9,
      "user_rating": null,
      "effective_rating": 9,
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
| `--limit` | No | Number of results (default: 5, max: 20) |

### Input Validation

**Errors:**
- No UUID: `Error: Project UUID required`
- Invalid UUID: `Error: Project not found: <uuid>`
- No approved channels: `Error: Must complete Step 2 first (no approved channels found)`

### Agent Behavior

**First call:**
- Search approved channels (weighted by rating)
- Return 5 results (or `--limit` count)
- Include link, description, last updated date
- No duplicates within same project

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
- Never show duplicates from previous searches

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
      "last_updated": "2025-12-18T10:00:00Z",
      "external_id": "linkedin-123456"
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
1. Create migration file: `progressive_search_schema.sql`
2. Run migration on Supabase
3. Test tables with sample data

### Phase 2: Shared Libraries
1. `lib/db.py` - Database client (Supabase)
2. `lib/command_parser.py` - Command parsing logic
3. `lib/context_builder.py` - Build context from DB
4. `lib/system_prompts.py` - Load category-specific prompts

### Phase 3: Step 1 - Clarify Subject
1. Create `step1-clarify.py`
2. Implement argument parsing
3. Implement agent call with context
4. Implement command parsing
5. Add system prompts for each category
6. Test with sample queries

### Phase 4: Step 2 - Discover Channels
1. Create `step2-channels.py`
2. Implement web search for channel discovery
3. Implement channel rating logic
4. Add command parsing for channel commands
5. Test with Step 1 output

### Phase 5: Step 3 - Execute Search
1. Create `step3-search.py`
2. Implement channel search logic
3. Implement deduplication
4. Implement learning from ratings
5. Add favorites and winner marking
6. Test end-to-end workflow

### Phase 6: Integration
1. Test full workflow (all 3 steps)
2. Add error handling and retries
3. Document common issues
4. Create usage examples for each category

### Phase 7: API Wrapper (Future)
1. Create REST API endpoints for each step
2. Add authentication
3. Enable AI agents to call via HTTP

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
progressive-search/
├── step1-clarify.py          # Step 1 script
├── step2-channels.py          # Step 2 script
├── step3-search.py            # Step 3 script
├── lib/
│   ├── __init__.py
│   ├── db.py                  # Database client
│   ├── command_parser.py      # Command parsing
│   ├── context_builder.py     # Context construction
│   └── system_prompts.py      # Prompt loading
├── prompts/
│   ├── step1/
│   │   ├── leadgen.txt
│   │   ├── recruiting.txt
│   │   ├── job_search.txt
│   │   ├── pet_adoption.txt
│   │   └── general.txt
│   ├── step2/
│   │   └── [same categories]
│   └── step3/
│       └── [same categories]
├── migrations/
│   └── progressive_search_schema.sql
├── tests/
│   ├── test_step1.py
│   ├── test_step2.py
│   └── test_step3.py
└── README.md                  # This file
```

---

## Todo Checklist

### Database
- [ ] Write SQL migration file
- [ ] Create tables on Supabase
- [ ] Test table structure with sample inserts
- [ ] Add RLS policies (if needed)

### Library Code
- [ ] `lib/db.py` - Supabase client + CRUD functions
- [ ] `lib/command_parser.py` - Command extraction and execution
- [ ] `lib/context_builder.py` - Build agent context from DB
- [ ] `lib/system_prompts.py` - Load prompts by category

### Scripts
- [ ] `step1-clarify.py` - Full implementation
- [ ] `step2-channels.py` - Full implementation
- [ ] `step3-search.py` - Full implementation

### System Prompts
- [ ] Write prompts for leadgen (all steps)
- [ ] Write prompts for recruiting (all steps)
- [ ] Write prompts for job_search (all steps)
- [ ] Write prompts for general (all steps)

### Testing
- [ ] Test Step 1 end-to-end
- [ ] Test Step 2 end-to-end
- [ ] Test Step 3 end-to-end
- [ ] Test full workflow (all 3 steps)
- [ ] Test error cases (bad UUIDs, missing data, etc.)

### Documentation
- [ ] Add inline code comments
- [ ] Create usage examples
- [ ] Document common issues
- [ ] Create video walkthrough (optional)

### Integration (Future)
- [ ] Create REST API wrapper
- [ ] Integrate with leadgen agent (i6)
- [ ] Integrate with recruiting agent
- [ ] Add webhook support

---

## Questions & Clarifications

Before starting implementation, please confirm:

1. **Database**: Should this use the existing Supabase instance or a separate database?
2. **Python version**: What Python version should we target? (3.10+?)
3. **Dependencies**: OK to use `anthropic` SDK + `supabase-py`?
4. **Web search**: Should Step 2 use Google Search API, or a different tool?
5. **Step 3 search**: How should the agent actually search channels? Web scraping? APIs? Manual research?
6. **Authentication**: Do we need user authentication, or can scripts run with env vars for now?
7. **Location**: Should this live in `sms-bot/` or `incubator/i6/progressive-search/`?

---

## Next Steps

Once questions are answered:
1. Create database migration file
2. Run migration on Supabase
3. Start implementing `lib/` modules
4. Build Step 1 script
5. Test and iterate

Ready to proceed?

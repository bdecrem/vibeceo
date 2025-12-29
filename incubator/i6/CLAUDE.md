# i6 - Progressive Search Interface Agent

## Purpose

**i6 is infrastructure, not a competing business.** This agent serves as the conversational interface between humans and the Progressive Search system.

**What it does:**
- Interface for humans to access Progressive Search via `/i6` slash command
- Finds qualified leads for incubator product ideas
- Helps with recruiting, market research, and general information gathering
- Guides users through the 3-step progressive search process
- Presents results and helps refine searches through iteration

**What it doesn't do:**
- Compete with business builders (i1, i2)
- Generate revenue (it's a tool, not a product)
- Run autonomously on a schedule (invoked on-demand only)
- Send SMS notifications (results stay in database/conversation)

## How to Invoke

Use the `/i6` slash command to activate this agent. i6 will load its context and help you use progressive search for:
- Lead generation for incubator products
- Candidate sourcing for recruiting
- Market research and competitive analysis
- General information gathering

---

## Startup: Verify Python Environment (Run Every Time i6 is Invoked)

**CRITICAL:** Before running any progressive-search commands, you must thoroughly verify the Python installation on this system.

### Step 1: Comprehensive Python Search

Search exhaustively for Python installations before asking the user to install:

```bash
# Check standard commands
which python3
which python
which python3.12
which python3.11
which python3.10
which python3.9
which python3.8

# Check common installation paths (macOS)
ls -la /usr/local/bin/python* 2>/dev/null
ls -la /opt/homebrew/bin/python* 2>/dev/null
ls -la /Library/Frameworks/Python.framework/Versions/*/bin/python* 2>/dev/null

# Check common installation paths (Linux)
ls -la /usr/bin/python* 2>/dev/null

# Find all Python binaries on the system
find /usr /opt /Library -name "python*" -type f 2>/dev/null | grep -E "python3?\.[0-9]+" | head -20

# Check virtual environment (if standard methods fail)
# Note: Some other incubator agents use ./venv/bin/python
# Only use this if you're having trouble accessing Python via standard paths
ls -la ./venv/bin/python* 2>/dev/null
```

### Step 2: Test Each Found Python Binary

For each Python binary found, verify it works and check version:

```bash
# Test the binary (replace /path/to/python with actual path found)
/path/to/python3 --version
/path/to/python3 -c "import sys; print(f'Python {sys.version}')"

# Verify it can import required packages
/path/to/python3 -c "import anthropic, supabase; print('Dependencies OK')" 2>/dev/null || echo "Dependencies missing"
```

### Step 3: Select the Best Python Binary

Choose based on priority:
1. **Python 3.11+ with dependencies installed** (best)
2. **Python 3.8-3.10 with dependencies installed** (good)
3. **Any Python 3.8+ even without dependencies** (can install deps)

**Store the full binary path** for use throughout the session. For example:
- `/opt/homebrew/bin/python3` (macOS Homebrew)
- `/usr/bin/python3` (Linux standard)
- `/Library/Frameworks/Python.framework/Versions/3.11/bin/python3` (macOS framework install)

### Step 4: Verify Dependencies

Once you've found a working Python binary, check dependencies:

```bash
/full/path/to/python3 -c "import anthropic; print('anthropic:', anthropic.__version__)"
/full/path/to/python3 -c "import supabase; print('supabase OK')"
/full/path/to/python3 -c "from dotenv import load_dotenv; print('python-dotenv OK')"
```

If any imports fail, install dependencies:

```bash
/full/path/to/python3 -m pip install -r progressive-search/requirements.txt
```

### Step 5: Verify Working Directory

Ensure you're in the correct directory:

```bash
pwd  # Should show the overall project root
ls progressive-search/step1-clarify.py  # Should exist
ls sms-bot/.env.local  # Should exist (needed for env vars)
```

### Final Output

After all checks, summarize for the user and yourself:

```
✓ Python found: /opt/homebrew/bin/python3 (v3.11.5)
✓ Dependencies: Installed
✓ Working directory: /home/whitcodes/Work/Dev/kochito
✓ Progressive search scripts: Found
✓ Environment file: sms-bot/.env.local exists

Ready to use progressive-search. Using: /opt/homebrew/bin/python3
```

**Store this Python path** and use it consistently for ALL progressive-search commands in this session.

### Error Handling

**Only ask user to install Python if:**
- No Python 3.8+ binary found anywhere on system after exhaustive search
- All found Python binaries are too old (< 3.8)

**If dependencies missing:**
- Attempt to install automatically with the found Python binary
- Only ask user if pip install fails

### Important

- **Run these checks EVERY session** - Python location may change (system updates, new installations)
- **Use the full path** (e.g., `/opt/homebrew/bin/python3`) in all commands to avoid ambiguity
- **Don't assume** - always verify, even if it worked last time

---

## ⚙️ SESSION STARTUP PROTOCOL

When invoked, I should:

### 1. Load State from Database (PRIMARY SOURCE)

Read learnings from database FIRST:

```python
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent / 'lib'))

from agent_messages import read_my_messages, read_broadcasts, read_inbox

# My learnings (last 30 days)
my_notes = read_my_messages('i6', days=30)

# Broadcasts from other agents (last 7 days)
broadcasts = read_broadcasts(days=7)

# Direct messages to me (last 7 days)
inbox = read_inbox('i6', days=7)

print(f"Loaded {len(my_notes)} self-notes, {len(broadcasts)} broadcasts, {len(inbox)} inbox messages")

# Apply critical learnings - especially patterns about progressive search usage
for note in my_notes:
    if note['type'] in ('lesson', 'warning', 'observation'):
        # Refine channel discovery patterns, search strategies
        # What worked well for different categories?
        pass
```

### 2. Load Human-Readable Context
- Read this `CLAUDE.md` file (purpose, progressive search system)
- Check current status above
- Skim `LOG.md` for recent usage patterns (if exists)

### 3. Verify Python Environment (Infrastructure-Specific)
- **Run Python verification checks** (see section above)
- Find and verify working Python binary
- Store full path for this session

### 4. Assist with Search
- Apply learnings from database messages
- Help users navigate progressive search effectively
- Provide guidance on channel evaluation and result rating

### 5. Record Learnings (DURING & END OF SESSION)

Write to database after discovering useful patterns:

```python
from agent_messages import write_message

# After helping with a search that went well/poorly
write_message(
    agent_id='i6',
    scope='SELF',  # or 'ALL' for insights that benefit all agents
    type='observation',  # infrastructure agent writes mostly observations
    content='Twitter search works well for leadgen when targeting specific hashtags',
    tags=['progressive-search', 'leadgen', 'channels'],
    context={'category': 'leadgen', 'outcome': 'positive'}
)

# If it benefits agents using progressive search (business builders, researchers)
write_message(
    agent_id='i6',
    scope='ALL',
    type='observation',
    content='Step 2 channel approval: Be selective - quality > quantity. 2-3 excellent channels beat 5 mediocre ones',
    tags=['progressive-search', 'best-practice']
)
```

### 6. Update Human Audit Trail (OPTIONAL)
- Append key usage patterns to `LOG.md` for human transparency
- Update `CLAUDE.md` only if durable patterns emerged

**Remember:** As infrastructure, my learnings focus on what search patterns work best for different categories and use cases. Database is PRIMARY, files are SECONDARY.

---

## Progressive Search System

**Location:** `../../progressive-search/` (relative to this agent folder)

**IMPORTANT:** For complete usage instructions, examples, flags, and troubleshooting, **read `progressive-search/USAGE.md`** before using the system. That file contains comprehensive documentation with real conversation flows, all command options, and category-specific examples.

### Architecture

```
Step 1: Clarify Subject    → Refine search through conversation
Step 2: Discover Channels   → Find best websites/platforms to search
Step 3: Execute Search      → Browse channels, extract results, learn from feedback
```

### Quick Start (Read USAGE.md for Full Details)

**IMPORTANT:** The `python` command in the examples below may need to be replaced with the full path to your Python binary (e.g., `/opt/homebrew/bin/python3`) as determined in the **Startup: Verify Python Environment** section above. Always verify the Python environment first before running these commands.

**For Lead Generation (Forge, Nix, etc.):**

```bash
# Step 1: Clarify what you're looking for
# NOTE: Replace 'python' with your verified Python path (e.g., /opt/homebrew/bin/python3)
python progressive-search/step1-clarify.py --new -c leadgen \
  -m "Find customers for [product description]"

# Agent asks clarifying questions, you respond:
python progressive-search/step1-clarify.py <uuid> \
  -m "Target: Series A-B SaaS companies, 20-100 employees"

# Step 2: Agent discovers channels (Twitter, Reddit, G2, Crunchbase, etc.)
python progressive-search/step2-channels.py <uuid>

# REVIEW CHANNELS CRITICALLY - Don't blindly approve all!
# Consider: Can this channel actually be searched effectively? Will it have good results?
# Approve only the channels that seem practical and high-quality:
python progressive-search/step2-channels.py <uuid> -m "approve channels 1, 2, and 3"
# OR if all channels look genuinely good:
python progressive-search/step2-channels.py <uuid> -m "approve all channels"

# Step 3: Agent searches channels and extracts leads
python progressive-search/step3-search.py <uuid>

# Rate results to teach preferences:
python progressive-search/step3-search.py <uuid> \
  -m "Rate result 1 as 9/10 - perfect ICP fit. Rate result 2 as 3/10 - too small."

# Request more results (agent applies learnings):
python progressive-search/step3-search.py <uuid> -m "Find 5 more leads"
```

### Critical Evaluation Philosophy

**When reviewing channels (Step 2):**
- Be mildly skeptical about channel usefulness
- Ask yourself: "Can this actually be searched effectively?"
- Consider: "Will this channel realistically yield multiple good results?"
- Don't approve channels just because they're suggested - evaluate them critically
- It's better to have 2-3 excellent channels than 5 mediocre ones

**When reviewing results (Step 3):**
- Rate honestly based on fit with your ICP (ideal customer profile)
- Low ratings (1-4) for poor matches help the agent learn what to avoid
- High ratings (8-10) only for genuinely excellent matches
- The agent learns from your ratings to improve future searches

**For other categories:** See `progressive-search/USAGE.md` for recruiting, job_search, and general examples.

### Key Features

1. **Category-Agnostic**: Works for recruiting, leadgen, job search, pet adoption, general research - just change the category flag
2. **Conversational Refinement**: Step 1 asks clarifying questions to understand exactly what you're looking for
3. **Autonomous Web Search**: Steps 2 & 3 use claude-agent-sdk to autonomously browse and extract data
4. **Iterative Learning**: Rate results 1-10, request more, agent learns your preferences over time
5. **Database-Backed**: All state persisted in Supabase - resume anytime with project UUID
6. **Deduplication**: Agent tracks previous results and avoids duplicates

### Documentation

- **⭐ Usage Guide**: `progressive-search/USAGE.md` - **READ THIS FIRST** for complete documentation
- **System Prompts**: `progressive-search/prompts/` - Base + category-specific prompts
- **Library Code**: `progressive-search/lib/` - Database, command parsing, context building

---

## i6's Role in Token Tank

### For Business Builders (Forge, Nix)

When you need to find leads for your product:
1. Use progressive search with `leadgen` category
2. Describe your product and ICP (ideal customer profile)
3. Agent discovers channels where potential customers hang out
4. Agent extracts qualified leads with contact info
5. Rate leads, request more, progressively improve results

**Example: B2B SaaS Product Lead Generation**

```bash
# NOTE: Use your verified Python path (see Startup section above)
# Examples below use 'python' but replace with full path like /opt/homebrew/bin/python3 if necessary

# Find customers for a B2B SaaS product
python progressive-search/step1-clarify.py --new -c leadgen \
  -m "Find customers for a project management tool for remote teams"

# Agent asks: Target company size? Geographic focus? Pain points?
python progressive-search/step1-clarify.py <uuid> \
  -m "Series A-B SaaS, 20-200 employees, struggling with team coordination"

# Agent discovers channels:
# - Twitter: people discussing project management challenges
# - Reddit: r/startups posts about team collaboration
# - G2: Reviews of project management tools mentioning pain points
# - LinkedIn: Posts from founders discussing remote work challenges

# Agent extracts leads:
# - Company name, industry, size, funding stage
# - Decision maker names and LinkedIn profiles
# - Contact info (email, website)
# - Pain signals (what they said that triggered detection)
```

### For Traders (Drift, Pulse)

Use `general` category for market research:
```bash
python progressive-search/step1-clarify.py --new -c general \
  -m "Research best data sources for crypto sentiment analysis"
```

### For Research (Echo)

Use for pattern discovery:
```bash
python progressive-search/step1-clarify.py --new -c general \
  -m "Find papers on multi-agent reinforcement learning"
```

---

## Integration Patterns

### CLI Invocation (Simplest)

```typescript
// From TypeScript (sms-bot)
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

// NOTE: Use the verified Python path from your startup checks
// e.g., '/opt/homebrew/bin/python3' instead of just 'python'
const pythonPath = '/opt/homebrew/bin/python3'; // Adjust based on your system

const { stdout } = await execAsync(
  `${pythonPath} progressive-search/step1-clarify.py --new -c leadgen -m "${message}"`
);

const result = JSON.parse(stdout);
console.log(result.project_id); // UUID for next steps
```

### Python Import (Advanced)

```python
# From Python agent
import sys
sys.path.insert(0, '../progressive-search')

from lib import db, context_builder
from step1_clarify import create_new_project, call_agent

# Create project
project = create_new_project("Find SaaS leads", category="leadgen")
project_id = project['id']

# Continue conversation
messages = context_builder.build_step1_context(project_id, user_message)
response = call_agent(system_prompt, messages)
```

### REST API (Future)

```bash
# Future: HTTP endpoints for each step
POST /api/progressive-search/projects
POST /api/progressive-search/projects/:id/messages
GET  /api/progressive-search/projects/:id
```

---

## Current Status

**Progressive Search System:** ✅ **COMPLETE**
- All 3 steps built and tested
- All base + category prompts created
- Full end-to-end leadgen test passed
- Documentation complete (USAGE.md)

**i6 Agent Setup:** 🔄 **IN PROGRESS**
- TODO.md created with remaining tasks
- CLAUDE.md created (this file)
- LOG.md and usage.md needed
- Integration examples needed

**Next Steps:**
1. Answer clarifying questions (see TODO.md)
2. Create LOG.md to track i6 development
3. Document integration pattern for incubator agents
4. Test integration with incubator business builders for lead generation

---

## Key Learnings (To Date)

### About Progressive Search

1. **Category-specific prompts are critical** - Generic prompts don't work well. Recruiting needs to find PEOPLE (not jobs), leadgen needs to find COMPANIES (not candidates).

2. **Iterative learning works** - Rating results and requesting more produces progressively better matches. High-rated (8-10) results teach patterns to replicate, low-rated (1-3) teach what to avoid.

3. **Two-layer prompt architecture scales** - Base prompts (shared instructions) + category prompts (specific guidance) = maintainable and extensible.

4. **Deduplication is critical** - Agent must check previous results in context to avoid showing duplicates.

5. **WebSearch is powerful** - claude-agent-sdk with Read/WebSearch tools enables autonomous research and data extraction without hardcoded scrapers.

### About Infrastructure Agents

1. **Documentation is the product** - For infrastructure, clear usage docs matter more than fancy features.

2. **Make it composable** - CLI scripts that output JSON can be called from anywhere (Python, TypeScript, bash).

3. **Database-backed state is essential** - Conversation history and results must persist across sessions.

---

## Resources

- **⭐ READ THIS FIRST:** `progressive-search/USAGE.md` - Complete usage guide with all flags, examples, and troubleshooting
- **Source Code:** `progressive-search/*.py`
- **System Prompts:** `progressive-search/prompts/`
- **Database:** Supabase tables with `ps_` prefix
- **Planning Archive:** `incubator/i6/archives/` (original planning documents)

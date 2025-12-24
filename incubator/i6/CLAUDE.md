# i6 - Progressive Search Interface Agent

## Purpose

**i6 is infrastructure, not a competing business.** This agent serves as the conversational interface between humans and the Progressive Search system.

**What it does:**
- Interface for humans to access Progressive Search via `/i6` slash command
- Finds qualified leads for incubator product ideas (primarily Forge's RivalAlert)
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

**For Lead Generation (Forge, Nix, etc.):**

```bash
# Step 1: Clarify what you're looking for
python progressive-search/step1-clarify.py --new -c leadgen \
  -m "Find customers for [product description]"

# Agent asks clarifying questions, you respond:
python progressive-search/step1-clarify.py <uuid> \
  -m "Target: Series A-B SaaS companies, 20-100 employees"

# Step 2: Agent discovers channels (Twitter, Reddit, G2, Crunchbase, etc.)
python progressive-search/step2-channels.py <uuid>

# Approve channels when ready:
python progressive-search/step2-channels.py <uuid> -m "approve all channels"

# Step 3: Agent searches channels and extracts leads
python progressive-search/step3-search.py <uuid>

# Rate results to teach preferences:
python progressive-search/step3-search.py <uuid> \
  -m "Rate result 1 as 9/10 - perfect ICP fit. Rate result 2 as 3/10 - too small."

# Request more results (agent applies learnings):
python progressive-search/step3-search.py <uuid> -m "Find 5 more leads"
```

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

**Example: Forge's RivalAlert**

```bash
# Find customers for RivalAlert (competitor intelligence tool)
python progressive-search/step1-clarify.py --new -c leadgen \
  -m "Find customers for RivalAlert - competitor tracking for B2B SaaS"

# Agent asks: Target company size? Geographic focus? Pain points?
python progressive-search/step1-clarify.py <uuid> \
  -m "Series A-B SaaS, 20-200 employees, frustrated with manual competitor research"

# Agent discovers channels:
# - Twitter: people complaining about Klue, manual competitor tracking
# - Reddit: r/startups posts about competitor analysis
# - G2: Reviews of competitor tools mentioning pain points
# - LinkedIn: Posts from founders struggling with competitive intelligence

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

const { stdout } = await execAsync(
  `python progressive-search/step1-clarify.py --new -c leadgen -m "${message}"`
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
4. Test integration with Forge (RivalAlert lead generation)

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

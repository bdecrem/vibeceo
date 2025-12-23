# i6 - Progressive Search Infrastructure Log

---

## 2025-12-23: Progressive Search System Complete

**What happened**: Built the complete Progressive Search Agent System from scratch - all 3 steps, all prompts, full end-to-end testing.

**System Components Built:**
1. **Step 1 - Clarify Subject** (`step1-clarify.py`)
   - Conversational refinement of search queries
   - Category support (leadgen, recruiting, job_search, general)
   - Command parsing (SAVE_SUBJECT, UPDATE_SUBJECT)
   - Full testing with recruiting category

2. **Step 2 - Discover Channels** (`step2-channels.py`)
   - Autonomous web search via claude-agent-sdk
   - Channel discovery and rating (1-10 scale)
   - User approval workflow
   - Command parsing (SAVE_CHANNELS, UPDATE_CHANNELS)
   - Full testing with recruiting category

3. **Step 3 - Execute Search** (`step3-search.py`)
   - Autonomous browsing of approved channels
   - Result extraction with structured metadata
   - Iterative learning from user ratings
   - Deduplication (checks previous results)
   - Command parsing (SAVE_RESULTS, UPDATE_RESULTS, ADD_TO_FAVORITES, MARK_WINNER)
   - Full end-to-end testing with leadgen category

**Prompt Architecture:**
- Base prompts (base_step1.txt, base_step2.txt, base_step3.txt) - shared across all categories
- Category-specific prompts for: recruiting, leadgen, job_search, general
- Two-layer system: base + category = final prompt

**Key Features Implemented:**
- **Iterative Learning Loop** - Rate results, request more, agent learns preferences
- **Category-Agnostic** - Same pipeline works for recruiting, leadgen, job search, etc.
- **Database-Backed** - All state in Supabase (ps_projects, ps_conversation, ps_channels, ps_results)
- **Autonomous Web Browsing** - Uses Read/WebSearch tools to visit URLs and extract data
- **Deduplication** - Agent tracks previous results to avoid duplicates

**Testing:**
- Recruiting test (Step 1 → 2 → 3): Found 5 job listings
- Leadgen test (Step 1 → 2 → 3): Found 5 B2B SaaS companies with full firmographic data
- All commands working correctly
- Iterative refinement working (rate results, request more, agent applies learnings)

**Documentation:**
- Created comprehensive `USAGE.md` with all flags, examples, conversation flows
- Updated with iterative learning section per user feedback
- Includes examples for all categories

**Decisions Made:**
1. **Category Separation** - Recruiting = find PEOPLE (candidates), leadgen = find COMPANIES, job_search = find JOBS. Critical distinction that was initially confused but now clarified in prompts.
2. **Industry-Agnostic** - Recruiting and leadgen prompts work for any industry (tech, healthcare, legal, etc.), not just tech-focused.
3. **Two-Layer Prompts** - Keep base prompts generic, category prompts specific. Scales better.
4. **Auto-Transitions** - Step 3 auto-transitions from 'discovering_channels' to 'searching' status when approved channels exist.

**Outcome**: Complete, tested, documented progressive search system ready for use by incubator agents.

**Lessons:**
- Category-specific prompts are critical - generic doesn't work
- Iterative learning requires clear high/low rating thresholds (8-10 = good, 1-3 = bad)
- Deduplication must be explicit in prompts - "check previous results URLs"
- WebSearch with autonomous agents is powerful but requires clear instructions

---

## 2025-12-23: i6 Agent Setup

**What happened**: Set up i6 as infrastructure agent for Token Tank incubator.

**Decisions Made:**
1. **i6 is infrastructure, not a competitor** - Provides leadgen/search capabilities to other agents
2. **Documentation-first** - Created CLAUDE.md with usage examples and integration patterns
3. **Archived planning docs** - Moved old leadgen-agent-plan.md and PROGRESSIVE-SEARCH-PLAN.md to archives/
4. **Created TODO.md** - Clean list of remaining tasks (mostly polish and testing edge cases)

**Files Created:**
- `TODO.md` - Remaining tasks for progressive search improvements and i6 integration
- `CLAUDE.md` - Purpose, usage guide, integration patterns, learnings
- `LOG.md` - This file
- `usage.md` - Will track time/token usage (next step)

**Next Steps:**
1. Create usage.md for tracking
2. Answer clarifying questions about i6's role (see TODO.md)
3. Document integration pattern for other agents
4. Test with Forge (RivalAlert lead generation)

**Purpose Defined:**
- i6 operates the Progressive Search system
- Finds qualified leads for incubator product ideas
- Provides reusable infrastructure for any search category
- NOT competing - powering the incubator

---

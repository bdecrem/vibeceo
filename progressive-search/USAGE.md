# Progressive Search Agent System - Usage Guide

## Overview

The Progressive Search Agent System is a 3-step conversational search refinement tool that helps users find specific information (jobs, leads, candidates, general research) through an AI-guided process:

1. **Step 1 - Clarify Subject**: Refine the search query through conversational clarification
2. **Step 2 - Discover Channels**: Find the best websites/platforms to search
3. **Step 3 - Execute Search**: Autonomously browse channels and extract results

Each step uses Claude AI agents to guide the user through the process and execute commands automatically.

## Prerequisites

### Environment Variables Required

The progressive-search scripts use environment variables from `sms-bot/.env.local`. Ensure the following variables are set:

```bash
# Anthropic API (required for all steps)
ANTHROPIC_API_KEY=sk-ant-...

# Supabase Database (required for all steps)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=sb_publishable_...

# Claude Agent SDK Token (required for Steps 2 & 3)
# This is an Anthropic API key with WebSearch permissions enabled
CLAUDE_AGENT_SDK_TOKEN=sk-ant-...
```

### Dependencies

```bash
pip install anthropic supabase claude-agent-sdk python-dotenv
```

### Supported Categories

- `recruiting` - Find candidates (people to hire)
- `leadgen` - Find companies/business leads
- `general` - General purpose search for any acategories that arent implemented yet

---

## Step 1: Clarify Subject

### Purpose
Refine your initial search query through conversational clarification with the AI agent.

### Script

```bash
python step1-clarify.py
```

### Flags & Options

| Flag | Short | Required | Description |
|------|-------|----------|-------------|
| `--new` | `-n` | For new projects | Create a new project |
| `--msg` | `-m` | For new projects, optional otherwise | Your message to the agent |
| `--category` | `-c` | Optional (default: `general`) | Search category |
| `project_id` | - | For existing projects | UUID of existing project |

### Categories

- `recruiting` - Finding candidates to hire
- `leadgen` - Finding business leads/companies
- `general` - General purpose search

### Usage Examples

#### Create New Project

```bash
# Recruiting: Find software engineers
python step1-clarify.py --new -m "Find senior backend engineers" -c recruiting

# Lead Generation: Find B2B SaaS companies
python step1-clarify.py --new -m "Find B2B SaaS companies in HR space" -c leadgen

# General: Any other search
python step1-clarify.py --new -m "Research best project management tools" -c general
```

#### Continue Existing Project

```bash
# Respond to agent's clarification questions
python step1-clarify.py abc-123-def -m "Focus on companies with 50-200 employees"

# Provide additional details
python step1-clarify.py abc-123-def -m "Remote-friendly, US-based, Series A/B funded"
```

#### Check Project State

```bash
# View current status without sending a message
python step1-clarify.py abc-123-def
```

### Sample Conversation Flow

**Creating a recruiting project:**

```bash
$ python step1-clarify.py --new -m "Find senior backend engineers" -c recruiting
Creating new recruiting project...
✓ Project created: 95aa3677-a44a-4db9-b99a-b1921d76b207

Agent: I'd like to clarify a few details about the senior backend engineers you're looking for:

1. Which programming languages or tech stack are most important?
2. What company size or type are you targeting?
3. Any geographic preferences or remote work requirements?
4. Years of experience range?

{
  "success": true,
  "project_id": "95aa3677-a44a-4db9-b99a-b1921d76b207",
  "status": "refining_query",
  "is_confirmed": false,
  "next_step": "Continue refining: python step1-clarify.py 95aa3677-a44a-4db9-b99a-b1921d76b207 -m 'your response'"
}
```

**Continuing the conversation:**

```bash
$ python step1-clarify.py 95aa3677-a44a-4db9-b99a-b1921d76b207 -m "Python/Go, remote-friendly startups, 5+ years experience"

Agent: Perfect! So we're looking for senior backend engineers with 5+ years of experience in Python and/or Go who are open to remote work at startup companies.

To finalize, what stage startups are you interested in? (Early stage, Series A-C, late stage?)

{
  "status": "refining_query",
  "is_confirmed": false,
  "next_step": "Continue refining: python step1-clarify.py 95aa3677-a44a-4db9-b99a-b1921d76b207 -m 'your response'"
}
```

**Finalizing the subject:**

```bash
$ python step1-clarify.py 95aa3677-a44a-4db9-b99a-b1921d76b207 -m "Series A/B startups"

Agent: Excellent! Here's the clarified search subject:

**"Senior backend engineers (5+ years) with Python/Go experience, open to remote work at Series A/B startups"**

I've saved this and we're ready to move to Step 2 to discover the best channels for finding these candidates.

✅ Commands Executed:
   - SAVE_SUBJECT

{
  "success": true,
  "project_id": "95aa3677-a44a-4db9-b99a-b1921d76b207",
  "status": "discovering_channels",
  "clarified_subject": "Senior backend engineers (5+ years) with Python/Go experience, open to remote work at Series A/B startups",
  "is_confirmed": true,
  "next_step": "Run step 2: python step2-channels.py 95aa3677-a44a-4db9-b99a-b1921d76b207"
}
```

### Commands Available (Step 1)

The AI agent can execute these commands (user doesn't have access directly):

- `SAVE_SUBJECT` - Save the clarified search subject and transition to Step 2

---

## Step 2: Discover Channels

### Purpose
Use autonomous web search to discover the best websites, job boards, directories, or platforms where you should search for your clarified subject.

### Script

```bash
python step2-channels.py <project_id> [-m "optional message"]
```

### Flags & Options

| Flag | Short | Required | Description |
|------|-------|----------|-------------|
| `project_id` | - | Yes | UUID from Step 1 |
| `--msg` | `-m` | Optional | Feedback or refinement requests |

### Usage Examples

#### Start Channel Discovery

```bash
# Agent will automatically research channels via web search
python step2-channels.py 95aa3677-a44a-4db9-b99a-b1921d76b207
```

#### Provide Feedback

```bash
# Request specific types of channels
python step2-channels.py 95aa3677-a44a-4db9-b99a-b1921d76b207 -m "Focus on remote-first companies"

# Replace a channel
python step2-channels.py 95aa3677-a44a-4db9-b99a-b1921d76b207 -m "I don't like Hacker News, find something else (or you could ask it to rate Hacker News as a 1)"

# Request more channels
python step2-channels.py 95aa3677-a44a-4db9-b99a-b1921d76b207 -m "Add 2 more niche job boards"
```

#### Approve Channels

```bash
# Approve specific channels
python step2-channels.py 95aa3677-a44a-4db9-b99a-b1921d76b207 -m "approve channels 1, 2, and 3"

# Approve all channels
python step2-channels.py 95aa3677-a44a-4db9-b99a-b1921d76b207 -m "approve all channels"
```

### Sample Conversation Flow

**Starting channel discovery:**

```bash
$ python step2-channels.py 95aa3677-a44a-4db9-b99a-b1921d76b207

🔍 Step 2: Discovering Channels
Project: 95aa3677-a44a-4db9-b99a-b1921d76b207
Category: recruiting
Subject: Senior backend engineers (5+ years) with Python/Go experience, open to remote work at Series A/B startups

Status: discovering_channels
------------------------------------------------------------

🤖 Agent: Researching channels with web search...

I've discovered 5 high-quality channels for finding senior backend engineers:

1. **LinkedIn People Search - Backend Engineers** (10/10)
   URL: https://www.linkedin.com/search/results/people/?keywords=senior%20backend%20engineer
   Description: Professional network for finding candidates by skills, experience, and location

2. **GitHub User Search** (9/10)
   URL: https://github.com/search?type=users
   Description: Find developers by programming language, contributions, and location

3. **Stack Overflow Developer Stories** (8/10)
   URL: https://stackoverflow.com/jobs/developer-jobs
   Description: Developer profiles with skills, experience, and portfolio

4. **Wellfound (AngelList) Candidate Search** (9/10)
   URL: https://wellfound.com/candidates
   Description: Startup-focused talent platform for finding tech candidates

5. **Arc.dev** (8/10)
   URL: https://arc.dev/
   Description: Remote developer marketplace with vetted candidates

✅ Commands Executed:
   - SAVE_CHANNELS

{
  "success": true,
  "project_id": "95aa3677-a44a-4db9-b99a-b1921d76b207",
  "next_steps": "Found 5 channels. Review them, provide feedback, or approve to proceed to Step 3."
}
```

**Approving channels:**

```bash
$ python step2-channels.py 95aa3677-a44a-4db9-b99a-b1921d76b207 -m "approve all channels"

🤖 Agent: Great! I've approved all 5 channels for searching. You're now ready to proceed to Step 3.

✅ Commands Executed:
   - UPDATE_CHANNELS (marked 5 channels as approved)

{
  "success": true,
  "project_id": "95aa3677-a44a-4db9-b99a-b1921d76b207",
  "next_steps": "Channels approved! Ready for Step 3. Run: python step3-search.py 95aa3677-a44a-4db9-b99a-b1921d76b207"
}
```

### Commands Available (Step 2)

The AI agent can execute these commands:

- `SAVE_CHANNELS` - Save newly discovered channels (all start as unapproved)
- `UPDATE_CHANNELS` - Modify existing channels (adjust ratings, mark as approved, etc.)

### Important Notes for Step 2

**Recruiting vs Job Search:**
- `recruiting` category finds channels for sourcing CANDIDATES (LinkedIn People Search, GitHub users, portfolios)
- `job_search` category finds JOB BOARDS where job seekers apply (LinkedIn Jobs, Indeed, etc.)

**Channel Approval:**
- All channels start as unapproved (`is_approved=false`)
- You must explicitly approve channels before Step 3
- Only approved channels will be searched in Step 3

---

## Step 3: Execute Search

### Purpose
Autonomously browse approved channels and extract relevant results (job postings, company leads, candidate profiles, etc.).

### Script

```bash
python step3-search.py <project_id> [-m "optional message"]
```

### Flags & Options

| Flag | Short | Required | Description |
|------|-------|----------|-------------|
| `project_id` | - | Yes | UUID from Step 1 |
| `--msg` | `-m` | Optional | Feedback or refinement requests |

### 🔄 Iterative Learning & Feedback Loop

**Step 3 is designed for continuous refinement through an iterative feedback loop.**

Unlike Steps 1 and 2, Step 3 doesn't end after the first search. You can keep running the script with feedback messages, and the agent will:

1. **Learn from your ratings** - Rate results on a 1-10 scale to teach the agent your preferences
   - High-rated results (8-10): Agent identifies patterns to replicate (skills, company types, experience levels, etc.)
   - Low-rated results (1-3): Agent learns what to avoid in future searches

2. **Apply learnings to new searches** - When you request more results, the agent uses your previous ratings to:
   - Prioritize results similar to highly-rated ones
   - Filter out results similar to poorly-rated ones
   - Focus on the attributes you valued most

3. **Refine based on feedback** - Provide natural language feedback to adjust search criteria:
   - "Focus more on remote positions"
   - "I prefer candidates with open source contributions"
   - "Find companies with more recent funding"

4. **Build progressively better results** - Each iteration improves result quality based on accumulated feedback

**Example Iterative Flow:**
```bash
# First search - get initial results
python step3-search.py <uuid>

# Rate results to teach preferences
python step3-search.py <uuid> -m "Rate result 1 as 9/10, result 3 as 8/10, result 2 as 4/10"

# Agent learns: Results 1 & 3 are good matches, result 2 is not
# Request more results - agent applies learnings
python step3-search.py <uuid> -m "Find 5 more results"

# Agent returns results similar to #1 and #3, avoids patterns from #2

# Continue refining with more feedback
python step3-search.py <uuid> -m "These are better! Focus even more on remote positions"

# Keep iterating until you find the perfect match
python step3-search.py <uuid> -m "Mark result 7 as winner"
```

This iterative approach ensures you progressively narrow down to the best possible results through continuous agent learning.

### Usage Examples

#### Start Search

```bash
# Agent will visit approved channels and extract results
python step3-search.py 95aa3677-a44a-4db9-b99a-b1921d76b207
```

#### Provide Feedback

```bash
# Focus on specific criteria
python step3-search.py 95aa3677-a44a-4db9-b99a-b1921d76b207 -m "Focus on remote positions"

# Continue searching for more results
python step3-search.py 95aa3677-a44a-4db9-b99a-b1921d76b207 -m "Find 5 more results from different channels"
```

#### Rate Results

```bash
# Rate individual results (1-10 scale)
python step3-search.py 95aa3677-a44a-4db9-b99a-b1921d76b207 -m "Rate result 1 as 9/10, result 2 as 7/10"

# Add notes to results
python step3-search.py 95aa3677-a44a-4db9-b99a-b1921d76b207 -m "Add note to result 1: Great company culture"
```

#### Mark Favorites and Winners

```bash
# Mark results as favorites
python step3-search.py 95aa3677-a44a-4db9-b99a-b1921d76b207 -m "Add results 1 and 3 to favorites"

# Mark final winner (completes project)
python step3-search.py 95aa3677-a44a-4db9-b99a-b1921d76b207 -m "Mark result 1 as winner"
```

### Sample Conversation Flow

**Starting search execution:**

```bash
$ python step3-search.py 95aa3677-a44a-4db9-b99a-b1921d76b207

🔍 Step 3: Executing Search
Project: 95aa3677-a44a-4db9-b99a-b1921d76b207
Category: recruiting
Subject: Senior backend engineers (5+ years) with Python/Go experience, open to remote work at Series A/B startups
Approved Channels: 5

Status: searching
------------------------------------------------------------

🤖 Agent: Searching channels with web browsing...

I've found 5 qualified senior backend engineers:

1. **Jane Smith - Senior Backend Engineer**
   Location: San Francisco, CA (Remote available)
   Experience: 7 years with Python, Go, PostgreSQL, AWS
   Currently at: Stripe
   LinkedIn: https://linkedin.com/in/janesmith
   GitHub: https://github.com/janesmith (200+ repos, 1.5k stars)

2. **John Doe - Staff Backend Engineer**
   Location: Austin, TX (Remote)
   Experience: 9 years with Go, Python, Kubernetes, distributed systems
   Currently at: Uber
   LinkedIn: https://linkedin.com/in/johndoe
   Notable: Built high-scale payment infrastructure

3. **Alice Johnson - Senior Software Engineer**
   Location: Seattle, WA (Remote-friendly)
   Experience: 6 years with Python, Go, microservices architecture
   Currently at: Amazon
   LinkedIn: https://linkedin.com/in/alicejohnson
   Open source: Contributor to Go standard library

4. **Bob Williams - Principal Engineer**
   Location: New York, NY (Hybrid)
   Experience: 11 years with Python, Go, distributed databases
   Currently at: MongoDB
   LinkedIn: https://linkedin.com/in/bobwilliams
   Skills: Database internals, systems programming

5. **Carol Martinez - Senior Backend Developer**
   Location: Remote (US)
   Experience: 8 years with Python, Go, cloud infrastructure
   Currently at: HashiCorp
   LinkedIn: https://linkedin.com/in/carolmartinez
   Notable: Led infrastructure team at Series B startup

✅ Commands Executed:
   - SAVE_RESULTS

{
  "success": true,
  "project_id": "95aa3677-a44a-4db9-b99a-b1921d76b207",
  "results_count": 5,
  "next_steps": "Found 5 results. You can:\n  - Rate results: python step3-search.py 95aa3677-a44a-4db9-b99a-b1921d76b207 -m \"Rate result 1 as 8/10\"\n  - Continue searching: python step3-search.py 95aa3677-a44a-4db9-b99a-b1921d76b207 -m \"Find more remote positions\"\n  - Mark winner: python step3-search.py 95aa3677-a44a-4db9-b99a-b1921d76b207 -m \"Mark result 1 as winner\""
}
```

**Rating results:**

```bash
$ python step3-search.py 95aa3677-a44a-4db9-b99a-b1921d76b207 -m "Rate result 1 as 9/10 - excellent fit, result 2 as 8/10 - strong candidate"

🤖 Agent: I've updated the ratings for results 1 and 2.

✅ Commands Executed:
   - UPDATE_RESULTS
```

**Marking winner:**

```bash
$ python step3-search.py 95aa3677-a44a-4db9-b99a-b1921d76b207 -m "Mark result 1 as winner"

🤖 Agent: Congratulations! I've marked Jane Smith as the winning candidate. Your project is now complete.

✅ Commands Executed:
   - MARK_WINNER

{
  "success": true,
  "project_id": "95aa3677-a44a-4db9-b99a-b1921d76b207",
  "status": "completed",
  "next_steps": "Project complete! Review your winner result."
}
```

**Iterative refinement example (demonstrating learning loop):**

```bash
# First search - initial results
$ python step3-search.py 95aa3677-a44a-4db9-b99a-b1921d76b207
# Returns 5 candidates...

# Rate results to teach preferences
$ python step3-search.py 95aa3677-a44a-4db9-b99a-b1921d76b207 -m "Rate result 1 as 9/10 - love the remote experience and open source background. Rate result 3 as 8/10 - strong technical skills. Rate result 2 as 3/10 - too focused on on-site work."

🤖 Agent: I've updated your ratings. I notice you value remote experience and open source contributions highly, while on-site-focused candidates aren't a good fit.

✅ Commands Executed:
   - UPDATE_RESULTS

# Request more results - agent applies learnings
$ python step3-search.py 95aa3677-a44a-4db9-b99a-b1921d76b207 -m "Find 5 more candidates"

🤖 Agent: Based on your preferences (high ratings for remote-friendly candidates with open source contributions), I've found 5 more candidates:

6. **Sarah Chen - Senior Backend Engineer**
   Location: Remote (US)
   Experience: 8 years with Python, Go, distributed systems
   Open source: Maintainer of popular Python async library
   [Similar to your highly-rated results 1 & 3]

7. **Mike Rodriguez - Staff Engineer**
   Location: Remote (Canada)
   Experience: 10 years, contributed to Go standard library
   ...

# Continue refining
$ python step3-search.py 95aa3677-a44a-4db9-b99a-b1921d76b207 -m "These are great! Rate result 6 as 10/10. Add result 6 to favorites. Find 3 more like result 6"

🤖 Agent: Excellent! I've marked result 6 as 10/10 and added to favorites. Looking for 3 more candidates similar to Sarah Chen (remote, strong open source contributions, distributed systems expertise)...

# Each iteration progressively improves result quality based on your feedback
```

### Commands Available (Step 3)

The AI agent can execute these commands:

- `SAVE_RESULTS` - Save newly extracted results from channels
- `UPDATE_RESULTS` - Rate results (1-10), add notes, or update metadata
- `ADD_TO_FAVORITES` - Mark specific results as favorites
- `MARK_WINNER` - Mark final selection and complete project

### Result Numbering

Results are referenced by 1-based index:
- "result 1" = first result
- "result 2" = second result
- etc.

---

## Category-Specific Examples

### Recruiting (Find Candidates)

**Goal:** Find people to hire for a role

```bash
# Create project
python step1-clarify.py --new -m "Find senior product designers" -c recruiting

# Continue clarification
python step1-clarify.py <uuid> -m "Focus on B2B SaaS experience, remote-friendly"

# Discover channels (expects: LinkedIn People Search, Dribbble, Behance, etc.)
python step2-channels.py <uuid>

# Approve channels
python step2-channels.py <uuid> -m "approve all channels"

# Extract candidates
python step3-search.py <uuid>
```

**Expected Step 3 Results:**
- Person profiles (name, title, experience, skills)
- Portfolio links
- LinkedIn/GitHub profiles
- Contact information

---

### Lead Generation (Find Companies)

**Goal:** Find business leads or potential customers

```bash
# Create project
python step1-clarify.py --new -m "Find B2B SaaS companies in HR space, Series A-B" -c leadgen

# Continue clarification
python step1-clarify.py <uuid> -m "20-100 employees, US-based, selling to mid-market"

# Discover channels (expects: Crunchbase, AngelList, G2, BuiltWith, etc.)
python step2-channels.py <uuid>

# Approve channels
python step2-channels.py <uuid> -m "approve all channels"

# Extract companies
python step3-search.py <uuid>
```

**Expected Step 3 Results:**
- Company profiles (name, size, location, industry)
- Funding information (stage, amount, investors)
- Decision-maker contact info
- Technologies used
- Growth indicators

---

### Job Search (Find Job Opportunities)

**Goal:** Find jobs for a job seeker to apply to

```bash
# Create project
python step1-clarify.py --new -m "Looking for marketing manager positions" -c job_search

# Continue clarification
python step1-clarify.py <uuid> -m "Remote, B2B SaaS companies, 5+ years experience"

# Discover channels (expects: LinkedIn Jobs, Indeed, Wellfound Jobs, company career pages)
python step2-channels.py <uuid>

# Approve channels
python step2-channels.py <uuid> -m "approve all channels"

# Extract job postings
python step3-search.py <uuid>
```

**Expected Step 3 Results:**
- Job postings (title, company, location)
- Salary range
- Requirements and qualifications
- Benefits
- Application links

---

### General Search

**Goal:** Research or find any type of information

```bash
# Create project
python step1-clarify.py --new -m "Research best project management tools for remote teams" -c general

# Continue clarification
python step1-clarify.py <uuid> -m "Focus on tools with Slack integration, under $20/user/month"

# Discover channels
python step2-channels.py <uuid>

# Approve channels
python step2-channels.py <uuid> -m "approve all channels"

# Extract information
python step3-search.py <uuid>
```

**Expected Step 3 Results:**
- Flexible results based on search topic
- Product/service information
- Reviews and comparisons
- Links to resources

---

## Project Lifecycle

### Status Flow

```
refining_query → discovering_channels → searching → completed
```

1. **refining_query** - Step 1 active, clarifying subject
2. **discovering_channels** - Step 2 active, finding channels
3. **searching** - Step 3 active, extracting results
4. **completed** - Winner marked, project done

### Auto-Transitions

- Step 1: `SAVE_SUBJECT` command transitions to `discovering_channels`
- Step 2→3: When running Step 3 with approved channels, auto-transitions from `discovering_channels` to `searching`
- Step 3: `MARK_WINNER` command transitions to `completed`

---

## Troubleshooting

### Error: "CLAUDE_AGENT_SDK_TOKEN not set"

**Problem:** Steps 2 & 3 require web search/browsing capabilities

**Solution:** Get an Anthropic API key with WebSearch permissions enabled and add to `sms-bot/.env.local`:
```bash
CLAUDE_AGENT_SDK_TOKEN=your-api-key-here
```

### Error: "Project not found"

**Problem:** Invalid or non-existent project UUID

**Solution:** Double-check the UUID from Step 1 output

### Error: "No approved channels found"

**Problem:** Trying to run Step 3 without approving channels in Step 2

**Solution:** Go back to Step 2 and approve channels:
```bash
python step2-channels.py <uuid> -m "approve all channels"
```

### Error: "Invalid project status"

**Problem:** Running wrong step for current project status

**Solution:** Check current status:
```bash
python step1-clarify.py <uuid>  # View current state
```

Then run the appropriate step for the status.

### Warning: "claude-agent-sdk not installed"

**Problem:** Missing dependency for Steps 2 & 3

**Solution:** Install the SDK:
```bash
pip install claude-agent-sdk
```

---

## Tips & Best Practices

### Step 1 - Clarify Subject

- Be specific in your initial message
- Answer clarification questions thoughtfully
- The more detail you provide, the better the channel discovery and results

### Step 2 - Discover Channels

- Review channels carefully before approving
- Replace channels that don't fit: `"I don't like Channel X, find an alternative"`
- Request more channels if needed: `"Add 2 more niche platforms"`
- For recruiting: Make sure channels are for finding PEOPLE, not job boards

### Step 3 - Execute Search

- **Use the iterative feedback loop** - Don't stop after the first search! Keep providing feedback and requesting more results
- **Rate early and often** - Rate results on 1-10 scale as soon as you review them to teach the agent your preferences
- **Request more results after rating** - After rating initial results, ask for more: `"Find 5 more results"` - the agent will apply your learnings
- **Provide qualitative feedback** - Tell the agent what you like/dislike: `"Focus more on remote positions"` or `"I prefer candidates with open source contributions"`
- **Use favorites to shortlist** - Mark favorites as you go to track top options before choosing winner
- **Be patient with learning** - The more iterations and ratings you provide, the better the agent gets at finding what you want
- **Results include deduplication** - The agent automatically avoids returning duplicate URLs

### General

- Each step builds on the previous - complete them in order
- Project UUID is persistent - save it for later use
- All conversation history is preserved in the database
- You can provide feedback at any step to refine results

---

## Output Format

All scripts output JSON with:
- `success` - Boolean indicating success/failure
- `project_id` - Project UUID
- `category` - Search category
- `status` - Current project status
- `agent_response` - Cleaned response from agent
- `commands_executed` - List of commands executed
- `next_steps` - Guidance for next action

Example:
```json
{
  "success": true,
  "project_id": "95aa3677-a44a-4db9-b99a-b1921d76b207",
  "category": "recruiting",
  "status": "discovering_channels",
  "clarified_subject": "Senior backend engineers...",
  "agent_response": "I've saved the clarified subject...",
  "commands_executed": [
    {
      "command": "SAVE_SUBJECT",
      "success": true
    }
  ],
  "next_step": "Run step 2: python step2-channels.py 95aa3677-a44a-4db9-b99a-b1921d76b207"
}
```

---

## Database Schema

The system uses Supabase with these tables:

- `ps_projects` - Project records
- `ps_conversation` - Conversation history
- `ps_channels` - Discovered channels
- `ps_results` - Search results

All data is persisted and can be resumed at any time using the project UUID.

---

## Support & Documentation

For detailed system prompt information, see:
- `prompts/base_step1.txt` - Step 1 base prompt
- `prompts/base_step2.txt` - Step 2 base prompt
- `prompts/base_step3.txt` - Step 3 base prompt
- `prompts/step2/{category}.txt` - Category-specific channel discovery
- `prompts/step3/{category}.txt` - Category-specific result extraction

For database operations, see:
- `lib/db.py` - Database functions
- `lib/context_builder.py` - Context building for agents
- `lib/command_parser.py` - Command parsing and execution
- `lib/system_prompts.py` - Prompt loading logic

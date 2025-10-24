# arXiv Research Agent

**Daily curated AI research papers from arXiv.org with author intelligence tracking**

## Overview

The arXiv Research Agent is an autonomous daily agent that:
1. **Fetches ALL** AI/ML papers from arXiv.org (cs.AI, cs.LG, cs.CV, cs.CL, stat.ML)
2. **Stores ALL** papers with complete author tracking in a relational database
3. **Curates** the top 5-10 most significant papers using Claude Agent SDK
4. **Generates** a professional markdown report with curation reasoning
5. **Broadcasts** the curated digest to SMS subscribers daily at 6 AM PT
6. **Builds intelligence** over time: author notability scores, publication patterns, research trends

## Architecture

### Two-Stage Process

#### Stage 1: Fetch All Papers (`fetch_papers.py`)
- Uses official `arxiv` Python library
- Queries ALL papers submitted in last 24 hours
- Respects arXiv rate limit: **1 request per 3 seconds**
- Extracts full metadata: title, abstract, authors, categories, URLs
- Outputs JSON file with complete paper list

#### Stage 2: Curate & Report (`agent.py`)
- Uses **Claude Agent SDK** for autonomous curation
- Analyzes papers against 5 criteria:
  - Novelty (30%)
  - Impact Potential (25%)
  - Author Notability (20%)
  - Research Quality (15%)
  - Timeliness (10%)
- Selects top 5-10 papers with reasoning
- Generates 3-5 page markdown report
- Outputs featured paper metadata

#### TypeScript Orchestrator (`index.ts`)
- Runs both Python stages
- Stores ALL papers to database
- Upserts ALL authors
- Links papers to authors (many-to-many)
- Marks featured papers
- Calculates author notability scores
- Uploads report to Supabase Storage
- Returns metadata for SMS broadcasting

## Database Schema

### Tables Created

#### `arxiv_papers`
Stores ALL papers fetched from arXiv with significance signals:
- `arxiv_id` (PK) - e.g., "2501.12345v1"
- `title`, `abstract`, `categories[]`, `published_date`
- `arxiv_url`, `pdf_url`
- `author_notability_score` - Sum of all authors' scores
- `featured_in_report`, `featured_rank`, `curation_reason`
- `huggingface_trending`, `citation_count` (for future enrichment)

#### `arxiv_authors`
Tracks ALL unique authors with notability tracking:
- `name` (unique) - Normalized author name
- External profiles: `github_username`, `huggingface_username`, `google_scholar_id`
- `notability_score` - Composite score based on papers, GitHub stars, h-index
- `paper_count`, `featured_paper_count`
- `affiliations[]`, `research_areas[]`
- `first_seen_date`, `last_paper_date`

#### `arxiv_paper_authors`
Junction table for many-to-many relationship:
- `paper_id`, `author_id`, `author_position`
- Tracks authorship order (1=first author, 2=second, etc.)

#### `arxiv_daily_reports`
Metadata for each day's curated report:
- `report_date`, `total_papers_fetched`, `featured_papers_count`
- `report_path`, `report_url`, `summary`
- `generation_duration_seconds`

## Author Notability Scoring

### Formula (v1)
```
score = (paper_count × 5)
      + (featured_paper_count × 50)
      + (github_stars ÷ 10)
      + (h_index × 10)
      + profile_bonuses
```

### Profile Bonuses
- GitHub profile: +20
- HuggingFace profile: +20
- Google Scholar profile: +30

### Updates
- **Daily**: Increment paper_count, update last_paper_date
- **Weekly** (Phase 2): Refresh GitHub stars
- **Monthly** (Phase 3): Update h-index from Google Scholar

## SMS Commands

### User Commands
- `ARXIV` or `ARXIV REPORT` - Get today's curated report
- `ARXIV SUBSCRIBE` - Get daily digest at 6 AM PT
- `ARXIV UNSUBSCRIBE` - Stop daily digest
- `ARXIV AUTHOR <name>` - Search for author and see their papers
- `ARXIV TOP AUTHORS` - See top 10 researchers by notability
- `ARXIV STATS` - Database statistics
- `ARXIV HELP` - Command list

### Admin Commands (Bart only)
- `ARXIV RUN` - Regenerate report immediately

## Setup & Deployment

### 1. Database Migration

```bash
# Run the migration SQL file
psql <connection-string> -f sms-bot/migrations/001_create_arxiv_tables.sql
```

Or apply via Supabase Dashboard > SQL Editor

### 2. Python Dependencies

```bash
# Install in the shared virtual environment
cd /path/to/vibeceo8
source .venv/bin/activate
pip install -r sms-bot/agents/arxiv-research/requirements.txt
```

Dependencies:
- `arxiv>=2.1.0` - Official arXiv API client
- `claude-agent-sdk>=0.1.0` - Autonomous agent framework

### 3. Claude Code CLI

The Claude Agent SDK requires the `claude-code` CLI tool to be available in PATH.

**If you have `claude` installed but not `claude-code`:**

```bash
# Create symlink (one-time setup)
ln -s ~/.npm-global/bin/claude ~/.npm-global/bin/claude-code

# Verify it works
which claude-code
claude-code --version
```

**If you don't have Claude Code CLI installed:**

```bash
npm install -g @anthropic-ai/claude-code
```

### 4. Environment Variables

Add to `.env` or production environment:

```bash
# arXiv Agent Configuration
ARXIV_REPORT_HOUR=6           # Default: 6 AM PT
ARXIV_REPORT_MINUTE=0         # Default: :00
ARXIV_MAX_PAPERS=1000         # Safety limit for daily fetch
ARXIV_BROADCAST_DELAY_MS=150  # Delay between SMS sends

# Required (already set)
ANTHROPIC_API_KEY=sk-ant-...  # For Claude Agent SDK
SUPABASE_URL=https://...
SUPABASE_SERVICE_KEY=...
TWILIO_ACCOUNT_SID=...
TWILIO_AUTH_TOKEN=...
TWILIO_PHONE_NUMBER=...
```

### 5. Build & Restart

```bash
cd sms-bot
npm run build

# Restart SMS listener
# (if running as service, restart the service)
```

### 6. Test Manually

```bash
# Stage 1: Fetch papers
python3 agents/arxiv-research/fetch_papers.py \
  --output-dir data/arxiv-reports \
  --date 2025-10-20

# Stage 2: Curate (requires Stage 1 output)
python3 agents/arxiv-research/agent.py \
  --input-json data/arxiv-reports/arxiv_papers_2025-10-20.json \
  --output-dir data/arxiv-reports \
  --date 2025-10-20 \
  --verbose

# Full pipeline via TypeScript (recommended)
node dist/agents/arxiv-research/test-runner.js
```

## Daily Report Format

### Structure (3-5 pages)

```markdown
# AI Research Papers - Daily Curated Brief
**Date:** 2025-10-20
**Curated:** 7 papers from 127 total submissions

## Executive Summary
[2-3 sentences on key themes and breakthroughs]

## 🌟 Top Papers Today

### 1. [Paper Title] ⭐⭐⭐⭐⭐
**Authors:** Jane Smith, John Doe, Alice Chen
**Categories:** cs.LG, cs.AI

**Why this matters:** [Curation reason - 2-3 sentences]
**Key Innovation:** [1 sentence]
**Potential Impact:** [1 sentence]

📄 [arXiv](link) | 📥 [PDF](link)

[Repeat for 5-10 papers]

## 👥 Notable Authors Today
**Jane Smith** (3 papers today, Score: 850)
- Research: LLMs, Efficient Training
- 5 featured papers in last 30 days

## 📊 Daily Statistics
- Total papers: 127
- cs.LG: 47 (2 featured)
- cs.CV: 38 (3 featured)
[...]
```

## Querying the Database

### Example Queries

```typescript
// Get all papers by an author
import * as db from './agents/arxiv-research/database.js';

const author = await db.getAuthorByName('Yann LeCun');
const papers = await db.getPapersByAuthor(author.id);

// Search authors
const results = await db.searchAuthorsByName('Geoffrey Hinton');

// Get top authors
const top = await db.getTopAuthors(10);

// Get featured papers from a specific date
const dbReport = await db.getDailyReportByDate('2025-10-20');
```

### SQL Queries

```sql
-- Papers by author
SELECT p.*
FROM arxiv_papers p
JOIN arxiv_paper_authors pa ON p.id = pa.paper_id
JOIN arxiv_authors a ON pa.author_id = a.id
WHERE a.name ILIKE '%LeCun%';

-- Top authors
SELECT name, notability_score, paper_count, featured_paper_count
FROM arxiv_authors
ORDER BY notability_score DESC
LIMIT 10;

-- Papers with notability > 500
SELECT title, author_notability_score
FROM arxiv_papers
WHERE author_notability_score > 500
ORDER BY author_notability_score DESC;

-- Authors who published today
SELECT a.*
FROM arxiv_authors a
WHERE a.last_paper_date = CURRENT_DATE
ORDER BY a.notability_score DESC;
```

## Future Enhancements

### Phase 2: GitHub Integration
- Search GitHub profiles by author name
- Link authors to repositories
- Track total GitHub stars
- Update notability scores

### Phase 3: HuggingFace & Citations
- Check if papers are trending on HuggingFace Papers
- Track paper upvotes
- Integrate Semantic Scholar API for citations
- Google Scholar API for h-index

### Phase 4: Intelligence Features
- Weekly "Rising Stars" report (new authors with sudden activity)
- Author collaboration networks
- Research trend analysis
- Personalized feeds ("papers by authors you follow")
- Real-time alerts ("your followed author just published")

## Rate Limiting

**CRITICAL**: arXiv Terms of Service require **1 request per 3 seconds**

Our implementation:
```python
client = arxiv.Client(
    page_size=100,
    delay_seconds=3,  # Enforced by library
    num_retries=3
)
```

The `arxiv` library handles rate limiting automatically. Do NOT modify this.

## File Structure

```
sms-bot/agents/arxiv-research/
├── fetch_papers.py       # Stage 1: Fetch all papers
├── agent.py              # Stage 2: Curate with Claude
├── index.ts              # TypeScript orchestrator
├── database.ts           # All database operations
├── requirements.txt      # Python dependencies
└── README.md             # This file

sms-bot/commands/
└── arxiv.ts              # SMS command handler

sms-bot/migrations/
└── 001_create_arxiv_tables.sql  # Database schema
```

## Troubleshooting

### "Missing claude_agent_sdk"
```bash
pip install claude-agent-sdk
```

### "Fatal error in message reader" / "Command failed with exit code 1"
This means the Claude Agent SDK cannot find the `claude-code` CLI tool. Solutions:

1. Create symlink if you have `claude` but not `claude-code`:
   ```bash
   ln -s ~/.npm-global/bin/claude ~/.npm-global/bin/claude-code
   ```

2. Or install Claude Code CLI:
   ```bash
   npm install -g @anthropic-ai/claude-code
   ```

3. Verify it works:
   ```bash
   which claude-code  # Should show path to executable
   claude-code --version  # Should show version number
   ```

### "arXiv API rate limit exceeded"
Check that `delay_seconds=3` in client configuration. Wait 3 seconds between requests.

### "No papers found"
Normal on some days. AI categories may have < 10 papers on weekends.

### "Curation failed"
Check ANTHROPIC_API_KEY is set. Agent requires API access.

### "Database permission denied"
Verify SUPABASE_SERVICE_KEY is correct and has write permissions.

## Performance

Typical execution times:
- **Stage 1 (Fetch)**: 2-5 minutes (100-150 papers with 3s delays)
- **Stage 2 (Curate)**: 3-7 minutes (Claude analyzes all papers)
- **Database Storage**: < 30 seconds
- **Total**: 5-15 minutes depending on paper volume

## Cost Estimates

Daily operational costs:
- **arXiv API**: Free (with rate limiting compliance)
- **Claude API** (curation): ~$0.10-0.30 per day (analyzing 100-150 papers)
- **Supabase**: Negligible (< 1MB storage per day)
- **SMS**: $0.0079 per message × subscribers

Monthly cost for 100 subscribers: ~$30-40

## Support

Questions or issues? Check:
1. `sms-bot/documentation/AGENT-PIPELINE.md` - Agent infrastructure patterns
2. `sms-bot/documentation/claude-agent-sdk.txt` - SDK usage guide
3. Database logs for query errors
4. Python script output for fetch/curation errors

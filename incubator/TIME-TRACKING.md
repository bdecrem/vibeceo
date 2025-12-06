# Time Tracking Methodology

How to estimate Claude Code "time spent" on incubator projects.

## The Formula

```
Hours = Output Tokens / 50,000
```

This ratio is based on observed work patterns: ~50k output tokens represents roughly 1 hour of Claude Code productive work.

## How to Measure

### Option 1: Full Session Count

Get total output tokens from all JSONL files for the project:

```bash
grep -o '"output_tokens":[0-9]*' ~/.claude/projects/-Users-bart-Documents-code-vibeceo/*.jsonl | \
  cut -d: -f3 | awk '{sum+=$1} END {printf "%.1f hours\n", sum/50000}'
```

### Option 2: Per-Date Count

Filter by modification date to get tokens for specific days:

```bash
# Get files modified on a specific date
ls -l ~/.claude/projects/-Users-bart-Documents-code-vibeceo/*.jsonl | grep "Dec  5" | \
  awk '{print $NF}' | xargs grep -o '"output_tokens":[0-9]*' | \
  cut -d: -f3 | awk '{sum+=$1} END {printf "%.1f hours\n", sum/50000}'
```

### Option 3: Git-Based Verification

Lines of code can verify productive output:

```bash
# LOC for specific folder
git log --oneline --all -- 'incubator/i1/*' | wc -l  # commits
git diff --stat $(git log --oneline -- 'incubator/i1/*' | tail -1 | cut -d' ' -f1)..HEAD -- 'incubator/i1/*'
```

Rough ratio: **200 LOC committed ≈ 1 hour** (but doesn't capture rolled-back work)

## Challenge: Multi-Project Sessions

When working on multiple things in one session (e.g., i1 + Token Tank fixes), estimate the percentage:

| Session Work | Estimate |
|--------------|----------|
| 100% on one project | Use full token count |
| Mixed work | Estimate % by messages/tasks |

## Updating usage.md

Each agent should update their `usage.md` after sessions:

```markdown
## Week of 2025-12-04

### Claude Code Sessions
| Date | Output Tokens | Hours | Task |
|------|---------------|-------|------|
| 2025-12-04 | 50,000 | 1.0 | Market research, pitches |
| 2025-12-05 | 25,000 | 0.5 | Pivot decision, cleanup |

**Week Total: 1.5 / 40 hours**
```

## Tools

- **ccusage**: CLI tool for analyzing Claude Code usage - [github.com/ryoppippi/ccusage](https://github.com/ryoppippi/ccusage)
- **Claude Code /cost**: Built-in command shows session cost and duration
- **JSONL files**: Located at `~/.claude/projects/<project-path>/`

## Calibration Notes

- 50k tokens/hour is a rough estimate based on Dec 2025 observations
- Adjust if your work patterns differ significantly
- Research-heavy work may have higher token counts per productive hour
- Code-heavy work may have lower token counts per productive hour

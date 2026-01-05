# Token Tank Skills Backup

This directory contains backup copies of all Token Tank Claude Code skills.

## Setup on a New Machine

Copy all skill directories to your `.claude/skills/` directory:

```bash
# From the project root
mkdir -p .claude/skills
cp -r incubator/documentation/skills/* .claude/skills/
```

## Available Skills

### Market Research
- **inc-research** - Validates business ideas through competitor analysis, domain checks, market validation, and pricing intelligence

### Design Review
- **inc-design** - Reviews landing pages, user interfaces, branding decisions, and conversion paths

### Executive Review
- **inc-exec** - Provides frank assessment of business viability, pivot/kill decisions, and resource allocation

### Progressive Search
- **inc-progsearch** - Research system for finding companies, candidates, jobs through guided 3-step process

## Skill Structure

Each skill is a directory containing:
- `SKILL.md` - The skill definition with frontmatter and instructions

## Keeping Backups Updated

When you modify a skill in `.claude/skills/`, update the backup:

```bash
cp .claude/skills/<skill-name>/SKILL.md incubator/documentation/skills/<skill-name>/
```

## Usage

Skills can be invoked by autonomous agents using the Skill tool:

```python
# From an autonomous agent
skill: "inc-research"
args: "competitor monitoring for indie hackers"
```

Or manually via the Skill command in Claude Code.

## See Also

- `incubator/SUBAGENTS.md` - Full documentation on when and how to use each skill
- `incubator/documentation/commands/` - Slash commands for persona activators

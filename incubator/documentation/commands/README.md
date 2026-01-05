# Token Tank Commands Backup

This directory contains backup copies of all Token Tank Claude Code slash commands.

## Setup on a New Machine

Copy all `.md` files to your `.claude/commands/` directory:

```bash
# From the project root
mkdir -p .claude/commands
cp incubator/documentation/commands/*.md .claude/commands/
```

## Available Commands

### Manager
- `/boss` - Activate Apex (i0) - operational overseer

### Business Builders
- `/forge` - Activate Forge (i1) - Ship to Learn
- `/nix` - Activate Nix (i2) - AI-Native

### Traders
- `/drift` - Activate Drift (i3-2) - Research-First
- `/pulse` - Activate Pulse (i3-1) - Two-Tier System

### Researchers
- `/echo` - Activate Echo (i4) - Pattern Recognition

### Support/Tools
- `/i6` - Progressive Search Interface
- `/inc-research` - Market research agent
- `/inc-design` - Design review agent
- `/inc-exec` - Executive review agent
- `/news` - Daily news briefing

## Keeping Backups Updated

When you modify a command in `.claude/commands/`, update the backup:

```bash
cp .claude/commands/<command>.md incubator/documentation/commands/
```

## See Also

- `incubator/SUBAGENTS.md` - Full documentation on when and how to use each command
- `incubator/documentation/skills/` - Skills that autonomous agents can invoke
- `sms-bot/documentation/subagents/` - Amber-related commands (main project)

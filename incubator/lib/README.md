# Incubator Shared Libraries

Python libraries for Token Tank autonomous agents.

## agent_messages.py

Agent self-learning and cross-agent communication system.

### Purpose

Allows agents to:
1. **Learn from themselves** - Write notes about what works/fails, read them in future runs
2. **Learn from others** - Read broadcasts from all agents to avoid repeating mistakes
3. **Collaborate** - Send direct messages to specific agents when needed

### Installation

No installation needed - already available to all incubator agents.

### Usage

```python
# Import the library (adjust path based on your agent location)
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent / 'lib'))

from agent_messages import (
    read_my_messages,
    read_broadcasts,
    read_inbox,
    read_all_for_agent,
    write_message,
    filter_by_tags,
    filter_by_type,
    get_message_summary
)
```

### Reading Messages

#### Read your own self-notes

```python
# Get self-notes from last 30 days
my_notes = read_my_messages('i3-2', days=30)

for note in my_notes:
    print(f"[{note['type']}] {note['content']}")
    print(f"  Tags: {note['tags']}")
    print(f"  Context: {note['context']}")
```

#### Read broadcasts from all agents

```python
# Get broadcasts from last 7 days
broadcasts = read_broadcasts(days=7)

for msg in broadcasts:
    print(f"From {msg['agent_id']}: {msg['content']}")
```

#### Read your inbox (direct messages)

```python
# Get direct messages sent to you
inbox = read_inbox('i3-2', days=7)

for msg in inbox:
    print(f"From {msg['agent_id']}: {msg['content']}")
```

#### Read everything at once

```python
# Get all messages relevant to this agent
all_msgs = read_all_for_agent('i3-2', days=30)

print(f"Self-notes: {len(all_msgs['self'])}")
print(f"Broadcasts: {len(all_msgs['broadcasts'])}")
print(f"Inbox: {len(all_msgs['inbox'])}")
```

### Writing Messages

#### Write a self-note

```python
write_message(
    agent_id='i3-2',
    scope='SELF',
    type='lesson',
    content='Stocks under $5 had 30% worse performance. Avoid in future.',
    tags=['trading', 'stock-selection', 'price-threshold'],
    context={'sample_size': 15, 'win_rate': 0.45, 'avg_loss': -0.08}
)
```

#### Broadcast to all agents

```python
write_message(
    agent_id='i1',
    scope='ALL',
    type='warning',
    content='Always check domain availability BEFORE building. Wasted 12 hours on taken name.',
    tags=['validation', 'naming', 'competitor-research'],
    context={'postmortem': 'postmortem-competitorpulse.md', 'hours_wasted': 12}
)
```

#### Send direct message to another agent

```python
write_message(
    agent_id='i3-2',
    scope='DIRECT',
    recipient='i4',
    type='observation',
    content='Echo: Found interesting pattern in arxiv ML papers about trading signals',
    tags=['research', 'trading', 'arxiv']
)
```

### Message Types

| Type | When to Use |
|------|-------------|
| `lesson` | Something you learned that you'll apply going forward |
| `warning` | A mistake or failure to avoid |
| `success` | Something that worked well |
| `failure` | Something that didn't work |
| `observation` | Interesting finding or insight |

### Filtering Messages

```python
# Get all messages
messages = read_my_messages('i3-2', days=30)

# Filter by tags
trading_msgs = filter_by_tags(messages, ['trading', 'stock-selection'])

# Filter by type
lessons = filter_by_type(messages, 'lesson')
warnings = filter_by_type(messages, 'warning')
```

### Message Summary

```python
# Get quick summary of message counts
summary = get_message_summary('i3-2', days=30)

print(f"Self-notes: {summary['self_notes_count']}")
print(f"Broadcasts: {summary['broadcasts_count']}")
print(f"Inbox: {summary['inbox_count']}")
print(f"Total: {summary['total_count']}")
```

## Example: Drift's Learning Loop

```python
# In Drift's agent.py - on startup
from agent_messages import read_my_messages, read_broadcasts, write_message

# Load recent learnings
my_notes = read_my_messages('i3-2', days=30)
broadcasts = read_broadcasts(days=7)

print(f"Loaded {len(my_notes)} self-notes and {len(broadcasts)} broadcasts")

# Apply learnings to current strategy
for note in my_notes:
    if 'price-threshold' in note['tags']:
        # Adjust strategy based on past learnings
        min_price = note['context'].get('min_price', 5.0)
        print(f"Applying lesson: Avoid stocks under ${min_price}")

# ... trading logic ...

# After making a decision
if trade_failed:
    write_message(
        agent_id='i3-2',
        scope='SELF',
        type='failure',
        content=f"Lost {pnl}% on {symbol}. Thesis: {thesis}. What went wrong: {why_failed}",
        tags=['trading', 'loss', symbol_category],
        context={'symbol': symbol, 'pnl': pnl, 'thesis': thesis}
    )

if major_insight:
    write_message(
        agent_id='i3-2',
        scope='ALL',
        type='lesson',
        content='News sentiment check before entry improved win rate from 50% to 87.5%',
        tags=['trading', 'news-sentiment', 'validated-rule'],
        context={'sample_size': 8, 'win_rate': 0.875}
    )
```

## Database Schema

**Table**: `incubator_messages`

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `agent_id` | TEXT | Sender agent identifier |
| `recipient` | TEXT | Recipient for DIRECT messages (null otherwise) |
| `scope` | TEXT | SELF, ALL, or DIRECT |
| `type` | TEXT | lesson, warning, success, failure, observation |
| `content` | TEXT | The message text |
| `tags` | TEXT[] | Searchable categories |
| `context` | JSONB | Flexible metadata |
| `created_at` | TIMESTAMPTZ | Auto-generated timestamp |

## Error Handling

All functions will raise exceptions on failure:

```python
try:
    write_message(
        agent_id='i3-2',
        scope='DIRECT',  # Missing recipient!
        type='lesson',
        content='Test message'
    )
except ValueError as e:
    print(f"Validation error: {e}")
```

Common validation errors:
- `recipient required when scope='DIRECT'`
- `recipient must be None when scope != 'DIRECT'`
- `Invalid scope: XYZ. Must be SELF, ALL, or DIRECT`
- `Invalid type: XYZ`

## Environment Variables

The library requires these environment variables in `sms-bot/.env.local`:

- `SUPABASE_URL` - Your Supabase project URL
- `SUPABASE_ANON_KEY` - Supabase anon key (has RLS policies allowing access)

These are already configured in the project.

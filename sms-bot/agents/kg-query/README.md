# KG Query Agent - Agentic Neo4j Queries

## Overview

The KG Query Agent provides conversational access to the arXiv research knowledge graph stored in Neo4j. It uses Claude Agent SDK with custom MCP tools to enable **true agentic behavior** - Claude iteratively queries the database until it finds the answer.

## Architecture

### Agentic Loop

```
User Query → Claude Agent SDK → Claude AI
                ↓
          ToolUseBlock
                ↓
    Neo4j SDK MCP Server
                ↓
         neo4j_tools.py
                ↓
         Neo4j Database
                ↓
         Results → Claude
                ↓
    (Repeat until satisfied)
                ↓
            Final Answer
```

### Components

1. **agent.py** - Main agent orchestrator using `ClaudeSDKClient`
2. **neo4j_sdk_tools.py** - MCP tool definitions with `@tool` decorator
3. **neo4j_tools.py** - Low-level Neo4j driver wrapper
4. **index.ts** - TypeScript wrapper for SMS bot integration

### Tools Available to Claude

- `mcp__neo4j__execute_cypher` - Execute Cypher queries
- `mcp__neo4j__get_schema` - Get database schema
- `mcp__neo4j__get_data_quality_status` - Check clean data boundaries

## Key Features

### True Agentic Behavior

Claude decides:
- What queries to run
- When to explore vs drill down
- How to adapt when data is missing
- When it has enough information to answer

Example query flow (15 tool calls):
1. Get schema (understand structure)
2. Get data quality status (check boundaries)
3. Exploratory query (see what's available)
4. Refined query 1 (filter by criteria)
5. Refined query 2 (different approach)
...
15. Final query (get specific results)

### No Hardcoded Templates

Unlike the previous version, there are NO pre-defined query templates or intent classifiers. Claude writes all queries dynamically based on:
- User's question
- Database schema
- Previous query results
- Data quality constraints

## Usage

### SMS Command

```
kg <your question>
```

Examples:
- `kg give me 2 up and coming authors in California`
- `kg what papers were published today on transformers?`
- `kg who are the top researchers in computer vision?`
- `kg show me trending topics this week`

### Local Testing

```bash
cd sms-bot/agents/kg-query

# Run test script
./test-agentic.sh

# Or run directly
source .venv/bin/activate
export KG_AGENT_DEBUG=1
python3 agent.py --input '{"query": "your question", ...}'
```

## Setup

### Prerequisites

- Python 3.10+
- Neo4j database (configured in .env)
- Claude Agent SDK v0.1.6+

### Environment Variables

```bash
NEO4J_URI=neo4j+s://xxx.databases.neo4j.io:7687
NEO4J_USERNAME=neo4j
NEO4J_PASSWORD=your-password
NEO4J_DATABASE=neo4j
ANTHROPIC_API_KEY=sk-ant-xxx
CLAUDE_CODE_OAUTH_TOKEN=your-token  # For SDK
```

### Installation

The agent uses a virtual environment with specific SDK version:

```bash
cd sms-bot/agents/kg-query

# Virtual environment already configured
source .venv/bin/activate

# Verify
python3 -c "import claude_agent_sdk; print(claude_agent_sdk.__version__)"
# Should show: 0.1.6
```

## Critical Implementation Details

### Message Parsing

**The most important lesson learned**: SDK messages must be parsed correctly to detect tool calls.

❌ **WRONG** (doesn't work):
```python
if message.type == "tool_use":
    # Never triggers!
```

✅ **CORRECT** (works):
```python
content = getattr(message, "content", None)
if isinstance(content, list):
    for block in content:
        if type(block).__name__ == "ToolUseBlock":
            # This correctly detects tool calls
```

See `sms-bot/documentation/CLAUDE-AGENT-SDK-GUIDE.md` for full details.

### Why This Matters

Without correct parsing:
- Tools ARE called (queries execute)
- But you can't track usage
- Debug logs show "0 tool calls"
- Appears broken when it's actually working

With correct parsing:
- See exactly what Claude is doing
- Track token costs per tool call
- Debug query strategy
- Verify agentic behavior

## Data Quality Awareness

The agent understands the knowledge graph has two data quality levels:

1. **Papers**: All papers available (Feb 2024 - present)
2. **Authors**: Only "clean" authors with verified identities

Clean authors have:
- `canonical_kid IS NOT NULL` - Fuzzy matched to canonical identity
- `migrated_from_old_system = true` - Migrated from old system
- Date range: ~Feb 2024 to Oct 2025 (~73% of papers)

The agent automatically:
- Queries all papers without restrictions
- Filters author queries to clean data only
- Explains data limitations in responses

## Performance

### Typical Query

- **Tool Calls**: 10-20 per query
- **Duration**: 10-30 seconds
- **Cost**: ~$0.005 per query
- **Tokens**: ~25K input + ~100 output

### Optimization

The agent self-optimizes:
- Starts with broad queries
- Refines based on results
- Stops when satisfied
- Uses LIMIT clauses appropriately

No manual tuning needed!

## Deployment

### Local Development

Uses `.venv` with SDK v0.1.6:
```bash
source .venv/bin/activate
python3 agent.py --input '...'
```

### Railway Production

The SMS bot (index.ts) uses system Python with globally installed SDK. The agent runs in-process (no external MCP server needed).

**Important**: Railway needs SDK v0.1.6+ installed:
```bash
pip3 install claude-agent-sdk==0.1.6
```

## Debugging

### Enable Debug Mode

```bash
export KG_AGENT_DEBUG=1
```

Shows:
- Each message type received
- Tool calls with tool names
- Total tool call count
- Query durations

### Common Issues

**Problem**: "0 tool calls" reported but queries execute

**Cause**: Incorrect message parsing

**Fix**: See "Critical Implementation Details" above

---

**Problem**: Tools not being called at all

**Check**:
1. SystemMessage shows tools registered
2. `allowed_tools` has correct names
3. `permission_mode="acceptEdits"`
4. SDK version >= 0.1.6

---

**Problem**: Agent gives generic answers

**Cause**: Claude isn't using tools, answering from prompt

**Fix**:
- Check SystemMessage shows `mcp_servers: [{'name': 'neo4j', 'status': 'connected'}]`
- Verify tools are in the tools list
- Try simple test (test-simple.py) first

## Examples

### Example 1: Emerging Researchers

**Query**: "Give me 2 up and coming authors in California"

**Tool Calls**:
1. get_schema → understand Author properties
2. get_data_quality_status → check date range
3. execute_cypher → explore author counts
4. execute_cypher → filter by last_seen date
5. execute_cypher → try h_index range
... (15 total)

**Result**: Found authors, explained affiliation data unavailable, provided alternatives

### Example 2: Recent Papers

**Query**: "What papers came out today on transformers?"

**Tool Calls**:
1. get_schema → understand Paper properties
2. execute_cypher → papers from today
3. execute_cypher → filter by category
4. execute_cypher → search title/abstract

**Result**: List of papers with arxiv IDs and summaries

## Migration Notes

### From Previous Version

**Old Architecture** (commit 9d4426927):
- Intent classifier (hardcoded rules)
- Pre-defined query templates
- Single query execution
- Format results as text
- Pass to Claude for summarization

**New Architecture** (commit 65d46bd36):
- No intent classification
- Claude writes queries dynamically
- Multiple iterative queries
- True agentic behavior
- Direct tool execution

**Benefits**:
- ✅ Handles complex multi-criteria queries
- ✅ Adapts to unexpected data
- ✅ No template maintenance
- ✅ Better answers through iteration

**Trade-offs**:
- ⚠️ Slightly higher token costs
- ⚠️ Slightly slower (more queries)
- ✅ But much better quality!

## Resources

- **SDK Guide**: `sms-bot/documentation/CLAUDE-AGENT-SDK-GUIDE.md`
- **Agent Pipeline**: `sms-bot/documentation/AGENT-PIPELINE.md`
- **Official SDK Docs**: https://docs.claude.com/en/api/agent-sdk/

## Contributing

When modifying this agent:

1. **Test locally first** with `test-agentic.sh`
2. **Check tool call count** - should be >0 for any real query
3. **Verify message parsing** - use debug mode
4. **Review query patterns** - Claude's strategy evolves
5. **Update this README** if architecture changes

## License

Part of the VibeCEO/kochi.to project.

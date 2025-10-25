# Neo4j MCP Server Setup

This guide explains how to set up the Neo4j MCP server for Claude Code to query your Neo4j database.

## Prerequisites

1. **Install `uv` (includes `uvx`)**:
   ```bash
   brew install uv
   ```

2. **Neo4j Database**: You need a running Neo4j instance (Aura, Desktop, or self-hosted)

## Installation Steps

### 1. Create MCP Configuration File

Create `.mcp.json` at your **project root**:

```json
{
  "mcpServers": {
    "neo4j": {
      "type": "stdio",
      "command": "uvx",
      "args": ["mcp-neo4j-cypher", "--transport", "stdio"],
      "env": {
        "NEO4J_URI": "neo4j+s://YOUR-INSTANCE.databases.neo4j.io:7687",
        "NEO4J_USERNAME": "neo4j",
        "NEO4J_PASSWORD": "YOUR-PASSWORD",
        "NEO4J_DATABASE": "neo4j"
      }
    }
  }
}
```

**Replace the following:**
- `YOUR-INSTANCE` - Your Neo4j Aura instance ID
- `YOUR-PASSWORD` - Your Neo4j password
- `neo4j` - Your database name (if different)

### 2. Connection String Formats

**For Neo4j Aura (cloud):**
```
neo4j+s://your-instance.databases.neo4j.io:7687
```

**For local Neo4j:**
```
bolt://localhost:7687
```

**For self-hosted with SSL:**
```
neo4j+s://your-domain.com:7687
```

### 3. Add to .gitignore

**CRITICAL**: Protect your credentials by adding `.mcp.json` to `.gitignore`:

```bash
echo ".mcp.json" >> .gitignore
```

### 4. Restart Claude Code

1. Quit Claude Code completely
2. Start from your project directory:
   ```bash
   cd /path/to/your/project
   claude-code
   ```

3. When prompted about the Neo4j MCP server:
   - Select **"1. Use this and all future MCP servers in this project"**

### 5. Verify Installation

Once Claude Code loads, ask it:
```
What Neo4j MCP tools do you have available?
```

You should see:
- `mcp__neo4j__get_neo4j_schema`
- `mcp__neo4j__read_neo4j_cypher`
- `mcp__neo4j__write_neo4j_cypher`

## Troubleshooting

### MCP Server Shows "failed"

1. **Check logs**:
   ```bash
   ls -lt ~/Library/Caches/claude-cli-nodejs/-*-code-*/mcp-logs-neo4j/
   ```

2. **View latest log**:
   ```bash
   tail -50 ~/Library/Caches/claude-cli-nodejs/-*-code-*/mcp-logs-neo4j/*.txt
   ```

### Common Issues

**"Connection reset by peer"**
- You're using `neo4j://` instead of `neo4j+s://` for Aura
- Solution: Use `neo4j+s://` for encrypted connections

**"NEO4J_URI must start with bolt:// or neo4j://"**
- Wrong MCP server package (using `@johnymontana/neo4j-mcp`)
- Solution: Use `mcp-neo4j-cypher` with `uvx` as shown above

**"APOC plugin not installed"**
- The `get_neo4j_schema` tool requires APOC
- Solution: Install APOC plugin in your Neo4j instance (Aura has it by default)

**MCP server not loading after config change**
- Claude Code caches the old config
- Solution: Fully quit and restart Claude Code (don't just click "Reconnect")

## Security Notes

1. **Never commit `.mcp.json` to git** - it contains credentials
2. **Rotate credentials** if accidentally committed to git history
3. Use environment variables for extra security (optional):
   ```json
   "env": {
     "NEO4J_URI": "${NEO4J_URI}",
     "NEO4J_PASSWORD": "${NEO4J_PASSWORD}"
   }
   ```

## Available Tools

### get_neo4j_schema
```
Lists all nodes, their attributes, and relationships
No parameters needed
```

### read_neo4j_cypher
```cypher
Execute read-only queries:
MATCH (p:Paper) RETURN p LIMIT 10
```

### write_neo4j_cypher
```cypher
Execute write queries:
CREATE (p:Paper {title: "New Paper"})
```

## References

- **Official Neo4j MCP**: https://github.com/neo4j-contrib/mcp-neo4j
- **Neo4j Aura**: https://neo4j.com/cloud/aura/
- **Claude Code MCP Docs**: https://docs.claude.com/en/docs/claude-code/mcp

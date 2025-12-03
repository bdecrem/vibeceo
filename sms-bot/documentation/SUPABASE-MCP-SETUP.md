# Supabase MCP Setup Guide

This guide explains how to set up the Supabase MCP server for Claude Code on a new development machine.

## Quick Setup (Recommended)

The `.mcp.json` file is gitignored (contains secrets), so it won't exist on a fresh clone. The easiest approach:

**Option A: Copy from another machine**
- Copy `.mcp.json` from a machine that already has it configured
- Or ask Claude Code on the other machine to show you the config

**Option B: Create it manually**

Create `.mcp.json` in the project root with:

```json
{
  "mcpServers": {
    "supabase": {
      "command": "npx",
      "args": [
        "-y",
        "@supabase/mcp-server-supabase",
        "--project-ref",
        "tqniseocczttrfwtpbdr"
      ],
      "env": {
        "SUPABASE_ACCESS_TOKEN": "sbp_XXXXX"
      }
    }
  }
}
```

Get the actual token from:
- Another team member's `.mcp.json`
- Or generate a new one at https://supabase.com/dashboard/account/tokens

Then **restart Claude Code** for the MCP server to load.

---

## Detailed Setup (Alternative)

If the quick setup doesn't work, follow these detailed steps.

## What You Get

Once configured, Claude Code can directly:
- List and inspect database tables
- Execute SQL queries
- Apply migrations
- Search Supabase documentation
- Generate TypeScript types
- View logs and advisories

## Prerequisites

1. **Node.js** (v18+) and **npm** installed
2. **Claude Code** installed and working
3. Access to the Supabase project

## Step 1: Get Your Supabase Access Token

This is the tricky part that causes most setup failures.

### Generate a Personal Access Token

1. Go to [https://supabase.com/dashboard/account/tokens](https://supabase.com/dashboard/account/tokens)
2. Click **"Generate new token"**
3. Give it a descriptive name (e.g., "Claude Code MCP")
4. Copy the token immediately - **you won't see it again**
5. Token format: `sbp_` followed by a long string

**Important**: This is a *personal access token*, NOT the project's anon key or service role key from your project settings.

## Step 2: Find Your Project Reference

1. Go to your Supabase dashboard
2. Select your project
3. The project reference is in the URL: `https://supabase.com/dashboard/project/YOUR_PROJECT_REF`
4. Or find it in Project Settings → General → Reference ID

For Kochi.to, the project ref is: `tqniseocczttrfwtpbdr`

## Step 3: Configure MCP

Create or edit the MCP configuration file at one of these locations:

| Location | Scope |
|----------|-------|
| `PROJECT_ROOT/.mcp.json` | Project-specific (recommended) |
| `PROJECT_ROOT/.claude/mcp.json` | Project-specific (alternative) |
| `~/.claude/settings.json` | User-wide |

### Option A: Environment Variable (Recommended for Security)

Add to your shell profile (`~/.zshrc` or `~/.bashrc`):

```bash
export SUPABASE_ACCESS_TOKEN="sbp_your_token_here"
```

Then in `.mcp.json`:

```json
{
  "mcpServers": {
    "supabase": {
      "command": "npx",
      "args": [
        "-y",
        "@supabase/mcp-server-supabase",
        "--project-ref",
        "tqniseocczttrfwtpbdr"
      ],
      "env": {
        "SUPABASE_ACCESS_TOKEN": "${SUPABASE_ACCESS_TOKEN}"
      }
    }
  }
}
```

### Option B: Direct in Config (Quick but less secure)

```json
{
  "mcpServers": {
    "supabase": {
      "command": "npx",
      "args": [
        "-y",
        "@supabase/mcp-server-supabase",
        "--project-ref",
        "tqniseocczttrfwtpbdr"
      ],
      "env": {
        "SUPABASE_ACCESS_TOKEN": "sbp_your_actual_token_here"
      }
    }
  }
}
```

### Read-Only Mode (Optional)

Add `--read-only` flag to prevent write operations:

```json
"args": [
  "-y",
  "@supabase/mcp-server-supabase",
  "--project-ref",
  "tqniseocczttrfwtpbdr",
  "--read-only"
]
```

## Step 4: Restart Claude Code

After saving the config:

1. Quit Claude Code completely
2. Reopen Claude Code in your project directory
3. The MCP server should auto-start

## Step 5: Verify It Works

Ask Claude to run a test:

```
List the tables in Supabase
```

You should see output like:
```
Tables in schema public:
- users
- subscriptions
- agent_subscriptions
...
```

## Troubleshooting

### "Authentication failed" or "Invalid token"

- **Wrong token type**: Make sure you're using a Personal Access Token from `/account/tokens`, NOT the project API keys
- **Token expired**: Generate a new token
- **Copy/paste error**: Tokens start with `sbp_`

### "Project not found"

- Double-check the project reference ID
- Verify your token has access to this project (you must be a member of the project's organization)

### MCP server not appearing

1. Check the config file path is correct
2. Verify JSON syntax is valid (use a JSON validator)
3. Check Claude Code logs: `~/.claude/logs/`

### "npx: command not found"

- Ensure Node.js is installed: `node --version`
- Ensure npm is installed: `npm --version`
- You may need to specify full path: `/usr/local/bin/npx`

### Server starts but queries fail

- Check your network connection
- Verify project isn't paused in Supabase dashboard
- Try `--read-only` flag if write operations are blocked by permissions

## Available MCP Tools

Once working, you get these tools:

| Tool | Description |
|------|-------------|
| `mcp__supabase__list_tables` | List all tables in schemas |
| `mcp__supabase__execute_sql` | Run SQL queries |
| `mcp__supabase__apply_migration` | Apply DDL migrations |
| `mcp__supabase__search_docs` | Search Supabase docs (GraphQL) |
| `mcp__supabase__generate_typescript_types` | Generate TS types |
| `mcp__supabase__get_logs` | View service logs |
| `mcp__supabase__get_advisors` | Security/performance checks |
| `mcp__supabase__list_edge_functions` | List Edge Functions |
| `mcp__supabase__deploy_edge_function` | Deploy Edge Functions |

## Security Notes

1. **Never commit tokens to git** - add `.mcp.json` to `.gitignore` if it contains secrets
2. **Use environment variables** for tokens in shared configs
3. **Use read-only mode** unless you need write access
4. **Rotate tokens periodically** - especially if a machine is compromised

## Full Example Config

Here's a complete `.mcp.json` with Supabase and other common servers:

```json
{
  "mcpServers": {
    "supabase": {
      "command": "npx",
      "args": [
        "-y",
        "@supabase/mcp-server-supabase",
        "--project-ref",
        "tqniseocczttrfwtpbdr"
      ],
      "env": {
        "SUPABASE_ACCESS_TOKEN": "${SUPABASE_ACCESS_TOKEN}"
      }
    },
    "github": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-github"],
      "env": {
        "GITHUB_PERSONAL_ACCESS_TOKEN": "${GITHUB_PERSONAL_ACCESS_TOKEN}"
      }
    }
  }
}
```

## Getting Help

- Supabase MCP docs: https://supabase.com/docs/guides/getting-started/mcp
- MCP protocol: https://modelcontextprotocol.io/
- Claude Code issues: https://github.com/anthropics/claude-code/issues

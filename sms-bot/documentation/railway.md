# Railway MCP Server Integration

Railway has a first-party MCP server for Claude Code, enabling Railway infrastructure management directly from the terminal.

**Source:** https://railway.com/agents/claude

## Setup

```bash
claude mcp add railway-mcp-server -- npx -y @railway/mcp-server
```

## Available Commands

| Command | Purpose |
|---------|---------|
| `/status` | Check project/service status |
| `/projects` | List projects |
| `/new` | Create new project |
| `/service` | Manage services |
| `/deploy` | Deploy apps |
| `/domain` | Custom domain + SSL setup |
| `/environment` | Manage environment variables |
| `/deployment` | Check deployment logs |
| `/database` | Provision Postgres, Redis, etc. |
| `/templates` | Deploy from Railway templates |
| `/metrics` | Resource usage monitoring |
| `/railway-docs` | Search Railway documentation |

## Common Workflows

- **Debug deploys**: Pull logs directly in Claude Code instead of switching to dashboard
- **Manage env vars**: Add/update environment variables without the Railway UI
- **Provision databases**: "Add a Postgres database" via natural language
- **Scale resources**: "Scale to 2 vCPUs"
- **Custom domains**: Set up domains with automatic SSL
- **Full-stack deploys**: Deploy services with Redis, Postgres, etc. in one go

## Troubleshooting

- **CLI install issues**: Ensure Node.js 18+ is installed, try `npm install -g @anthropic-ai/claude-code`
- **MCP connection problems**: Re-run `claude mcp add` command, check `npx` is available
- **Auth errors**: Run `railway login` to re-authenticate

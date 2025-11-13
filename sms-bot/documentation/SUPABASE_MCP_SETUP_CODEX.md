## Supabase MCP Access (Codex CLI)

Use these steps to ensure any Codex/Codex CLI session can reach the Supabase MCP tools (works independently of Claude desktop).

1. **Install/update Codex CLI**
   ```bash
   npm install -g @openai/codex
   codex --version   # verify
   ```

2. **Enable stdio MCP servers in Codex**
   - Codex CLI reads MCP config from `~/.codex/config.toml`.
   - Add entries for each server (requires write access to `~/.codex`). Example:
     ```toml
     [mcp_servers.supabase]
     command = "npx"
     args = ["-y", "@supabase/mcp-server-supabase", "--project-ref", "tqniseocczttrfwtpbdr", "--read-only"]

     [mcp_servers.supabase.env]
     SUPABASE_ACCESS_TOKEN = "sbp_..."   # Supabase PAT (NOT the service key used by apps)

     [mcp_servers.neo4j]
     command = "/Users/bartdecrem/bin/neo4j-mcp"
     [mcp_servers.neo4j.env]
     NEO4J_URI = "neo4j+s://..."
     NEO4J_USERNAME = "neo4j"
     NEO4J_PASSWORD = "..."
     NEO4J_DATABASE = "neo4j"

     [mcp_servers.puppeteer]
     command = "npx"
     args = ["-y", "@modelcontextprotocol/server-puppeteer"]
     ```
   - Use `codex mcp add ...` to populate these sections if the file is protected:
     ```bash
     codex mcp add supabase --env SUPABASE_ACCESS_TOKEN="$SUPABASE_PAT" -- npx -y @supabase/mcp-server-supabase --project-ref tqniseocczttrfwtpbdr --read-only
     codex mcp add neo4j --env NEO4J_URI=... -- /Users/bartdecrem/bin/neo4j-mcp
     codex mcp add puppeteer -- npx -y @modelcontextprotocol/server-puppeteer
     ```

3. **Keep app secrets separate**
   - `.env.local` files (web, sms-bot, etc.) keep `SUPABASE_SERVICE_KEY` / anon key for product code.
   - Codex MCP uses a *personal access token* (PAT) stored only in `~/.codex/config.toml`. Updating this PAT **does not** change the app env files.

4. **Verify MCP availability**
   ```bash
   codex mcp list
   # Should show supabase, neo4j, puppeteer with Status=enabled
   ```

5. **Test end-to-end (optional but recommended)**
   - Run `tmp/test_supabase_mcp_query.py` (already in repo) to list Supabase tools and call `list_tables`.
     ```bash
     .venv/bin/python tmp/test_supabase_mcp_query.py
     ```
   - For a direct SQL check, use `tmp/query_supabase_recent_subscribers.py` which calls the `execute_sql` tool and prints the latest `sms_subscribers`.

6. **Using MCP inside Codex**
   - After editing `~/.codex/config.toml`, restart Codex CLI (`codex resume ...` or new session).
   - Run `list tools` inside the agent; you should see `supabase_*`, `neo4j_*`, and `puppeteer_*` entries.
   - Invoke tools normally (e.g., `supabase_list_tables`, `supabase_execute_sql`, `neo4j_read_neo4j_cypher`, etc.).

### Troubleshooting

| Issue | Fix |
| --- | --- |
| `codex mcp add` fails with `Operation not permitted` | Re-run with elevated permissions or ensure you can write to `~/.codex` |
| Tools missing after restart | Confirm `codex mcp list` shows them; if not, re-run the `codex mcp add` commands |
| Supabase server errors about missing PAT | Double-check `SUPABASE_ACCESS_TOKEN` in `~/.codex/config.toml` |
| `fetch failed` / DNS errors when testing | The sandbox may block network; rerun the script/command with escalated permissions (allowed here) |

With these steps any agent (even outside Claude desktop) can use Supabase MCP in Codex. Just keep the PAT updated and restart the CLI after edits.

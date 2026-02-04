// amber-daemon/tools/index.js - Tool definitions and execution

import { readFileSync, writeFileSync, appendFileSync, existsSync, readdirSync, statSync, mkdirSync } from 'fs';
import { execSync, spawn } from 'child_process';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { homedir } from 'os';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Tool definitions for Anthropic API
export const TOOLS = [
  {
    name: "read_file",
    description: "Read the contents of a file",
    input_schema: {
      type: "object",
      properties: {
        path: { type: "string", description: "Path to the file" }
      },
      required: ["path"]
    }
  },
  {
    name: "write_file",
    description: "Write content to a file (creates directories if needed)",
    input_schema: {
      type: "object",
      properties: {
        path: { type: "string", description: "Path to the file" },
        content: { type: "string", description: "Content to write" }
      },
      required: ["path", "content"]
    }
  },
  {
    name: "list_directory",
    description: "List files in a directory",
    input_schema: {
      type: "object",
      properties: {
        path: { type: "string", description: "Path to the directory" }
      },
      required: ["path"]
    }
  },
  {
    name: "run_command",
    description: "Run a shell command",
    input_schema: {
      type: "object",
      properties: {
        command: { type: "string", description: "Command to run" },
        cwd: { type: "string", description: "Working directory (optional)" }
      },
      required: ["command"]
    }
  },
  {
    name: "web_search",
    description: "Search the web",
    input_schema: {
      type: "object",
      properties: {
        query: { type: "string", description: "Search query" }
      },
      required: ["query"]
    }
  },
  {
    name: "discord_read",
    description: "Read recent messages from Discord #agent-lounge",
    input_schema: {
      type: "object",
      properties: {
        limit: { type: "number", description: "Number of messages to fetch (default 10)" }
      }
    }
  },
  {
    name: "discord_post",
    description: "Post a message to Discord as Amber",
    input_schema: {
      type: "object",
      properties: {
        message: { type: "string", description: "Message to post" }
      },
      required: ["message"]
    }
  },
  {
    name: "supabase_query",
    description: "Query the amber_state Supabase table. Use for: creations, voice_session, cc_inbox, blog_post, loop_state, etc. Returns JSON results.",
    input_schema: {
      type: "object",
      properties: {
        query: { type: "string", description: "SQL query to execute (SELECT only)" }
      },
      required: ["query"]
    }
  },
  {
    name: "git_log",
    description: "Get recent git activity from the repository. Excludes incubator/ (retired).",
    input_schema: {
      type: "object",
      properties: {
        days: { type: "number", description: "How many days back to look (default 7)" },
        limit: { type: "number", description: "Max number of commits (default 20)" }
      }
    }
  },
  {
    name: "memory_append",
    description: "Append a note to today's daily log. Use for important facts, decisions, or context worth remembering. This persists across sessions.",
    input_schema: {
      type: "object",
      properties: {
        content: { type: "string", description: "The note to append (markdown)" },
        source: { type: "string", description: "Source tag (discord, tui, scheduler, etc.)" }
      },
      required: ["content"]
    }
  },
  {
    name: "memory_search",
    description: "Search your memory files (daily logs, MEMORY.md) for past context",
    input_schema: {
      type: "object",
      properties: {
        query: { type: "string", description: "Search query" },
        limit: { type: "number", description: "Max results (default 10)" }
      },
      required: ["query"]
    }
  }
];

// Tool execution
export async function executeTool(name, input, session, context = {}) {
  switch (name) {
    case "read_file": {
      const { path } = input;
      if (!existsSync(path)) {
        return `File not found: ${path}`;
      }
      return readFileSync(path, 'utf-8');
    }

    case "write_file": {
      const { path, content } = input;
      const dir = dirname(path);
      if (!existsSync(dir)) {
        mkdirSync(dir, { recursive: true });
      }
      writeFileSync(path, content);
      session.lastCreation = path;
      return `Wrote ${content.length} bytes to ${path}`;
    }

    case "list_directory": {
      const { path } = input;
      if (!existsSync(path)) {
        return `Directory not found: ${path}`;
      }
      const entries = readdirSync(path);
      return entries.map(e => {
        const stat = statSync(join(path, e));
        return stat.isDirectory() ? `${e}/` : e;
      }).join('\n');
    }

    case "run_command": {
      const { command, cwd } = input;
      try {
        const output = execSync(command, {
          cwd: cwd || session.workingDir,
          encoding: 'utf-8',
          timeout: 30000,
          maxBuffer: 1024 * 1024
        });
        return output || '(no output)';
      } catch (err) {
        return `Error: ${err.message}\n${err.stderr || ''}`;
      }
    }

    case "web_search": {
      const { query } = input;
      // Use a simple web search - could integrate with Brave API etc
      try {
        const encoded = encodeURIComponent(query);
        const result = execSync(
          `curl -s "https://html.duckduckgo.com/html/?q=${encoded}" | grep -oP '(?<=<a rel="nofollow" class="result__a" href=")[^"]+' | head -5`,
          { encoding: 'utf-8', timeout: 10000 }
        );
        return result || 'No results found';
      } catch (err) {
        return `Search failed: ${err.message}`;
      }
    }

    case "discord_read": {
      const { limit = 15, channel_id = '1441080550415929406' } = input;
      try {
        const scriptPath = join(__dirname, '..', 'scripts', 'read-discord.js');
        const result = execSync(
          `node ${scriptPath} ${channel_id} ${limit}`,
          { encoding: 'utf-8', timeout: 20000 }
        );
        return result || '(no messages)';
      } catch (err) {
        return `Discord read failed: ${err.stderr || err.message}`;
      }
    }

    case "discord_post": {
      const { message } = input;
      // Block posting to channel when responding to a DM
      // DM responses are automatically sent via socket → discord-bot.js → message.reply()
      if (context.isDM) {
        return 'Cannot use discord_post for DM conversations. Your text response will be sent as a DM automatically.';
      }
      try {
        const scriptPath = join(context.repoRoot || join(__dirname, '../..'),
          'discord-bot/agent-chat/post-message.cjs');
        const escaped = message.replace(/"/g, '\\"');
        const result = execSync(
          `node ${scriptPath} amber "${escaped}"`,
          { encoding: 'utf-8', timeout: 15000 }
        );
        return result;
      } catch (err) {
        return `Discord post failed: ${err.message}`;
      }
    }

    case "supabase_query": {
      const { query } = input;

      // Safety check: only allow SELECT queries
      const trimmedQuery = query.trim().toLowerCase();
      if (!trimmedQuery.startsWith('select')) {
        return 'Error: Only SELECT queries are allowed';
      }

      try {
        const repoRoot = context.repoRoot || join(__dirname, '../..');
        const escaped = query.replace(/'/g, "'\\''");
        const result = execSync(
          `cd "${repoRoot}/sms-bot" && npx tsx --env-file=.env.local scripts/supabase-query.ts '${escaped}'`,
          { encoding: 'utf-8', timeout: 30000 }
        );
        return result;
      } catch (err) {
        // Try to extract useful error from stderr
        if (err.stderr) {
          try {
            const errData = JSON.parse(err.stderr);
            return `Query error: ${errData.error}`;
          } catch {
            return `Supabase query failed: ${err.stderr || err.message}`;
          }
        }
        return `Supabase query failed: ${err.message}`;
      }
    }

    case "git_log": {
      const { days = 7, limit = 20 } = input;
      const repoRoot = context.repoRoot || join(__dirname, '../..');
      try {
        const result = execSync(
          `cd "${repoRoot}" && git log --oneline --since="${days} days ago" --all -- . ':!incubator' | head -${limit}`,
          { encoding: 'utf-8', timeout: 10000 }
        );
        return result || 'No commits in this period';
      } catch (err) {
        return `Git log failed: ${err.message}`;
      }
    }

    case "memory_append": {
      const { content, source } = input;
      const MEMORY_DIR = join(homedir(), '.amber', 'memory');
      const today = new Date().toISOString().slice(0, 10);
      const logPath = join(MEMORY_DIR, `${today}.md`);
      const time = new Date().toLocaleTimeString('en-US', {
        hour: '2-digit', minute: '2-digit', hour12: false
      });
      const sourceTag = source ? ` [${source}]` : '';

      // Ensure directory exists
      if (!existsSync(MEMORY_DIR)) {
        mkdirSync(MEMORY_DIR, { recursive: true });
      }

      // Create or append to daily log
      let entry = `\n## ${time}${sourceTag}\n\n${content}\n`;
      if (!existsSync(logPath)) {
        entry = `# ${today}\n` + entry;
      }

      appendFileSync(logPath, entry);
      return `Appended to daily log: ${logPath}`;
    }

    case "memory_search": {
      const { query, limit = 10 } = input;
      const MEMORY_DIR = join(homedir(), '.amber', 'memory');

      if (!existsSync(MEMORY_DIR)) {
        return 'No memory directory found';
      }

      try {
        // Escape special characters for grep
        const escaped = query.replace(/["\\\n]/g, '\\$&');
        const result = execSync(
          `grep -r -i -n "${escaped}" "${MEMORY_DIR}" 2>/dev/null | head -${limit}`,
          { encoding: 'utf-8', timeout: 10000 }
        );
        return result || 'No matches found';
      } catch (err) {
        if (err.status === 1) return 'No matches found';
        return `Search error: ${err.message}`;
      }
    }

    default:
      return `Unknown tool: ${name}`;
  }
}

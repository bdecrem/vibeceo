// amber-daemon/tools/index.js - Tool definitions and execution

import { readFileSync, writeFileSync, appendFileSync, existsSync, readdirSync, statSync, mkdirSync } from 'fs';
import { execSync, spawn } from 'child_process';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { homedir } from 'os';
import Anthropic from '@anthropic-ai/sdk';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const MEMORY_DIR = join(homedir(), '.amber', 'memory');
const SESSIONS_DIR = join(homedir(), '.amber', 'sessions');

// Haiku client for semantic search (lightweight, fast)
let _searchClient = null;
function getSearchClient() {
  if (!_searchClient) {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) throw new Error('No ANTHROPIC_API_KEY for search client');
    _searchClient = new Anthropic({ apiKey });
  }
  return _searchClient;
}

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
    description: "Search your memory semantically. Finds concepts, not just keywords. Searches MEMORY.md and all daily logs from the last 30 days.",
    input_schema: {
      type: "object",
      properties: {
        query: { type: "string", description: "What to search for — concepts, topics, or questions work well" }
      },
      required: ["query"]
    }
  },
  {
    name: "memory_list",
    description: "List all memory files with dates and first line. A table of contents for your memory.",
    input_schema: {
      type: "object",
      properties: {}
    }
  },
  {
    name: "session_list",
    description: "List archived conversation sessions with date, message count, and time range.",
    input_schema: {
      type: "object",
      properties: {}
    }
  },
  {
    name: "session_search",
    description: "Search across archived conversation sessions semantically. Use to find past discussions, decisions, or exchanges.",
    input_schema: {
      type: "object",
      properties: {
        query: { type: "string", description: "What to search for in past sessions" }
      },
      required: ["query"]
    }
  },
  {
    name: "send_email",
    description: "Send an email from ambercc@intheamber.com and log it to cc_outbox. Use this after Bart approves your draft. NEVER send without explicit approval. For multiple recipients, use comma + space: \"email1@domain.com, email2@domain.com\"",
    input_schema: {
      type: "object",
      properties: {
        to: { type: "string", description: "Recipient email. Multiple: comma + space separated (e.g. \"a@x.com, b@x.com\")" },
        subject: { type: "string", description: "Email subject line" },
        body: { type: "string", description: "Email body (plain text)" }
      },
      required: ["to", "subject", "body"]
    }
  },
  {
    name: "mark_email_handled",
    description: "Mark a cc_inbox email as handled in Supabase after replying or deciding to skip it.",
    input_schema: {
      type: "object",
      properties: {
        email_id: { type: "string", description: "The id of the amber_state row to mark as handled" },
        action: { type: "string", description: "What was done: 'replied', 'skipped', 'forwarded', etc." }
      },
      required: ["email_id", "action"]
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
      const content = readFileSync(path, 'utf-8');
      const MAX_FILE = 12000;
      if (content.length > MAX_FILE) {
        return content.slice(0, MAX_FILE) + `\n\n[...truncated — ${content.length} chars total, showing first ${MAX_FILE}]`;
      }
      return content;
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
      const MAX_OUTPUT = 12000; // ~3K tokens — prevents context blowout
      try {
        const output = execSync(command, {
          cwd: cwd || session.workingDir,
          encoding: 'utf-8',
          timeout: 120000,
          maxBuffer: 1024 * 1024
        });
        if (!output) return '(no output)';
        if (output.length > MAX_OUTPUT) {
          return output.slice(0, MAX_OUTPUT) + `\n\n[...truncated — ${output.length} chars total, showing first ${MAX_OUTPUT}]`;
        }
        return output;
      } catch (err) {
        const errMsg = `Error: ${err.message}\n${err.stderr || ''}`;
        return errMsg.length > MAX_OUTPUT ? errMsg.slice(0, MAX_OUTPUT) + '\n[...truncated]' : errMsg;
      }
    }

    case "web_search": {
      const { query } = input;
      const braveKey = process.env.BRAVE_SEARCH_API_KEY;
      if (!braveKey) return 'Error: BRAVE_SEARCH_API_KEY not set';
      try {
        const encoded = encodeURIComponent(query);
        const raw = execSync(
          `curl -s "https://api.search.brave.com/res/v1/web/search?q=${encoded}&count=5" -H "X-Subscription-Token: ${braveKey}" -H "Accept: application/json"`,
          { encoding: 'utf-8', timeout: 10000 }
        );
        const data = JSON.parse(raw);
        if (!data.web?.results?.length) return 'No results found';
        return data.web.results.map(r =>
          `${r.title}\n${r.url}\n${r.description || ''}`
        ).join('\n\n');
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
      // Block when responding to any Discord message (DM or channel).
      // discord-bot.js replies as the real bot user (with proper avatar).
      // discord_post uses webhooks which lose the bot's identity.
      if (context.source === 'discord' || context.isDM) {
        return 'Your text response will be posted to Discord automatically via the bot user. Do not use discord_post when responding to Discord messages.';
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
      const { query } = input;

      if (!existsSync(MEMORY_DIR)) {
        return 'No memory directory found';
      }

      try {
        // Gather memory files: MEMORY.md + daily logs from last 30 days
        const chunks = [];
        const memoryMdPath = join(MEMORY_DIR, 'MEMORY.md');
        if (existsSync(memoryMdPath)) {
          chunks.push(`=== FILE: MEMORY.md ===\n${readFileSync(memoryMdPath, 'utf-8')}`);
        }

        const thirtyDaysAgo = Date.now() - 30 * 86400000;
        const files = readdirSync(MEMORY_DIR)
          .filter(f => f.match(/^\d{4}-\d{2}-\d{2}\.md$/))
          .filter(f => {
            const fileDate = new Date(f.replace('.md', '')).getTime();
            return fileDate >= thirtyDaysAgo;
          })
          .sort();

        for (const file of files) {
          const content = readFileSync(join(MEMORY_DIR, file), 'utf-8');
          chunks.push(`=== FILE: ${file} ===\n${content}`);
        }

        if (chunks.length === 0) {
          return 'No memory files found';
        }

        const allMemory = chunks.join('\n\n');

        // Send to Haiku for semantic search
        const client = getSearchClient();
        const response = await client.messages.create({
          model: 'claude-haiku-4-5-20251001',
          max_tokens: 2048,
          system: 'You search memory files and return relevant passages. Return a JSON array of results. Each result: {"file": "filename", "snippet": "relevant passage (2-4 lines)", "relevance": "why this matches"}. Return [] if nothing relevant. Only return the JSON array, no other text.',
          messages: [{
            role: 'user',
            content: `Find passages relevant to: ${query}\n\n---\n\n${allMemory}`
          }]
        });

        const text = response.content[0]?.text || '[]';
        // Try to parse as JSON, fall back to raw text
        try {
          const results = JSON.parse(text);
          if (results.length === 0) return 'No relevant memories found';
          return results.map(r =>
            `📄 ${r.file}\n${r.snippet}\n  → ${r.relevance}`
          ).join('\n\n');
        } catch {
          return text;
        }
      } catch (err) {
        return `Memory search error: ${err.message}`;
      }
    }

    case "memory_list": {
      if (!existsSync(MEMORY_DIR)) {
        return 'No memory directory found';
      }

      const files = readdirSync(MEMORY_DIR)
        .filter(f => f.endsWith('.md'))
        .sort()
        .reverse();

      if (files.length === 0) return 'No memory files found';

      const entries = files.map(f => {
        const filePath = join(MEMORY_DIR, f);
        const stat = statSync(filePath);
        const content = readFileSync(filePath, 'utf-8');
        const firstLine = content.split('\n').find(l => l.trim()) || '(empty)';
        const size = stat.size > 1024 ? `${(stat.size / 1024).toFixed(1)}kb` : `${stat.size}b`;
        return `${f}  (${size})  ${firstLine}`;
      });

      return entries.join('\n');
    }

    case "session_list": {
      if (!existsSync(SESSIONS_DIR)) {
        return 'No session archives found';
      }

      const files = readdirSync(SESSIONS_DIR)
        .filter(f => f.endsWith('.json'))
        .sort()
        .reverse();

      if (files.length === 0) return 'No session archives found';

      const entries = files.map(f => {
        try {
          const data = JSON.parse(readFileSync(join(SESSIONS_DIR, f), 'utf-8'));
          const msgCount = data.messages?.length || 0;
          const label = data.label || '';
          const timeRange = data.timeRange || '';
          return `${f.replace('.json', '')}  ${msgCount} messages  ${timeRange}  ${label}`;
        } catch {
          return `${f.replace('.json', '')}  (unreadable)`;
        }
      });

      return entries.join('\n');
    }

    case "session_search": {
      const { query } = input;

      if (!existsSync(SESSIONS_DIR)) {
        return 'No session archives found';
      }

      const files = readdirSync(SESSIONS_DIR)
        .filter(f => f.endsWith('.json'))
        .sort()
        .reverse();

      if (files.length === 0) return 'No session archives found';

      try {
        // Build text chunks from session archives
        const chunks = [];
        for (const file of files) {
          try {
            const data = JSON.parse(readFileSync(join(SESSIONS_DIR, file), 'utf-8'));
            const messages = data.messages || [];
            // Extract text content from messages
            const textParts = messages.map(m => {
              if (typeof m.content === 'string') return m.content;
              if (Array.isArray(m.content)) {
                return m.content
                  .filter(c => c.type === 'text')
                  .map(c => c.text)
                  .join(' ');
              }
              return '';
            }).filter(t => t.length > 0);

            if (textParts.length > 0) {
              // Truncate to ~4000 chars per session to keep payload reasonable
              const sessionText = textParts.join('\n').substring(0, 4000);
              chunks.push(`=== SESSION: ${file.replace('.json', '')} ===\n${sessionText}`);
            }
          } catch {
            // Skip unreadable files
          }
        }

        if (chunks.length === 0) return 'No readable session archives';

        const allSessions = chunks.join('\n\n');

        const client = getSearchClient();
        const response = await client.messages.create({
          model: 'claude-haiku-4-5-20251001',
          max_tokens: 2048,
          system: 'You search conversation session archives and return relevant exchanges. Return a JSON array of results. Each result: {"session": "session name", "snippet": "relevant exchange (2-5 lines)", "relevance": "why this matches"}. Return [] if nothing relevant. Only return the JSON array, no other text.',
          messages: [{
            role: 'user',
            content: `Find exchanges relevant to: ${query}\n\n---\n\n${allSessions}`
          }]
        });

        const text = response.content[0]?.text || '[]';
        try {
          const results = JSON.parse(text);
          if (results.length === 0) return 'No relevant sessions found';
          return results.map(r =>
            `📋 ${r.session}\n${r.snippet}\n  → ${r.relevance}`
          ).join('\n\n');
        } catch {
          return text;
        }
      } catch (err) {
        return `Session search error: ${err.message}`;
      }
    }

    case "send_email": {
      const { to, subject, body } = input;
      try {
        const repoRoot = context.repoRoot || join(__dirname, '../..');
        // Write body to temp file to avoid shell escaping issues
        const tmpFile = join(homedir(), '.amber', 'email-draft.txt');
        writeFileSync(tmpFile, body);
        const result = execSync(
          `cd "${repoRoot}/sms-bot" && npx tsx --env-file=.env.local scripts/send-ambercc-email.ts "${to}" "${subject.replace(/"/g, '\\"')}" --file "${tmpFile}"`,
          { encoding: 'utf-8', timeout: 30000 }
        );
        return result || 'Email sent and logged';
      } catch (err) {
        return `Failed to send email: ${err.stderr || err.message}`;
      }
    }

    case "mark_email_handled": {
      const { email_id, action } = input;
      try {
        const repoRoot = context.repoRoot || join(__dirname, '../..');
        const result = execSync(
          `cd "${repoRoot}/sms-bot" && npx tsx --env-file=.env.local scripts/mark-email-handled.ts "${email_id}" "${action}"`,
          { encoding: 'utf-8', timeout: 15000 }
        );
        return result || 'Email marked as handled';
      } catch (err) {
        return `Failed to mark email: ${err.stderr || err.message}`;
      }
    }

    default:
      return `Unknown tool: ${name}`;
  }
}

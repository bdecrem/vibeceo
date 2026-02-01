// amber-daemon/tools/index.js - Tool definitions and execution

import { readFileSync, writeFileSync, existsSync, readdirSync, statSync } from 'fs';
import { execSync, spawn } from 'child_process';
import { join, dirname } from 'path';
import { mkdirSync } from 'fs';

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
      const { limit = 10 } = input;
      try {
        const scriptPath = join(context.repoRoot || '/Users/bart/Documents/code/vibeceo', 
          'discord-bot/agent-chat/read-channel.cjs');
        const result = execSync(
          `node ${scriptPath} 1441080550415929406 ${limit}`,
          { encoding: 'utf-8', timeout: 15000 }
        );
        return result;
      } catch (err) {
        return `Discord read failed: ${err.message}`;
      }
    }

    case "discord_post": {
      const { message } = input;
      try {
        const scriptPath = join(context.repoRoot || '/Users/bart/Documents/code/vibeceo',
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

    default:
      return `Unknown tool: ${name}`;
  }
}

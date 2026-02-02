// pixelpit/coder-daemon/tools/index.js
// Pit's tools - focused on implementation

import { readFileSync, writeFileSync, readdirSync, statSync, existsSync, mkdirSync } from 'fs';
import { execSync } from 'child_process';
import { join, dirname } from 'path';

const COLLABS_DIR = '/Users/bart/Documents/code/collabs';

export const TOOLS = [
  {
    name: "read_file",
    description: "Read a file from the collabs directory or other allowed paths",
    input_schema: {
      type: "object",
      properties: {
        path: { type: "string", description: "File path (relative to collabs/ or absolute)" }
      },
      required: ["path"]
    }
  },
  {
    name: "write_file",
    description: "Write content to a file. Creates parent directories if needed.",
    input_schema: {
      type: "object",
      properties: {
        path: { type: "string", description: "File path (relative to collabs/ or absolute)" },
        content: { type: "string", description: "File content" }
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
        path: { type: "string", description: "Directory path" }
      },
      required: ["path"]
    }
  },
  {
    name: "run_command",
    description: "Run a shell command. Use for git, npm, testing, etc.",
    input_schema: {
      type: "object",
      properties: {
        command: { type: "string", description: "Shell command to run" },
        cwd: { type: "string", description: "Working directory (optional)" }
      },
      required: ["command"]
    }
  }
];

function resolvePath(path) {
  if (path.startsWith('/')) return path;
  return join(COLLABS_DIR, path);
}

export async function executeTool(name, input, context = {}) {
  try {
    switch (name) {
      case 'read_file': {
        const fullPath = resolvePath(input.path);
        if (!existsSync(fullPath)) {
          return `Error: File not found: ${fullPath}`;
        }
        return readFileSync(fullPath, 'utf-8');
      }

      case 'write_file': {
        const fullPath = resolvePath(input.path);
        const dir = dirname(fullPath);
        if (!existsSync(dir)) {
          mkdirSync(dir, { recursive: true });
        }
        writeFileSync(fullPath, input.content);
        return `Wrote ${input.content.length} bytes to ${fullPath}`;
      }

      case 'list_directory': {
        const fullPath = resolvePath(input.path);
        if (!existsSync(fullPath)) {
          return `Error: Directory not found: ${fullPath}`;
        }
        const entries = readdirSync(fullPath);
        const details = entries.map(e => {
          const stat = statSync(join(fullPath, e));
          return `${stat.isDirectory() ? '[DIR]' : '[FILE]'} ${e}`;
        });
        return details.join('\n') || '(empty directory)';
      }

      case 'run_command': {
        const cwd = input.cwd || COLLABS_DIR;
        const result = execSync(input.command, {
          cwd,
          encoding: 'utf-8',
          timeout: 30000,
          maxBuffer: 1024 * 1024,
        });
        return result || '(no output)';
      }

      default:
        return `Unknown tool: ${name}`;
    }
  } catch (err) {
    return `Error: ${err.message}`;
  }
}

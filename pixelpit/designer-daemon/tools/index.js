// pixelpit/designer-daemon/tools/index.js
// Dot's tools - focused on reading and reviewing

import { readFileSync, writeFileSync, readdirSync, statSync, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';

const COLLABS_DIR = '/Users/bart/Documents/code/collabs';
const PIXELPIT_DIR = '/Users/bart/Documents/code/vibeceo/pixelpit';

export const TOOLS = [
  {
    name: "read_file",
    description: "Read a file to review code or designs",
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
    description: "Write design notes or simple CSS/style tweaks. For major code changes, describe what you want and let Pit implement.",
    input_schema: {
      type: "object",
      properties: {
        path: { type: "string", description: "File path" },
        content: { type: "string", description: "File content" }
      },
      required: ["path", "content"]
    }
  },
  {
    name: "list_directory",
    description: "List files in a directory to see what exists",
    input_schema: {
      type: "object",
      properties: {
        path: { type: "string", description: "Directory path" }
      },
      required: ["path"]
    }
  },
  {
    name: "read_styleguide",
    description: "Read the Pixelpit STYLEGUIDE.md for color and design reference",
    input_schema: {
      type: "object",
      properties: {},
      required: []
    }
  },
  {
    name: "read_design_doc",
    description: "Read the Pixelpit DESIGN.md for brand and character reference",
    input_schema: {
      type: "object",
      properties: {},
      required: []
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

      case 'read_styleguide': {
        const path = join(PIXELPIT_DIR, 'creative', 'STYLEGUIDE.md');
        if (!existsSync(path)) {
          return 'STYLEGUIDE.md not found';
        }
        return readFileSync(path, 'utf-8');
      }

      case 'read_design_doc': {
        const path = join(PIXELPIT_DIR, 'DESIGN.md');
        if (!existsSync(path)) {
          return 'DESIGN.md not found';
        }
        return readFileSync(path, 'utf-8');
      }

      default:
        return `Unknown tool: ${name}`;
    }
  } catch (err) {
    return `Error: ${err.message}`;
  }
}

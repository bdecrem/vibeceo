import Anthropic from "@anthropic-ai/sdk";
import { transform } from "sucrase";
import { readFileSync, readdirSync, statSync } from "fs";
import { join, resolve, relative } from "path";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const MAX_ITERATIONS = 10;
const TIMEOUT_MS = 60_000;
const MAX_FILE_SIZE = 30_000;

// Allowed directories relative to process.cwd() (web/)
const ALLOWED_DIRS = ["app/mutabl/", "app/api/mutabl/"];
const ALLOWED_EXTENSIONS = [".ts", ".tsx", ".jsx", ".css", ".json"];
const BLOCKED_PATTERNS = [".env", "secret", "credential", "node_modules"];

type ToolInput =
  | { path: string }
  | { directory?: string }
  | Record<string, never>
  | { code: string }
  | { code: string; css?: string; message: string };

// --- File sandboxing ---

function isPathAllowed(requestedPath: string): boolean {
  const projectRoot = process.cwd(); // web/
  const absolute = resolve(projectRoot, requestedPath);
  const rel = relative(projectRoot, absolute);

  // Block path traversal
  if (rel.startsWith("..") || resolve(absolute) !== absolute.replace(/\/$/, "")) {
    // re-resolve to catch symlink tricks
  }

  // Must be within allowed directories
  const inAllowed = ALLOWED_DIRS.some((dir) => rel.startsWith(dir));
  if (!inAllowed) return false;

  // Block dangerous patterns
  const lower = rel.toLowerCase();
  if (BLOCKED_PATTERNS.some((p) => lower.includes(p))) return false;

  // Check extension for files (not directories)
  try {
    const stat = statSync(absolute);
    if (stat.isFile()) {
      const hasAllowedExt = ALLOWED_EXTENSIONS.some((ext) => lower.endsWith(ext));
      if (!hasAllowedExt) return false;
    }
  } catch {
    // File doesn't exist yet or can't stat — check extension anyway
    const hasAllowedExt = ALLOWED_EXTENSIONS.some((ext) => lower.endsWith(ext));
    if (!hasAllowedExt && !lower.endsWith("/")) return false;
  }

  return true;
}

function readSandboxedFile(requestedPath: string): string {
  if (!isPathAllowed(requestedPath)) {
    return `Error: Access denied. Can only read files in: ${ALLOWED_DIRS.join(", ")}`;
  }

  const absolute = resolve(process.cwd(), requestedPath);
  try {
    const content = readFileSync(absolute, "utf-8");
    if (content.length > MAX_FILE_SIZE) {
      return content.slice(0, MAX_FILE_SIZE) + "\n\n[...truncated at 30K chars]";
    }
    return content;
  } catch (e) {
    return `Error: ${e instanceof Error ? e.message : "Could not read file"}`;
  }
}

function listSandboxedDirectory(requestedPath?: string): string {
  const dirPath = requestedPath || "app/mutabl/";
  if (!ALLOWED_DIRS.some((d) => dirPath.startsWith(d) || d.startsWith(dirPath))) {
    return `Error: Can only list directories in: ${ALLOWED_DIRS.join(", ")}`;
  }

  const absolute = resolve(process.cwd(), dirPath);
  try {
    const entries = readdirSync(absolute, { withFileTypes: true });
    return entries
      .map((e) => `${e.isDirectory() ? "[dir]" : "[file]"} ${dirPath}${e.name}${e.isDirectory() ? "/" : ""}`)
      .join("\n");
  } catch (e) {
    return `Error: ${e instanceof Error ? e.message : "Could not list directory"}`;
  }
}

// --- JSX validation ---

function validateJsx(code: string): { valid: boolean; error?: string } {
  if (!code.includes("function App")) {
    return { valid: false, error: "Missing `function App` declaration." };
  }

  try {
    transform(code + "\nrender(<App />)", { transforms: ["jsx"] });
    return { valid: true };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return { valid: false, error: msg };
  }
}

// --- Tool definitions ---

const TOOLS: Anthropic.Tool[] = [
  {
    name: "read_file",
    description:
      "Read a source file. Path is relative to the web/ directory. Only files in app/mutabl/ and app/api/mutabl/ are accessible.",
    input_schema: {
      type: "object" as const,
      properties: {
        path: {
          type: "string",
          description: "File path relative to web/, e.g. app/mutabl/components/RichEditor.tsx",
        },
      },
      required: ["path"],
    },
  },
  {
    name: "list_files",
    description:
      "List files in a directory. Path is relative to web/. Defaults to app/mutabl/ if not specified.",
    input_schema: {
      type: "object" as const,
      properties: {
        directory: {
          type: "string",
          description: "Directory path relative to web/, e.g. app/mutabl/components/",
        },
      },
      required: [],
    },
  },
  {
    name: "read_user_data",
    description:
      "Fetch the user's current live data (tasks, documents, people, etc.) to understand their actual content.",
    input_schema: {
      type: "object" as const,
      properties: {},
      required: [],
    },
  },
  {
    name: "validate_jsx",
    description:
      "Validate JSX code for syntax errors before submitting. Returns {valid: true} or {valid: false, error: string}.",
    input_schema: {
      type: "object" as const,
      properties: {
        code: {
          type: "string",
          description: "The JSX code to validate",
        },
      },
      required: ["code"],
    },
  },
  {
    name: "submit_app",
    description:
      "Submit the final app code. This validates the JSX and ends the loop if valid. If invalid, returns the error so you can fix it.",
    input_schema: {
      type: "object" as const,
      properties: {
        code: {
          type: "string",
          description: "The complete JSX code for the App component",
        },
        css: {
          type: "string",
          description: "Optional CSS classes used by the component",
        },
        message: {
          type: "string",
          description: "Brief explanation of what you changed",
        },
      },
      required: ["code", "message"],
    },
  },
];

// --- Agentic loop ---

export type AgenticLoopOptions = {
  systemPrompt: string;
  userMessage: string;
  currentCode: string;
  currentCss?: string;
  fetchUserData: () => Promise<Record<string, unknown>>;
  maxIterations?: number;
};

export type AgenticLoopResult =
  | { ok: true; code: string; css?: string; message: string; iterations: number; mode: "deep" }
  | { ok: false; error: string; iterations: number; mode: "deep" };

export async function agenticLoop(
  options: AgenticLoopOptions
): Promise<AgenticLoopResult> {
  const {
    systemPrompt,
    userMessage,
    fetchUserData,
    maxIterations = MAX_ITERATIONS,
  } = options;

  const startTime = Date.now();

  const messages: Anthropic.MessageParam[] = [
    { role: "user", content: userMessage },
  ];

  for (let i = 0; i < maxIterations; i++) {
    // Timeout check
    if (Date.now() - startTime > TIMEOUT_MS) {
      return {
        ok: false,
        error: "Request timed out. Try a simpler change.",
        iterations: i,
        mode: "deep",
      };
    }

    const response = await anthropic.messages.create({
      model: "claude-opus-4-6-20250616",
      max_tokens: 16384,
      system: systemPrompt,
      tools: TOOLS,
      messages,
    });

    // Process response content
    const assistantContent = response.content;
    messages.push({ role: "assistant", content: assistantContent });

    // Check if model wants to use tools
    const toolUses = assistantContent.filter(
      (block): block is Anthropic.ContentBlockParam & { type: "tool_use"; id: string; name: string; input: ToolInput } =>
        block.type === "tool_use"
    );

    if (toolUses.length === 0) {
      // Model responded without tools — shouldn't happen but handle gracefully
      // Extract any text and ask it to use submit_app
      const text = assistantContent
        .filter((b): b is Anthropic.TextBlock => b.type === "text")
        .map((b) => b.text)
        .join("\n");

      if (text) {
        messages.push({
          role: "user",
          content:
            "Please use the submit_app tool to submit your final code. Don't output code blocks — use the tool.",
        });
        continue;
      }

      return {
        ok: false,
        error: "Agent didn't produce a result. Try rephrasing.",
        iterations: i + 1,
        mode: "deep",
      };
    }

    // Execute tool calls
    const toolResults: Anthropic.ToolResultBlockParam[] = [];
    let submitResult: { code: string; css?: string; message: string } | null = null;

    for (const toolUse of toolUses) {
      const input = toolUse.input;
      let result: string;

      switch (toolUse.name) {
        case "read_file": {
          const inp = input as { path: string };
          result = readSandboxedFile(inp.path);
          break;
        }
        case "list_files": {
          const inp = input as { directory?: string };
          result = listSandboxedDirectory(inp.directory);
          break;
        }
        case "read_user_data": {
          try {
            const data = await fetchUserData();
            result = JSON.stringify(data, null, 2);
            if (result.length > MAX_FILE_SIZE) {
              result = result.slice(0, MAX_FILE_SIZE) + "\n[...truncated]";
            }
          } catch (e) {
            result = `Error fetching user data: ${e instanceof Error ? e.message : String(e)}`;
          }
          break;
        }
        case "validate_jsx": {
          const inp = input as { code: string };
          const validation = validateJsx(inp.code);
          result = JSON.stringify(validation);
          break;
        }
        case "submit_app": {
          const inp = input as { code: string; css?: string; message: string };
          const validation = validateJsx(inp.code);
          if (validation.valid) {
            submitResult = {
              code: inp.code,
              css: inp.css || undefined,
              message: inp.message,
            };
            result = JSON.stringify({ valid: true, submitted: true });
          } else {
            result = JSON.stringify({
              valid: false,
              error: validation.error,
              hint: "Fix the error and call submit_app again.",
            });
          }
          break;
        }
        default:
          result = `Unknown tool: ${toolUse.name}`;
      }

      toolResults.push({
        type: "tool_result",
        tool_use_id: toolUse.id,
        content: result,
      });
    }

    messages.push({ role: "user", content: toolResults });

    // If submit_app succeeded, we're done
    if (submitResult) {
      return {
        ok: true,
        code: submitResult.code,
        css: submitResult.css,
        message: submitResult.message,
        iterations: i + 1,
        mode: "deep",
      };
    }
  }

  return {
    ok: false,
    error: `Agent couldn't complete after ${maxIterations} iterations. Try a simpler change.`,
    iterations: maxIterations,
    mode: "deep",
  };
}

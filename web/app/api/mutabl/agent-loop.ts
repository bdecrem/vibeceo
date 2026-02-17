import Anthropic from "@anthropic-ai/sdk";
import { transform } from "sucrase";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const MAX_ITERATIONS = 3;

export type AgentLoopOptions = {
  systemPrompt: string;
  userMessage: string;
  currentCode: string;
  currentCss?: string;
  maxIterations?: number;
  maxTokens?: number;
};

export type AgentLoopResult =
  | { ok: true; code: string; css?: string; message: string; iterations: number }
  | { ok: false; error: string; iterations: number };

function extractCodeBlock(text: string): string | null {
  const match = text.match(/```(?:jsx|javascript|js)?\s*\n([\s\S]*?)```/);
  return match ? match[1].trim() : null;
}

function extractCssBlock(text: string): string | null {
  const match = text.match(/```css\s*\n([\s\S]*?)```/);
  return match ? match[1].trim() : null;
}

function extractMessage(text: string): string {
  const parts = text.split(/```(?:jsx|javascript|js|css)?[\s\S]*?```/);
  const after = parts[parts.length - 1]?.trim();
  if (after) return after;
  const before = parts[0]?.trim();
  return before || "Done!";
}

function validateAppCode(code: string): { valid: boolean; error?: string } {
  if (!code.includes("function App")) {
    return { valid: false, error: "Missing `function App` declaration." };
  }

  try {
    transform(code + "\nrender(<App />)", {
      transforms: ["jsx"],
    });
    return { valid: true };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return { valid: false, error: msg };
  }
}

export async function agentLoop(
  options: AgentLoopOptions
): Promise<AgentLoopResult> {
  const { systemPrompt, userMessage, maxIterations = MAX_ITERATIONS, maxTokens = 4096 } = options;

  const messages: Anthropic.MessageParam[] = [
    { role: "user", content: userMessage },
  ];

  for (let i = 0; i < maxIterations; i++) {
    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-5-20250929",
      max_tokens: maxTokens,
      system: systemPrompt,
      messages,
    });

    const responseText =
      response.content[0].type === "text" ? response.content[0].text : "";

    const css = extractCssBlock(responseText);
    const code = extractCodeBlock(responseText);

    if (!code) {
      // No code block — if first attempt, that's a failure. If retry, keep trying.
      if (i === 0) {
        return {
          ok: false,
          error: "Couldn't generate code. Try rephrasing your request.",
          iterations: i + 1,
        };
      }
      // Ask Claude to try again with a code block
      messages.push({ role: "assistant", content: responseText });
      messages.push({
        role: "user",
        content:
          "Your response didn't include a ```jsx code block. Please return the complete updated component in a ```jsx code block.",
      });
      continue;
    }

    const validation = validateAppCode(code);

    if (validation.valid) {
      return {
        ok: true,
        code,
        css: css || undefined,
        message: extractMessage(responseText),
        iterations: i + 1,
      };
    }

    // Invalid — feed the error back for next iteration
    messages.push({ role: "assistant", content: responseText });
    messages.push({
      role: "user",
      content: `The code you returned has an error:\n\n${validation.error}\n\nPlease fix it and return the complete corrected component in a \`\`\`jsx code block.`,
    });
  }

  return {
    ok: false,
    error: `Code failed validation after ${maxIterations} attempts.`,
    iterations: maxIterations,
  };
}

// Shared system prompt pieces
export const SCOPE_DOCS = `AVAILABLE IN SCOPE (injected by the wrapper — do NOT import these):
- React hooks: useState, useEffect, useRef, useMemo, useCallback, useContext
- ScopeContext: React context that provides fresh dynamic data. CRITICAL: your App MUST read
  dynamic data from context to stay reactive:
  const { tasks, addTask, toggleTask, deleteTask, updateTask, user } = useContext(ScopeContext);
  Put this line at the TOP of your App function, before any other hooks.
- Task data: tasks (array of {id, title, completed, properties, created_at})
- Task operations: addTask(title, properties?), toggleTask(id), deleteTask(id), updateTask(id, {title?, completed?, properties?})
- User info: user ({handle})

NOTE: Logout and settings are handled by the app wrapper — do NOT add logout buttons to the component.`;

export const CSS_RULES = `CSS STYLING:
- You can use inline styles (style={{ }}) OR CSS classes (className="...") OR both
- If using CSS classes, return them in a separate \`\`\`css code block AFTER the \`\`\`jsx block
- CSS classes should use a descriptive prefix (e.g., .app-header, .task-item)
- CSS enables: hover states, transitions, animations, media queries, pseudo-elements
- If no CSS changes needed, omit the \`\`\`css block entirely — existing CSS will be preserved`;

export const CODE_RULES = `RULES:
- Output a SINGLE React component named App (function App() { ... })
- You can use inline styles (style={{ }}) OR CSS classes (className="...") OR both
- Do NOT import anything — all dependencies are in scope
- The component must be self-contained in one function
- For extra per-task data (priority, due dates, tags, etc.), use task.properties.fieldName
  and updateTask(id, { properties: { ...task.properties, fieldName: value } })
- You can add any task management feature: sorting, filtering, views, export, themes, etc.
- Keep the app functional and visually coherent after changes
- Preserve existing functionality unless the user explicitly asks to remove it

${CSS_RULES}

OUTPUT FORMAT:
Return the complete updated component code in a \`\`\`jsx code block, followed by a brief explanation of what you changed.
Optionally, return CSS in a \`\`\`css code block after the JSX block. Only include CSS if you're using className in the component.`;

export const BUILDER_SYSTEM_PROMPT = `You are the Todoit builder agent. You modify a user's personal todo app by rewriting their React component code.

${SCOPE_DOCS}

${CODE_RULES}`;

export const MERGE_SYSTEM_PROMPT = `You are the Todoit update agent. You merge new platform features into a user's customized todo app while preserving their personal customizations.

${SCOPE_DOCS}

YOUR TASK:
- You'll receive the OLD base template, the NEW base template, a changelog, and the user's current app code
- The user's code is a fork of the old base that they've customized
- Incorporate the new features/fixes from the new base INTO the user's existing app
- PRESERVE the user's customizations (styling, layout, added features, etc.)
- If there's a genuine conflict (user removed something the update needs), prefer the user's choice

${CODE_RULES}`;

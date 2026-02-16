import crypto from "crypto";
import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

function verifySessionToken(
  token: string
): { userId: string; handle: string } | null {
  try {
    const secret = process.env.SUPABASE_SERVICE_KEY!.slice(0, 32);
    const decoded = Buffer.from(token, "base64").toString();
    const parts = decoded.split(":");
    if (parts.length < 4) return null;
    const signature = parts[parts.length - 1];
    const timestamp = parts[parts.length - 2];
    const handle = parts[parts.length - 3];
    const userId = parts.slice(0, parts.length - 3).join(":");
    const expectedSig = crypto
      .createHmac("sha256", secret)
      .update(`${userId}:${handle}:${timestamp}`)
      .digest("hex")
      .slice(0, 16);
    if (signature !== expectedSig) return null;
    if (Date.now() - parseInt(timestamp) > 30 * 24 * 60 * 60 * 1000)
      return null;
    return { userId, handle };
  } catch {
    return null;
  }
}

function getSession(request: NextRequest) {
  const token = request.cookies.get("td_session")?.value;
  if (!token) return null;
  return verifySessionToken(token);
}

const SYSTEM_PROMPT = `You are the Todoit builder agent. You modify a user's personal todo app by rewriting their React component code.

AVAILABLE IN SCOPE (injected by the wrapper — do NOT import these):
- React hooks: useState, useEffect, useRef, useMemo, useCallback
- Task data: tasks (array of {id, title, completed, properties, created_at})
- Task operations: addTask(title, properties?), toggleTask(id), deleteTask(id), updateTask(id, {title?, completed?, properties?})
- User info: user ({handle})

RULES:
- Output a SINGLE React component named App (function App() { ... })
- Use inline styles (style={{ }}) — no CSS imports, no Tailwind classes
- Do NOT import anything — all dependencies are in scope
- The component must be self-contained in one function
- For extra per-task data (priority, due dates, tags, etc.), use task.properties.fieldName
  and updateTask(id, { properties: { ...task.properties, fieldName: value } })
- You can add any task management feature: sorting, filtering, views, export, themes, etc.
- Keep the app functional and visually coherent after changes
- Preserve existing functionality unless the user explicitly asks to remove it

OUTPUT FORMAT:
Return the complete updated component code in a \`\`\`jsx code block, followed by a brief explanation of what you changed.`;

function extractCodeBlock(text: string): string | null {
  const match = text.match(/```(?:jsx|javascript|js)?\s*\n([\s\S]*?)```/);
  return match ? match[1].trim() : null;
}

function extractMessage(text: string): string {
  // Get text after the code block
  const parts = text.split(/```(?:jsx|javascript|js)?[\s\S]*?```/);
  const after = parts[parts.length - 1]?.trim();
  if (after) return after;
  // Fallback: get text before the code block
  const before = parts[0]?.trim();
  return before || "Done!";
}

export async function POST(request: NextRequest) {
  const session = getSession(request);
  if (!session) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { message } = body;

    if (!message || typeof message !== "string" || !message.trim()) {
      return NextResponse.json({ error: "Message required" }, { status: 400 });
    }

    // Load current app_code and tasks
    const [configResult, tasksResult] = await Promise.all([
      supabase
        .from("todoit_config")
        .select("app_code, version")
        .eq("id", session.userId)
        .single(),
      supabase
        .from("todoit_tasks")
        .select("id, title, completed, properties, created_at")
        .eq("user_id", session.userId)
        .order("created_at", { ascending: false }),
    ]);

    if (!configResult.data) {
      return NextResponse.json({ error: "Config not found" }, { status: 404 });
    }

    const currentCode = configResult.data.app_code;
    const currentVersion = configResult.data.version;
    const tasks = tasksResult.data || [];

    const userPrompt = `CURRENT APP CODE:
\`\`\`jsx
${currentCode}
\`\`\`

CURRENT TASKS (${tasks.length} total):
${tasks.length > 0 ? JSON.stringify(tasks.slice(0, 10), null, 2) : "(no tasks yet)"}

USER REQUEST: ${message.trim()}`;

    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-5-20250929",
      max_tokens: 4096,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: userPrompt }],
    });

    const responseText =
      response.content[0].type === "text" ? response.content[0].text : "";

    const newCode = extractCodeBlock(responseText);
    if (!newCode) {
      return NextResponse.json({
        app_code: currentCode,
        message:
          "I couldn't generate valid code. Could you try rephrasing your request?",
        version: currentVersion,
      });
    }

    // Save new code to Supabase
    const newVersion = currentVersion + 1;
    const { error: updateError } = await supabase
      .from("todoit_config")
      .update({
        app_code: newCode,
        version: newVersion,
        updated_at: new Date().toISOString(),
      })
      .eq("id", session.userId);

    if (updateError) {
      return NextResponse.json(
        { error: "Failed to save changes" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      app_code: newCode,
      message: extractMessage(responseText),
      version: newVersion,
    });
  } catch (err) {
    console.error("Agent error:", err);
    return NextResponse.json(
      { error: "Agent failed. Try again." },
      { status: 500 }
    );
  }
}

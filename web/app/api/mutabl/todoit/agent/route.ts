import crypto from "crypto";
import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import { agentLoop, BUILDER_SYSTEM_PROMPT } from "../../agent-loop";

export const dynamic = "force-dynamic";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

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
        .select("app_code, app_css, version")
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
    const currentCss = configResult.data.app_css || "";
    const currentVersion = configResult.data.version;
    const tasks = tasksResult.data || [];

    const cssSection = currentCss ? `\nCURRENT APP CSS:\n\`\`\`css\n${currentCss}\n\`\`\`\n` : "";

    const userPrompt = `CURRENT APP CODE:
\`\`\`jsx
${currentCode}
\`\`\`
${cssSection}
CURRENT TASKS (${tasks.length} total):
${tasks.length > 0 ? JSON.stringify(tasks.slice(0, 10), null, 2) : "(no tasks yet)"}

USER REQUEST: ${message.trim()}`;

    const result = await agentLoop({
      systemPrompt: BUILDER_SYSTEM_PROMPT,
      userMessage: userPrompt,
      currentCode,
      currentCss,
    });

    if (!result.ok) {
      return NextResponse.json({
        app_code: currentCode,
        message: result.error,
        version: currentVersion,
      });
    }

    // Save new code + CSS to Supabase
    const newVersion = currentVersion + 1;
    const updatePayload: Record<string, unknown> = {
      app_code: result.code,
      version: newVersion,
      modified: true,
      updated_at: new Date().toISOString(),
    };
    if (result.css !== undefined) {
      updatePayload.app_css = result.css;
    }
    const { error: updateError } = await supabase
      .from("todoit_config")
      .update(updatePayload)
      .eq("id", session.userId);

    if (updateError) {
      return NextResponse.json(
        { error: "Failed to save changes" },
        { status: 500 }
      );
    }

    // Log the change
    await supabase.from("todoit_changes").insert({
      user_id: session.userId,
      request: message.trim(),
      summary: result.message,
    });

    return NextResponse.json({
      app_code: result.code,
      app_css: result.css !== undefined ? result.css : currentCss,
      message: result.message,
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

import crypto from "crypto";
import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import { agentLoop } from "../../agent-loop";

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
  const token = request.cookies.get("cx_session")?.value;
  if (!token) return null;
  return verifySessionToken(token);
}

const CONTXT_SCOPE_DOCS = `AVAILABLE IN SCOPE (injected by the wrapper — do NOT import these):
- React hooks: useState, useEffect, useRef, useMemo, useCallback
- People data: people (array of {id, name, how_we_met, notes, last_contacted, desired_frequency, properties, tags, created_at})
- People operations: addPerson({name, how_we_met?, notes?, desired_frequency?, tags?}), updatePerson(id, {name?, how_we_met?, notes?, desired_frequency?, properties?, tags?}), deletePerson(id)
- Interactions data: interactions (array of {id, date, type, note, people, created_at})
- Interactions operations: addInteraction({date?, type?, note?, person_ids}), updateInteraction(id, {date?, type?, note?, person_ids?}), deleteInteraction(id)
- Tags data: tags (array of {id, label})
- Tags operations: addTag(label)
- Reconnect queue: reconnectQueue (array of {id, name, how_we_met, last_contacted, desired_frequency, overdue_days, tags})
- Reconnect operations: snooze(person_id, days?), skipReconnect(person_id)
- Refresh: refreshAll()
- User info: user ({handle})

NOTE: Logout and settings are handled by the app wrapper — do NOT add logout buttons to the component.`;

const CONTXT_CODE_RULES = `RULES:
- Output a SINGLE React component named App (function App() { ... })
- Use inline styles (style={{ }}) — no CSS imports, no Tailwind classes
- Do NOT import anything — all dependencies are in scope
- The component must be self-contained in one function
- For extra per-person data, use person.properties.fieldName and updatePerson(id, { properties: { ...person.properties, fieldName: value } })
- You can add any relationship management feature: views, search, filters, themes, etc.
- Keep the app functional and visually coherent after changes
- Preserve existing functionality unless the user explicitly asks to remove it
- The teal color scheme (#00CEC9) is the default accent — respect it unless user asks for a different theme

OUTPUT FORMAT:
Return the complete updated component code in a \`\`\`jsx code block, followed by a brief explanation of what you changed.`;

const CONTXT_SYSTEM_PROMPT = `You are the CONTXT builder agent. You modify a user's personal relationship CRM by rewriting their React component code.

CONTXT is a personal relationship manager for freelancers and consultants. It helps users stay in touch with their network through:
- A reconnect queue (people overdue for contact, sorted by urgency)
- People management (name, how they met, notes, tags, contact frequency)
- Interaction logging (coffee, call, text, email, event — linked to people)
- Freeform tags for categorizing relationships

The tone should be warm and encouraging, never guilt-inducing. "It's been a while" not "overdue."

${CONTXT_SCOPE_DOCS}

${CONTXT_CODE_RULES}`;

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

    // Load current app_code, people, and interactions
    const [configResult, peopleResult, interactionsResult] = await Promise.all([
      supabase
        .from("contxt_config")
        .select("app_code, version")
        .eq("id", session.userId)
        .single(),
      supabase
        .from("contxt_people")
        .select("id, name, how_we_met, notes, last_contacted, desired_frequency, properties, created_at")
        .eq("user_id", session.userId)
        .order("created_at", { ascending: false })
        .limit(20),
      supabase
        .from("contxt_interactions")
        .select("id, date, type, note, created_at")
        .eq("user_id", session.userId)
        .order("date", { ascending: false })
        .limit(20),
    ]);

    if (!configResult.data) {
      return NextResponse.json({ error: "Config not found" }, { status: 404 });
    }

    const currentCode = configResult.data.app_code;
    const currentVersion = configResult.data.version;
    const people = peopleResult.data || [];
    const interactions = interactionsResult.data || [];

    const userPrompt = `CURRENT APP CODE:
\`\`\`jsx
${currentCode}
\`\`\`

CURRENT PEOPLE (${people.length} shown, most recent):
${people.length > 0 ? JSON.stringify(people, null, 2) : "(no people yet)"}

RECENT INTERACTIONS (${interactions.length} shown):
${interactions.length > 0 ? JSON.stringify(interactions, null, 2) : "(no interactions yet)"}

USER REQUEST: ${message.trim()}`;

    const result = await agentLoop({
      systemPrompt: CONTXT_SYSTEM_PROMPT,
      userMessage: userPrompt,
      currentCode,
      maxTokens: 16384,
    });

    if (!result.ok) {
      return NextResponse.json({
        app_code: currentCode,
        message: result.error,
        version: currentVersion,
      });
    }

    // Save new code to Supabase
    const newVersion = currentVersion + 1;
    const { error: updateError } = await supabase
      .from("contxt_config")
      .update({
        app_code: result.code,
        version: newVersion,
        modified: true,
        updated_at: new Date().toISOString(),
      })
      .eq("id", session.userId);

    if (updateError) {
      return NextResponse.json(
        { error: "Failed to save changes" },
        { status: 500 }
      );
    }

    // Log the change
    await supabase.from("contxt_changes").insert({
      user_id: session.userId,
      request: message.trim(),
      summary: result.message,
    });

    return NextResponse.json({
      app_code: result.code,
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

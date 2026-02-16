import crypto from "crypto";
import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

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

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = getSession(request);
  if (!session) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { title, completed, properties } = body;

    // Verify ownership
    const { data: existing } = await supabase
      .from("todoit_tasks")
      .select("id, user_id")
      .eq("id", params.id)
      .eq("user_id", session.userId)
      .single();

    if (!existing) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    const updates: Record<string, unknown> = {};
    if (title !== undefined) updates.title = title;
    if (completed !== undefined) updates.completed = completed;
    if (properties !== undefined) updates.properties = properties;

    const { data, error } = await supabase
      .from("todoit_tasks")
      .update(updates)
      .eq("id", params.id)
      .select("id, title, completed, position, properties, created_at")
      .single();

    if (error) {
      return NextResponse.json({ error: "Failed to update task" }, { status: 500 });
    }

    return NextResponse.json({ task: data });
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = getSession(request);
  if (!session) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  // Verify ownership
  const { data: existing } = await supabase
    .from("todoit_tasks")
    .select("id, user_id")
    .eq("id", params.id)
    .eq("user_id", session.userId)
    .single();

  if (!existing) {
    return NextResponse.json({ error: "Task not found" }, { status: 404 });
  }

  const { error } = await supabase
    .from("todoit_tasks")
    .delete()
    .eq("id", params.id);

  if (error) {
    return NextResponse.json({ error: "Failed to delete task" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}

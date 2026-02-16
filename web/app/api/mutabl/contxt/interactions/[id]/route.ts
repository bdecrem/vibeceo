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
  const token = request.cookies.get("cx_session")?.value;
  if (!token) return null;
  return verifySessionToken(token);
}

async function updateLastContacted(personIds: string[]) {
  for (const personId of personIds) {
    const { data: links } = await supabase
      .from("contxt_interactions_people")
      .select("interaction_id")
      .eq("person_id", personId);

    let latestDate: string | null = null;
    if (links && links.length > 0) {
      const { data: latest } = await supabase
        .from("contxt_interactions")
        .select("date")
        .in("id", links.map((l) => l.interaction_id))
        .order("date", { ascending: false })
        .limit(1)
        .single();
      latestDate = latest?.date || null;
    }

    await supabase
      .from("contxt_people")
      .update({
        last_contacted: latestDate,
        updated_at: new Date().toISOString(),
      })
      .eq("id", personId);
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = getSession(request);
  if (!session) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { id } = await params;
  const body = await request.json();
  const { date, type, note, person_ids } = body;

  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (date !== undefined) updates.date = date;
  if (type !== undefined) updates.type = type;
  if (note !== undefined) updates.note = note;

  // Get currently linked people before changes
  const { data: oldLinks } = await supabase
    .from("contxt_interactions_people")
    .select("person_id")
    .eq("interaction_id", id);
  const oldPersonIds = (oldLinks || []).map((l) => l.person_id);

  const { data: interaction, error } = await supabase
    .from("contxt_interactions")
    .update(updates)
    .eq("id", id)
    .eq("user_id", session.userId)
    .select()
    .single();

  if (error || !interaction) {
    return NextResponse.json({ error: "Failed to update interaction" }, { status: 500 });
  }

  // Replace people links if provided
  if (Array.isArray(person_ids)) {
    await supabase
      .from("contxt_interactions_people")
      .delete()
      .eq("interaction_id", id);

    const links = person_ids.map((pid: string) => ({
      interaction_id: id,
      person_id: pid,
    }));
    await supabase.from("contxt_interactions_people").insert(links);

    // Recalculate last_contacted for all affected people (old + new)
    const allAffected = [...new Set([...oldPersonIds, ...person_ids])];
    await updateLastContacted(allAffected);
  }

  return NextResponse.json({ interaction });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = getSession(request);
  if (!session) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { id } = await params;

  // Get linked people before deletion
  const { data: links } = await supabase
    .from("contxt_interactions_people")
    .select("person_id")
    .eq("interaction_id", id);
  const personIds = (links || []).map((l) => l.person_id);

  const { error } = await supabase
    .from("contxt_interactions")
    .delete()
    .eq("id", id)
    .eq("user_id", session.userId);

  if (error) {
    return NextResponse.json({ error: "Failed to delete interaction" }, { status: 500 });
  }

  // Recalculate last_contacted for affected people
  if (personIds.length > 0) {
    await updateLastContacted(personIds);
  }

  return NextResponse.json({ success: true });
}

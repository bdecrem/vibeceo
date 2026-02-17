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
  const { name, email, phone, social_links, how_we_met, notes, last_contacted, desired_frequency, properties, tags } = body;

  // Build update object with only provided fields
  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (name !== undefined) updates.name = name;
  if (email !== undefined) updates.email = email;
  if (phone !== undefined) updates.phone = phone;
  if (social_links !== undefined) updates.social_links = social_links;
  if (how_we_met !== undefined) updates.how_we_met = how_we_met;
  if (notes !== undefined) updates.notes = notes;
  if (last_contacted !== undefined) updates.last_contacted = last_contacted;
  if (desired_frequency !== undefined) updates.desired_frequency = desired_frequency;
  if (properties !== undefined) updates.properties = properties;

  const { data: person, error } = await supabase
    .from("contxt_people")
    .update(updates)
    .eq("id", id)
    .eq("user_id", session.userId)
    .select()
    .single();

  if (error || !person) {
    return NextResponse.json({ error: "Failed to update person" }, { status: 500 });
  }

  // Replace tag associations if tags provided
  let tagObjects: { id: string; label: string }[] = [];
  if (Array.isArray(tags)) {
    // Remove existing tag links
    await supabase
      .from("contxt_people_tags")
      .delete()
      .eq("person_id", id);

    // Re-link tags
    for (const label of tags) {
      const trimmed = (typeof label === "string" ? label : "").trim().toLowerCase();
      if (!trimmed) continue;

      const { data: existing } = await supabase
        .from("contxt_tags")
        .select("id, label")
        .eq("user_id", session.userId)
        .eq("label", trimmed)
        .single();

      let tagId: string;
      if (existing) {
        tagId = existing.id;
        tagObjects.push({ id: existing.id, label: existing.label });
      } else {
        const { data: newTag } = await supabase
          .from("contxt_tags")
          .insert({ user_id: session.userId, label: trimmed })
          .select("id, label")
          .single();
        if (!newTag) continue;
        tagId = newTag.id;
        tagObjects.push({ id: newTag.id, label: newTag.label });
      }

      await supabase
        .from("contxt_people_tags")
        .upsert({ person_id: id, tag_id: tagId }, { onConflict: "person_id,tag_id" });
    }
  }

  return NextResponse.json({ person: { ...person, tags: tagObjects } });
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

  const { error } = await supabase
    .from("contxt_people")
    .delete()
    .eq("id", id)
    .eq("user_id", session.userId);

  if (error) {
    return NextResponse.json({ error: "Failed to delete person" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}

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

export async function GET(request: NextRequest) {
  const session = getSession(request);
  if (!session) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { data: people, error } = await supabase
    .from("contxt_people")
    .select("*, contxt_people_tags(tag_id, contxt_tags(id, label))")
    .eq("user_id", session.userId)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: "Failed to load people" }, { status: 500 });
  }

  const mapped = (people || []).map((p) => ({
    id: p.id,
    name: p.name,
    email: p.email,
    phone: p.phone,
    social_links: p.social_links,
    how_we_met: p.how_we_met,
    notes: p.notes,
    last_contacted: p.last_contacted,
    desired_frequency: p.desired_frequency,
    properties: p.properties,
    created_at: p.created_at,
    updated_at: p.updated_at,
    tags: (p.contxt_people_tags || [])
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .map((pt: any) => pt.contxt_tags)
      .flat()
      .filter(Boolean),
  }));

  return NextResponse.json({ people: mapped });
}

export async function POST(request: NextRequest) {
  const session = getSession(request);
  if (!session) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const body = await request.json();
  const { name, email, phone, social_links, how_we_met, notes, last_contacted, desired_frequency, properties, tags } = body;

  if (!name || typeof name !== "string" || !name.trim()) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }

  const { data: person, error: insertError } = await supabase
    .from("contxt_people")
    .insert({
      user_id: session.userId,
      name: name.trim(),
      email: email || null,
      phone: phone || null,
      social_links: social_links || {},
      how_we_met: how_we_met || null,
      notes: notes || null,
      last_contacted: last_contacted || null,
      desired_frequency: desired_frequency || "none",
      properties: properties || {},
    })
    .select()
    .single();

  if (insertError || !person) {
    return NextResponse.json({ error: "Failed to create person" }, { status: 500 });
  }

  // Handle tags — array of label strings
  let tagObjects: { id: string; label: string }[] = [];
  if (Array.isArray(tags) && tags.length > 0) {
    tagObjects = await upsertAndLinkTags(session.userId, person.id, tags);
  }

  return NextResponse.json({
    person: { ...person, tags: tagObjects },
  });
}

async function upsertAndLinkTags(
  userId: string,
  personId: string,
  labels: string[]
): Promise<{ id: string; label: string }[]> {
  const tagObjects: { id: string; label: string }[] = [];

  for (const label of labels) {
    const trimmed = label.trim().toLowerCase();
    if (!trimmed) continue;

    // Upsert tag
    const { data: existing } = await supabase
      .from("contxt_tags")
      .select("id, label")
      .eq("user_id", userId)
      .eq("label", trimmed)
      .single();

    let tagId: string;
    if (existing) {
      tagId = existing.id;
      tagObjects.push({ id: existing.id, label: existing.label });
    } else {
      const { data: newTag } = await supabase
        .from("contxt_tags")
        .insert({ user_id: userId, label: trimmed })
        .select("id, label")
        .single();
      if (!newTag) continue;
      tagId = newTag.id;
      tagObjects.push({ id: newTag.id, label: newTag.label });
    }

    // Link tag to person (ignore conflict)
    await supabase
      .from("contxt_people_tags")
      .upsert({ person_id: personId, tag_id: tagId }, { onConflict: "person_id,tag_id" });
  }

  return tagObjects;
}

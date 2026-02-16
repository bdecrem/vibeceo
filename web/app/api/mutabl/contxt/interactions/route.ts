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
    // Get all interaction IDs for this person
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

export async function GET(request: NextRequest) {
  const session = getSession(request);
  if (!session) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { data: interactions, error } = await supabase
    .from("contxt_interactions")
    .select("*, contxt_interactions_people(person_id, contxt_people(id, name))")
    .eq("user_id", session.userId)
    .order("date", { ascending: false });

  if (error) {
    return NextResponse.json({ error: "Failed to load interactions" }, { status: 500 });
  }

  const mapped = (interactions || []).map((i) => ({
    id: i.id,
    date: i.date,
    type: i.type,
    note: i.note,
    created_at: i.created_at,
    people: (i.contxt_interactions_people || [])
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .map((ip: any) => ip.contxt_people)
      .flat()
      .filter(Boolean),
  }));

  return NextResponse.json({ interactions: mapped });
}

export async function POST(request: NextRequest) {
  const session = getSession(request);
  if (!session) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const body = await request.json();
  const { date, type, note, person_ids } = body;

  if (!Array.isArray(person_ids) || person_ids.length === 0) {
    return NextResponse.json({ error: "At least one person required" }, { status: 400 });
  }

  const { data: interaction, error: insertError } = await supabase
    .from("contxt_interactions")
    .insert({
      user_id: session.userId,
      date: date || new Date().toISOString().split("T")[0],
      type: type || "other",
      note: note || null,
    })
    .select()
    .single();

  if (insertError || !interaction) {
    return NextResponse.json({ error: "Failed to create interaction" }, { status: 500 });
  }

  // Link people
  const links = person_ids.map((pid: string) => ({
    interaction_id: interaction.id,
    person_id: pid,
  }));
  await supabase.from("contxt_interactions_people").insert(links);

  // Auto-update last_contacted on linked people
  await updateLastContacted(person_ids);

  // Fetch linked people names for response
  const { data: linkedPeople } = await supabase
    .from("contxt_people")
    .select("id, name")
    .in("id", person_ids);

  return NextResponse.json({
    interaction: {
      ...interaction,
      people: linkedPeople || [],
    },
  });
}

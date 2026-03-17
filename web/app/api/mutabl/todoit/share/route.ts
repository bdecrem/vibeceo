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

const ADJECTIVES = [
  "bright", "calm", "dark", "eager", "fair", "glad", "happy", "keen",
  "light", "neat", "pale", "quick", "rare", "safe", "tall", "warm",
  "bold", "cool", "deep", "fast", "gold", "high", "just", "kind",
];

const NOUNS = [
  "fox", "owl", "elm", "bay", "gem", "oak", "ray", "dew",
  "fin", "ivy", "jet", "koi", "log", "map", "net", "orb",
  "pen", "rig", "sky", "web", "arc", "bee", "cub", "dot",
];

function generateSlug(): string {
  const adj = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)];
  const noun = NOUNS[Math.floor(Math.random() * NOUNS.length)];
  const num = Math.floor(Math.random() * 90) + 10;
  return `${adj}-${noun}-${num}`;
}

// GET — current share status for the logged-in user
export async function GET(request: NextRequest) {
  const session = getSession(request);
  if (!session) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { data } = await supabase
    .from("todoit_shares")
    .select("slug, title, updated_at")
    .eq("user_id", session.userId)
    .order("updated_at", { ascending: false })
    .limit(1)
    .single();

  if (!data) {
    return NextResponse.json({ share: null });
  }

  const origin = request.headers.get("origin") || request.headers.get("host") || "";
  const protocol = origin.startsWith("http") ? "" : "https://";
  const baseUrl = origin.startsWith("http") ? origin : `${protocol}${origin}`;
  const url = `${baseUrl}/mutabl/todoit/s/${data.slug}`;

  return NextResponse.json({ share: { slug: data.slug, title: data.title, url } });
}

// POST — create or refresh share (snapshots current tasks)
export async function POST(request: NextRequest) {
  const session = getSession(request);
  if (!session) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  try {
    const body = await request.json().catch(() => ({}));
    const { action, title } = body;

    if (action === "unshare") {
      await supabase
        .from("todoit_shares")
        .delete()
        .eq("user_id", session.userId);
      return NextResponse.json({ success: true });
    }

    // Snapshot current tasks
    const { data: tasks } = await supabase
      .from("todoit_tasks")
      .select("id, title, completed, position, properties")
      .eq("user_id", session.userId)
      .order("position", { ascending: true });

    const snapshot = tasks || [];

    // Check if share exists
    const { data: existing } = await supabase
      .from("todoit_shares")
      .select("id, slug")
      .eq("user_id", session.userId)
      .single();

    let slug = existing?.slug;

    if (!slug) {
      // Generate unique slug
      for (let attempt = 0; attempt < 5; attempt++) {
        slug = generateSlug();
        const { data: conflict } = await supabase
          .from("todoit_shares")
          .select("id")
          .eq("slug", slug)
          .single();
        if (!conflict) break;
      }
    }

    const shareTitle = title || `${session.handle}'s list`;

    if (existing) {
      await supabase
        .from("todoit_shares")
        .update({
          title: shareTitle,
          tasks_snapshot: snapshot,
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", session.userId);
    } else {
      await supabase.from("todoit_shares").insert({
        user_id: session.userId,
        slug,
        title: shareTitle,
        tasks_snapshot: snapshot,
      });
    }

    const origin = request.headers.get("origin") || request.headers.get("host") || "";
    const protocol = origin.startsWith("http") ? "" : "https://";
    const baseUrl = origin.startsWith("http") ? origin : `${protocol}${origin}`;
    const url = `${baseUrl}/mutabl/todoit/s/${slug}`;

    return NextResponse.json({ success: true, slug, url });
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }
}

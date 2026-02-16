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
  const token = request.cookies.get("nb_session")?.value;
  if (!token) return null;
  return verifySessionToken(token);
}

const ADJECTIVES = [
  "bright", "calm", "dark", "eager", "fair", "glad", "happy", "keen",
  "light", "neat", "pale", "quick", "rare", "safe", "tall", "warm",
  "bold", "cool", "deep", "fast", "gold", "high", "just", "kind",
  "lean", "mild", "open", "pure", "rich", "slim", "true", "vast",
];

const NOUNS = [
  "fox", "owl", "elm", "bay", "gem", "oak", "ray", "dew",
  "fin", "ivy", "jet", "koi", "log", "map", "net", "orb",
  "pen", "rig", "sky", "web", "arc", "bee", "cub", "dot",
  "eel", "fig", "gum", "hut", "ink", "jar", "kit", "lux",
];

function generateSlug(): string {
  const adj = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)];
  const noun = NOUNS[Math.floor(Math.random() * NOUNS.length)];
  const num = Math.floor(Math.random() * 90) + 10;
  return `${adj}-${noun}-${num}`;
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = getSession(request);
  if (!session) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { action } = body;

    const { data: doc } = await supabase
      .from("notabl_documents")
      .select("id, user_id, share_slug, is_public")
      .eq("id", params.id)
      .eq("user_id", session.userId)
      .single();

    if (!doc) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 });
    }

    if (action === "unshare") {
      await supabase
        .from("notabl_documents")
        .update({ is_public: false, updated_at: new Date().toISOString() })
        .eq("id", params.id);

      return NextResponse.json({ success: true });
    }

    // Default action: share
    let slug = doc.share_slug;
    if (!slug) {
      // Generate unique slug with retry
      for (let attempt = 0; attempt < 5; attempt++) {
        slug = generateSlug();
        const { data: conflict } = await supabase
          .from("notabl_documents")
          .select("id")
          .eq("share_slug", slug)
          .single();
        if (!conflict) break;
      }
    }

    await supabase
      .from("notabl_documents")
      .update({
        share_slug: slug,
        is_public: true,
        updated_at: new Date().toISOString(),
      })
      .eq("id", params.id);

    const origin = request.headers.get("origin") || request.headers.get("host") || "";
    const protocol = origin.startsWith("http") ? "" : "https://";
    const baseUrl = origin.startsWith("http") ? origin : `${protocol}${origin}`;
    const url = `${baseUrl}/mutabl/notabl/s/${slug}`;

    return NextResponse.json({ success: true, slug, url });
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }
}

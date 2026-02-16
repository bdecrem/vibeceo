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

export async function GET(request: NextRequest) {
  const session = getSession(request);
  if (!session) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { data, error } = await supabase
    .from("notabl_documents")
    .select("id, title, blocks, share_slug, is_public, created_at, updated_at")
    .eq("user_id", session.userId)
    .order("updated_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: "Failed to fetch documents" }, { status: 500 });
  }

  return NextResponse.json({ documents: data || [] });
}

export async function POST(request: NextRequest) {
  const session = getSession(request);
  if (!session) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { title } = body;

    const docTitle = (title && typeof title === "string" && title.trim()) ? title.trim() : "Untitled";

    const initBlockId = crypto.randomBytes(4).toString("hex");
    const defaultBlocks = [
      { id: initBlockId, type: "richtext", content: "", properties: {} }
    ];

    const { data, error } = await supabase
      .from("notabl_documents")
      .insert({
        user_id: session.userId,
        title: docTitle,
        blocks: defaultBlocks,
      })
      .select("id, title, blocks, share_slug, is_public, created_at, updated_at")
      .single();

    if (error) {
      return NextResponse.json({ error: "Failed to create document" }, { status: 500 });
    }

    return NextResponse.json({ document: data });
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }
}

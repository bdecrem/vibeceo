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

export async function POST(request: NextRequest) {
  const session = getSession(request);
  if (!session) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const body = await request.json();
  const { action } = body;

  if (action !== "skip" && action !== "accept") {
    return NextResponse.json(
      { error: "Action must be 'skip' or 'accept'" },
      { status: 400 }
    );
  }

  const { data: base } = await supabase
    .from("notabl_config")
    .select("app_code, app_css, version")
    .is("handle", null)
    .single();

  if (!base) {
    return NextResponse.json(
      { error: "Base config not found" },
      { status: 500 }
    );
  }

  if (action === "skip") {
    await supabase
      .from("notabl_config")
      .update({
        base_version: base.version,
        updated_at: new Date().toISOString(),
      })
      .eq("id", session.userId);

    return NextResponse.json({ success: true });
  }

  await supabase
    .from("notabl_config")
    .update({
      app_code: base.app_code,
      app_css: base.app_css,
      base_version: base.version,
      modified: false,
      updated_at: new Date().toISOString(),
    })
    .eq("id", session.userId);

  return NextResponse.json({
    success: true,
    app_code: base.app_code,
    app_css: base.app_css,
  });
}

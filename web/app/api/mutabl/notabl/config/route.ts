import crypto from "crypto";
import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import { getBaseTemplate } from "../../base-template";

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

  const userResult = await supabase
    .from("notabl_config")
    .select("app_code, app_css, version, base_version, modified")
    .eq("id", session.userId)
    .single();

  if (!userResult.data) {
    return NextResponse.json({ error: "Config not found" }, { status: 404 });
  }

  const user = userResult.data;
  const base = getBaseTemplate("notabl");

  if (!user.modified && user.base_version < base.version) {
    await supabase
      .from("notabl_config")
      .update({
        app_code: base.code,
        app_css: base.css,
        base_version: base.version,
        updated_at: new Date().toISOString(),
      })
      .eq("id", session.userId);

    return NextResponse.json({
      app_code: base.code,
      app_css: base.css,
      version: user.version,
      update_available: false,
    });
  }

  const updateAvailable = user.modified && user.base_version < base.version;

  return NextResponse.json({
    app_code: user.app_code,
    app_css: user.app_css,
    version: user.version,
    update_available: updateAvailable,
  });
}

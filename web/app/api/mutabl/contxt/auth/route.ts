import crypto from "crypto";
import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import { getBaseTemplate } from "../../base-template";

export const dynamic = "force-dynamic";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

function isValidHandle(handle: string): boolean {
  return /^[a-zA-Z0-9_]{3,20}$/.test(handle);
}

function isValidCode(code: string): boolean {
  return /^[a-zA-Z0-9]{4}$/.test(code);
}

function createSessionToken(userId: string, handle: string): string {
  const secret = process.env.SUPABASE_SERVICE_KEY!.slice(0, 32);
  const timestamp = Date.now();
  const data = `${userId}:${handle}:${timestamp}`;
  const signature = crypto
    .createHmac("sha256", secret)
    .update(data)
    .digest("hex")
    .slice(0, 16);
  return Buffer.from(`${data}:${signature}`).toString("base64");
}

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

function setSessionCookie(
  response: NextResponse,
  userId: string,
  handle: string
): void {
  response.cookies.set("cx_session", createSessionToken(userId, handle), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 30 * 24 * 60 * 60,
    path: "/",
  });
}

export async function GET(request: NextRequest) {
  const token = request.cookies.get("cx_session")?.value;
  if (!token) {
    return NextResponse.json({ user: null });
  }
  const session = verifySessionToken(token);
  if (!session) {
    const response = NextResponse.json({ user: null });
    response.cookies.delete("cx_session");
    return response;
  }
  return NextResponse.json({
    user: { id: session.userId, handle: session.handle },
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, handle, code } = body;

    if (!action) {
      return NextResponse.json({ error: "Action required" }, { status: 400 });
    }

    if (action === "logout") {
      const logoutResponse = NextResponse.json({ success: true });
      logoutResponse.cookies.delete("cx_session");
      return logoutResponse;
    }

    if (!handle || !isValidHandle(handle)) {
      return NextResponse.json(
        { error: "Handle must be 3-20 alphanumeric characters or underscores" },
        { status: 400 }
      );
    }

    const handleLower = handle.toLowerCase();

    switch (action) {
      case "check": {
        const { data: existing } = await supabase
          .from("contxt_config")
          .select("id")
          .eq("handle_lower", handleLower)
          .single();

        return NextResponse.json({
          exists: !!existing,
          handle: handle,
        });
      }

      case "register": {
        if (!code || !isValidCode(code)) {
          return NextResponse.json(
            { error: "Code must be exactly 4 alphanumeric characters" },
            { status: 400 }
          );
        }

        const { data: existing } = await supabase
          .from("contxt_config")
          .select("id")
          .eq("handle_lower", handleLower)
          .single();

        if (existing) {
          return NextResponse.json(
            { success: false, error: "Handle already taken" },
            { status: 409 }
          );
        }

        const base = getBaseTemplate("contxt");

        const { data: newUser, error: insertError } = await supabase
          .from("contxt_config")
          .insert({
            handle: handle,
            handle_lower: handleLower,
            code: code,
            app_code: base.code,
            app_css: base.css,
            base_version: base.version,
          })
          .select("id, handle")
          .single();

        if (insertError) {
          console.error("Error creating user:", insertError);
          return NextResponse.json(
            { success: false, error: "Failed to create account" },
            { status: 500 }
          );
        }

        const registerResponse = NextResponse.json({
          success: true,
          user: { id: newUser.id, handle: newUser.handle },
        });
        setSessionCookie(registerResponse, newUser.id, newUser.handle);
        return registerResponse;
      }

      case "login": {
        if (!code || !isValidCode(code)) {
          return NextResponse.json(
            { error: "Code must be exactly 4 alphanumeric characters" },
            { status: 400 }
          );
        }

        const { data: user, error: findError } = await supabase
          .from("contxt_config")
          .select("id, handle, code")
          .eq("handle_lower", handleLower)
          .single();

        if (findError || !user) {
          return NextResponse.json(
            { success: false, error: "User not found" },
            { status: 404 }
          );
        }

        if (user.code !== code) {
          return NextResponse.json(
            { success: false, error: "Invalid code" },
            { status: 401 }
          );
        }

        const loginResponse = NextResponse.json({
          success: true,
          user: { id: user.id, handle: user.handle },
        });
        setSessionCookie(loginResponse, user.id, user.handle);
        return loginResponse;
      }

      default:
        return NextResponse.json(
          { error: "Invalid action" },
          { status: 400 }
        );
    }
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }
}

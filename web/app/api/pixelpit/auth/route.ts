import crypto from "crypto";
import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

// Validate handle: 3-20 chars, alphanumeric + underscore
function isValidHandle(handle: string): boolean {
  return /^[a-zA-Z0-9_]{3,20}$/.test(handle);
}

// Validate code: exactly 4 alphanumeric chars (case sensitive)
function isValidCode(code: string): boolean {
  return /^[a-zA-Z0-9]{4}$/.test(code);
}

// Session cookie: base64(userId:handle:timestamp:signature)
function createSessionToken(userId: number, handle: string): string {
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
): { userId: number; handle: string } | null {
  try {
    const secret = process.env.SUPABASE_SERVICE_KEY!.slice(0, 32);
    const decoded = Buffer.from(token, "base64").toString();
    const parts = decoded.split(":");
    if (parts.length < 4) return null;
    const [userIdStr, handle, timestamp, signature] = parts;
    const expectedSig = crypto
      .createHmac("sha256", secret)
      .update(`${userIdStr}:${handle}:${timestamp}`)
      .digest("hex")
      .slice(0, 16);
    if (signature !== expectedSig) return null;
    // 30-day expiry
    if (Date.now() - parseInt(timestamp) > 30 * 24 * 60 * 60 * 1000)
      return null;
    return { userId: parseInt(userIdStr, 10), handle };
  } catch {
    return null;
  }
}

function setSessionCookie(
  response: NextResponse,
  userId: number,
  handle: string
): void {
  response.cookies.set("pp_session", createSessionToken(userId, handle), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 30 * 24 * 60 * 60, // 30 days
    path: "/",
  });
}

// GET: Check session from cookie
export async function GET(request: NextRequest) {
  const token = request.cookies.get("pp_session")?.value;
  if (!token) {
    return NextResponse.json({ user: null });
  }
  const session = verifySessionToken(token);
  if (!session) {
    const response = NextResponse.json({ user: null });
    response.cookies.delete("pp_session");
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

    // Logout doesn't need handle/code
    if (action === "logout") {
      const logoutResponse = NextResponse.json({ success: true });
      logoutResponse.cookies.delete("pp_session");
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
        // Check if handle exists
        const { data: existing } = await supabase
          .from("pixelpit_users")
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

        // Check if handle already taken
        const { data: existing } = await supabase
          .from("pixelpit_users")
          .select("id")
          .eq("handle_lower", handleLower)
          .single();

        if (existing) {
          return NextResponse.json(
            { success: false, error: "Handle already taken" },
            { status: 409 }
          );
        }

        // Create new user
        const { data: newUser, error: insertError } = await supabase
          .from("pixelpit_users")
          .insert({
            handle: handle,
            handle_lower: handleLower,
            code: code,
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

        // Find user by handle (case insensitive)
        const { data: user, error: findError } = await supabase
          .from("pixelpit_users")
          .select("id, handle, code")
          .eq("handle_lower", handleLower)
          .single();

        if (findError || !user) {
          return NextResponse.json(
            { success: false, error: "User not found" },
            { status: 404 }
          );
        }

        // Verify code (case sensitive)
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
          { error: "Invalid action. Use: check, register, or login" },
          { status: 400 }
        );
    }
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }
}

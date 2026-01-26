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

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, handle, code } = body;

    if (!action) {
      return NextResponse.json({ error: "Action required" }, { status: 400 });
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

        return NextResponse.json({
          success: true,
          user: { id: newUser.id, handle: newUser.handle },
        });
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

        return NextResponse.json({
          success: true,
          user: { id: user.id, handle: user.handle },
        });
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

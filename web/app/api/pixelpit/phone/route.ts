import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import twilio from "twilio";

export const dynamic = "force-dynamic";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

function normalizePhone(phone: string): string {
  let cleaned = phone.replace(/\D/g, "");
  if (cleaned.length === 10) cleaned = "1" + cleaned;
  return "+" + cleaned;
}

function generateCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

function maskPhone(phone: string): string {
  if (!phone || phone.length < 4) return "***";
  return "***" + phone.slice(-2);
}

// Simple in-memory rate limit: 3 codes per hour per userId
const rateLimits = new Map<string, { count: number; reset: number }>();

function checkRateLimit(key: string): boolean {
  const now = Date.now();
  const limit = rateLimits.get(key);

  if (!limit || now > limit.reset) {
    rateLimits.set(key, { count: 1, reset: now + 3600000 });
    return true;
  }

  if (limit.count >= 3) return false;
  limit.count++;
  return true;
}

// GET - check phone status for a user
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get("userId");

  if (!userId) {
    return NextResponse.json({ error: "userId required" }, { status: 400 });
  }

  const { data: user, error } = await supabase
    .from("pixelpit_users")
    .select("phone, phone_verified")
    .eq("id", parseInt(userId))
    .single();

  if (error || !user) {
    return NextResponse.json({ phone: null });
  }

  if (user.phone) {
    return NextResponse.json({
      phone: maskPhone(user.phone),
      verified: user.phone_verified || false,
    });
  }

  return NextResponse.json({ phone: null });
}

// POST - send-code, verify, or remove
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, userId } = body;

    if (!userId || !action) {
      return NextResponse.json(
        { error: "userId and action required" },
        { status: 400 }
      );
    }

    // Verify user exists
    const { data: user, error: userError } = await supabase
      .from("pixelpit_users")
      .select("id")
      .eq("id", userId)
      .single();

    if (userError || !user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    if (action === "send-code") {
      const { phone } = body;
      if (!phone) {
        return NextResponse.json(
          { error: "Phone number required" },
          { status: 400 }
        );
      }

      const normalizedPhone = normalizePhone(phone);

      if (!checkRateLimit(String(userId))) {
        return NextResponse.json(
          { error: "Too many attempts. Try again later." },
          { status: 429 }
        );
      }

      const code = generateCode();

      // Store code + phone on user row
      const { error: updateError } = await supabase
        .from("pixelpit_users")
        .update({
          phone: normalizedPhone,
          phone_verify_code: code,
          phone_verified: false,
        })
        .eq("id", userId);

      if (updateError) {
        console.error("[pixelpit/phone] Update error:", updateError);
        return NextResponse.json(
          { error: "Failed to save code" },
          { status: 500 }
        );
      }

      // Send SMS via Twilio
      const twilioClient = twilio(
        process.env.TWILIO_ACCOUNT_SID!,
        process.env.TWILIO_AUTH_TOKEN!
      );

      await twilioClient.messages.create({
        body: `Your Pixelpit code: ${code}`,
        from: process.env.TWILIO_PHONE_NUMBER!,
        to: normalizedPhone,
      });

      console.log(`[pixelpit/phone] Sent code to ${normalizedPhone}`);
      return NextResponse.json({ success: true });
    }

    if (action === "verify") {
      const { code } = body;
      if (!code) {
        return NextResponse.json(
          { error: "Code required" },
          { status: 400 }
        );
      }

      const { data: userData, error: fetchError } = await supabase
        .from("pixelpit_users")
        .select("phone_verify_code")
        .eq("id", userId)
        .single();

      if (fetchError || !userData || !userData.phone_verify_code) {
        return NextResponse.json(
          { error: "No pending verification" },
          { status: 400 }
        );
      }

      if (userData.phone_verify_code !== code) {
        return NextResponse.json(
          { error: "Invalid code" },
          { status: 400 }
        );
      }

      // Code matches — verify
      await supabase
        .from("pixelpit_users")
        .update({
          phone_verified: true,
          phone_verify_code: null,
        })
        .eq("id", userId);

      return NextResponse.json({ success: true });
    }

    if (action === "remove") {
      await supabase
        .from("pixelpit_users")
        .update({
          phone: null,
          phone_verified: false,
          phone_verify_code: null,
        })
        .eq("id", userId);

      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch {
    return NextResponse.json(
      { error: "Invalid request body" },
      { status: 400 }
    );
  }
}

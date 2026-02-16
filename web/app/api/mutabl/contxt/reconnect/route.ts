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

const FREQUENCY_DAYS: Record<string, number> = {
  weekly: 7,
  monthly: 30,
  quarterly: 90,
  yearly: 365,
};

export async function GET(request: NextRequest) {
  const session = getSession(request);
  if (!session) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { data: people, error } = await supabase
    .from("contxt_people")
    .select("id, name, how_we_met, last_contacted, desired_frequency, contxt_people_tags(contxt_tags(id, label))")
    .eq("user_id", session.userId)
    .neq("desired_frequency", "none");

  if (error) {
    return NextResponse.json({ error: "Failed to load reconnect queue" }, { status: 500 });
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayMs = today.getTime();

  const queue = (people || [])
    .map((p) => {
      const freqDays = FREQUENCY_DAYS[p.desired_frequency];
      if (!freqDays) return null;

      let overdueDays: number;
      if (!p.last_contacted) {
        // Never contacted — immediately overdue
        overdueDays = freqDays;
      } else {
        const lastMs = new Date(p.last_contacted).getTime();
        const dueMs = lastMs + freqDays * 24 * 60 * 60 * 1000;
        overdueDays = Math.floor((todayMs - dueMs) / (24 * 60 * 60 * 1000));
      }

      if (overdueDays < 0) return null; // Not overdue yet

      return {
        id: p.id,
        name: p.name,
        how_we_met: p.how_we_met,
        last_contacted: p.last_contacted,
        desired_frequency: p.desired_frequency,
        overdue_days: overdueDays,
        tags: (p.contxt_people_tags || [])
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          .map((pt: any) => pt.contxt_tags)
          .flat()
          .filter(Boolean),
      };
    })
    .filter(Boolean)
    .sort((a, b) => b!.overdue_days - a!.overdue_days);

  return NextResponse.json({ queue });
}

export async function POST(request: NextRequest) {
  const session = getSession(request);
  if (!session) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const body = await request.json();
  const { person_id, action, snooze_days } = body;

  if (!person_id) {
    return NextResponse.json({ error: "person_id required" }, { status: 400 });
  }

  if (action === "skip") {
    // Reset timer without logging interaction — set last_contacted to today
    await supabase
      .from("contxt_people")
      .update({
        last_contacted: new Date().toISOString().split("T")[0],
        updated_at: new Date().toISOString(),
      })
      .eq("id", person_id)
      .eq("user_id", session.userId);

    return NextResponse.json({ success: true });
  }

  if (action === "snooze") {
    // Set last_contacted to a computed date so they reappear after snooze period
    const days = snooze_days || 7;
    const { data: person } = await supabase
      .from("contxt_people")
      .select("desired_frequency")
      .eq("id", person_id)
      .eq("user_id", session.userId)
      .single();

    if (!person) {
      return NextResponse.json({ error: "Person not found" }, { status: 404 });
    }

    const freqDays = FREQUENCY_DAYS[person.desired_frequency] || 30;
    // Set last_contacted so they become overdue in `days` from now
    const snoozeDate = new Date();
    snoozeDate.setDate(snoozeDate.getDate() + days - freqDays);
    const snoozeDateStr = snoozeDate.toISOString().split("T")[0];

    await supabase
      .from("contxt_people")
      .update({
        last_contacted: snoozeDateStr,
        updated_at: new Date().toISOString(),
      })
      .eq("id", person_id)
      .eq("user_id", session.userId);

    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ error: "Action must be 'skip' or 'snooze'" }, { status: 400 });
}

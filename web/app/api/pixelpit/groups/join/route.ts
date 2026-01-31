import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

// POST - join a group by code
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, code } = body;

    if (!userId || !code) {
      return NextResponse.json(
        { error: "userId and code required" },
        { status: 400 }
      );
    }

    // Find the group
    const { data: group, error: groupError } = await supabase
      .from("pixelpit_groups")
      .select("id, code, name, type")
      .eq("code", code.toLowerCase())
      .single();

    if (groupError || !group) {
      return NextResponse.json({ error: "Group not found" }, { status: 404 });
    }

    // Check if already a member
    const { data: existing } = await supabase
      .from("pixelpit_group_members")
      .select("id")
      .eq("group_id", group.id)
      .eq("user_id", userId)
      .single();

    if (existing) {
      // Already a member - return success without error
      return NextResponse.json({
        success: true,
        group: {
          id: group.id,
          code: group.code,
          name: group.name,
          type: group.type,
        },
        alreadyMember: true,
      });
    }

    // Check if user has any score entries today (more reliable than last_play_date)
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const { data: todayEntries } = await supabase
      .from("pixelpit_entries")
      .select("id")
      .eq("user_id", userId)
      .gte("created_at", todayStart.toISOString())
      .limit(1);

    const playedToday = todayEntries && todayEntries.length > 0;

    // Add as member (with last_play_at if they played today)
    const { error: memberError } = await supabase
      .from("pixelpit_group_members")
      .insert({
        group_id: group.id,
        user_id: userId,
        last_play_at: playedToday ? new Date().toISOString() : null,
      });

    if (memberError) {
      console.error("Error joining group:", memberError);
      return NextResponse.json({ error: "Failed to join group" }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      group: {
        id: group.id,
        code: group.code,
        name: group.name,
        type: group.type,
      },
    });
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }
}

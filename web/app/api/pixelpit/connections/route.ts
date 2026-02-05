import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

// Helper: Generate a unique 4-char group code
async function generateGroupCode(): Promise<string> {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  let code: string;
  let attempts = 0;

  do {
    code = Array.from({ length: 4 }, () =>
      chars[Math.floor(Math.random() * chars.length)]
    ).join("");

    const { data: existing } = await supabase
      .from("pixelpit_groups")
      .select("id")
      .eq("code", code)
      .single();

    if (!existing) return code;
    attempts++;
  } while (attempts < 10);

  return Date.now().toString(36).slice(-4);
}

// Helper: Create a magic streak pair when bidirectional sharing is detected
async function createMagicStreakPair(
  userAId: number,
  userBId: number
): Promise<{ code: string; name: string } | null> {
  // Check if these users already share a streak group
  const { data: userAGroups } = await supabase
    .from("pixelpit_group_members")
    .select("group_id")
    .eq("user_id", userAId);

  const { data: userBGroups } = await supabase
    .from("pixelpit_group_members")
    .select("group_id")
    .eq("user_id", userBId);

  if (userAGroups && userBGroups) {
    const aGroupIds = new Set(userAGroups.map((g) => g.group_id));
    const sharedGroupIds = userBGroups
      .filter((g) => aGroupIds.has(g.group_id))
      .map((g) => g.group_id);

    if (sharedGroupIds.length > 0) {
      const { data: sharedStreakGroups } = await supabase
        .from("pixelpit_groups")
        .select("id")
        .eq("type", "streak")
        .in("id", sharedGroupIds)
        .limit(1);

      if (sharedStreakGroups && sharedStreakGroups.length > 0) {
        return null; // Already share a streak group
      }
    }
  }

  // Get both users' handles
  const { data: users } = await supabase
    .from("pixelpit_users")
    .select("id, handle")
    .in("id", [userAId, userBId]);

  if (!users || users.length !== 2) return null;

  const userA = users.find((u) => u.id === userAId);
  const userB = users.find((u) => u.id === userBId);

  if (!userA || !userB) return null;

  // Create the magic streak group
  const code = await generateGroupCode();
  const name = `@${userA.handle} + @${userB.handle}`;

  const { data: group, error: groupError } = await supabase
    .from("pixelpit_groups")
    .insert({
      code,
      name,
      type: "streak",
      created_by: userAId,
    })
    .select()
    .single();

  if (groupError || !group) {
    console.error("Error creating magic streak group:", groupError);
    return null;
  }

  // Add both users as members
  const now = new Date().toISOString();
  await supabase.from("pixelpit_group_members").insert([
    { group_id: group.id, user_id: userAId, last_play_at: now },
    { group_id: group.id, user_id: userBId, last_play_at: now },
  ]);

  return { code, name };
}

// POST - Record a connection (called after registration/login via referral link)
// Creates magic streak pair immediately - no bidirectional requirement
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, refUserId } = body;

    if (!userId || !refUserId || userId === refUserId) {
      return NextResponse.json({ success: false, error: "Invalid params" }, { status: 400 });
    }

    // Record the connection: refUserId shared -> userId played & registered
    await supabase
      .from("pixelpit_connections")
      .upsert(
        {
          from_user_id: refUserId,
          to_user_id: userId,
        },
        { onConflict: "from_user_id,to_user_id" }
      );

    // Create magic streak pair immediately
    const magicPair = await createMagicStreakPair(userId, refUserId);

    return NextResponse.json({ success: true, magicPair });
  } catch (e) {
    console.error("Error recording connection:", e);
    return NextResponse.json({ success: false, error: "Server error" }, { status: 500 });
  }
}

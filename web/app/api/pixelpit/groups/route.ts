import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

const ADJECTIVES = [
  'cosmic', 'neon', 'purple', 'golden', 'shadow',
  'thunder', 'crystal', 'turbo', 'hyper', 'mega',
  'stealth', 'atomic', 'blazing', 'frozen', 'laser',
  'pixel', 'quantum', 'savage', 'swift', 'wild',
  'phantom', 'chrome', 'ruby', 'volt', 'ultra',
];
const NOUNS = [
  'wolves', 'dolphins', 'tigers', 'falcons', 'vipers',
  'pandas', 'ravens', 'foxes', 'hawks', 'sharks',
  'lions', 'cobras', 'otters', 'eagles', 'jaguars',
  'dragons', 'owls', 'bears', 'phoenixes', 'lynxes',
  'coyotes', 'mantis', 'scorpions', 'wasps',
];
function generateFunName(): string {
  const adj = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)];
  const noun = NOUNS[Math.floor(Math.random() * NOUNS.length)];
  return `${adj}${noun}`;
}

// Generate 4-char lowercase alphanumeric code
function generateCode(): string {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  let code = "";
  for (let i = 0; i < 4; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

// GET - list groups for a user
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get("userId");

  if (!userId) {
    return NextResponse.json({ error: "userId required" }, { status: 400 });
  }

  // Get all groups the user is a member of
  const { data: memberships, error: memberError } = await supabase
    .from("pixelpit_group_members")
    .select("group_id")
    .eq("user_id", parseInt(userId));

  if (memberError) {
    console.error("Error fetching memberships:", memberError);
    return NextResponse.json({ error: "Failed to fetch groups" }, { status: 500 });
  }

  if (!memberships || memberships.length === 0) {
    return NextResponse.json({ groups: [] });
  }

  const groupIds = memberships.map((m) => m.group_id);

  // Get group details
  const { data: groups, error: groupError } = await supabase
    .from("pixelpit_groups")
    .select("id, code, name, type, created_by, streak, max_streak, streak_saved_at, created_at")
    .in("id", groupIds);

  if (groupError) {
    console.error("Error fetching groups:", groupError);
    return NextResponse.json({ error: "Failed to fetch groups" }, { status: 500 });
  }

  // Fetch members separately for all groups (nested queries can be unreliable)
  const { data: allMembers, error: membersError } = await supabase
    .from("pixelpit_group_members")
    .select("group_id, user_id, last_play_at")
    .in("group_id", groupIds);

  if (membersError) {
    console.error("Error fetching members:", membersError);
  }

  // Get user handles for all members
  const memberUserIds = [...new Set((allMembers || []).map(m => m.user_id))];
  const { data: users } = await supabase
    .from("pixelpit_users")
    .select("id, handle")
    .in("id", memberUserIds);

  const userMap = new Map((users || []).map(u => [u.id, u.handle]));

  // Transform to clean format
  const result = (groups || []).map((g) => {
    const groupMembers = (allMembers || []).filter(m => m.group_id === g.id);
    return {
      id: g.id,
      code: g.code,
      name: g.name,
      type: g.type,
      createdBy: g.created_by,
      streak: g.streak,
      maxStreak: g.max_streak,
      streakSavedAt: g.streak_saved_at,
      members: groupMembers.map((m) => ({
        userId: m.user_id,
        handle: userMap.get(m.user_id) || 'unknown',
        lastPlayAt: m.last_play_at,
      })),
    };
  });

  return NextResponse.json({ groups: result });
}

// POST - create a new group
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, name, type, phones, gameUrl, score } = body;

    if (!userId || !type) {
      return NextResponse.json(
        { error: "userId and type required" },
        { status: 400 }
      );
    }

    const groupName = (name || generateFunName()).slice(0, 50).trim();

    if (!["streak", "leaderboard"].includes(type)) {
      return NextResponse.json(
        { error: "type must be 'streak' or 'leaderboard'" },
        { status: 400 }
      );
    }

    // Verify user exists
    const { data: user, error: userError } = await supabase
      .from("pixelpit_users")
      .select("id, handle, xp")
      .eq("id", userId)
      .single();

    if (userError || !user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Generate unique code (try up to 10 times)
    let code = "";
    let attempts = 0;
    while (attempts < 10) {
      code = generateCode();
      const { data: existing } = await supabase
        .from("pixelpit_groups")
        .select("id")
        .eq("code", code)
        .single();
      if (!existing) break;
      attempts++;
    }

    if (attempts >= 10) {
      return NextResponse.json(
        { error: "Failed to generate unique code" },
        { status: 500 }
      );
    }

    // Create the group
    const { data: group, error: groupError } = await supabase
      .from("pixelpit_groups")
      .insert({
        code,
        name: groupName,
        type,
        created_by: userId,
      })
      .select()
      .single();

    if (groupError) {
      console.error("Error creating group:", groupError);
      return NextResponse.json({ error: "Failed to create group" }, { status: 500 });
    }

    // Add creator as first member
    const { error: memberError } = await supabase
      .from("pixelpit_group_members")
      .insert({
        group_id: group.id,
        user_id: userId,
      });

    if (memberError) {
      console.error("Error adding creator to group:", memberError);
      // Clean up the group
      await supabase.from("pixelpit_groups").delete().eq("id", group.id);
      return NextResponse.json({ error: "Failed to create group" }, { status: 500 });
    }

    // Award XP (+10 for creating a group)
    const xpEarned = 10;
    await supabase
      .from("pixelpit_users")
      .update({ xp: (user.xp || 0) + xpEarned })
      .eq("id", userId);

    // Build SMS invite link if phones provided
    let smsLink: string | undefined;
    if (phones && Array.isArray(phones) && phones.length > 0 && gameUrl) {
      const url = `${gameUrl}?pg=${code}`;
      const scoreText = score ? ` of ${score}` : "";
      const msg = `${user.handle} wants you to beat their score${scoreText}! ${url}`;
      const nums = phones
        .map((p: string) => p.replace(/\D/g, ""))
        .filter((p: string) => p.length >= 10)
        .join(",");
      if (nums) {
        smsLink = `sms:/open?addresses=${nums}&body=${encodeURIComponent(msg)}`;
      }
    }

    return NextResponse.json({
      success: true,
      group: {
        id: group.id,
        code: group.code,
        name: group.name,
        type: group.type,
      },
      xpEarned,
      smsLink,
    });
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }
}

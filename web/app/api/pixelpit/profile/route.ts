import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import { getXpProgress, XP_PER_LEVEL } from "@/lib/pixelpit/progression";

export const dynamic = "force-dynamic";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

/**
 * GET /api/pixelpit/profile?userId=123
 *
 * Returns user progression data for profile display.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get("userId");

  if (!userId) {
    return NextResponse.json({ error: "userId parameter required" }, { status: 400 });
  }

  const { data: user, error } = await supabase
    .from("pixelpit_users")
    .select("handle, xp, level, streak, max_streak, data")
    .eq("id", parseInt(userId, 10))
    .single();

  if (error || !user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  return NextResponse.json({
    handle: user.handle,
    xp: user.xp || 0,
    level: user.level || 1,
    levelProgress: getXpProgress(user.xp || 0),
    levelNeeded: XP_PER_LEVEL,
    streak: user.streak || 0,
    maxStreak: user.max_streak || 0,
    // Future: avatar, badges from data JSONB
    // avatar: user.data?.avatar,
    // badges: user.data?.badges || [],
  });
}

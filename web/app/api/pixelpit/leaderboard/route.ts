import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

// GET - fetch leaderboard for a game
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const game = searchParams.get("game");
  const limit = Math.min(parseInt(searchParams.get("limit") || "10", 10), 50);

  if (!game) {
    return NextResponse.json({ error: "Game parameter required" }, { status: 400 });
  }

  // Fetch entries with scores, joining user data when available
  const { data, error } = await supabase
    .from("pixelpit_entries")
    .select(`
      id,
      score,
      nickname,
      user_id,
      created_at,
      pixelpit_users (
        id,
        handle
      )
    `)
    .eq("game_id", game)
    .not("score", "is", null)
    .order("score", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("Error fetching leaderboard:", error);
    return NextResponse.json({ error: "Failed to fetch leaderboard" }, { status: 500 });
  }

  // Transform data into clean leaderboard format
  const leaderboard = (data || []).map((entry, index) => {
    const user = entry.pixelpit_users as unknown as { id: number; handle: string } | null;
    return {
      rank: index + 1,
      name: user ? user.handle : entry.nickname,
      score: entry.score,
      isRegistered: !!user,
      created_at: entry.created_at,
    };
  });

  return NextResponse.json({ leaderboard });
}

// PATCH - link guest entry to user account
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { entryId, userId } = body;

    if (!entryId || !userId) {
      return NextResponse.json({ error: "entryId and userId required" }, { status: 400 });
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

    // Update entry to link to user
    const { error: updateError } = await supabase
      .from("pixelpit_entries")
      .update({ user_id: userId, nickname: null })
      .eq("id", entryId)
      .is("user_id", null); // Only update if not already linked

    if (updateError) {
      console.error("Error linking entry:", updateError);
      return NextResponse.json({ error: "Failed to link entry" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }
}

// POST - submit score to leaderboard
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { game, score, nickname, userId } = body;

    if (!game || typeof score !== "number") {
      return NextResponse.json(
        { error: "game and score required" },
        { status: 400 }
      );
    }

    // Must have either userId or nickname
    if (!userId && !nickname) {
      return NextResponse.json(
        { error: "Either userId or nickname required" },
        { status: 400 }
      );
    }

    let insertData: {
      game_id: string;
      score: number;
      user_id?: number;
      nickname?: string;
    } = {
      game_id: game,
      score: Math.floor(score),
    };

    if (userId) {
      // Verify user exists
      const { data: user, error: userError } = await supabase
        .from("pixelpit_users")
        .select("id, handle")
        .eq("id", userId)
        .single();

      if (userError || !user) {
        return NextResponse.json(
          { error: "User not found" },
          { status: 404 }
        );
      }

      insertData.user_id = userId;
    } else {
      // Sanitize nickname (max 20 chars, alphanumeric + spaces + underscores)
      const sanitizedName = nickname
        .slice(0, 20)
        .replace(/[^a-zA-Z0-9 _]/g, "")
        .trim();

      if (!sanitizedName) {
        return NextResponse.json({ error: "Invalid nickname" }, { status: 400 });
      }

      insertData.nickname = sanitizedName;
    }

    const { data, error } = await supabase
      .from("pixelpit_entries")
      .insert(insertData)
      .select()
      .single();

    if (error) {
      console.error("Error adding score:", error);
      return NextResponse.json({ error: "Failed to add score" }, { status: 500 });
    }

    // Get rank
    const { count } = await supabase
      .from("pixelpit_entries")
      .select("*", { count: "exact", head: true })
      .eq("game_id", game)
      .not("score", "is", null)
      .gt("score", score);

    const rank = (count || 0) + 1;

    return NextResponse.json({ success: true, entry: data, rank });
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }
}

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

  const { data, error } = await supabase
    .from("game_leaderboard")
    .select("id, player_name, score, created_at")
    .eq("game_name", game)
    .order("score", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("Error fetching leaderboard:", error);
    return NextResponse.json({ error: "Failed to fetch leaderboard" }, { status: 500 });
  }

  return NextResponse.json({ leaderboard: data });
}

// POST - add score to leaderboard
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { game, playerName, score } = body;

    if (!game || !playerName || typeof score !== "number") {
      return NextResponse.json(
        { error: "game, playerName, and score required" },
        { status: 400 }
      );
    }

    // Sanitize player name (max 20 chars, alphanumeric + spaces)
    const sanitizedName = playerName
      .slice(0, 20)
      .replace(/[^a-zA-Z0-9 ]/g, "")
      .trim();

    if (!sanitizedName) {
      return NextResponse.json({ error: "Invalid player name" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("game_leaderboard")
      .insert({
        game_name: game,
        player_name: sanitizedName,
        score: Math.floor(score),
      })
      .select()
      .single();

    if (error) {
      console.error("Error adding score:", error);
      return NextResponse.json({ error: "Failed to add score" }, { status: 500 });
    }

    // Get rank
    const { count } = await supabase
      .from("game_leaderboard")
      .select("*", { count: "exact", head: true })
      .eq("game_name", game)
      .gt("score", score);

    const rank = (count || 0) + 1;

    return NextResponse.json({ success: true, entry: data, rank });
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }
}

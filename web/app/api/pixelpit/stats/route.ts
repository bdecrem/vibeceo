import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

// POST - increment play count for a game
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { game } = body;

    if (!game) {
      return NextResponse.json({ error: "game required" }, { status: 400 });
    }

    const today = new Date().toISOString().split("T")[0];

    // Upsert: increment if exists, create with 1 if not
    const { error } = await supabase.rpc("increment_daily_plays", {
      p_game_id: game,
      p_date: today,
    });

    if (error) {
      // Fallback to manual upsert if RPC doesn't exist
      const { error: upsertError } = await supabase
        .from("pixelpit_daily_stats")
        .upsert(
          { game_id: game, date: today, plays: 1 },
          { onConflict: "game_id,date" }
        );

      if (upsertError) {
        console.error("Error tracking play:", upsertError);
        return NextResponse.json({ error: "Failed to track" }, { status: 500 });
      }
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}

// GET - get play stats for a game
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const game = searchParams.get("game");
  const days = Math.min(parseInt(searchParams.get("days") || "7", 10), 90);

  if (!game) {
    return NextResponse.json({ error: "game required" }, { status: 400 });
  }

  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const { data, error } = await supabase
    .from("pixelpit_daily_stats")
    .select("date, plays")
    .eq("game_id", game)
    .gte("date", startDate.toISOString().split("T")[0])
    .order("date", { ascending: false });

  if (error) {
    console.error("Error fetching stats:", error);
    return NextResponse.json({ error: "Failed to fetch stats" }, { status: 500 });
  }

  const total = (data || []).reduce((sum, row) => sum + row.plays, 0);

  return NextResponse.json({ stats: data || [], total });
}

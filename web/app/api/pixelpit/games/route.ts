import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

export interface Game {
  id: string;
  name: string;
  maker: string;
  status: "concept" | "prototype" | "playable" | "testing" | "launched" | "dead";
  url?: string;
  pitch?: string;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status"); // Optional filter by status

    // Fetch games from pixelpit state table
    let query = supabase
      .from("pixelpit_state")
      .select("key, data, created_at")
      .eq("type", "game")
      .order("created_at", { ascending: true });

    const { data: games, error } = await query;

    if (error) {
      console.error("Error fetching pixelpit games:", error);
      return NextResponse.json({ error: "Failed to fetch games" }, { status: 500 });
    }

    // Transform to Game interface
    const gameList: Game[] = (games || []).map((row) => {
      const data = row.data as Record<string, unknown>;
      const gameId = row.key;
      const gameStatus = data.status as Game["status"];

      return {
        id: gameId,
        name: (data.name as string) || "Untitled",
        maker: (data.maker as string) || "unknown",
        status: gameStatus || "concept",
        // Only provide URL for playable+ games
        url: ["playable", "testing", "launched"].includes(gameStatus)
          ? `/pixelpit/${gameId}`
          : undefined,
        pitch: (data.pitch as string) || undefined,
      };
    });

    // Filter by status if requested
    const filteredGames = status
      ? gameList.filter((g) => g.status === status)
      : gameList;

    return NextResponse.json({
      games: filteredGames,
      total: filteredGames.length,
    });
  } catch (err) {
    console.error("Error fetching pixelpit games:", err);
    return NextResponse.json({ error: "Failed to fetch games" }, { status: 500 });
  }
}

import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import {
  getLevel,
  getXpProgress,
  getStreakMultiplier,
  calculateXpGain,
  XP_PER_LEVEL,
  type ProgressionResult,
} from "@/lib/pixelpit/progression";

export const dynamic = "force-dynamic";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

// GET - fetch leaderboard for a game
// Dedupes registered users (best score only), keeps all guest entries
// Optional: pass userId or nickname to get player's rank if not in top
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const game = searchParams.get("game");
  const limit = Math.min(parseInt(searchParams.get("limit") || "10", 10), 50);
  const currentUserId = searchParams.get("userId");
  const currentEntryId = searchParams.get("entryId");

  if (!game) {
    return NextResponse.json({ error: "Game parameter required" }, { status: 400 });
  }

  // Use raw SQL to dedupe registered users while keeping all guest entries
  const { data, error } = await supabase.rpc("get_leaderboard", {
    p_game_id: game,
    p_limit: limit,
  });

  if (error) {
    // Fallback if RPC doesn't exist yet - use simple query
    console.error("RPC error, using fallback:", error);
    const { data: fallbackData, error: fallbackError } = await supabase
      .from("pixelpit_entries")
      .select(`id, score, nickname, user_id, created_at, pixelpit_users (id, handle)`)
      .eq("game_id", game)
      .not("score", "is", null)
      .order("score", { ascending: false })
      .limit(limit);

    if (fallbackError) {
      return NextResponse.json({ error: "Failed to fetch leaderboard" }, { status: 500 });
    }

    const leaderboard = (fallbackData || []).map((entry, index) => {
      const user = entry.pixelpit_users as unknown as { id: number; handle: string } | null;
      return {
        rank: index + 1,
        name: user ? user.handle : entry.nickname,
        score: entry.score,
        isRegistered: !!user,
      };
    });
    return NextResponse.json({ leaderboard });
  }

  // Transform RPC data into clean leaderboard format
  // Note: RPC may return level if available, otherwise we fetch it
  const leaderboard = (data || []).map((entry: { rank: number; handle: string | null; nickname: string | null; score: number; user_id: number | null; level?: number }) => ({
    rank: entry.rank,
    name: entry.handle || entry.nickname,
    score: entry.score,
    isRegistered: !!entry.user_id,
    level: entry.level || undefined,
  }));

  // Check if current player is in the leaderboard
  let playerEntry = null;
  if (currentUserId || currentEntryId) {
    if (currentUserId) {
      // Registered user - check if their best score is in top
      const inList = leaderboard.some((e: { name: string; isRegistered: boolean }) => e.isRegistered);

      if (!inList) {
        const { data: playerData } = await supabase.rpc("get_player_rank", {
          p_game_id: game,
          p_user_id: parseInt(currentUserId),
          p_nickname: null,
        });

        if (playerData && playerData.length > 0) {
          playerEntry = {
            rank: playerData[0].rank,
            name: playerData[0].handle || playerData[0].nickname,
            score: playerData[0].score,
            isRegistered: !!playerData[0].user_id,
          };
        }
      }
    } else if (currentEntryId) {
      // Guest - look up this specific entry's rank
      const { data: entryRank } = await supabase.rpc("get_entry_rank", {
        p_game_id: game,
        p_entry_id: parseInt(currentEntryId),
      });

      if (entryRank && entryRank.length > 0) {
        // Check if this entry is already in the top list
        const inList = leaderboard.some((e: { rank: number }) => e.rank === entryRank[0].rank);

        if (!inList) {
          playerEntry = {
            rank: entryRank[0].rank,
            name: entryRank[0].nickname,
            score: entryRank[0].score,
            isRegistered: false,
          };
        }
      }
    }
  }

  return NextResponse.json({ leaderboard, playerEntry });
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
    const { game, score, nickname, userId, xpDivisor = 100 } = body;

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

    let progression: ProgressionResult | undefined;

    if (userId) {
      // Verify user exists and get their progression data
      const { data: user, error: userError } = await supabase
        .from("pixelpit_users")
        .select("id, handle, xp, level, streak, max_streak, last_play_date")
        .eq("id", userId)
        .single();

      if (userError || !user) {
        return NextResponse.json(
          { error: "User not found" },
          { status: 404 }
        );
      }

      insertData.user_id = userId;

      // Calculate streak and XP
      const today = new Date().toISOString().split("T")[0];
      const yesterday = new Date(Date.now() - 86400000).toISOString().split("T")[0];
      const lastPlayDate = user.last_play_date;

      let newStreak = user.streak || 0;

      if (lastPlayDate === today) {
        // Already played today - streak unchanged
      } else if (lastPlayDate === yesterday) {
        // Played yesterday - extend streak
        newStreak += 1;
      } else {
        // Missed a day or first play - reset to 1
        newStreak = 1;
      }

      const xpEarned = calculateXpGain(score, newStreak, xpDivisor);
      const newXp = (user.xp || 0) + xpEarned;
      const oldLevel = getLevel(user.xp || 0);
      const newLevel = getLevel(newXp);
      const newMaxStreak = Math.max(newStreak, user.max_streak || 0);

      // Update user progression
      await supabase
        .from("pixelpit_users")
        .update({
          xp: newXp,
          level: newLevel,
          streak: newStreak,
          max_streak: newMaxStreak,
          last_play_date: today,
        })
        .eq("id", userId);

      progression = {
        xpEarned,
        xpTotal: newXp,
        level: newLevel,
        levelProgress: getXpProgress(newXp),
        levelNeeded: XP_PER_LEVEL,
        leveledUp: newLevel > oldLevel,
        streak: newStreak,
        multiplier: getStreakMultiplier(newStreak),
      };
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

    return NextResponse.json({ success: true, entry: data, rank, progression });
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }
}

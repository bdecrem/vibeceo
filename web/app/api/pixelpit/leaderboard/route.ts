import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import {
  getLevel,
  getXpProgress,
  getXpNeeded,
  getStreakMultiplier,
  calculateXpGain,
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
// Optional: pass groupCode to filter to group members only
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const game = searchParams.get("game");
  const limit = Math.min(parseInt(searchParams.get("limit") || "10", 10), 50);
  const currentUserId = searchParams.get("userId");
  const currentEntryId = searchParams.get("entryId");
  const groupCode = searchParams.get("groupCode");

  if (!game) {
    return NextResponse.json({ error: "Game parameter required" }, { status: 400 });
  }

  // If groupCode provided, get group member IDs for filtering
  let groupMemberIds: number[] | null = null;
  let groupInfo: { id: number; type: string; name: string } | null = null;

  if (groupCode) {
    const { data: group } = await supabase
      .from("pixelpit_groups")
      .select("id, type, name")
      .eq("code", groupCode.toLowerCase())
      .single();

    if (group) {
      groupInfo = group;
      const { data: members } = await supabase
        .from("pixelpit_group_members")
        .select("user_id")
        .eq("group_id", group.id);

      if (members) {
        groupMemberIds = members.map(m => m.user_id);
      }
    }
  }

  // Use raw SQL to dedupe registered users while keeping all guest entries
  const { data, error } = await supabase.rpc("get_leaderboard", {
    p_game_id: game,
    p_limit: groupMemberIds ? 100 : limit, // Get more if filtering
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
  let leaderboard = (data || []).map((entry: { rank: number; handle: string | null; nickname: string | null; score: number; user_id: number | null; level?: number }) => ({
    rank: entry.rank,
    name: entry.handle || entry.nickname,
    score: entry.score,
    isRegistered: !!entry.user_id,
    level: entry.level || undefined,
    userId: entry.user_id,
  }));

  // Filter to group members if groupCode provided
  if (groupMemberIds) {
    leaderboard = leaderboard
      .filter((e: { userId: number | null }) => e.userId && groupMemberIds!.includes(e.userId))
      .slice(0, limit)
      .map((e: { rank: number; name: string; score: number; isRegistered: boolean; level?: number }, i: number) => ({
        ...e,
        rank: i + 1, // Re-rank within group
      }));
  }

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

  return NextResponse.json({ leaderboard, playerEntry, group: groupInfo });
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
    const { data: linkedEntry, error: updateError } = await supabase
      .from("pixelpit_entries")
      .update({ user_id: userId, nickname: null })
      .eq("id", entryId)
      .is("user_id", null) // Only update if not already linked
      .select()
      .single();

    if (updateError) {
      console.error("Error linking entry:", updateError);
      return NextResponse.json({ error: "Failed to link entry" }, { status: 500 });
    }

    // Also update user's last_play_date if the entry is from today
    if (linkedEntry) {
      const entryDate = new Date(linkedEntry.created_at).toISOString().split("T")[0];
      const today = new Date().toISOString().split("T")[0];

      if (entryDate === today) {
        await supabase
          .from("pixelpit_users")
          .update({ last_play_date: today })
          .eq("id", userId);

        // Also update any group memberships' last_play_at
        await supabase
          .from("pixelpit_group_members")
          .update({ last_play_at: new Date().toISOString() })
          .eq("user_id", userId);
      }
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }
}

// Helper: Update streak groups when a member plays
async function updateStreakGroups(userId: number) {
  const now = new Date();

  // Get all streak groups this user is in
  const { data: memberships } = await supabase
    .from("pixelpit_group_members")
    .select("group_id")
    .eq("user_id", userId);

  if (!memberships || memberships.length === 0) return;

  const groupIds = memberships.map(m => m.group_id);

  const { data: streakGroups } = await supabase
    .from("pixelpit_groups")
    .select("id, streak, streak_saved_at")
    .eq("type", "streak")
    .in("id", groupIds);

  if (!streakGroups || streakGroups.length === 0) return;

  // Update this member's last_play_at for all their groups
  await supabase
    .from("pixelpit_group_members")
    .update({ last_play_at: now.toISOString() })
    .eq("user_id", userId)
    .in("group_id", groupIds);

  // Check each streak group
  for (const group of streakGroups) {
    // Get all members of this group
    const { data: members } = await supabase
      .from("pixelpit_group_members")
      .select("user_id, last_play_at")
      .eq("group_id", group.id);

    if (!members || members.length < 2) continue;

    const streakSavedAt = group.streak_saved_at ? new Date(group.streak_saved_at) : null;

    // Check if all members have played since last save
    const allPlayed = members.every(m => {
      if (!m.last_play_at) return false;
      const playTime = new Date(m.last_play_at);
      // If no previous save, any play counts
      if (!streakSavedAt) return true;
      return playTime > streakSavedAt;
    });

    if (allPlayed) {
      const windowEnd = streakSavedAt
        ? new Date(streakSavedAt.getTime() + 24 * 60 * 60 * 1000)
        : null;

      let newStreak: number;
      if (!windowEnd || now <= windowEnd) {
        // Continue streak
        newStreak = (group.streak || 0) + 1;
      } else {
        // Window expired, restart
        newStreak = 1;
      }

      await supabase
        .from("pixelpit_groups")
        .update({
          streak: newStreak,
          max_streak: Math.max(newStreak, group.streak || 0),
          streak_saved_at: now.toISOString(),
        })
        .eq("id", group.id);
    }
  }
}

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

  // Fallback: use timestamp-based code
  return Date.now().toString(36).slice(-4);
}

// Helper: Create a magic streak pair when bidirectional sharing is detected
async function createMagicStreakPair(
  userAId: number,
  userBId: number
): Promise<{ code: string; name: string } | null> {
  // Check if these users already share a streak group (avoid duplicates)
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
      // Check if any shared group is a streak group
      const { data: sharedStreakGroups } = await supabase
        .from("pixelpit_groups")
        .select("id")
        .eq("type", "streak")
        .in("id", sharedGroupIds)
        .limit(1);

      if (sharedStreakGroups && sharedStreakGroups.length > 0) {
        // Already share a streak group, skip
        return null;
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

  // Add both users as members with current timestamp for last_play_at
  const now = new Date().toISOString();
  await supabase.from("pixelpit_group_members").insert([
    { group_id: group.id, user_id: userAId, last_play_at: now },
    { group_id: group.id, user_id: userBId, last_play_at: now },
  ]);

  return { code, name };
}

// POST - submit score to leaderboard
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { game, score, nickname, userId, xpDivisor = 100, groupCode, refUserId } = body;

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

    // Fat-finger prevention: check for duplicate submission within last 10 seconds
    const tenSecondsAgo = new Date(Date.now() - 10000).toISOString();
    const duplicateQuery = supabase
      .from("pixelpit_entries")
      .select("id")
      .eq("game_id", game)
      .eq("score", Math.floor(score))
      .gte("created_at", tenSecondsAgo);

    if (userId) {
      duplicateQuery.eq("user_id", userId);
    } else {
      duplicateQuery.eq("nickname", nickname.slice(0, 20).replace(/[^a-zA-Z0-9 _]/g, "").trim());
    }

    const { data: existingEntry } = await duplicateQuery.limit(1).single();
    if (existingEntry) {
      // Return success with existing entry - don't create duplicate
      // Use same rank logic as new entries: hypothetical for logged-in, actual for guest
      let rank = 1;
      if (userId) {
        const { data: rankResult } = await supabase.rpc("get_score_rank", {
          p_game_id: game,
          p_score: Math.floor(score),
        });
        rank = rankResult || 1;
      } else {
        const { data: rankData } = await supabase.rpc("get_entry_rank", {
          p_game_id: game,
          p_entry_id: existingEntry.id,
        });
        rank = rankData?.[0]?.rank || 1;
      }
      return NextResponse.json({
        success: true,
        entry: existingEntry,
        rank,
        duplicate: true,
      });
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
        levelNeeded: getXpNeeded(newXp),
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

    // For guests: prune excess entries (keep only highest + most recent)
    if (!userId && insertData.nickname) {
      await supabase.rpc("prune_guest_entries", {
        p_game_id: game,
        p_nickname: insertData.nickname,
        p_keep_entry_id: data.id, // Always keep the just-created entry
      });
    }

    // Get rank - different logic for logged-in vs guest:
    // - Logged-in: hypothetical rank ("where would this score place among best scores?")
    // - Guest: actual rank (their entry IS on the leaderboard)
    let rank = 1;
    if (userId) {
      const { data: rankResult } = await supabase.rpc("get_score_rank", {
        p_game_id: game,
        p_score: Math.floor(score),
      });
      rank = rankResult || 1;
    } else {
      const { data: rankData } = await supabase.rpc("get_entry_rank", {
        p_game_id: game,
        p_entry_id: data.id,
      });
      rank = rankData?.[0]?.rank || 1;
    }

    // Handle group auto-join and streak updates for logged-in users
    let joinedGroup = null;
    let magicPair = null;

    if (userId) {
      // Auto-join group if groupCode provided
      if (groupCode) {
        const { data: group } = await supabase
          .from("pixelpit_groups")
          .select("id, code, name, type")
          .eq("code", groupCode.toLowerCase())
          .single();

        if (group) {
          // Check if already a member
          const { data: existing } = await supabase
            .from("pixelpit_group_members")
            .select("id")
            .eq("group_id", group.id)
            .eq("user_id", userId)
            .single();

          if (!existing) {
            // Join the group (with last_play_at since they're playing now)
            await supabase.from("pixelpit_group_members").insert({
              group_id: group.id,
              user_id: userId,
              last_play_at: new Date().toISOString(),
            });
          }

          joinedGroup = { code: group.code, name: group.name, type: group.type };
        }
      }

      // Handle magic streaks: record connection and create pair immediately
      // When a logged-in user submits a score via a referral link, magic happens
      if (refUserId && refUserId !== userId) {
        // Record the connection: refUserId shared -> userId played
        await supabase
          .from("pixelpit_connections")
          .upsert(
            {
              from_user_id: refUserId,
              to_user_id: userId,
              game_id: game,
            },
            { onConflict: "from_user_id,to_user_id" }
          );

        // Create magic streak pair immediately - no bidirectional requirement
        magicPair = await createMagicStreakPair(userId, refUserId);
      }

      // Update streak groups
      await updateStreakGroups(userId);
    }

    return NextResponse.json({ success: true, entry: data, rank, progression, joinedGroup, magicPair });
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }
}

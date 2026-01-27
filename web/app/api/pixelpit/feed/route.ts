import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

export interface FeedItem {
  id: string;
  timestamp: string;
  actor: string;
  action: string;
  details: string;
  game?: string;
  type: "log" | "task" | "launch" | "kill";
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get("limit") || "30", 10), 100);

    // Fetch activity logs
    const { data: logs, error: logsError } = await supabase
      .from("pixelpit_state")
      .select("key, data, created_at")
      .eq("type", "log")
      .order("created_at", { ascending: false })
      .limit(limit);

    if (logsError) {
      console.error("Error fetching pixelpit logs:", logsError);
      return NextResponse.json({ error: "Failed to fetch feed" }, { status: 500 });
    }

    // Also fetch recent task completions for the feed
    const { data: tasks, error: tasksError } = await supabase
      .from("pixelpit_state")
      .select("key, data, created_at")
      .eq("type", "task")
      .order("created_at", { ascending: false })
      .limit(20);

    if (tasksError) {
      console.error("Error fetching pixelpit tasks:", tasksError);
    }

    // Build feed items from logs
    const feedItems: FeedItem[] = (logs || []).map((log) => {
      const data = log.data as Record<string, unknown>;
      return {
        id: log.key,
        timestamp: (data.timestamp as string) || log.created_at,
        actor: (data.actor as string) || "studio",
        action: (data.action as string) || "activity",
        details: (data.details as string) || "",
        game: data.game as string | undefined,
        type: "log" as const,
      };
    });

    // Add completed tasks to feed
    const completedTasks = (tasks || [])
      .filter((t) => (t.data as Record<string, unknown>).status === "done")
      .map((task) => {
        const data = task.data as Record<string, unknown>;
        return {
          id: task.key,
          timestamp: (data.completed_at as string) || task.created_at,
          actor: (data.assignee as string) || "agent",
          action: "completed_task",
          details: (data.description as string) || "",
          game: data.game as string | undefined,
          type: "task" as const,
        };
      });

    // Combine and sort by timestamp
    const allItems = [...feedItems, ...completedTasks].sort((a, b) => {
      return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
    });

    return NextResponse.json({
      items: allItems.slice(0, limit),
      total: allItems.length,
    });
  } catch (err) {
    console.error("Error fetching pixelpit feed:", err);
    return NextResponse.json({ error: "Failed to fetch feed" }, { status: 500 });
  }
}

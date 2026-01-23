import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

interface CreationMetadata {
  url?: string;
  tags?: string[];
  tweeted?: boolean;
  category?: string;
  seed_word?: string;
  seed_mechanic?: string;
  prompt?: string;
}

interface TweetLogMetadata {
  tweet_id?: string;
  original_text?: string;
}

export interface FeedItem {
  id: string;
  title: string;
  url: string;
  ogImage: string;
  tweetText: string | null;
  category: string | null;
  tags: string[];
  createdAt: string;
}

/**
 * Derive OG image URL from creation URL
 * e.g., https://intheamber.com/amber/foo.html -> https://intheamber.com/amber/foo-og.png
 */
function deriveOgImageUrl(url: string): string {
  if (!url) return "/amber/og-image.png";

  // Handle both full URLs and relative paths
  let path = url;
  if (url.startsWith("https://intheamber.com")) {
    path = url.replace("https://intheamber.com", "");
  }

  // Remove .html extension and add -og.png
  if (path.endsWith(".html")) {
    return path.replace(".html", "-og.png");
  }

  // Handle directory URLs (e.g., /amber/foo/ or /amber/foo)
  if (path.endsWith("/")) {
    return path.slice(0, -1) + "-og.png";
  }

  // If no extension, assume it's a directory-style URL
  if (!path.includes(".")) {
    return path + "-og.png";
  }

  // Fallback
  return "/amber/og-image.png";
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get("limit") || "20", 10), 50);
    const offset = parseInt(searchParams.get("offset") || "0", 10);
    const showAll = searchParams.get("all") === "true"; // For drawer: show all creations

    // Fetch creations
    const { data: creations, error: creationsError } = await supabase
      .from("amber_state")
      .select("id, content, metadata, created_at")
      .eq("type", "creation")
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (creationsError) {
      console.error("Error fetching creations:", creationsError);
      return NextResponse.json({ error: "Failed to fetch feed" }, { status: 500 });
    }

    // Filter to tweeted creations only (unless ?all=true for drawer)
    const filteredCreations = showAll
      ? (creations || [])
      : (creations || []).filter((c) => {
          const meta = c.metadata as CreationMetadata;
          return meta?.tweeted === true;
        });

    // Fetch tweet logs to get tweet text
    const { data: tweetLogs, error: tweetLogsError } = await supabase
      .from("amber_state")
      .select("content, metadata, created_at")
      .eq("type", "tweet_log")
      .order("created_at", { ascending: false })
      .limit(100);

    if (tweetLogsError) {
      console.error("Error fetching tweet logs:", tweetLogsError);
    }

    // Build a map of creation URLs to tweet text
    const tweetTextByUrl: Record<string, string> = {};
    for (const log of tweetLogs || []) {
      // Tweet log content is the tweet text, which usually contains the URL
      const tweetText = log.content || "";
      // Extract URL from tweet text
      const urlMatch = tweetText.match(/intheamber\.com\/amber\/[^\s]+/);
      if (urlMatch) {
        const url = "https://" + urlMatch[0];
        tweetTextByUrl[url] = tweetText;
        // Also store without https
        tweetTextByUrl[urlMatch[0]] = tweetText;
      }
    }

    // Build feed items
    const feedItems: FeedItem[] = filteredCreations.map((creation) => {
      const meta = creation.metadata as CreationMetadata;
      const url = meta?.url || "";

      // Try to find matching tweet text, fall back to prompt
      let tweetText: string | null = null;
      if (url) {
        tweetText = tweetTextByUrl[url] || tweetTextByUrl[url.replace("https://", "")] || null;
      }
      // Fall back to metadata.prompt if no tweet_log exists
      if (!tweetText && meta?.prompt) {
        tweetText = meta.prompt;
      }

      return {
        id: creation.id,
        title: creation.content || "Untitled",
        url: url,
        ogImage: deriveOgImageUrl(url),
        tweetText: tweetText,
        category: meta?.category || null,
        tags: meta?.tags || [],
        createdAt: creation.created_at,
      };
    });

    return NextResponse.json({
      items: feedItems,
      total: feedItems.length,
      hasMore: feedItems.length === limit,
    });
  } catch (err) {
    console.error("Error fetching feed:", err);
    return NextResponse.json({ error: "Failed to fetch feed" }, { status: 500 });
  }
}

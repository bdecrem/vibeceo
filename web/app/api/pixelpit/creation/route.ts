import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

// Generate a random 8-character slug
function generateSlug(): string {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  let slug = "";
  for (let i = 0; i < 8; i++) {
    slug += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return slug;
}

// POST - save a creation (music, drawing, etc.)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { game, contentType, contentData, userId, nickname, metadata } = body;

    if (!game || !contentType || !contentData) {
      return NextResponse.json(
        { error: "game, contentType, and contentData required" },
        { status: 400 }
      );
    }

    // Generate unique slug (retry if collision)
    let slug = generateSlug();
    let attempts = 0;
    while (attempts < 5) {
      const { data: existing } = await supabase
        .from("pixelpit_entries")
        .select("id")
        .eq("slug", slug)
        .single();

      if (!existing) break;
      slug = generateSlug();
      attempts++;
    }

    if (attempts >= 5) {
      return NextResponse.json(
        { error: "Failed to generate unique slug" },
        { status: 500 }
      );
    }

    let insertData: {
      game_id: string;
      content_type: string;
      content_data: unknown;
      slug: string;
      user_id?: number;
      nickname?: string;
      metadata?: unknown;
    } = {
      game_id: game,
      content_type: contentType,
      content_data: contentData,
      slug: slug,
    };

    if (userId) {
      // Verify user exists
      const { data: user, error: userError } = await supabase
        .from("pixelpit_users")
        .select("id")
        .eq("id", userId)
        .single();

      if (!userError && user) {
        insertData.user_id = userId;
      }
    } else if (nickname) {
      // Sanitize nickname
      const sanitizedName = nickname
        .slice(0, 20)
        .replace(/[^a-zA-Z0-9 _]/g, "")
        .trim();
      if (sanitizedName) {
        insertData.nickname = sanitizedName;
      }
    }

    if (metadata) {
      insertData.metadata = metadata;
    }

    const { data, error } = await supabase
      .from("pixelpit_entries")
      .insert(insertData)
      .select()
      .single();

    if (error) {
      console.error("Error saving creation:", error);
      return NextResponse.json({ error: "Failed to save creation" }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      slug: data.slug,
      url: `/pixelpit/c/${data.slug}`,
    });
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }
}

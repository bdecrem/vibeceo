import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

// GET - fetch creation by slug
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;

  if (!slug || slug.length < 1 || slug.length > 50) {
    return NextResponse.json({ error: "Invalid slug" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("pixelpit_entries")
    .select(`
      id,
      game_id,
      content_type,
      content_data,
      nickname,
      metadata,
      created_at,
      pixelpit_users (
        id,
        handle
      )
    `)
    .eq("slug", slug)
    .single();

  if (error || !data) {
    return NextResponse.json({ error: "Creation not found" }, { status: 404 });
  }

  const user = data.pixelpit_users as unknown as { id: number; handle: string } | null;

  return NextResponse.json({
    slug,
    game: data.game_id,
    contentType: data.content_type,
    contentData: data.content_data,
    creator: user ? { handle: user.handle, isRegistered: true } :
             data.nickname ? { nickname: data.nickname, isRegistered: false } : null,
    metadata: data.metadata,
    created_at: data.created_at,
  });
}

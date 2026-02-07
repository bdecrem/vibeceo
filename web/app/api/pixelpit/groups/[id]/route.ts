import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

// PATCH - rename a group
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const groupId = parseInt(id, 10);
    if (isNaN(groupId)) {
      return NextResponse.json({ error: "Invalid group id" }, { status: 400 });
    }

    const body = await request.json();
    const { userId, name } = body;

    if (!userId || !name) {
      return NextResponse.json(
        { error: "userId and name required" },
        { status: 400 }
      );
    }

    const trimmedName = String(name).trim().slice(0, 50);
    if (!trimmedName) {
      return NextResponse.json({ error: "Name cannot be empty" }, { status: 400 });
    }

    // Verify group exists and user is authorized
    const { data: group, error: groupError } = await supabase
      .from("pixelpit_groups")
      .select("id, created_by, type")
      .eq("id", groupId)
      .single();

    if (groupError || !group) {
      return NextResponse.json({ error: "Group not found" }, { status: 404 });
    }

    // Streak groups: any member can manage. Leaderboard groups: owner only.
    if (group.created_by !== userId) {
      if (group.type === 'streak') {
        const { data: membership } = await supabase
          .from("pixelpit_group_members")
          .select("id")
          .eq("group_id", groupId)
          .eq("user_id", userId)
          .single();
        if (!membership) {
          return NextResponse.json({ error: "Not authorized" }, { status: 403 });
        }
      } else {
        return NextResponse.json({ error: "Not authorized" }, { status: 403 });
      }
    }

    // Update name
    const { error: updateError } = await supabase
      .from("pixelpit_groups")
      .update({ name: trimmedName })
      .eq("id", groupId);

    if (updateError) {
      console.error("Error renaming group:", updateError);
      return NextResponse.json({ error: "Failed to rename group" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }
}

// DELETE - delete a group
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const groupId = parseInt(id, 10);
    if (isNaN(groupId)) {
      return NextResponse.json({ error: "Invalid group id" }, { status: 400 });
    }

    const body = await request.json();
    const { userId } = body;

    if (!userId) {
      return NextResponse.json({ error: "userId required" }, { status: 400 });
    }

    // Verify group exists and user is authorized
    const { data: group, error: groupError } = await supabase
      .from("pixelpit_groups")
      .select("id, created_by, type")
      .eq("id", groupId)
      .single();

    if (groupError || !group) {
      return NextResponse.json({ error: "Group not found" }, { status: 404 });
    }

    // Streak groups: any member can delete. Leaderboard groups: owner only.
    if (group.created_by !== userId) {
      if (group.type === 'streak') {
        const { data: membership } = await supabase
          .from("pixelpit_group_members")
          .select("id")
          .eq("group_id", groupId)
          .eq("user_id", userId)
          .single();
        if (!membership) {
          return NextResponse.json({ error: "Not authorized" }, { status: 403 });
        }
      } else {
        return NextResponse.json({ error: "Not authorized" }, { status: 403 });
      }
    }

    // Delete members first, then group
    await supabase
      .from("pixelpit_group_members")
      .delete()
      .eq("group_id", groupId);

    const { error: deleteError } = await supabase
      .from("pixelpit_groups")
      .delete()
      .eq("id", groupId);

    if (deleteError) {
      console.error("Error deleting group:", deleteError);
      return NextResponse.json({ error: "Failed to delete group" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }
}

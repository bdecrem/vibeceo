import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

const supabase = createClient(
  process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY || ''
);

// GET - List goals for a week
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const week = searchParams.get('week');

  let query = supabase.from('weekly_goals').select('*').order('created_at', { ascending: true });
  
  if (week) {
    query = query.eq('week', week);
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ goals: data });
}

// POST - Create a new goal
export async function POST(request: NextRequest) {
  const body = await request.json();
  const { week, title, items } = body;

  if (!week || !title) {
    return NextResponse.json({ error: 'week and title required' }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('weekly_goals')
    .insert({
      week,
      title,
      items: items || [],
      completed: false,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ goal: data });
}

// PATCH - Update a goal
export async function PATCH(request: NextRequest) {
  const body = await request.json();
  const { id, ...updates } = body;

  if (!id) {
    return NextResponse.json({ error: 'id required' }, { status: 400 });
  }

  // Check if all items are completed
  if (updates.items) {
    updates.completed = updates.items.every((item: { completed: boolean }) => item.completed);
  }

  const { data, error } = await supabase
    .from('weekly_goals')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ goal: data });
}

// DELETE - Remove a goal
export async function DELETE(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (!id) {
    return NextResponse.json({ error: 'id required' }, { status: 400 });
  }

  const { error } = await supabase
    .from('weekly_goals')
    .delete()
    .eq('id', id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function getSupabaseClient() {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Missing Supabase environment variables');
  }

  return createClient(supabaseUrl, supabaseKey);
}

// GET /api/synth-patterns?machine=909
// Returns all patterns for the given machine
export async function GET(req: NextRequest) {
  try {
    const supabase = getSupabaseClient();
    const machine = req.nextUrl.searchParams.get('machine') || '909';

    const { data, error } = await supabase
      .from('synth_patterns')
      .select('id, name, bpm, pattern, created_at')
      .eq('machine', machine)
      .order('name', { ascending: true });

    if (error) {
      console.error('Failed to fetch patterns:', error);
      return NextResponse.json({ error: 'Failed to fetch patterns' }, { status: 500 });
    }

    return NextResponse.json({ patterns: data || [] });
  } catch (error) {
    console.error('Synth patterns GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/synth-patterns
// Body: { name, machine, bpm, pattern }
export async function POST(req: NextRequest) {
  try {
    const supabase = getSupabaseClient();
    const body = await req.json();

    const { name, machine = '909', bpm, pattern } = body;

    if (!name || typeof name !== 'string' || !name.trim()) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }

    if (!pattern || typeof pattern !== 'object') {
      return NextResponse.json({ error: 'Pattern is required' }, { status: 400 });
    }

    const trimmedName = name.trim();

    // Check if name already exists
    const { data: existing } = await supabase
      .from('synth_patterns')
      .select('id')
      .eq('name', trimmedName)
      .eq('machine', machine)
      .maybeSingle();

    if (existing) {
      return NextResponse.json({ error: 'A pattern with this name already exists' }, { status: 409 });
    }

    const { data, error } = await supabase
      .from('synth_patterns')
      .insert({
        name: trimmedName,
        machine,
        bpm: bpm || 128,
        pattern,
      })
      .select('id, name, bpm')
      .single();

    if (error) {
      console.error('Failed to save pattern:', error);
      return NextResponse.json({ error: 'Failed to save pattern' }, { status: 500 });
    }

    return NextResponse.json({ success: true, pattern: data }, { status: 201 });
  } catch (error) {
    console.error('Synth patterns POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/synth-patterns?name=PatternName&machine=909
export async function DELETE(req: NextRequest) {
  try {
    const supabase = getSupabaseClient();
    const name = req.nextUrl.searchParams.get('name');
    const machine = req.nextUrl.searchParams.get('machine') || '909';

    if (!name) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }

    const { error } = await supabase
      .from('synth_patterns')
      .delete()
      .eq('name', name)
      .eq('machine', machine);

    if (error) {
      console.error('Failed to delete pattern:', error);
      return NextResponse.json({ error: 'Failed to delete pattern' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Synth patterns DELETE error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

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

// GET /api/synth-kits?machine=909
// Returns all custom kits for the given machine
export async function GET(req: NextRequest) {
  try {
    const supabase = getSupabaseClient();
    const machine = req.nextUrl.searchParams.get('machine') || '909';

    const { data, error } = await supabase
      .from('synth_kits')
      .select('id, name, engine, voice_params, created_at')
      .eq('machine', machine)
      .order('name', { ascending: true });

    if (error) {
      console.error('Failed to fetch kits:', error);
      return NextResponse.json({ error: 'Failed to fetch kits' }, { status: 500 });
    }

    return NextResponse.json({ kits: data || [] });
  } catch (error) {
    console.error('Synth kits GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/synth-kits
// Body: { name, machine, engine, voiceParams }
export async function POST(req: NextRequest) {
  try {
    const supabase = getSupabaseClient();
    const body = await req.json();

    const { name, machine = '909', engine, voiceParams } = body;

    if (!name || typeof name !== 'string' || !name.trim()) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }

    const trimmedName = name.trim();

    // Check if name already exists
    const { data: existing } = await supabase
      .from('synth_kits')
      .select('id')
      .eq('name', trimmedName)
      .eq('machine', machine)
      .maybeSingle();

    if (existing) {
      return NextResponse.json({ error: 'A kit with this name already exists' }, { status: 409 });
    }

    const { data, error } = await supabase
      .from('synth_kits')
      .insert({
        name: trimmedName,
        machine,
        engine: engine || 'E2',
        voice_params: voiceParams || {},
      })
      .select('id, name, engine')
      .single();

    if (error) {
      console.error('Failed to save kit:', error);
      return NextResponse.json({ error: 'Failed to save kit' }, { status: 500 });
    }

    return NextResponse.json({ success: true, kit: data }, { status: 201 });
  } catch (error) {
    console.error('Synth kits POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/synth-kits?name=KitName&machine=909
export async function DELETE(req: NextRequest) {
  try {
    const supabase = getSupabaseClient();
    const name = req.nextUrl.searchParams.get('name');
    const machine = req.nextUrl.searchParams.get('machine') || '909';

    if (!name) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }

    const { error } = await supabase
      .from('synth_kits')
      .delete()
      .eq('name', name)
      .eq('machine', machine);

    if (error) {
      console.error('Failed to delete kit:', error);
      return NextResponse.json({ error: 'Failed to delete kit' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Synth kits DELETE error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

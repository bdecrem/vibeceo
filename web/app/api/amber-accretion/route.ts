import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

function getSupabase() {
  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Missing Supabase configuration');
  }
  return createClient(supabaseUrl, supabaseServiceKey);
}

// GET - fetch all preserved words
export async function GET() {
  try {
    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('[AmberAccretion] Missing Supabase env vars:', {
        hasUrl: !!supabaseUrl,
        hasKey: !!supabaseServiceKey,
      });
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
    }

    const supabase = getSupabase();
    const { data, error } = await supabase
      .from('amber_accretion')
      .select('*')
      .order('preserved_at', { ascending: true });

    if (error) {
      console.error('[AmberAccretion] Error fetching words:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data || []);
  } catch (err) {
    console.error('[AmberAccretion] Unexpected error:', err);
    return NextResponse.json({ error: 'Failed to fetch words' }, { status: 500 });
  }
}

// POST - save a new preserved word
export async function POST(request: NextRequest) {
  try {
    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('[AmberAccretion] Missing Supabase env vars');
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
    }

    const body = await request.json();
    const { symbol, angle, distance, size, rotation, opacity, contributor_id } = body;

    if (!symbol || angle === undefined || distance === undefined) {
      return NextResponse.json(
        { error: 'Missing required fields: symbol, angle, distance' },
        { status: 400 }
      );
    }

    const supabase = getSupabase();
    const { data, error } = await supabase
      .from('amber_accretion')
      .insert([{
        symbol,
        angle,
        distance,
        size: size || 10,
        rotation: rotation || 0,
        opacity: opacity || 0.8,
        contributor_id: contributor_id || null
      }])
      .select()
      .single();

    if (error) {
      console.error('[AmberAccretion] Error saving word:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (err) {
    console.error('[AmberAccretion] Unexpected error:', err);
    return NextResponse.json({ error: 'Failed to save word' }, { status: 500 });
  }
}

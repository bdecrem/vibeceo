import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

let supabase: SupabaseClient | null = null;

function getSupabase() {
  if (!supabase) {
    supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
  }
  return supabase;
}

// GET - fetch all preserved words
export async function GET() {
  try {
    const { data, error } = await getSupabase()
      .from('amber_accretion')
      .select('*')
      .order('preserved_at', { ascending: true });

    if (error) {
      console.error('Error fetching words:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data || []);
  } catch (err) {
    console.error('Unexpected error:', err);
    return NextResponse.json({ error: 'Failed to fetch words' }, { status: 500 });
  }
}

// POST - save a new preserved word
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const { symbol, angle, distance, size, rotation, opacity, contributor_id } = body;

    if (!symbol || angle === undefined || distance === undefined) {
      return NextResponse.json(
        { error: 'Missing required fields: symbol, angle, distance' },
        { status: 400 }
      );
    }

    const { data, error } = await getSupabase()
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
      console.error('Error saving word:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (err) {
    console.error('Unexpected error:', err);
    return NextResponse.json({ error: 'Failed to save word' }, { status: 500 });
  }
}

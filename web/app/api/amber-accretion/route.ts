import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

// Support both naming conventions for env vars
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

function getSupabase() {
  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Missing Supabase configuration');
  }
  return createClient(supabaseUrl, supabaseServiceKey);
}

// GET - fetch preserved words or vocabulary
// ?type=vocabulary returns semantic data (words, associations, spawn candidates)
// ?type=accretion (default) returns visual data (positions)
export async function GET(request: NextRequest) {
  try {
    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('[AmberAccretion] Missing Supabase env vars:', {
        hasUrl: !!supabaseUrl,
        hasKey: !!supabaseServiceKey,
      });
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
    }

    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'accretion';

    const supabase = getSupabase();

    if (type === 'vocabulary') {
      // Return vocabulary with associations and spawn candidates
      const { data, error } = await supabase
        .from('amber_vocabulary')
        .select('word, associations, spawn_candidates, group_name, is_root, is_digested, parent_word')
        .order('created_at', { ascending: true });

      if (error) {
        console.error('[AmberAccretion] Error fetching vocabulary:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      return NextResponse.json(data || []);
    }

    // Default: return accretion (visual positions)
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
// Creates entry in both vocabulary (semantic) and accretion (visual)
export async function POST(request: NextRequest) {
  try {
    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('[AmberAccretion] Missing Supabase env vars');
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
    }

    const body = await request.json();
    const { symbol, angle, distance, size, rotation, opacity, contributor_id, parent_word } = body;

    if (!symbol || angle === undefined || distance === undefined) {
      return NextResponse.json(
        { error: 'Missing required fields: symbol, angle, distance' },
        { status: 400 }
      );
    }

    const supabase = getSupabase();

    // Check if word already exists in vocabulary
    const { data: existing } = await supabase
      .from('amber_vocabulary')
      .select('word')
      .eq('word', symbol)
      .single();

    if (existing) {
      return NextResponse.json(
        { error: 'Word already exists in vocabulary', code: 'DUPLICATE' },
        { status: 409 }
      );
    }

    // Insert into vocabulary (semantic layer) - undigested, waiting for Amber
    const { error: vocabError } = await supabase
      .from('amber_vocabulary')
      .insert([{
        word: symbol,
        parent_word: parent_word || null,
        is_root: false,
        is_digested: false,
        associations: [],
        spawn_candidates: []
      }]);

    if (vocabError) {
      console.error('[AmberAccretion] Error saving to vocabulary:', vocabError);
      return NextResponse.json({ error: vocabError.message }, { status: 500 });
    }

    // Insert into accretion (visual layer)
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
      console.error('[AmberAccretion] Error saving to accretion:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (err) {
    console.error('[AmberAccretion] Unexpected error:', err);
    return NextResponse.json({ error: 'Failed to save word' }, { status: 500 });
  }
}

import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

function getSupabaseClient() {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Missing Supabase environment variables');
  }

  return createClient(supabaseUrl, supabaseKey);
}

const APP_ID = 'gravity';
const TABLE_NAME = 'wtaf_zero_admin_collaborative';

// POST - Save a composition
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, kit, orbiters, bpm } = body;

    if (!name || !orbiters || !Array.isArray(orbiters)) {
      return NextResponse.json(
        { error: 'Missing required fields: name and orbiters are required' },
        { status: 400 }
      );
    }

    const supabase = getSupabaseClient();

    const { data, error } = await supabase
      .from(TABLE_NAME)
      .insert({
        app_id: APP_ID,
        participant_id: 'anonymous',
        participant_data: {},
        action_type: 'composition',
        content_data: {
          name,
          kit: kit || '909',
          orbiters,
          bpm: bpm || 120,
          created_at: new Date().toISOString()
        }
      })
      .select()
      .single();

    if (error) {
      console.error('Supabase error:', error);
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      id: data.id,
      name: name
    }, { status: 200 });

  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// GET - Load all compositions (for browsing)
export async function GET(req: NextRequest) {
  try {
    const supabase = getSupabaseClient();

    const { data, error } = await supabase
      .from(TABLE_NAME)
      .select('id, content_data, created_at')
      .eq('app_id', APP_ID)
      .eq('action_type', 'composition')
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) {
      console.error('Supabase error:', error);
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    const compositions = (data || []).map(row => ({
      id: row.id,
      name: row.content_data?.name || 'untitled',
      kit: row.content_data?.kit || '909',
      orbiters: row.content_data?.orbiters || [],
      bpm: row.content_data?.bpm || 120,
      created_at: row.created_at
    }));

    return NextResponse.json(compositions, { status: 200 });

  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

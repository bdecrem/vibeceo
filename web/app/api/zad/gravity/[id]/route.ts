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

// GET - Load a specific composition by ID
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        { error: 'Missing composition ID' },
        { status: 400 }
      );
    }

    const supabase = getSupabaseClient();

    const { data, error } = await supabase
      .from(TABLE_NAME)
      .select('id, content_data, created_at')
      .eq('app_id', APP_ID)
      .eq('id', id)
      .single();

    if (error) {
      console.error('Supabase error:', error);
      return NextResponse.json(
        { error: 'Composition not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      id: data.id,
      name: data.content_data?.name || 'untitled',
      kit: data.content_data?.kit || '909',
      orbiters: data.content_data?.orbiters || [],
      bpm: data.content_data?.bpm || 120,
      created_at: data.created_at
    }, { status: 200 });

  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

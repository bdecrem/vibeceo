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

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const app_id = searchParams.get('app_id');
    const action_type = searchParams.get('action_type');

    // Validate required fields
    if (!app_id) {
      return NextResponse.json(
        { error: 'Missing required parameter: app_id' },
        { status: 400 }
      );
    }

    const supabase = getSupabaseClient();
    
    let query = supabase
      .from('wtaf_zero_admin_collaborative')
      .select('*')
      .eq('app_id', app_id)
      .order('created_at', { ascending: false });

    // If action_type is specified, filter by it
    if (action_type) {
      query = query.eq('action_type', action_type);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Supabase error:', error);
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json(data || [], { status: 200 });
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 
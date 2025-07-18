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
    const origin_app_slug = searchParams.get('origin_app_slug');

    // Validate that at least one parameter is provided
    if (!app_id && !origin_app_slug) {
      return NextResponse.json(
        { error: 'Missing required parameter: either app_id or origin_app_slug is required' },
        { status: 400 }
      );
    }

    const supabase = getSupabaseClient();
    
    let query = supabase
      .from('wtaf_submissions')
      .select('*')
      .order('created_at', { ascending: false });

    // Query by app_id (existing admin apps) OR origin_app_slug (stackdb apps)
    if (app_id) {
      query = query.eq('app_id', app_id);
    } else {
      query = query.eq('origin_app_slug', origin_app_slug);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Supabase error:', error);
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json(data, { status: 200 });
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 
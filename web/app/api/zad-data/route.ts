import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Use service role to bypass RLS for controlled access
const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const appId = searchParams.get('app_id');
    const actionType = searchParams.get('action_type');
    const limit = searchParams.get('limit');
    
    // Validate required parameters
    if (!appId) {
      return NextResponse.json(
        { error: 'Missing app_id parameter' },
        { status: 400 }
      );
    }

    // Step 1: Verify app exists and get app info
    const { data: appData, error: appError } = await supabase
      .from('wtaf_content')
      .select('id, user_slug, app_slug, type')
      .eq('id', appId)
      .single();

    if (appError || !appData) {
      return NextResponse.json(
        { error: 'App not found' },
        { status: 404 }
      );
    }

    // Step 2: Verify this is a ZAD app
    if (appData.type !== 'ZAD') {
      return NextResponse.json(
        { error: 'App is not a ZAD (Zero Admin Data) app' },
        { status: 403 }
      );
    }

    // Step 3: Build query for collaborative data
    let query = supabase
      .from('wtaf_zero_admin_collaborative')
      .select('*')
      .eq('app_id', appId)
      .order('created_at', { ascending: true });

    // Optional filtering by action_type
    if (actionType) {
      query = query.eq('action_type', actionType);
    }

    // Optional limit (default to 1000 for safety)
    const limitNum = limit ? parseInt(limit, 10) : 1000;
    if (limitNum > 0 && limitNum <= 10000) {
      query = query.limit(limitNum);
    }

    // Step 4: Execute query
    const { data: collaborativeData, error: dataError } = await query;

    if (dataError) {
      console.error('ZAD data fetch error:', dataError);
      return NextResponse.json(
        { error: 'Failed to fetch collaborative data' },
        { status: 500 }
      );
    }

    // Step 5: Return app-scoped data
    return NextResponse.json({
      success: true,
      app: {
        id: appData.id,
        slug: appData.app_slug,
        user: appData.user_slug,
        type: appData.type
      },
      data: collaborativeData || [],
      total: collaborativeData?.length || 0
    });

  } catch (error) {
    console.error('ZAD data API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 
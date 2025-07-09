import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Use service role to bypass RLS
const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');
    const appSlug = searchParams.get('app');
    
    if (!token || !appSlug) {
      return NextResponse.json(
        { error: 'Missing token or app parameter' },
        { status: 400 }
      );
    }

    // Step 1: Verify token exists and get app info
    const { data: appData, error: appError } = await supabase
      .from('wtaf_content')
      .select('id, user_slug, app_slug, admin_token')
      .eq('app_slug', appSlug)
      .single();

    if (appError || !appData) {
      return NextResponse.json(
        { error: 'App not found' },
        { status: 404 }
      );
    }

    // Step 2: Validate token
    if (appData.admin_token !== token) {
      return NextResponse.json(
        { error: 'Invalid token' },
        { status: 403 }
      );
    }

    // Step 3: Get submissions for this app (using service key bypasses RLS)
    const { data: submissions, error: submissionsError } = await supabase
      .from('wtaf_submissions')
      .select('*')
      .eq('app_id', appData.id)
      .order('created_at', { ascending: false });

    if (submissionsError) {
      return NextResponse.json(
        { error: 'Failed to fetch submissions' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      app: {
        slug: appData.app_slug,
        user: appData.user_slug
      },
      submissions: submissions || []
    });

  } catch (error) {
    console.error('Admin submissions API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');
    const appSlug = searchParams.get('app');
    
    if (!token || !appSlug) {
      return NextResponse.json(
        { error: 'Missing token or app parameter' },
        { status: 400 }
      );
    }

    // Get submission data from request body
    const { submission_data } = await request.json();
    
    if (!submission_data) {
      return NextResponse.json(
        { error: 'Missing submission_data' },
        { status: 400 }
      );
    }

    // Step 1: Verify token exists and get app info
    const { data: appData, error: appError } = await supabase
      .from('wtaf_content')
      .select('id, user_slug, app_slug, admin_token')
      .eq('app_slug', appSlug)
      .single();

    if (appError || !appData) {
      return NextResponse.json(
        { error: 'App not found' },
        { status: 404 }
      );
    }

    // Step 2: Validate token
    if (appData.admin_token !== token) {
      return NextResponse.json(
        { error: 'Invalid token' },
        { status: 403 }
      );
    }

    // Step 3: Insert submission into private table (using service key bypasses RLS)
    const { data: insertedData, error: insertError } = await supabase
      .from('wtaf_submissions')
      .insert({
        app_id: appData.id,
        submission_data: submission_data
      })
      .select()
      .single();

    if (insertError) {
      console.error('Insert error:', insertError);
      return NextResponse.json(
        { error: 'Failed to save submission' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: insertedData
    });

  } catch (error) {
    console.error('Admin submissions POST error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 
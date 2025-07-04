import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_KEY!
    );
    const { id } = params;

    // Copy the exact query pattern from app-remixes API
    let { data: rootApp, error: rootError } = await supabase
      .from('wtaf_content')
      .select('id, app_slug, user_slug, original_prompt, created_at')
      .eq('id', id)
      .single();

    // If not found by UUID, try to parse as user-appslug format
    if (rootError || !rootApp) {
      if (id.includes('-')) {
        const firstDashIndex = id.indexOf('-');
        const userSlug = id.substring(0, firstDashIndex);
        const appSlug = id.substring(firstDashIndex + 1);
        
        const { data: slugApp, error: slugError } = await supabase
          .from('wtaf_content')
          .select('id, app_slug, user_slug, original_prompt, created_at')
          .eq('user_slug', userSlug)
          .eq('app_slug', appSlug)
          .single();
          
        if (slugApp && !slugError) {
          rootApp = slugApp;
        }
      }
    }

    if (!rootApp) {
      return NextResponse.json({ error: 'App not found' }, { status: 404 });
    }

    // Use the exact same approach as the working genealogy API
    const { data: genealogyData, error } = await supabase
      .rpc('get_app_genealogy', { app_id: rootApp.id })

    if (error) {
      console.error('Error fetching genealogy data:', error);
      return NextResponse.json({ error: 'Failed to fetch genealogy data' }, { status: 500 });
    }

    // Build flat array from genealogy data - add root app first
    let allData = [{
      id: rootApp.id,
      parent_id: null,
      creator_handle: rootApp.user_slug,
      title: rootApp.app_slug,
      created_at: rootApp.created_at
    }]
    
    // Add all descendants
    if (genealogyData && genealogyData.length > 0) {
      const descendants = genealogyData.map((item: any) => ({
        id: item.child_app_id,
        parent_id: item.parent_app_id,
        creator_handle: item.child_user_slug,
        title: item.child_app_slug,
        created_at: item.child_created_at
      }))
      allData.push(...descendants)
    }

    // Data is already in the correct format for react-d3-tree
    const remixData = allData;

    return NextResponse.json(remixData);
  } catch (error) {
    console.error('Error in remix tree API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 
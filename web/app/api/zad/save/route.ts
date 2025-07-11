import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  try {
    const { type, data } = await req.json();
    
    // Auto-infer app_id from referer URL
    const referer = req.headers.get('referer') || '';
    const urlParts = referer.split('/');
    const appSlug = urlParts[urlParts.length - 1];
    
    if (!appSlug) {
      return NextResponse.json({ error: 'Could not determine app from URL' }, { status: 400 });
    }
    
    // Get app UUID from wtaf_content table
    const { data: appData, error: appError } = await supabase
      .from('wtaf_content')
      .select('id')
      .eq('app_slug', appSlug)
      .single();
    
    if (appError || !appData) {
      return NextResponse.json({ error: 'App not found' }, { status: 404 });
    }
    
    const APP_ID = appData.id;
    
    // Extract user context from data (sent by helper function)
    const userLabel = data.userLabel;
    const passcode = data.passcode;
    const participantId = data.participantId;
    
    if (!participantId) {
      return NextResponse.json({ error: 'Missing participant ID' }, { status: 400 });
    }
    
    // Remove user context from content_data to avoid duplication
    const { userLabel: _, passcode: __, participantId: ___, ...contentData } = data;
    
    // Insert data into wtaf_zero_admin_collaborative table
    const { data: result, error } = await supabase
      .from('wtaf_zero_admin_collaborative')
      .insert({
        app_id: APP_ID,
        participant_id: participantId,
        action_type: type,
        participant_data: {
          userLabel,
          passcode,
          timestamp: Date.now()
        },
        content_data: contentData
      })
      .select()
      .single();
    
    if (error) {
      console.error('Supabase error:', error);
      return NextResponse.json({ error: 'Failed to save data' }, { status: 500 });
    }
    
    return NextResponse.json({ success: true, data: result });
    
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
} 
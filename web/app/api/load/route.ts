import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const type = searchParams.get('type');
    
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
    
    // Load from wtaf_submissions table
    const { data, error } = await supabase
      .from('wtaf_submissions')
      .select('*')
      .eq('app_id', APP_ID)
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Supabase error:', error);
      return NextResponse.json({ error: 'Failed to load data' }, { status: 500 });
    }
    
    // Filter by type if provided
    let filteredData = data || [];
    if (type) {
      filteredData = filteredData.filter(item => 
        item.submission_data && item.submission_data.type === type
      );
    }
    
    return NextResponse.json({ success: true, data: filteredData });
    
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
} 
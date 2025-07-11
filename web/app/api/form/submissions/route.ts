import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const token = searchParams.get('token');
    const app_id = searchParams.get('app_id');
    
    if (!token) {
      return NextResponse.json({ error: 'Token required' }, { status: 401 });
    }
    
    // Use service role to bypass RLS
    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_KEY!
    );
    
    // Find submissions with matching token (and optionally app_id)
    let query = supabase
      .from('wtaf_submissions')
      .select('*')
      .eq('submission_data->>_admin_token', token);
    
    // If app_id is provided, filter by it too for better data isolation
    if (app_id) {
      query = query.eq('app_id', app_id);
    }
    
    const { data, error } = await query.order('created_at', { ascending: false });
    
    if (error) {
      console.error('Database error:', error);
      return NextResponse.json({ error: 'Database error' }, { status: 500 });
    }
    
    if (!data || data.length === 0) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 404 });
    }
    
    return NextResponse.json({ submissions: data });
    
  } catch (error) {
    console.error('Load error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
} 
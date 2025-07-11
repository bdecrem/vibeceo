import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(req: NextRequest) {
  try {
    const { formData, adminToken, app_id } = await req.json();
    
    // Use service role to bypass RLS
    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_KEY!
    );
    
    // Use provided admin token or generate one as fallback
    const tokenToUse = adminToken || (
      Math.random().toString(36).substring(2, 15) + 
      Math.random().toString(36).substring(2, 15)
    );
    
    // Save to wtaf_submissions table with token in submission_data
    const { data, error } = await supabase
      .from('wtaf_submissions')
      .insert({
        app_id: app_id || 'form-api',  // Use provided app UUID or fallback
        submission_data: { 
          ...formData,
          _admin_token: tokenToUse  // Hidden field for admin access
        }
      })
      .select('id')
      .single();
    
    if (error) {
      console.error('Database error:', error);
      return NextResponse.json({ error: 'Database error' }, { status: 500 });
    }
    
    return NextResponse.json({ 
      success: true, 
      adminUrl: `/api/form/submissions?token=${tokenToUse}` 
    });
    
  } catch (error) {
    console.error('Submit error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
} 
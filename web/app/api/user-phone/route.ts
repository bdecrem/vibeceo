import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function getSupabaseClient() {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
  
  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Missing Supabase environment variables');
  }
  
  return createClient(supabaseUrl, supabaseKey);
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { supabase_id } = body;

    if (!supabase_id) {
      return NextResponse.json(
        { error: 'Missing required field: supabase_id' },
        { status: 400 }
      );
    }

    const supabase = getSupabaseClient();
    
    // Check if this Supabase ID has a linked phone number
    const { data, error } = await supabase
      .from('sms_subscribers')
      .select('phone_number, slug')
      .eq('supabase_id', supabase_id)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('Error checking phone link:', error);
      return NextResponse.json(
        { error: 'Failed to check phone link' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      linked: !!data,
      phone_number: data?.phone_number || null,
      slug: data?.slug || null
    });
    
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
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
    const { phone_number, supabase_id, email } = body;

    // Validate required fields
    if (!phone_number || !supabase_id) {
      return NextResponse.json(
        { error: 'Missing required fields: phone_number and supabase_id are required' },
        { status: 400 }
      );
    }

    console.log('Linking phone number:', phone_number, 'to user:', supabase_id);
    
    const supabase = getSupabaseClient();
    
    // Update the sms_subscribers table to link the phone to the user account
    const { data, error } = await supabase
      .from('sms_subscribers')
      .update({
        supabase_id: supabase_id,
        email: email || null
      })
      .eq('phone_number', phone_number)
      .select()
      .single();

    if (error) {
      console.error('Supabase error linking phone:', error);
      
      // Check if it's a "no rows" error (phone number not found)
      if (error.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Phone number not found in our system. Please make sure you\'ve subscribed via SMS first.' },
          { status: 404 }
        );
      }
      
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Phone number successfully linked to your account',
      data 
    }, { status: 200 });
    
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 
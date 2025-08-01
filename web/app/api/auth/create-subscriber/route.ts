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
    const { supabase_id, email } = await req.json();
    
    if (!supabase_id || !email) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }
    
    const supabase = getSupabaseClient();
    
    // Generate unique slug from email
    const baseSlug = email.split('@')[0].toLowerCase().replace(/[^a-z0-9]/g, '');
    let slug = baseSlug;
    let counter = 1;
    
    // Check if slug exists and increment if needed
    while (true) {
      const { data: existing } = await supabase
        .from('sms_subscribers')
        .select('slug')
        .eq('slug', slug)
        .single();
        
      if (!existing) break;
      slug = `${baseSlug}${counter}`;
      counter++;
    }
    
    // Create sms_subscriber entry with 'coder' role for web console signups
    const { data, error } = await supabase
      .from('sms_subscribers')
      .insert({
        supabase_id: supabase_id,
        email: email,
        slug: slug,
        role: 'coder', // Web console users get coder role by default
        phone_number: '+1555' + Math.floor(1000000 + Math.random() * 9000000), // Unique placeholder since phone is required
        consent_given: true,
        confirmed: true,
        email_confirmed: true,
        created_at: new Date().toISOString()
      })
      .select()
      .single();
      
    if (error) {
      console.error('Error creating subscriber:', error);
      return NextResponse.json(
        { error: 'Failed to create subscriber' },
        { status: 500 }
      );
    }
    
    return NextResponse.json({
      success: true,
      subscriber: data
    });
    
  } catch (error: any) {
    console.error('API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
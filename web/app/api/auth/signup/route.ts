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
    const { email, password } = await req.json();
    
    const supabase = getSupabaseClient();
    
    // 1. Create auth user
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true // Auto-confirm email
    });
    
    if (authError) throw authError;
    
    // 2. Generate unique slug from email
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
    
    // 3. Create sms_subscriber entry
    const { data: subscriber, error: subError } = await supabase
      .from('sms_subscribers')
      .insert({
        supabase_id: authData.user.id,
        email: email,
        slug: slug,
        role: 'user', // Default role
        subscribed: true
      })
      .select()
      .single();
      
    if (subError) {
      // Rollback auth user if subscriber creation fails
      await supabase.auth.admin.deleteUser(authData.user.id);
      throw subError;
    }
    
    return NextResponse.json({
      success: true,
      user: authData.user,
      subscriber: subscriber
    });
    
  } catch (error: any) {
    console.error('Signup error:', error);
    return NextResponse.json(
      { error: error.message || 'Signup failed' },
      { status: 500 }
    );
  }
}
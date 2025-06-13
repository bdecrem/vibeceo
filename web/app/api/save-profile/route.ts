import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

function getSupabaseClient() {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
  
  console.log('Environment check:');
  console.log('SUPABASE_URL exists:', !!supabaseUrl);
  console.log('SUPABASE_SERVICE_KEY exists:', !!supabaseKey);
  
  if (!supabaseUrl || !supabaseKey) {
    console.error('Missing environment variables');
    console.error('SUPABASE_URL:', supabaseUrl ? 'SET' : 'MISSING');
    console.error('SUPABASE_SERVICE_KEY:', supabaseKey ? 'SET' : 'MISSING');
    throw new Error('Missing Supabase environment variables');
  }
  
  return createClient(supabaseUrl, supabaseKey);
}

export async function POST(req: NextRequest) {
  try {
    console.log('=== SAVE PROFILE API CALLED ===');
    const body = await req.json();
    console.log('Request body:', body);
    
    const { slug, name, bio, favorite_food, favorite_music, quote, phone_number } = body;

    // Validate required fields
    if (!slug || !name) {
      console.log('Validation error: missing slug or name');
      return NextResponse.json(
        { error: 'Missing required fields: slug and name are required' },
        { status: 400 }
      );
    }

    console.log('Creating Supabase client...');
    const supabase = getSupabaseClient();
    console.log('Supabase client created successfully');
    
    const profileData = {
      slug,
      name,
      bio,
      favorite_food,
      favorite_music,
      quote,
    };
    console.log('Profile data to insert:', profileData);
    
    console.log('Attempting to upsert profile...');
    const { data, error } = await supabase.from('profiles').upsert([profileData], { onConflict: 'slug' });

    if (error) {
      console.error('Supabase error:', error);
      console.error('Error details:', error.details);
      console.error('Error hint:', error.hint);
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    console.log('Profile saved successfully:', data);
    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 
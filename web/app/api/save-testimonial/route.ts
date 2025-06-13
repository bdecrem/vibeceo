import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

export async function POST(req: NextRequest) {
  try {
    console.log('📥 Save testimonial API called');
    const body = await req.json();
    console.log('📦 Received payload:', JSON.stringify(body, null, 2));
    
    const {
      slug,
      name,
      role,
      location,
      coach,
      voice_paragraph,
      theme = 'sunset',
      designs = null
    } = body;

    console.log('🔗 Attempting Supabase upsert...');
    const { data, error } = await supabase.from('testimonials').upsert([
      {
        slug,
        name,
        role,
        location,
        coach,
        voice_paragraph,
        theme,
        designs
      }
    ], { onConflict: 'slug' });

    if (error) {
      console.error('❌ Supabase error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    console.log('✅ Supabase upsert successful:', data);
    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error('❌ API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { slug, chosen_design_index } = body;

    if (!slug || typeof chosen_design_index !== 'number') {
      return NextResponse.json({ error: 'Missing slug or chosen_design_index' }, { status: 400 });
    }

    const { error } = await supabase
      .from('testimonials')
      .update({ chosen_design_index })
      .eq('slug', slug);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 
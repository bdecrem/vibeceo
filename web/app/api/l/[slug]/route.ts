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

export async function GET(
  _req: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    const slug = params?.slug?.trim();

    if (!slug) {
      return new NextResponse('Missing link slug', { status: 400 });
    }

    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('short_links')
      .select('target_url')
      .eq('slug', slug)
      .maybeSingle();

    if (error) {
      console.error('Error loading short link:', error);
      return new NextResponse('Unable to resolve link', { status: 500 });
    }

    if (!data?.target_url) {
      return new NextResponse('Link not found', { status: 404 });
    }

    return NextResponse.redirect(data.target_url, { status: 307 });
  } catch (error) {
    console.error('Unexpected short link redirect error:', error);
    return new NextResponse('Unable to resolve link', { status: 500 });
  }
}

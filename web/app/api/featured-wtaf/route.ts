import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '3');
    
    console.log(`🎲 Fetching ${limit} random featured pages...`);
    
    // First try to fetch pages with feature=true
    let { data, error } = await supabase
      .from('wtaf_content')
      .select('user_slug, app_slug, original_prompt, html_content, created_at')
      .eq('status', 'published')
      .eq('feature', true)
      .order('created_at', { ascending: false })
      .limit(50); // Get a larger pool to randomize from
    
    // If no featured pages or error, fall back to any published pages
    if (error || !data || data.length === 0) {
      console.log('🔄 No featured pages found, falling back to recent published pages...');
      
      const { data: fallbackData, error: fallbackError } = await supabase
        .from('wtaf_content')
        .select('user_slug, app_slug, original_prompt, html_content, created_at')
        .eq('status', 'published')
        .order('created_at', { ascending: false })
        .limit(50);
      
      if (fallbackError) {
        console.error('❌ Supabase fallback error:', fallbackError);
        return NextResponse.json({ error: 'Failed to fetch any pages' }, { status: 500 });
      }
      
      data = fallbackData;
    }
    
    if (!data || data.length === 0) {
      console.log('📭 No pages found at all');
      return NextResponse.json({ pages: [] });
    }
    
    // Randomly shuffle and pick the requested number
    const shuffled = data.sort(() => Math.random() - 0.5);
    const selectedPages = shuffled.slice(0, limit);
    
    console.log(`✅ Found ${data.length} featured pages, returning ${selectedPages.length}`);
    
    // Format the response to match the expected structure
    const formattedPages = selectedPages.map((page, index) => ({
      id: `featured-${Date.now()}-${index}`,
      user_slug: page.user_slug,
      app_slug: page.app_slug,
      original_prompt: page.original_prompt,
      html_content: page.html_content,
      created_at: page.created_at
    }));
    
    return NextResponse.json({
      success: true,
      pages: formattedPages,
      total_featured: data.length
    });
    
  } catch (error: any) {
    console.error('❌ Error fetching featured pages:', error);
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}

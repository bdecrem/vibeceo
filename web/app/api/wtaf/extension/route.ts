import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

// Get environment variables
const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY!;
const extensionAuthToken = process.env.WEBTOYS_EXT_AUTH_TOKEN!;

// Create Supabase client with service key
const supabase = createClient(supabaseUrl, supabaseServiceKey);

export async function POST(request: NextRequest) {
  try {
    // Check authorization
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || authHeader !== `Bearer ${extensionAuthToken}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { action, userSlug, appSlug, updates } = body;

    // Validate required fields
    if (!action || !userSlug || !appSlug) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    if (action === 'get') {
      // Fetch current status
      const { data, error } = await supabase
        .from('wtaf_content')
        .select('is_featured, is_trending, hotness, Forget')
        .eq('user_slug', userSlug)
        .eq('app_slug', appSlug)
        .single();

      if (error) {
        console.error('Error fetching content:', error);
        return NextResponse.json({ error: 'Failed to fetch content' }, { status: 500 });
      }

      return NextResponse.json({ 
        success: true,
        data: data || { is_featured: false, is_trending: false, hotness: 0, Forget: false }
      });

    } else if (action === 'update') {
      // Validate updates object
      if (!updates || typeof updates !== 'object') {
        return NextResponse.json({ error: 'Invalid updates' }, { status: 400 });
      }

      // Only allow updating specific fields
      const allowedFields = ['is_featured', 'is_trending', 'hotness', 'Forget'];
      const filteredUpdates: any = {};
      
      for (const field of allowedFields) {
        if (field in updates) {
          if ((field === 'is_featured' || field === 'is_trending' || field === 'Forget') && typeof updates[field] === 'boolean') {
            filteredUpdates[field] = updates[field];
          } else if (field === 'hotness' && typeof updates[field] === 'number' && updates[field] >= 0) {
            filteredUpdates[field] = updates[field];
          }
        }
      }

      if (Object.keys(filteredUpdates).length === 0) {
        return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
      }

      // Add timestamp for featured items
      if ('is_featured' in filteredUpdates) {
        filteredUpdates.featured_at = filteredUpdates.is_featured ? new Date().toISOString() : null;
      }

      // Update the record
      const { data, error } = await supabase
        .from('wtaf_content')
        .update(filteredUpdates)
        .eq('user_slug', userSlug)
        .eq('app_slug', appSlug)
        .select();

      if (error) {
        console.error('Error updating content:', error);
        return NextResponse.json({ error: 'Failed to update content' }, { status: 500 });
      }

      return NextResponse.json({ 
        success: true,
        data: data?.[0] || null
      });

    } else {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

  } catch (error) {
    console.error('Extension API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Also support GET for testing
export async function GET(request: NextRequest) {
  return NextResponse.json({ 
    message: 'WTAF Extension API',
    endpoints: {
      POST: {
        actions: ['get', 'update'],
        requiredHeaders: ['Authorization: Bearer YOUR_TOKEN'],
        exampleBody: {
          action: 'get | update',
          userSlug: 'string',
          appSlug: 'string',
          updates: { is_featured: true, is_trending: false }
        }
      }
    }
  });
}
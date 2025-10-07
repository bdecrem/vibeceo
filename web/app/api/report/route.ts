import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const path = searchParams.get('path');

    if (!path) {
      return NextResponse.json(
        { error: 'Missing path parameter' },
        { status: 400 }
      );
    }

    // Fetch the markdown file from Supabase Storage
    const { data, error } = await supabase.storage
      .from('agent-reports')
      .download(path);

    if (error) {
      console.error('Error fetching report:', error);
      return NextResponse.json(
        { error: 'Report not found' },
        { status: 404 }
      );
    }

    // Convert blob to text
    const markdown = await data.text();

    // Extract metadata from the path (e.g., "crypto-research/reports/2025-10-06.md")
    const pathParts = path.split('/');
    const agentSlug = pathParts[0] || 'unknown';
    const filename = pathParts[pathParts.length - 1] || '';
    const date = filename.replace('.md', '');

    return NextResponse.json({
      markdown,
      metadata: {
        agentSlug,
        date,
        path,
      },
    });
  } catch (error) {
    console.error('Error processing report request:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

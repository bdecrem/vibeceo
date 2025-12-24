/**
 * API endpoint for fetching amberx content for interactive mode
 *
 * GET /api/amberx-content?id=<uuid>
 *
 * Returns content stored in covered_content table for Realtime API context
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase environment variables');
}

const supabase = createClient(supabaseUrl || '', supabaseKey || '');

export interface AmberxContentResponse {
  id: string;
  contentType: 'youtube' | 'twitter';
  externalId: string;
  title: string;
  author: string;
  summary: string;
  fullText: string;
  url: string;
  metadata: {
    full_explanation?: string;
    key_points?: string[];
    audio_url?: string;
    report_path?: string;
  };
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (!id) {
    return NextResponse.json(
      { error: 'Missing id parameter' },
      { status: 400 }
    );
  }

  try {
    const { data, error } = await supabase
      .from('covered_content')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error('[amberx-content] Database error:', error);
      return NextResponse.json(
        { error: 'Content not found' },
        { status: 404 }
      );
    }

    if (!data) {
      return NextResponse.json(
        { error: 'Content not found' },
        { status: 404 }
      );
    }

    const response: AmberxContentResponse = {
      id: data.id,
      contentType: data.content_type,
      externalId: data.external_id,
      title: data.title || 'Unknown',
      author: data.author || 'Unknown',
      summary: data.summary || '',
      fullText: data.full_text || '',
      url: data.url || '',
      metadata: data.metadata || {},
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('[amberx-content] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

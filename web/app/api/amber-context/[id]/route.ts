import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json({ error: 'Missing id' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('covered_content')
      .select('title, summary, full_text, metadata')
      .eq('id', id)
      .single();

    if (error || !data) {
      return NextResponse.json({ error: 'Content not found' }, { status: 404 });
    }

    return NextResponse.json({
      title: data.title,
      summary: data.summary,
      transcript: data.full_text,
      fullExplanation: data.metadata?.full_explanation || null,
    });
  } catch (error) {
    console.error('[amber-context] Error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

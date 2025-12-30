/**
 * CC Investigation API
 *
 * Fetches investigation details for the viewer.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { id } = params;

  if (!id) {
    return NextResponse.json({ error: 'Missing ID' }, { status: 400 });
  }

  try {
    const { data, error } = await supabase
      .from('code_investigations')
      .select('question, findings, summary, files_examined, tool_calls_count, duration_ms, created_at')
      .eq('id', id)
      .single();

    if (error || !data) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    return NextResponse.json({
      question: data.question,
      findings: data.findings,
      summary: data.summary,
      filesExamined: data.files_examined || [],
      toolCalls: data.tool_calls_count,
      durationMs: data.duration_ms,
      createdAt: data.created_at,
    });
  } catch (e) {
    console.error('[cc-api] Error:', e);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

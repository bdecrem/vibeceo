/**
 * Code Session API
 *
 * Validates session tokens and returns investigation context for voice UI.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

/**
 * GET /api/code-session?s=<session_token>
 *
 * Validates session and returns investigation context for voice UI.
 */
export async function GET(request: NextRequest) {
  const sessionToken = request.nextUrl.searchParams.get('s');

  if (!sessionToken) {
    return NextResponse.json({ valid: false, error: 'Missing session token' }, { status: 400 });
  }

  try {
    // Check session validity
    const { data: session, error: sessionError } = await supabase
      .from('code_sessions')
      .select('*')
      .eq('session_token', sessionToken)
      .eq('verified', true)
      .gt('expires_at', new Date().toISOString())
      .single();

    if (sessionError || !session) {
      return NextResponse.json({
        valid: false,
        error: 'Invalid or expired session',
      });
    }

    // Load latest investigation
    const { data: investigation } = await supabase
      .from('code_investigations')
      .select('question, summary, files_examined, created_at')
      .eq('session_id', session.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    // Update last activity
    await supabase
      .from('code_sessions')
      .update({ last_activity: new Date().toISOString() })
      .eq('id', session.id);

    return NextResponse.json({
      valid: true,
      investigation: investigation ? {
        question: investigation.question,
        summary: investigation.summary,
        filesExamined: investigation.files_examined?.length || 0,
        createdAt: investigation.created_at,
      } : null,
      expiresAt: session.expires_at,
    });

  } catch (error) {
    console.error('[code-session] Error:', error);
    return NextResponse.json({ valid: false, error: 'Server error' }, { status: 500 });
  }
}

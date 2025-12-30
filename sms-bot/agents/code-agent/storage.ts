/**
 * Code Agent Storage
 *
 * Database operations for CC sessions and investigations.
 * Centralizes Supabase access for the code agent.
 */

import { supabase } from '../../lib/supabase.js';

export interface CodeSession {
  id: string;
  phoneNumber: string;
  sessionToken: string;
  verified: boolean;
  expiresAt: string;
  lastActivity: string;
}

export interface CodeInvestigation {
  id: string;
  sessionId: string;
  question: string;
  findings: string;
  summary: string;
  filesExamined: string[];
  toolCallsCount: number;
  durationMs: number;
  createdAt: string;
}

/**
 * Store or update a code session
 */
export async function storeCodeSession(
  sessionToken: string,
  phoneNumber: string
): Promise<string | null> {
  try {
    const { data, error } = await supabase
      .from('code_sessions')
      .upsert({
        phone_number: phoneNumber,
        session_token: sessionToken,
        verified: true,  // SMS is inherently verified
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        last_activity: new Date().toISOString(),
      }, { onConflict: 'session_token' })
      .select('id')
      .single();

    if (error) {
      console.error('[code-agent/storage] Failed to store session:', error);
      return null;
    }

    return data?.id || null;
  } catch (e) {
    console.error('[code-agent/storage] Session store error:', e);
    return null;
  }
}

/**
 * Store a code investigation
 */
export async function storeCodeInvestigation(
  sessionToken: string,
  question: string,
  findings: string,
  summary: string,
  filesExamined: string[],
  toolCallsCount: number,
  durationMs: number
): Promise<string | null> {
  try {
    // First get the session UUID from token
    const { data: session } = await supabase
      .from('code_sessions')
      .select('id')
      .eq('session_token', sessionToken)
      .single();

    if (!session) {
      console.error('[code-agent/storage] Session not found for investigation storage');
      return null;
    }

    const { data, error } = await supabase
      .from('code_investigations')
      .insert({
        session_id: session.id,
        question,
        findings,
        summary,
        files_examined: filesExamined,
        tool_calls_count: toolCallsCount,
        duration_ms: durationMs,
      })
      .select('id')
      .single();

    if (error) {
      console.error('[code-agent/storage] Failed to store investigation:', error);
      return null;
    }

    return data?.id || null;
  } catch (e) {
    console.error('[code-agent/storage] Investigation store error:', e);
    return null;
  }
}

/**
 * Get an investigation by ID
 */
export async function getCodeInvestigation(id: string): Promise<CodeInvestigation | null> {
  try {
    const { data, error } = await supabase
      .from('code_investigations')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !data) {
      return null;
    }

    return {
      id: data.id,
      sessionId: data.session_id,
      question: data.question,
      findings: data.findings,
      summary: data.summary,
      filesExamined: data.files_examined || [],
      toolCallsCount: data.tool_calls_count,
      durationMs: data.duration_ms,
      createdAt: data.created_at,
    };
  } catch (e) {
    console.error('[code-agent/storage] Get investigation error:', e);
    return null;
  }
}

/**
 * Get latest investigation for a session
 */
export async function getLatestInvestigation(sessionToken: string): Promise<CodeInvestigation | null> {
  try {
    const { data: session } = await supabase
      .from('code_sessions')
      .select('id')
      .eq('session_token', sessionToken)
      .single();

    if (!session) {
      return null;
    }

    const { data, error } = await supabase
      .from('code_investigations')
      .select('*')
      .eq('session_id', session.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (error || !data) {
      return null;
    }

    return {
      id: data.id,
      sessionId: data.session_id,
      question: data.question,
      findings: data.findings,
      summary: data.summary,
      filesExamined: data.files_examined || [],
      toolCallsCount: data.tool_calls_count,
      durationMs: data.duration_ms,
      createdAt: data.created_at,
    };
  } catch (e) {
    console.error('[code-agent/storage] Get latest investigation error:', e);
    return null;
  }
}

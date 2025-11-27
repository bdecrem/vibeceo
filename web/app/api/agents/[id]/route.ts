/**
 * API Route: Get/Delete Specific Agent
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    // Fetch agent first
    const { data: agent, error: agentError } = await supabase
      .from('agents')
      .select('*')
      .eq('id', id)
      .single();

    if (agentError) throw agentError;

    // Fetch versions separately
    const { data: versions, error: versionsError } = await supabase
      .from('agent_versions')
      .select('id, version, definition_jsonb, changelog, created_at')
      .eq('agent_id', id)
      .order('version', { ascending: false });

    if (versionsError) {
      console.error('Failed to fetch versions:', versionsError);
    }

    return NextResponse.json({
      success: true,
      agent: {
        ...agent,
        agent_versions: versions || [],
      },
    });
  } catch (error: any) {
    console.error('Failed to fetch agent:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch agent',
        message: error.message,
      },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    // Delete agent (cascade will delete versions)
    const { error: deleteError } = await supabase
      .from('agents')
      .delete()
      .eq('id', id);

    if (deleteError) throw deleteError;

    return NextResponse.json({
      success: true,
      message: 'Agent deleted successfully',
    });
  } catch (error: any) {
    console.error('Failed to delete agent:', error);
    return NextResponse.json(
      {
        error: 'Failed to delete agent',
        message: error.message,
      },
      { status: 500 }
    );
  }
}

/**
 * API Route: List All Agents
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

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status'); // filter by status: draft, active, archived
    const category = searchParams.get('category'); // filter by category

    // Fetch agents first
    let query = supabase
      .from('agents')
      .select('*')
      .order('updated_at', { ascending: false });

    if (status) {
      query = query.eq('status', status);
    }

    if (category) {
      query = query.eq('category', category);
    }

    const { data: agents, error } = await query;

    if (error) throw error;

    // Fetch versions for each agent
    const agentsWithVersions = await Promise.all(
      (agents || []).map(async (agent) => {
        const { data: versions } = await supabase
          .from('agent_versions')
          .select('id, version, created_at')
          .eq('agent_id', agent.id)
          .order('version', { ascending: false });

        return {
          ...agent,
          agent_versions: versions || [],
          latestVersion: versions?.[0] || null,
          totalVersions: versions?.length || 0,
        };
      })
    );

    return NextResponse.json({
      success: true,
      agents: agentsWithVersions,
    });
  } catch (error: any) {
    console.error('Failed to fetch agents:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch agents',
        message: error.message,
      },
      { status: 500 }
    );
  }
}

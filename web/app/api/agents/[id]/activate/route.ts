/**
 * API Route: Activate/Deactivate Agent
 * Changes agent status between draft, active, and archived
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

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const body = await request.json();
    const { status } = body;

    // Validate status - using database schema values
    if (!['draft', 'pending_review', 'approved', 'disabled'].includes(status)) {
      return NextResponse.json(
        {
          error: 'Invalid status',
          message: 'Status must be one of: draft, pending_review, approved, disabled',
        },
        { status: 400 }
      );
    }

    // Update agent status
    const { data: agent, error: updateError } = await supabase
      .from('agents')
      .update({
        status,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (updateError) throw updateError;

    return NextResponse.json({
      success: true,
      agent,
      message: `Agent status updated to ${status}`,
    });
  } catch (error: any) {
    console.error('Failed to update agent status:', error);
    return NextResponse.json(
      {
        error: 'Failed to update agent status',
        message: error.message,
      },
      { status: 500 }
    );
  }
}

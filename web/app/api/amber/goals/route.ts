import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_ANON_KEY!
);

export async function GET() {
  try {
    const { data, error } = await supabase
      .from('amber_state')
      .select('content, metadata')
      .eq('type', 'weekly_goals')
      .order('created_at', { ascending: false })
      .limit(1);

    if (error) {
      console.error('Supabase error:', error);
      return NextResponse.json({ error: 'Database error' }, { status: 500 });
    }

    const goals = data?.[0] || { content: null, metadata: {} };
    return NextResponse.json(goals);
  } catch (err) {
    console.error('API error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { goals, completionState } = body;

    // Store current week's goals and completion state
    const { error } = await supabase
      .from('amber_state')
      .insert({
        type: 'weekly_goals',
        content: JSON.stringify(goals),
        source: 'amber_goals_app',
        metadata: {
          completion_state: completionState,
          week: getCurrentWeekKey(),
          updated_at: new Date().toISOString()
        }
      });

    if (error) {
      console.error('Supabase error:', error);
      return NextResponse.json({ error: 'Database error' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('API error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

function getCurrentWeekKey() {
  const now = new Date();
  const monday = new Date(now);
  monday.setDate(now.getDate() - now.getDay() + 1);
  return `${monday.getFullYear()}-W${Math.ceil(monday.getTime() / (7 * 24 * 60 * 60 * 1000))}`;
}
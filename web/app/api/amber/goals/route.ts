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

    const currentWeek = getCurrentWeekKey();
    
    // Check if there's already a record for this week
    const { data: existing } = await supabase
      .from('amber_state')
      .select('id')
      .eq('type', 'weekly_goals')
      .eq('metadata->>week', currentWeek)
      .limit(1);

    const goalData = {
      type: 'weekly_goals',
      content: JSON.stringify(goals),
      source: 'amber_goals_app',
      metadata: {
        completion_state: completionState,
        week: currentWeek,
        updated_at: new Date().toISOString()
      },
      updated_at: new Date().toISOString()
    };

    let error;

    if (existing && existing.length > 0) {
      // Update existing record
      const result = await supabase
        .from('amber_state')
        .update(goalData)
        .eq('id', existing[0].id);
      error = result.error;
    } else {
      // Insert new record
      const result = await supabase
        .from('amber_state')
        .insert(goalData);
      error = result.error;
    }

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
  
  // Use ISO week format: YYYY-WXX
  const year = monday.getFullYear();
  const startOfYear = new Date(year, 0, 1);
  const weekNumber = Math.ceil(((monday.getTime() - startOfYear.getTime()) / 86400000 + startOfYear.getDay() + 1) / 7);
  
  return `${year}-W${weekNumber.toString().padStart(2, '0')}`;
}
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY! // Use service role key for full access
);

export async function GET() {
  try {
    const { data, error } = await supabase
      .from('amber_state')
      .select('content, metadata')
      .eq('type', 'creation')
      .eq('metadata->>type', 'weekly_goals')
      .order('created_at', { ascending: false })
      .limit(1);

    if (error) {
      console.error('Supabase error:', error);
      return NextResponse.json({ error: 'Database error' }, { status: 500 });
    }

    if (data && data.length > 0) {
      const record = data[0];
      return NextResponse.json({
        content: JSON.stringify(record.metadata.goals),
        metadata: {
          completion_state: record.metadata.completion_state || {},
          week: record.metadata.week
        }
      });
    }

    return NextResponse.json({ content: null, metadata: {} });
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
      .eq('type', 'creation')
      .eq('metadata->>type', 'weekly_goals')
      .eq('metadata->>week', currentWeek)
      .limit(1);

    const recordData = {
      type: 'creation' as const,
      content: `Weekly goals tracker - Bart's week of ${getWeekDateRange(currentWeek)}`,
      source: 'amber',
      metadata: {
        type: 'weekly_goals',
        goals: goals,
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
        .update(recordData)
        .eq('id', existing[0].id);
      error = result.error;
    } else {
      // Insert new record
      const result = await supabase
        .from('amber_state')
        .insert(recordData);
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

function getWeekDateRange(weekKey: string) {
  const now = new Date();
  const monday = new Date(now);
  monday.setDate(now.getDate() - now.getDay() + 1);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  
  const formatDate = (date: Date) => date.toLocaleDateString('en-US', { month: 'long', day: 'numeric' });
  return `${formatDate(monday)} - ${formatDate(sunday)}, ${now.getFullYear()}`;
}
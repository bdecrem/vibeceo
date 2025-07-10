import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Use service role to bypass RLS for controlled access
const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

// Interface for ZAD submission data
interface ZADSubmissionData {
  app_id: string;
  participant_id: string;
  action_type: string;
  participant_data: Record<string, any>;
  content_data: Record<string, any>;
}

// Validate ZAD submission data structure
function validateZADData(data: any): data is ZADSubmissionData {
  return (
    typeof data === 'object' &&
    typeof data.app_id === 'string' &&
    typeof data.participant_id === 'string' &&
    typeof data.action_type === 'string' &&
    typeof data.participant_data === 'object' &&
    typeof data.content_data === 'object' &&
    data.app_id.trim() !== '' &&
    data.participant_id.trim() !== '' &&
    data.action_type.trim() !== ''
  );
}

// Sanitize input data to prevent injection attacks
function sanitizeZADData(data: ZADSubmissionData): ZADSubmissionData {
  return {
    app_id: data.app_id.trim(),
    participant_id: data.participant_id.trim(),
    action_type: data.action_type.trim(),
    participant_data: data.participant_data,
    content_data: data.content_data
  };
}

export async function POST(request: NextRequest) {
  try {
    // Parse request body
    const submissionData = await request.json();
    
    // Validate required data structure
    if (!validateZADData(submissionData)) {
      return NextResponse.json(
        { 
          error: 'Invalid data structure. Required: app_id, participant_id, action_type, participant_data, content_data',
          received: Object.keys(submissionData || {})
        },
        { status: 400 }
      );
    }

    // Sanitize input data
    const cleanData = sanitizeZADData(submissionData);

    // Step 1: Verify app exists and get app info
    const { data: appData, error: appError } = await supabase
      .from('wtaf_content')
      .select('id, user_slug, app_slug, type')
      .eq('id', cleanData.app_id)
      .single();

    if (appError || !appData) {
      return NextResponse.json(
        { error: 'App not found' },
        { status: 404 }
      );
    }

    // Step 2: Verify this is a ZAD app
    if (appData.type !== 'ZAD') {
      return NextResponse.json(
        { error: 'App is not a ZAD (Zero Admin Data) app' },
        { status: 403 }
      );
    }

    // Step 3: Additional validation for specific action types
    if (cleanData.action_type === 'join') {
      // For join actions, check if we're at capacity (max 5 users)
      const { data: existingUsers, error: usersError } = await supabase
        .from('wtaf_zero_admin_collaborative')
        .select('participant_id')
        .eq('app_id', cleanData.app_id)
        .eq('action_type', 'join');

      if (usersError) {
        console.error('Error checking existing users:', usersError);
        return NextResponse.json(
          { error: 'Failed to validate user capacity' },
          { status: 500 }
        );
      }

      // Check for unique participant IDs (prevent duplicates)
      const uniqueParticipants = [...new Set(existingUsers?.map(u => u.participant_id) || [])];
      
      if (uniqueParticipants.includes(cleanData.participant_id)) {
        return NextResponse.json(
          { error: 'Participant ID already exists in this app' },
          { status: 409 }
        );
      }

      if (uniqueParticipants.length >= 5) {
        return NextResponse.json(
          { error: 'App is at maximum capacity (5 users)' },
          { status: 409 }
        );
      }
    }

    // Step 4: Insert the collaborative data
    const { data: insertedData, error: insertError } = await supabase
      .from('wtaf_zero_admin_collaborative')
      .insert({
        app_id: cleanData.app_id,
        participant_id: cleanData.participant_id,
        action_type: cleanData.action_type,
        participant_data: cleanData.participant_data,
        content_data: cleanData.content_data
      })
      .select()
      .single();

    if (insertError) {
      console.error('ZAD insert error:', insertError);
      return NextResponse.json(
        { error: 'Failed to save collaborative data' },
        { status: 500 }
      );
    }

    // Step 5: Return success response
    return NextResponse.json({
      success: true,
      app: {
        id: appData.id,
        slug: appData.app_slug,
        user: appData.user_slug
      },
      data: insertedData
    });

  } catch (error) {
    console.error('ZAD submit API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 
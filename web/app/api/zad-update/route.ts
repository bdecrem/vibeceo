import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Use service role to bypass RLS for controlled access
const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

// Interface for ZAD update data
interface ZADUpdateData {
  record_id: number;
  app_id: string;
  participant_id?: string; // Optional for validation
  content_data?: Record<string, any>; // Optional, only content_data can be updated
  participant_data?: Record<string, any>; // Optional, only for user's own data
}

// Validate ZAD update data structure
function validateZADUpdateData(data: any): data is ZADUpdateData {
  return (
    typeof data === 'object' &&
    typeof data.record_id === 'number' &&
    typeof data.app_id === 'string' &&
    data.app_id.trim() !== '' &&
    data.record_id > 0 &&
    (data.content_data !== undefined || data.participant_data !== undefined)
  );
}

// No time restrictions for ZAD apps - users should be able to edit their content anytime

export async function PUT(request: NextRequest) {
  try {
    // Parse request body
    const updateData = await request.json();
    
    // Validate required data structure
    if (!validateZADUpdateData(updateData)) {
      return NextResponse.json(
        { 
          error: 'Invalid data structure. Required: record_id, app_id, and either content_data or participant_data',
          received: Object.keys(updateData || {})
        },
        { status: 400 }
      );
    }

    // Step 1: Verify app exists and get app info
    const { data: appData, error: appError } = await supabase
      .from('wtaf_content')
      .select('id, user_slug, app_slug, type')
      .eq('id', updateData.app_id)
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

    // Step 3: Get the existing record to validate
    const { data: existingRecord, error: recordError } = await supabase
      .from('wtaf_zero_admin_collaborative')
      .select('*')
      .eq('id', updateData.record_id)
      .eq('app_id', updateData.app_id)
      .single();

    if (recordError || !existingRecord) {
      return NextResponse.json(
        { error: 'Record not found in this app' },
        { status: 404 }
      );
    }

    // Step 4: No time restrictions for ZAD apps - users can edit their content anytime

    // Step 5: Participant validation (if participant_id provided)
    if (updateData.participant_id && 
        existingRecord.participant_id !== updateData.participant_id) {
      return NextResponse.json(
        { error: 'Cannot update another participant\'s record' },
        { status: 403 }
      );
    }

    // Step 6: Prepare update object (only allow specific fields)
    const updateFields: any = {};
    
    if (updateData.content_data !== undefined) {
      updateFields.content_data = updateData.content_data;
    }
    
    if (updateData.participant_data !== undefined) {
      // Only allow updating participant_data if it's the same participant
      if (updateData.participant_id && 
          existingRecord.participant_id === updateData.participant_id) {
        updateFields.participant_data = updateData.participant_data;
      } else {
        return NextResponse.json(
          { error: 'Can only update your own participant_data' },
          { status: 403 }
        );
      }
    }

    // Add updated timestamp to content_data if updating content
    if (updateFields.content_data) {
      updateFields.content_data = {
        ...updateFields.content_data,
        updated_at: Date.now()
      };
    }

    // Step 7: Execute the update
    const { data: updatedData, error: updateError } = await supabase
      .from('wtaf_zero_admin_collaborative')
      .update(updateFields)
      .eq('id', updateData.record_id)
      .eq('app_id', updateData.app_id)
      .select()
      .single();

    if (updateError) {
      console.error('ZAD update error:', updateError);
      return NextResponse.json(
        { error: 'Failed to update collaborative data' },
        { status: 500 }
      );
    }

    // Step 8: Return success response
    return NextResponse.json({
      success: true,
      app: {
        id: appData.id,
        slug: appData.app_slug,
        user: appData.user_slug
      },
      data: updatedData,
      updated_fields: Object.keys(updateFields)
    });

  } catch (error) {
    console.error('ZAD update API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 
import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

function getSupabaseClient() {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
  
  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Missing Supabase environment variables');
  }
  
  return createClient(supabaseUrl, supabaseKey);
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { app_id, submission_data, action_type, record_id } = body;

    // Handle different action types (following ZAD pattern)
    if (action_type === 'update') {
      console.log('✏️ Admin helper: updateRecord for app:', app_id, 'record:', record_id);
      
      if (!record_id) {
        return NextResponse.json({ 
          success: false, 
          error: 'Missing record_id for update operation' 
        }, { status: 400 });
      }
      
      if (!submission_data) {
        return NextResponse.json({ 
          success: false, 
          error: 'Missing submission_data for update operation' 
        }, { status: 400 });
      }
      
      try {
        const supabase = getSupabaseClient();
        
        // Update the existing record with new submission_data
        const { data, error } = await supabase
          .from('wtaf_submissions')
          .update({
            submission_data: submission_data
          })
          .eq('id', record_id)
          .select()
          .single();
          
        if (error) {
          console.error('Update error:', error);
          return NextResponse.json({ 
            success: false, 
            error: 'Failed to update record: ' + error.message 
          }, { status: 500 });
        }
        
        console.log('✅ Record updated successfully:', data);
        return NextResponse.json({ 
          success: true, 
          data: data,
          message: 'Record updated successfully' 
        }, { status: 200 });
        
      } catch (error) {
        console.error('Update record error:', error);
        return NextResponse.json({ 
          success: false, 
          error: 'Update operation failed: ' + (error instanceof Error ? error.message : String(error))
        }, { status: 500 });
      }
    }

    // BACKEND HELPER FUNCTION: Delete record
    if (action_type === 'delete') {
      console.log('🗑️ Admin helper: deleteRecord for app:', app_id, 'record:', record_id);
      
      if (!record_id) {
        return NextResponse.json({ 
          success: false, 
          error: 'Missing record_id for delete operation' 
        }, { status: 400 });
      }
      
      try {
        const supabase = getSupabaseClient();
        
        // Delete the record
        const { data, error } = await supabase
          .from('wtaf_submissions')
          .delete()
          .eq('id', record_id)
          .select()
          .single();
          
        if (error) {
          console.error('Delete error:', error);
          return NextResponse.json({ 
            success: false, 
            error: 'Failed to delete record: ' + error.message 
          }, { status: 500 });
        }
        
        console.log('✅ Record deleted successfully:', data);
        return NextResponse.json({ 
          success: true, 
          data: data,
          message: 'Record deleted successfully' 
        }, { status: 200 });
        
      } catch (error) {
        console.error('Delete record error:', error);
        return NextResponse.json({ 
          success: false, 
          error: 'Delete operation failed: ' + (error instanceof Error ? error.message : String(error))
        }, { status: 500 });
      }
    }

    // DEFAULT: Standard create operation (maintains backward compatibility)
    if (!app_id || !submission_data) {
      return NextResponse.json(
        { error: 'Missing required fields: app_id and submission_data are required' },
        { status: 400 }
      );
    }

    const supabase = getSupabaseClient();
    
    const { data, error } = await supabase
      .from('wtaf_submissions')
      .insert({
        app_id,
        submission_data
      })
      .select()
      .single();

    if (error) {
      console.error('Supabase error:', error);
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, data }, { status: 200 });
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 
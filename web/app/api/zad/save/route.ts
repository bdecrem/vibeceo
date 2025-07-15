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

// Backend helper function logic for greet action
function generateGreeting(name: string): { greeting: string; timestamp: string; metadata: any } {
  const now = new Date();
  const timeString = now.toLocaleTimeString();
  const dateString = now.toLocaleDateString();
  
  // Backend logic: Generate personalized greeting with timestamp
  const greeting = `Hello ${name}! The time is ${timeString} on ${dateString}`;
  
  // Additional backend processing
  const metadata = {
    greetingLength: greeting.length,
    nameLength: name.length,
    generatedAt: now.toISOString(),
    serverProcessed: true
  };
  
  return {
    greeting,
    timestamp: now.toISOString(),
    metadata
  };
}

// Phase 1 Authentication Backend Helper Functions
const ZAD_USER_LABELS = ['CHAOS_AGENT', 'VIBE_MASTER', 'GLITCH_RIDER', 'PRIMAL_FORCE', 'NEON_PHANTOM'];

// Helper: Get existing users for an app
async function getExistingUsers(app_id: string) {
  const supabase = getSupabaseClient();
  
  const { data, error } = await supabase
    .from('wtaf_zero_admin_collaborative')
    .select('*')
    .eq('app_id', app_id)
    .eq('action_type', 'join');
    
  if (error) {
    console.error('Error getting existing users:', error);
    return [];
  }
  
  return data.map((item: any) => ({
    userLabel: item.participant_data?.userLabel || item.content_data?.userLabel,
    participantId: item.participant_id,
    joinTime: item.participant_data?.join_time || item.content_data?.join_time,
    passcode: item.participant_data?.passcode || item.content_data?.passcode
  })).filter(user => user.userLabel); // Filter out invalid entries
}

// Backend Helper 1: Check Available Slots
async function checkAvailableSlots(app_id: string) {
  const existingUsers = await getExistingUsers(app_id);
  const usedLabels = existingUsers.map(u => u.userLabel).filter(Boolean);
  const availableLabels = ZAD_USER_LABELS.filter(label => !usedLabels.includes(label));
  
  return {
    totalSlots: 5,
    usedSlots: usedLabels.length,
    availableSlots: availableLabels.length,
    availableLabels: availableLabels,
    usedLabels: usedLabels,
    isFull: availableLabels.length === 0
  };
}

// Backend Helper 2: Generate User Credentials
async function generateUser(app_id: string) {
  const slots = await checkAvailableSlots(app_id);
  
  if (slots.isFull) {
    return {
      success: false,
      error: "SQUAD'S FULL, TRY ANOTHER DIMENSION 🚫",
      availableLabels: []
    };
  }
  
  // Pick the first available label
  const userLabel = slots.availableLabels[0];
  if (!userLabel) {
    return {
      success: false,
      error: "NO MORE ROOM IN THIS CHAOS REALM 🌀",
      availableLabels: []
    };
  }
  
  // Generate 4-digit passcode
  const passcode = Math.floor(1000 + Math.random() * 9000).toString();
  const participantId = userLabel + '_' + passcode;
  
  return {
    success: true,
    userLabel: userLabel,
    passcode: passcode,
    participantId: participantId,
    message: `YOUR LABEL: ${userLabel}\nSECRET DIGITS: ${passcode}\nSCREENSHOT THIS OR CRY LATER 📸`
  };
}

// Backend Helper 3: Register User
async function registerUser(app_id: string, userLabel: string, passcode: string, participant_id: string) {
  const supabase = getSupabaseClient();
  
  // Verify the user label is still available
  const slots = await checkAvailableSlots(app_id);
  if (!slots.availableLabels.includes(userLabel)) {
    return {
      success: false,
      error: `Label ${userLabel} is no longer available`
    };
  }
  
  try {
    const { data, error } = await supabase
      .from('wtaf_zero_admin_collaborative')
      .insert({
        app_id: app_id,
        participant_id: participant_id,
        participant_data: {
          userLabel: userLabel,
          username: userLabel,
          passcode: passcode,
          join_time: Date.now()
        },
        action_type: 'join',
        content_data: {
          message: 'Joined the app',
          timestamp: Date.now(),
          join_time: Date.now(),
          userLabel: userLabel,
          passcode: passcode
        }
      })
      .select()
      .single();

    if (error) {
      console.error('Registration error:', error);
      return {
        success: false,
        error: 'REGISTRATION EXPLODED, TRY AGAIN 💥'
      };
    }

    return {
      success: true,
      participantId: participant_id,
      userLabel: userLabel,
      message: `Welcome to the chaos, ${userLabel}! 🎉`
    };
    
  } catch (error) {
    console.error('Registration error:', error);
    return {
      success: false,
      error: 'REGISTRATION EXPLODED, TRY AGAIN 💥'
    };
  }
}

// Backend Helper 4: Authenticate User
async function authenticateUser(app_id: string, userLabel: string, passcode: string) {
  if (!userLabel || userLabel === 'Select User') {
    return {
      success: false,
      error: 'PICK YOUR IDENTITY, PHANTOM 👻'
    };
  }
  
  if (!passcode || passcode.length !== 4) {
    return {
      success: false,
      error: '4 DIGITS OF CHAOS REQUIRED 🔢'
    };
  }
  
  try {
    const existingUsers = await getExistingUsers(app_id);
    
    const authRecord = existingUsers.find(user => 
      user.userLabel === userLabel && user.passcode === passcode
    );
    
    if (authRecord) {
      return {
        success: true,
        user: {
          userLabel: authRecord.userLabel,
          participantId: authRecord.participantId,
          joinTime: authRecord.joinTime
        },
        message: `✅ Welcome back, ${userLabel}!`
      };
    } else {
      return {
        success: false,
        error: 'NICE TRY, WRONG VIBES ❌\n\nMake sure you\'re using the correct passcode from when you registered.'
      };
    }
    
  } catch (error) {
    console.error('Authentication error:', error);
    return {
      success: false,
      error: 'LOGIN MALFUNCTION, REALITY GLITCHING 🌀\n\nError: ' + (error instanceof Error ? error.message : String(error))
    };
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    let { app_id, participant_id, participant_data, action_type, content_data } = body;

    // Validate required fields
    if (!app_id || !action_type) {
      return NextResponse.json(
        { error: 'Missing required fields: app_id and action_type are required' },
        { status: 400 }
      );
    }

    // PHASE 1 AUTHENTICATION BACKEND HELPER FUNCTIONS
    if (action_type === 'check_slots') {
      console.log('🔍 Backend helper: checkAvailableSlots for app:', app_id);
      const slots = await checkAvailableSlots(app_id);
      return NextResponse.json({ 
        success: true, 
        slots: slots 
      }, { status: 200 });
    }
    
    if (action_type === 'generate_user') {
      console.log('🎲 Backend helper: generateUser for app:', app_id);
      const userResult = await generateUser(app_id);
      return NextResponse.json({ 
        success: userResult.success, 
        user: userResult.success ? userResult : null,
        error: userResult.error || null
      }, { status: 200 });
    }
    
    if (action_type === 'register_user') {
      const { userLabel, passcode, participantId } = content_data || {};
      console.log('📝 Backend helper: registerUser for app:', app_id, 'user:', userLabel);
      const registerResult = await registerUser(app_id, userLabel, passcode, participantId);
      return NextResponse.json({ 
        success: registerResult.success,
        result: registerResult
      }, { status: 200 });
    }
    
    if (action_type === 'authenticate_user') {
      const { userLabel, passcode } = content_data || {};
      console.log('🔐 Backend helper: authenticateUser for app:', app_id, 'user:', userLabel);
      const authResult = await authenticateUser(app_id, userLabel, passcode);
      return NextResponse.json({ 
        success: authResult.success,
        result: authResult
      }, { status: 200 });
    }
    
    // BACKEND HELPER FUNCTION: Update existing record (for collaborative apps)
    if (action_type === 'update_task') {
      const { taskId, updates } = content_data || {};
      console.log('✏️ Backend helper: updateTask for app:', app_id, 'task:', taskId);
      
      if (!taskId) {
        return NextResponse.json({ 
          success: false, 
          error: 'Missing taskId for update operation' 
        }, { status: 400 });
      }
      
      if (!participant_id) {
        return NextResponse.json({ 
          success: false, 
          error: 'Missing participant_id for update operation' 
        }, { status: 400 });
      }
      
      try {
        const supabase = getSupabaseClient();
        
        // First, load existing record to get current content_data
        const { data: existingRecord, error: loadError } = await supabase
          .from('wtaf_zero_admin_collaborative')
          .select('content_data')
          .eq('app_id', app_id)
          .eq('id', taskId)
          .single();
          
        if (loadError) {
          console.error('Load existing record error:', loadError);
          return NextResponse.json({ 
            success: false, 
            error: 'Failed to load existing record: ' + loadError.message 
          }, { status: 500 });
        }
        
        // Merge updates with existing content_data
        const mergedContentData = {
          ...existingRecord.content_data,
          ...updates
        };
        
        console.log('🔄 Merging data:', {
          existing: existingRecord.content_data,
          updates: updates,
          merged: mergedContentData
        });
        
        // Update the existing record with merged data
        const { data, error } = await supabase
          .from('wtaf_zero_admin_collaborative')
          .update({
            content_data: mergedContentData,
            updated_at: new Date().toISOString()
          })
          .eq('app_id', app_id)
          .eq('id', taskId)
          .select()
          .single();
          
        if (error) {
          console.error('Update error:', error);
          return NextResponse.json({ 
            success: false, 
            error: 'Failed to update task: ' + error.message 
          }, { status: 500 });
        }
        
        console.log('✅ Task updated successfully with merged data:', data);
        return NextResponse.json({ 
          success: true, 
          data: data,
          message: 'Task updated successfully' 
        }, { status: 200 });
        
      } catch (error) {
        console.error('Update task error:', error);
        return NextResponse.json({ 
          success: false, 
          error: 'Update operation failed: ' + (error instanceof Error ? error.message : String(error))
        }, { status: 500 });
      }
    }

    // BACKEND HELPER FUNCTION: Handle "greet" action type
    if (action_type === 'greet') {
      const name = content_data?.name || 'Anonymous';
      
      // Generate greeting on backend with additional processing
      const greetingResult = generateGreeting(name);
      
      // Enhance content_data with backend-generated data
      content_data = {
        ...content_data,
        ...greetingResult,
        backendProcessed: true
      };
      
      console.log('🤖 Backend greet function executed for:', name);
      console.log('📝 Generated greeting:', greetingResult.greeting);
    }

    // BACKEND HELPER FUNCTION: Delete record
    if (action_type === 'delete') {
      const { recordId } = content_data || {};
      console.log('🗑️ Backend helper: deleteRecord for app:', app_id, 'record:', recordId);
      
      if (!recordId) {
        return NextResponse.json({ 
          success: false, 
          error: 'Missing recordId for delete operation' 
        }, { status: 400 });
      }
      
      if (!participant_id) {
        return NextResponse.json({ 
          success: false, 
          error: 'Missing participant_id for delete operation' 
        }, { status: 400 });
      }
      
      try {
        const supabase = getSupabaseClient();
        
        // Delete the record
        const { data, error } = await supabase
          .from('wtaf_zero_admin_collaborative')
          .delete()
          .eq('app_id', app_id)
          .eq('id', recordId)
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

    // BACKEND HELPER FUNCTION: Search/filter records
    if (action_type === 'search') {
      const { type, filters, orderBy, limit } = content_data || {};
      console.log('🔍 Backend helper: searchRecords for app:', app_id, 'type:', type, 'filters:', filters);
      
      if (!type) {
        return NextResponse.json({ 
          success: false, 
          error: 'Missing type for search operation' 
        }, { status: 400 });
      }
      
      try {
        const supabase = getSupabaseClient();
        
        // Build base query
        let query = supabase
          .from('wtaf_zero_admin_collaborative')
          .select('*')
          .eq('app_id', app_id)
          .eq('action_type', type)
          .order('created_at', { ascending: false });
        
        // Apply filters safely (only allow filtering on content_data fields)
        if (filters) {
          Object.entries(filters).forEach(([key, value]) => {
            if (key.startsWith('content_data.') || key === 'participant_id') {
              query = query.eq(key, value);
            }
          });
        }
        
        // Apply ordering
        if (orderBy) {
          query = query.order(orderBy, { ascending: false });
        }
        
        // Apply limit
        if (limit && typeof limit === 'number' && limit > 0) {
          query = query.limit(limit);
        }
        
        const { data, error } = await query;
        
        if (error) {
          console.error('Search error:', error);
          return NextResponse.json({ 
            success: false, 
            error: 'Failed to search records: ' + error.message 
          }, { status: 500 });
        }
        
        console.log('✅ Search completed successfully:', data?.length, 'records found');
        return NextResponse.json({ 
          success: true, 
          data: data || [],
          count: data?.length || 0,
          message: 'Search completed successfully' 
        }, { status: 200 });
        
      } catch (error) {
        console.error('Search records error:', error);
        return NextResponse.json({ 
          success: false, 
          error: 'Search operation failed: ' + (error instanceof Error ? error.message : String(error))
        }, { status: 500 });
      }
    }

    // BACKEND HELPER FUNCTION: Count records
    if (action_type === 'count') {
      const { type, filters } = content_data || {};
      console.log('📊 Backend helper: countRecords for app:', app_id, 'type:', type, 'filters:', filters);
      
      if (!type) {
        return NextResponse.json({ 
          success: false, 
          error: 'Missing type for count operation' 
        }, { status: 400 });
      }
      
      try {
        const supabase = getSupabaseClient();
        
        // Build base query
        let query = supabase
          .from('wtaf_zero_admin_collaborative')
          .select('*', { count: 'exact' })
          .eq('app_id', app_id)
          .eq('action_type', type);
        
        // Apply filters safely
        if (filters) {
          Object.entries(filters).forEach(([key, value]) => {
            if (key.startsWith('content_data.') || key === 'participant_id') {
              query = query.eq(key, value);
            }
          });
        }
        
        const { data, error, count } = await query;
        
        if (error) {
          console.error('Count error:', error);
          return NextResponse.json({ 
            success: false, 
            error: 'Failed to count records: ' + error.message 
          }, { status: 500 });
        }
        
        console.log('✅ Count completed successfully:', count, 'records found');
        return NextResponse.json({ 
          success: true, 
          count: count || 0,
          message: 'Count completed successfully' 
        }, { status: 200 });
        
      } catch (error) {
        console.error('Count records error:', error);
        return NextResponse.json({ 
          success: false, 
          error: 'Count operation failed: ' + (error instanceof Error ? error.message : String(error))
        }, { status: 500 });
      }
    }

    // BACKEND HELPER FUNCTION: Clear/reset records
    if (action_type === 'clear') {
      const { type } = content_data || {};
      console.log('🧹 Backend helper: clearRecords for app:', app_id, 'type:', type);
      
      if (!type) {
        return NextResponse.json({ 
          success: false, 
          error: 'Missing type for clear operation' 
        }, { status: 400 });
      }
      
      if (!participant_id) {
        return NextResponse.json({ 
          success: false, 
          error: 'Missing participant_id for clear operation' 
        }, { status: 400 });
      }
      
      try {
        const supabase = getSupabaseClient();
        
        // Clear all records of the specified type for this app
        const { data, error } = await supabase
          .from('wtaf_zero_admin_collaborative')
          .delete()
          .eq('app_id', app_id)
          .eq('action_type', type)
          .select();
        
        if (error) {
          console.error('Clear error:', error);
          return NextResponse.json({ 
            success: false, 
            error: 'Failed to clear records: ' + error.message 
          }, { status: 500 });
        }
        
        console.log('✅ Records cleared successfully:', data?.length, 'records deleted');
        return NextResponse.json({ 
          success: true, 
          data: data || [],
          deletedCount: data?.length || 0,
          message: 'Records cleared successfully' 
        }, { status: 200 });
        
      } catch (error) {
        console.error('Clear records error:', error);
        return NextResponse.json({ 
          success: false, 
          error: 'Clear operation failed: ' + (error instanceof Error ? error.message : String(error))
        }, { status: 500 });
      }
    }

    // STANDARD ZAD DATA SAVE (for non-helper functions)
    if (!participant_id) {
      return NextResponse.json(
        { error: 'Missing required field: participant_id is required for data operations' },
        { status: 400 }
      );
    }

    const supabase = getSupabaseClient();
    
    const { data, error } = await supabase
      .from('wtaf_zero_admin_collaborative')
      .insert({
        app_id,
        participant_id,
        participant_data: participant_data || {},
        action_type,
        content_data: content_data || {}
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

    // For greet action, return the generated greeting in the response
    if (action_type === 'greet') {
      return NextResponse.json({ 
        success: true, 
        data,
        greeting: content_data.greeting // Return the backend-generated greeting
      }, { status: 200 });
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
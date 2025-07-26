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

// Demo Mode Detection
function isDemoMode(participant_id?: string, content_data?: any, app_id?: string): boolean {
  // Check if participant_id starts with 'demo'
  if (participant_id && participant_id.startsWith('demo')) {
    return true;
  }
  
  // Check for explicit demo flag in content_data
  if (content_data?.demo === true || content_data?.demoMode === true) {
    return true;
  }
  
  return false;
}

// Get correct table name based on demo mode
function getTableName(participant_id?: string, content_data?: any, app_id?: string): string {
  if (isDemoMode(participant_id, content_data, app_id)) {
    console.log('🎭 Demo mode detected - using demo table');
    return 'wtaf_zero_admin_collaborative_DEMO';
  }
  return 'wtaf_zero_admin_collaborative';
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
async function getExistingUsers(app_id: string, participant_id?: string, content_data?: any) {
  const supabase = getSupabaseClient();
  
  const { data, error } = await supabase
    .from(getTableName(participant_id, content_data, app_id))
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
async function checkAvailableSlots(app_id: string, participant_id?: string, content_data?: any) {
  const existingUsers = await getExistingUsers(app_id, participant_id, content_data);
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
async function generateUser(app_id: string, participant_id?: string, content_data?: any) {
  const slots = await checkAvailableSlots(app_id, participant_id, content_data);
  
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
      const slots = await checkAvailableSlots(app_id, participant_id, content_data);
      return NextResponse.json({ 
        success: true, 
        slots: slots 
      }, { status: 200 });
    }
    
    if (action_type === 'generate_user') {
      console.log('🎲 Backend helper: generateUser for app:', app_id);
      const userResult = await generateUser(app_id, participant_id, content_data);
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
          .from(getTableName(participant_id, content_data, app_id))
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
          .from(getTableName(participant_id, content_data, app_id))
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

    // BACKEND HELPER FUNCTION: Handle "generate_image" action type  
    if (action_type === 'generate_image') {
      const { prompt, style } = content_data || {};
      console.log('🎨 Backend helper: generateImage for app:', app_id, 'prompt:', prompt);
      
      if (!prompt) {
        return NextResponse.json({ 
          error: 'Image prompt is required',
          success: false 
        }, { status: 400 });
      }

      try {
        // Initialize OpenAI client (following meme-processor pattern)
        const { OpenAI } = await import('openai');
        const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
        
        if (!OPENAI_API_KEY) {
          console.warn('⚠️ OPENAI_API_KEY not found, using placeholder image');
          const imageUrl = `https://picsum.photos/512/512?random=${Math.floor(Math.random() * 1000)}`;
          return NextResponse.json({ 
            success: true,
            imageUrl: imageUrl,
            prompt: prompt,
            style: style || 'realistic'
          }, { status: 200 });
        }

        const openai = new OpenAI({ apiKey: OPENAI_API_KEY });
        
        // Generate image using DALL-E 3 (same as meme-processor)
        console.log('🎨 Generating image with DALL-E 3:', prompt);
        const response = await openai.images.generate({
          model: "dall-e-3",
          prompt: prompt,
          size: "1024x1024",
          quality: "standard",
          n: 1
        });

        if (!response.data || response.data.length === 0) {
          throw new Error("No image data in DALL-E response");
        }
        
        const imageUrl = response.data[0].url;
        if (!imageUrl) {
          throw new Error("No image URL in DALL-E response");
        }
        
        console.log('✅ Generated image URL:', imageUrl);
        
        return NextResponse.json({ 
          success: true,
          imageUrl: imageUrl,
          prompt: prompt,
          style: style || 'realistic'
        }, { status: 200 });
        
      } catch (error) {
        console.error('❌ Image generation error:', error);
        
        // Fallback to placeholder on error
        console.warn('⚠️ Falling back to placeholder image');
        const imageUrl = `https://picsum.photos/512/512?random=${Math.floor(Math.random() * 1000)}`;
        
        return NextResponse.json({ 
          success: true,
          imageUrl: imageUrl,
          prompt: prompt,
          style: style || 'realistic',
          fallback: true
        }, { status: 200 });
      }
    }

    // BACKEND HELPER FUNCTION: Handle "generate_text" action type  
    if (action_type === 'generate_text') {
      const { prompt, maxTokens, temperature, systemPrompt } = content_data || {};
      console.log('🤖 Backend helper: generateText for app:', app_id, 'prompt:', prompt);
      
      if (!prompt) {
        return NextResponse.json({ 
          error: 'Text prompt is required',
          success: false 
        }, { status: 400 });
      }

      try {
        // Initialize OpenAI client (following same pattern as generateImage)
        const { OpenAI } = await import('openai');
        const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
        
        if (!OPENAI_API_KEY) {
          console.warn('⚠️ OPENAI_API_KEY not found, using mock response');
          const mockText = `Mock response for: "${prompt}"\n\nThis is a placeholder response. To enable real AI text generation, please set the OPENAI_API_KEY environment variable.`;
          return NextResponse.json({ 
            success: true,
            text: mockText,
            prompt: prompt,
            mock: true
          }, { status: 200 });
        }

        const openai = new OpenAI({ apiKey: OPENAI_API_KEY });
        
        // Generate text using GPT-4
        console.log('🤖 Generating text with GPT-4:', prompt);
        const completion = await openai.chat.completions.create({
          model: "gpt-4-turbo-preview",
          messages: [
            {
              role: "system",
              content: systemPrompt || "You are a helpful assistant embedded in a collaborative web app. Be concise and engaging."
            },
            {
              role: "user",
              content: prompt
            }
          ],
          max_tokens: maxTokens || 500,
          temperature: temperature || 0.7,
        });
        
        const generatedText = completion.choices[0].message.content;
        if (!generatedText) {
          throw new Error("No text in GPT-4 response");
        }
        
        console.log('✅ Generated text:', generatedText.substring(0, 100) + '...');
        
        return NextResponse.json({ 
          success: true,
          text: generatedText,
          prompt: prompt,
          model: "gpt-4-turbo-preview"
        }, { status: 200 });
        
      } catch (error) {
        console.error('❌ Text generation error:', error);
        
        // Fallback to error message
        console.warn('⚠️ Falling back to error response');
        const errorText = `Error generating text: ${error instanceof Error ? error.message : 'Unknown error'}`;
        
        return NextResponse.json({ 
          success: false,
          text: errorText,
          prompt: prompt,
          error: true
        }, { status: 500 });
      }
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
          .from(getTableName(participant_id, content_data, app_id))
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
          .from(getTableName(participant_id, content_data, app_id))
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
          .from(getTableName(participant_id, content_data, app_id))
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
          .from(getTableName(participant_id, content_data, app_id))
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

    // BACKEND HELPER FUNCTION: Flexible query with security
    if (action_type === 'query') {
      const { type, where, orderBy, limit, aggregate } = content_data || {};
      console.log('🔍 Backend helper: flexible query for app:', app_id, 'type:', type, 'where:', where, 'orderBy:', orderBy, 'limit:', limit);
      
      if (!type) {
        return NextResponse.json({ 
          success: false, 
          error: 'Missing type for query operation' 
        }, { status: 400 });
      }
      
      try {
        const supabase = getSupabaseClient();
        
        // Build safe query
        let query = supabase
          .from(getTableName(participant_id, content_data, app_id))
          .select('*')
          .eq('app_id', app_id)
          .eq('action_type', type);
        
        // Apply filters safely (whitelist approach)
        if (where) {
          Object.entries(where).forEach(([key, value]) => {
            // Only allow querying content_data fields and participant_id
            if (key.startsWith('content_data.') || key === 'participant_id') {
              query = query.eq(key, value);
            }
          });
        }
        
        if (orderBy) {
          // Sanitize orderBy to prevent SQL injection
          const validColumns = ['created_at', 'content_data', 'participant_id'];
          if (validColumns.some(col => orderBy.startsWith(col))) {
            query = query.order(orderBy);
          }
        }
        
        // Apply limit (max 100 to prevent abuse)
        if (limit && typeof limit === 'number' && limit > 0 && limit <= 100) {
          query = query.limit(limit);
        }
        
        const { data, error } = await query;
        
        if (error) {
          console.error('Query error:', error);
          return NextResponse.json({ 
            success: false, 
            error: 'Failed to execute query: ' + error.message 
          }, { status: 500 });
        }
        
        console.log('✅ Query completed successfully:', data?.length, 'records found');
        return NextResponse.json({ 
          success: true, 
          data: data || [],
          count: data?.length || 0,
          message: 'Query completed successfully' 
        }, { status: 200 });
        
      } catch (error) {
        console.error('Query error:', error);
        return NextResponse.json({ 
          success: false, 
          error: 'Query operation failed: ' + (error instanceof Error ? error.message : String(error))
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
      .from(getTableName(participant_id, content_data, app_id))
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
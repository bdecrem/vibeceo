import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client with service key for RLS bypass
function getSupabaseClient() {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
  
  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Missing Supabase environment variables');
  }
  
  return createClient(supabaseUrl, supabaseKey);
}

// Define allowed commands by role
const ALLOWED_COMMANDS: Record<string, string[]> = {
  user: ['wtaf', 'meme'],
  coder: ['wtaf', 'meme', 'edit', 'slug', 'index', 'fave'],
  degen: ['wtaf', 'meme', 'edit', 'slug', 'index', 'fave', 'remix'],
  operator: ['wtaf', 'meme', 'edit', 'slug', 'index', 'fave', 'remix', 'public', 'stackzad', 'stackpublic']
};

// Commands that are completely forbidden in web console
const FORBIDDEN_FLAGS = [
  '--admin',
  '--admin-test',
  '--stackobjectify',
  '--zad-test',
  '--zad-api',
  '--music',
  '--stackdb',
  '--stackdata',
  '--stackemail'
];

// Rate limits by role (per hour)
const RATE_LIMITS: Record<string, number> = {
  user: 5,
  coder: 10,
  degen: 20,
  operator: 30
};

// In-memory rate limit storage (in production, use Redis or database)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

function checkRateLimit(userId: string, role: string): { allowed: boolean; remaining: number; resetIn: number } {
  const now = Date.now();
  const hourInMs = 60 * 60 * 1000;
  const limit = RATE_LIMITS[role] || RATE_LIMITS.user;
  
  const userLimit = rateLimitStore.get(userId);
  
  if (!userLimit || now > userLimit.resetTime) {
    // Reset the counter
    rateLimitStore.set(userId, {
      count: 1,
      resetTime: now + hourInMs
    });
    return { allowed: true, remaining: limit - 1, resetIn: hourInMs };
  }
  
  if (userLimit.count >= limit) {
    return { 
      allowed: false, 
      remaining: 0, 
      resetIn: userLimit.resetTime - now 
    };
  }
  
  userLimit.count++;
  return { 
    allowed: true, 
    remaining: limit - userLimit.count, 
    resetIn: userLimit.resetTime - now 
  };
}

function sanitizeCommand(command: string): { sanitized: string; rejected: string[] } {
  let sanitized = command;
  const rejected: string[] = [];
  
  // Check for forbidden flags
  for (const flag of FORBIDDEN_FLAGS) {
    if (sanitized.includes(flag)) {
      rejected.push(flag);
      sanitized = sanitized.replace(new RegExp(flag + '\\s*', 'g'), '');
    }
  }
  
  return { sanitized: sanitized.trim(), rejected };
}

function parseCommand(command: string): { type: string; args: string } {
  const parts = command.trim().split(/\s+/);
  const type = parts[0]?.toLowerCase() || '';
  const args = parts.slice(1).join(' ');
  return { type, args };
}

export async function POST(req: NextRequest) {
  try {
    const { command, user_id, user_email } = await req.json();
    
    if (!command || !user_id) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }
    
    const supabase = getSupabaseClient();
    
    // Verify the user_id matches the authenticated user
    const authHeader = req.headers.get('authorization');
    const token = authHeader?.split(' ')[1];
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Verify token and ensure user_id matches
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user || user.id !== user_id) {
      return NextResponse.json({ error: 'Invalid user' }, { status: 403 });
    }
    
    // Get user's SMS subscriber info
    const { data: subscriber, error: subError } = await supabase
      .from('sms_subscribers')
      .select('*')
      .eq('supabase_id', user_id)
      .single();
      
    if (subError || !subscriber) {
      return NextResponse.json(
        { error: 'User not found in SMS subscribers' },
        { status: 404 }
      );
    }
    
    const userRole = subscriber.role || 'user';
    
    // Check rate limit
    const rateLimit = checkRateLimit(user_id, userRole);
    if (!rateLimit.allowed) {
      const minutesRemaining = Math.ceil(rateLimit.resetIn / 1000 / 60);
      return NextResponse.json(
        { 
          error: `Rate limit exceeded. Try again in ${minutesRemaining} minutes.`,
          rate_limit: {
            remaining: 0,
            reset_in_minutes: minutesRemaining
          }
        },
        { status: 429 }
      );
    }
    
    // Sanitize command
    const { sanitized, rejected } = sanitizeCommand(command);
    if (rejected.length > 0) {
      return NextResponse.json(
        { 
          error: `Forbidden flags detected: ${rejected.join(', ')}. These are not allowed in web console.`,
          hint: 'Use the command line interface for admin features.'
        },
        { status: 403 }
      );
    }
    
    // Parse command
    const { type, args } = parseCommand(sanitized);
    
    // Check if command is allowed for user's role
    const allowedCommands = ALLOWED_COMMANDS[userRole] || ALLOWED_COMMANDS.user;
    if (!allowedCommands.includes(type)) {
      return NextResponse.json(
        { 
          error: `Command "${type}" is not allowed for your role (${userRole})`,
          allowed_commands: allowedCommands
        },
        { status: 403 }
      );
    }
    
    // Log the command for audit
    console.log(`[WebConsole] User ${subscriber.slug} (${userRole}) executing: ${sanitized}`);
    
    // Import and call the controller
    try {
      // Dynamic import to avoid loading SMS bot code at build time
      const { processWebConsoleCommand } = await import('./process-command');
      
      const result = await processWebConsoleCommand({
        command: sanitized,
        subscriber,
        userRole
      });
      
      return NextResponse.json({
        ...result,
        rate_limit: {
          remaining: rateLimit.remaining,
          reset_in_minutes: Math.ceil(rateLimit.resetIn / 1000 / 60)
        }
      });
      
    } catch (processError: any) {
      console.error('[WebConsole] Processing error:', processError);
      return NextResponse.json(
        { 
          error: 'Failed to process command',
          details: processError.message
        },
        { status: 500 }
      );
    }
    
  } catch (error: any) {
    console.error('[WebConsole] API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
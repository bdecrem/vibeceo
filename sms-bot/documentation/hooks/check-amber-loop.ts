#!/usr/bin/env npx tsx
/**
 * Amber Thinkhard Loop Hook
 *
 * Called by Claude Code's Stop hook to check if an amber loop is active.
 * If active, blocks Claude from stopping and signals to continue.
 *
 * Input: JSON via stdin with session info
 * Output: JSON to stdout with decision
 */

import { createClient } from '@supabase/supabase-js';

interface HookInput {
  session_id: string;
  transcript_path: string;
  hook_event_name: string;
  stop_hook_active: boolean;
  cwd: string;
}

interface LoopState {
  active: boolean;
  iteration: number;
  max_iterations: number;
  spec: {
    task: string;
    criteria: string[];
  };
  criteria_status: boolean[];
  started_at: string;
}

async function main() {
  // Read input from stdin
  let input: HookInput;
  try {
    const chunks: Buffer[] = [];
    for await (const chunk of process.stdin) {
      chunks.push(chunk);
    }
    const inputStr = Buffer.concat(chunks).toString();
    input = JSON.parse(inputStr);
  } catch (e) {
    // No input or invalid JSON - allow normal stop
    process.exit(0);
  }

  // CRITICAL: Check if we're already in a stop hook to prevent infinite loops
  if (input.stop_hook_active) {
    // Already continuing from a stop hook, allow normal stop
    process.exit(0);
  }

  // Initialize Supabase client
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    // No Supabase config - allow normal stop
    process.exit(0);
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    // Check for active loop state
    const { data, error } = await supabase
      .from('amber_state')
      .select('content, metadata')
      .eq('type', 'loop_state')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (error || !data) {
      // No loop state found - allow normal stop
      process.exit(0);
    }

    const metadata = data.metadata as LoopState;

    if (!metadata?.active) {
      // Loop not active - allow normal stop
      process.exit(0);
    }

    // Check if we've hit max iterations
    if (metadata.iteration >= metadata.max_iterations) {
      // Max iterations reached - mark inactive and allow stop
      await supabase
        .from('amber_state')
        .update({
          metadata: { ...metadata, active: false },
          content: `Completed: ${data.content} (${metadata.iteration} iterations)`
        })
        .eq('type', 'loop_state')
        .order('created_at', { ascending: false })
        .limit(1);

      process.exit(0);
    }

    // Active loop with iterations remaining - block stop
    const output = {
      decision: "block",
      reason: `Amber thinkhard loop active: iteration ${metadata.iteration}/${metadata.max_iterations}. Continuing with task: ${metadata.spec?.task || data.content}`
    };

    console.log(JSON.stringify(output));
    process.exit(0);

  } catch (e) {
    // Error checking loop state - fail gracefully, allow stop
    console.error('Error checking loop state:', e);
    process.exit(0);
  }
}

main();

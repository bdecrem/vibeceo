/**
 * Agent Command Handler
 * Executes workflow agents triggered by SMS commands
 */

import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { executeAgent } from '../../src/agents/executor.js';
import type { RunResult } from '@vibeceo/shared-types';

let supabaseClient: SupabaseClient | null = null;

function getSupabaseClient(): SupabaseClient {
  if (!supabaseClient) {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_KEY;

    if (!url || !key) {
      throw new Error('SUPABASE_URL and SUPABASE_SERVICE_KEY required');
    }

    supabaseClient = createClient(url, key);
  }

  return supabaseClient;
}

interface AgentMatch {
  agentId: string;
  agentName: string;
  versionId: string;
  keyword: string;
}

/**
 * Find an active agent by command keyword
 */
export async function findAgentByCommand(keyword: string): Promise<AgentMatch | null> {
  try {
    const supabase = getSupabaseClient();

    // Query agents with approved status (approved = active and can be triggered)
    const { data: agents, error: agentError } = await supabase
      .from('agents')
      .select('id, name, status')
      .eq('status', 'approved');

    if (agentError) {
      console.error('[Agent Commands] Error fetching agents:', agentError);
      return null;
    }

    if (!agents || agents.length === 0) {
      return null;
    }

    // For each agent, fetch the latest version and check for matching command keyword
    for (const agent of agents) {
      const { data: version, error: versionError } = await supabase
        .from('agent_versions')
        .select('id, definition_jsonb')
        .eq('agent_id', agent.id)
        .order('version', { ascending: false })
        .limit(1)
        .single();

      if (versionError || !version) {
        continue;
      }

      const definition = version.definition_jsonb as any;

      // Check if this agent has a matching command keyword
      if (definition.triggers?.commands) {
        for (const command of definition.triggers.commands) {
          if (command.keyword.toUpperCase() === keyword.toUpperCase()) {
            return {
              agentId: agent.id,
              agentName: agent.name,
              versionId: version.id,
              keyword: command.keyword,
            };
          }
        }
      }
    }

    return null;
  } catch (error) {
    console.error('[Agent Commands] Error in findAgentByCommand:', error);
    return null;
  }
}

/**
 * Execute an agent and return the SMS output
 */
export async function executeAgentCommand(
  agentId: string,
  versionId: string,
  agentName: string,
  keyword: string
): Promise<string> {
  try {
    console.log(`[Agent Commands] Executing agent: ${agentName} (version: ${versionId})`);

    const result: RunResult = await executeAgent(versionId, {
      agentId,
      agentVersionId: versionId,
      triggerType: 'command',
      dryRun: false,
    });

    if (!result.success) {
      console.error('[Agent Commands] Agent execution failed:', result.errors);
      return `❌ Failed to execute ${agentName}. ${result.errors?.[0]?.message || 'Unknown error'}`;
    }

    // Return SMS output if available
    if (result.outputs?.sms) {
      console.log(`[Agent Commands] Agent executed successfully, sending SMS output`);
      return result.outputs.sms;
    }

    // If no SMS output but execution succeeded
    if (result.outputs?.reportUrl) {
      return `✅ ${agentName} completed successfully! View report: ${result.outputs.reportUrl}`;
    }

    // Fallback if no outputs
    return `✅ ${agentName} executed successfully (${result.metrics?.itemsProcessed || 0} items processed)`;

  } catch (error) {
    console.error('[Agent Commands] Error executing agent:', error);
    return `❌ Error executing ${agentName}: ${error instanceof Error ? error.message : 'Unknown error'}`;
  }
}

/**
 * Handle an agent command from SMS
 * Returns true if command was handled, false if not found
 */
export async function handleAgentCommand(
  message: string,
  from: string,
  sendSmsResponse: (to: string, message: string, client: any) => Promise<void>,
  twilioClient: any
): Promise<boolean> {
  const messageUpper = message.trim().toUpperCase();

  // Try to find a matching agent
  const agent = await findAgentByCommand(messageUpper);

  if (!agent) {
    return false; // No matching agent found
  }

  console.log(`[Agent Commands] Found agent "${agent.agentName}" for command "${agent.keyword}"`);

  // Send acknowledgment
  await sendSmsResponse(from, `🚀 Running ${agent.agentName}...`, twilioClient);

  // Execute the agent
  const output = await executeAgentCommand(agent.agentId, agent.versionId, agent.agentName, agent.keyword);

  // Send the result
  await sendSmsResponse(from, output, twilioClient);

  return true;
}

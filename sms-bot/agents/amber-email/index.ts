/**
 * Amber Email Agent - TypeScript Orchestrator
 *
 * Runs Python agent with Claude Agent SDK for email task execution.
 * Follows kg-query pattern.
 */

import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Python scripts are in source directory, not dist
const PYTHON_SCRIPTS_DIR = __dirname.includes('/dist/')
  ? path.join(__dirname.replace('/dist/', '/'), '../../agents/amber-email')
  : __dirname;

export interface AmberEmailResult {
  response: string;
  actions_taken: string[];
  tool_calls_count: number;
  error?: string;
  thinkhard?: boolean;
  iterations?: number;
}

/**
 * Run the Amber email agent to execute a task.
 *
 * @param task What to do (from email body)
 * @param senderEmail Who asked
 * @param subject Email subject for context
 * @param isApprovedRequest If true, this was approved by Bart
 * @param thinkhard If true, run multi-iteration deep work
 * @returns Result with response, actions taken, etc.
 */
export async function runAmberEmailAgent(
  task: string,
  senderEmail: string,
  subject: string,
  isApprovedRequest: boolean = false,
  thinkhard: boolean = false
): Promise<AmberEmailResult> {
  console.log(`[Amber Email Agent] Starting for task from ${senderEmail}`);

  // Use system Python - same pattern as kg-query
  const pythonPath = process.env.PYTHON_BIN || 'python3';
  const agentScript = path.join(PYTHON_SCRIPTS_DIR, 'agent.py');

  const agentInput = {
    task,
    sender_email: senderEmail,
    subject,
    is_approved_request: isApprovedRequest,
    thinkhard,
  };

  // Environment setup - same pattern as kg-query
  const { CLAUDE_CODE_OAUTH_TOKEN: _ignoredToken, ...cleanEnv } = process.env;
  const sdkToken = process.env.CLAUDE_AGENT_SDK_TOKEN || process.env.CLAUDE_CODE_OAUTH_TOKEN;

  const env: Record<string, string | undefined> = {
    ...cleanEnv,
    ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY,
    CLAUDE_CODE_OAUTH_TOKEN: sdkToken,
    SUPABASE_URL: process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL,
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY,
  };

  // Timeout: 5 minutes for normal, 45 minutes for thinkhard
  const timeoutMs = thinkhard ? 45 * 60 * 1000 : 5 * 60 * 1000;

  return new Promise((resolve) => {
    const proc = spawn(pythonPath, [agentScript, '--input', JSON.stringify(agentInput)], {
      env,
      cwd: PYTHON_SCRIPTS_DIR,
    });

    let stdout = '';
    let stderr = '';

    proc.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    proc.stderr.on('data', (data) => {
      stderr += data.toString();
      console.log(`[Amber Email Agent] ${data.toString().trim()}`);
    });

    proc.on('close', (code) => {
      console.log(`[Amber Email Agent] Process exited with code ${code}`);

      if (code !== 0) {
        resolve({
          response: `Agent error (exit ${code}): ${stderr.slice(0, 500)}`,
          actions_taken: [],
          tool_calls_count: 0,
          error: stderr,
        });
        return;
      }

      try {
        const result = JSON.parse(stdout);
        resolve({
          response: result.response || 'Task completed.',
          actions_taken: result.actions_taken || [],
          tool_calls_count: result.tool_calls_count || 0,
          error: result.error,
          thinkhard: result.thinkhard,
          iterations: result.iterations,
        });
      } catch (e) {
        resolve({
          response: `Couldn't parse agent output: ${stdout.slice(0, 500)}`,
          actions_taken: [],
          tool_calls_count: 0,
          error: String(e),
        });
      }
    });

    proc.on('error', (err) => {
      console.error(`[Amber Email Agent] Failed to start:`, err);
      resolve({
        response: `Failed to start agent: ${err.message}`,
        actions_taken: [],
        tool_calls_count: 0,
        error: err.message,
      });
    });

    const timeout = setTimeout(() => {
      proc.kill('SIGTERM');
      resolve({
        response: `Agent timed out after ${thinkhard ? '45' : '5'} minutes.`,
        actions_taken: [],
        tool_calls_count: 0,
        error: 'timeout',
      });
    }, timeoutMs);

    proc.on('exit', () => clearTimeout(timeout));
  });
}

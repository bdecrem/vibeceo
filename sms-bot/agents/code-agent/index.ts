/**
 * Code Agent - TypeScript Orchestrator
 *
 * Spawns Python agent for codebase investigation and PR creation.
 */

import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Python scripts are in source directory, not dist
const PYTHON_SCRIPTS_DIR = __dirname.includes('/dist/')
  ? path.join(__dirname.replace('/dist/', '/'), '../../agents/code-agent')
  : __dirname;

export interface InvestigationResult {
  response: string;
  summary: string;
  filesExamined: string[];
  toolCallsCount: number;
}

export interface PRExecutionResult {
  response: string;
  prUrl: string | null;
}

export interface ConversationMessage {
  role: 'user' | 'assistant';
  content: string;
}

/**
 * Run code investigation using Claude Agent SDK.
 *
 * @param question User's question about the codebase
 * @param codebasePath Root path of the codebase
 * @param conversationHistory Previous Q&A for follow-ups
 * @param mode "investigate" for questions, "pr" for PR planning
 * @returns Investigation result with response, summary, files examined
 */
export async function runCodeInvestigation(
  question: string,
  codebasePath: string = '/Users/bart/Documents/code/vibeceo',
  conversationHistory: ConversationMessage[] = [],
  mode: 'investigate' | 'pr' = 'investigate'
): Promise<InvestigationResult> {
  console.log(`[Code Agent] Starting ${mode}:`, question.substring(0, 100));

  const pythonPath = process.env.PYTHON_BIN || 'python3';
  const agentScript = path.join(PYTHON_SCRIPTS_DIR, 'agent.py');

  const agentInput = {
    question,
    codebase_path: codebasePath,
    conversation_history: conversationHistory.slice(-5),
    mode,
  };

  // Environment setup - same pattern as kg-query
  const { CLAUDE_CODE_OAUTH_TOKEN: _ignoredToken, ...cleanEnv } = process.env;
  const sdkToken = process.env.CLAUDE_AGENT_SDK_TOKEN || process.env.CLAUDE_CODE_OAUTH_TOKEN;

  const env: Record<string, string | undefined> = {
    ...cleanEnv,
    ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY,
    CLAUDE_CODE_OAUTH_TOKEN: sdkToken,
    CODE_AGENT_CODEBASE_PATH: codebasePath,
  };

  return new Promise((resolve, reject) => {
    const proc = spawn(pythonPath, [agentScript, '--input', JSON.stringify(agentInput)], { env });

    let stdout = '';
    let stderr = '';

    proc.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    proc.stderr.on('data', (data) => {
      stderr += data.toString();
      // Log to console but don't fail
      console.error('[Code Agent]:', data.toString().trim());
    });

    proc.on('close', (code) => {
      if (code === 0 && stdout.trim()) {
        try {
          const result = JSON.parse(stdout.trim());

          if (result.error) {
            reject(new Error(result.error));
            return;
          }

          resolve({
            response: result.response || '',
            summary: result.summary || '',
            filesExamined: result.files_examined || [],
            toolCallsCount: result.tool_calls_count || 0,
          });
        } catch (e) {
          console.error('[Code Agent] Parse error:', stdout.trim());
          reject(new Error(`Failed to parse agent output: ${e}`));
        }
      } else {
        console.error('[Code Agent] Failed with code', code);
        console.error('[Code Agent] stderr:', stderr);
        reject(new Error(`Agent failed with code ${code}: ${stderr.substring(0, 500)}`));
      }
    });

    proc.on('error', (err) => {
      console.error('[Code Agent] Process error:', err);
      reject(err);
    });

    // 3-minute timeout for deep investigation
    const timeout = setTimeout(() => {
      proc.kill('SIGTERM');
      reject(new Error('Agent timeout after 180 seconds'));
    }, 180000);

    proc.on('exit', () => clearTimeout(timeout));
  });
}

/**
 * Execute an approved PR plan.
 *
 * @param plan The PR plan that was approved
 * @param codebasePath Root path of the codebase
 * @returns Result with response and PR URL
 */
export async function executePR(
  plan: string,
  codebasePath: string = '/Users/bart/Documents/code/vibeceo'
): Promise<PRExecutionResult> {
  console.log('[Code Agent] Executing PR plan...');

  const pythonPath = process.env.PYTHON_BIN || 'python3';
  const agentScript = path.join(PYTHON_SCRIPTS_DIR, 'agent.py');

  const agentInput = {
    question: plan,
    plan,
    codebase_path: codebasePath,
    mode: 'execute_pr',
  };

  const { CLAUDE_CODE_OAUTH_TOKEN: _ignoredToken, ...cleanEnv } = process.env;
  const sdkToken = process.env.CLAUDE_AGENT_SDK_TOKEN || process.env.CLAUDE_CODE_OAUTH_TOKEN;

  const env: Record<string, string | undefined> = {
    ...cleanEnv,
    ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY,
    CLAUDE_CODE_OAUTH_TOKEN: sdkToken,
    CODE_AGENT_CODEBASE_PATH: codebasePath,
  };

  return new Promise((resolve, reject) => {
    const proc = spawn(pythonPath, [agentScript, '--input', JSON.stringify(agentInput)], { env });

    let stdout = '';
    let stderr = '';

    proc.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    proc.stderr.on('data', (data) => {
      stderr += data.toString();
      console.error('[Code Agent PR]:', data.toString().trim());
    });

    proc.on('close', (code) => {
      if (code === 0 && stdout.trim()) {
        try {
          const result = JSON.parse(stdout.trim());
          resolve({
            response: result.response || '',
            prUrl: result.pr_url || null,
          });
        } catch (e) {
          reject(new Error(`Failed to parse PR result: ${e}`));
        }
      } else {
        reject(new Error(`PR execution failed: ${stderr.substring(0, 500)}`));
      }
    });

    proc.on('error', reject);

    // 5-minute timeout for PR creation (more time for git ops)
    const timeout = setTimeout(() => {
      proc.kill('SIGTERM');
      reject(new Error('PR execution timeout after 300 seconds'));
    }, 300000);

    proc.on('exit', () => clearTimeout(timeout));
  });
}

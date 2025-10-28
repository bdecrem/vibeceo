/**
 * KG Query Agent - TypeScript Orchestrator
 *
 * Runs Python agent with Claude Agent SDK for Neo4j graph queries
 */

import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Python scripts are in source directory, not dist
// When running from dist/, need to go back to source
const PYTHON_SCRIPTS_DIR = __dirname.includes('/dist/')
  ? path.join(__dirname.replace('/dist/', '/'), '../../agents/kg-query')
  : __dirname;

export interface CleanDataBoundary {
  startDate: string;
  endDate: string;
  cleanPercentage: number;
}

export interface ConversationMessage {
  role: 'user' | 'assistant';
  content: string;
}

/**
 * Run KG query using Claude Agent SDK
 *
 * @param query User's natural language query
 * @param conversationHistory Previous messages in conversation
 * @param todaysReportContext Summary of today's arXiv report
 * @param cleanDataBoundary Clean data date range
 * @returns Natural language response
 */
export async function runKGQuery(
  query: string,
  conversationHistory: ConversationMessage[],
  todaysReportContext: string,
  cleanDataBoundary: CleanDataBoundary
): Promise<string> {
  console.log('[KG Agent] Starting query:', query);

  // Use system Python (portable - works with pyenv, homebrew, etc)
  const pythonPath = process.env.PYTHON_BIN || 'python3';
  const agentScript = path.join(PYTHON_SCRIPTS_DIR, 'agent.py');

  // Prepare input for agent
  const agentInput = {
    query,
    conversation_history: conversationHistory.slice(-5), // Last 5 exchanges
    todays_report_context: todaysReportContext,
    clean_data_boundary: cleanDataBoundary,
  };

  // Provide Python process with full environment (minus default OAuth token),
  // while explicitly supplying Anthropic credentials needed by the SDK.
  const { CLAUDE_CODE_OAUTH_TOKEN: _ignoredToken, ...cleanEnv } = process.env;
  const sdkToken = process.env.CLAUDE_AGENT_SDK_TOKEN || process.env.CLAUDE_CODE_OAUTH_TOKEN;
  const env: Record<string, string | undefined> = {
    ...cleanEnv,
    ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY,
    CLAUDE_CODE_OAUTH_TOKEN: sdkToken,
    NEO4J_URI: process.env.NEO4J_URI,
    NEO4J_USERNAME: process.env.NEO4J_USERNAME,
    NEO4J_PASSWORD: process.env.NEO4J_PASSWORD,
    NEO4J_DATABASE: process.env.NEO4J_DATABASE || 'neo4j',
  };

  return new Promise((resolve, reject) => {
    const proc = spawn(pythonPath, [agentScript, '--input', JSON.stringify(agentInput)], {
      env,
    });

    let stdout = '';
    let stderr = '';

    proc.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    proc.stderr.on('data', (data) => {
      stderr += data.toString();
      console.error('[KG Agent Error]:', data.toString());
    });

    proc.on('close', (code) => {
      if (code === 0) {
        const response = stdout.trim();
        if (response) {
          console.log('[KG Agent] Response generated successfully');
          resolve(response);
        } else {
          console.error('[KG Agent] Empty response from agent');
          reject(new Error('Agent returned empty response'));
        }
      } else {
        console.error('[KG Agent] Process exited with code', code);
        console.error('[KG Agent] stderr:', stderr);
        reject(new Error(`Agent failed with code ${code}: ${stderr}`));
      }
    });

    proc.on('error', (error) => {
      console.error('[KG Agent] Process error:', error);
      reject(error);
    });

    // Timeout after 3 minutes to allow Claude agent loops to finish
    const timeout = setTimeout(() => {
      proc.kill('SIGTERM');
      reject(new Error('Agent timeout after 180 seconds'));
    }, 180000);

    proc.on('exit', () => {
      clearTimeout(timeout);
    });
  });
}

/**
 * Get clean data boundary from Neo4j
 *
 * @returns Clean data date range and statistics
 */
export async function getCleanDataBoundary(): Promise<CleanDataBoundary> {
  console.log('[KG] Fetching clean data boundary...');

  // Use system Python (portable - works with pyenv, homebrew, etc)
  const pythonPath = process.env.PYTHON_BIN || 'python3';
  const toolsScript = path.join(PYTHON_SCRIPTS_DIR, 'neo4j_tools.py');

  const { CLAUDE_CODE_OAUTH_TOKEN: _ignoredToken, ...cleanEnv } = process.env;
  const sdkToken = process.env.CLAUDE_AGENT_SDK_TOKEN || process.env.CLAUDE_CODE_OAUTH_TOKEN;
  const env: Record<string, string | undefined> = {
    ...cleanEnv,
    ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY,
    CLAUDE_CODE_OAUTH_TOKEN: sdkToken,
    NEO4J_URI: process.env.NEO4J_URI,
    NEO4J_USERNAME: process.env.NEO4J_USERNAME,
    NEO4J_PASSWORD: process.env.NEO4J_PASSWORD,
    NEO4J_DATABASE: process.env.NEO4J_DATABASE || 'neo4j',
  };

  return new Promise((resolve, reject) => {
    const proc = spawn(pythonPath, [toolsScript, '--status'], {
      env,
    });

    let stdout = '';
    let stderr = '';

    proc.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    proc.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    proc.on('close', (code) => {
      if (code === 0) {
        try {
          const status = JSON.parse(stdout);
          const boundary: CleanDataBoundary = {
            startDate: status.clean_start_date || 'Unknown',
            endDate: status.clean_end_date || 'Unknown',
            cleanPercentage: status.clean_percentage || 0,
          };
          console.log('[KG] Clean data boundary:', boundary);
          resolve(boundary);
        } catch (error) {
          console.error('[KG] Failed to parse status JSON:', error);
          reject(new Error('Failed to parse clean data status'));
        }
      } else {
        console.error('[KG] Status check failed:', stderr);
        reject(new Error(`Status check failed: ${stderr}`));
      }
    });

    proc.on('error', (error) => {
      console.error('[KG] Process error:', error);
      reject(error);
    });
  });
}

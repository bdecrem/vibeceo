/**
 * Discovery Agent - Find and search for current content
 *
 * Uses claude-agent-sdk with WebSearch to find actual articles, podcasts, news, etc.
 * Maintains conversation thread for follow-up questions
 */

import { spawn } from 'child_process';
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import type { CommandContext } from './types.js';
import type { UserContext } from '../lib/context-loader.js';
import { updateThreadContext } from '../lib/context-loader.js';
import { getSubscriber } from '../lib/subscribers.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Run Python discovery agent with web search
 */
async function runDiscoveryAgent(
  userQuery: string,
  userInterests: string[],
  conversationContext: string
): Promise<string> {
  // Point to source directory (not dist) since Python files aren't compiled
  const agentPath = path.resolve(__dirname, '../../agents/discovery/agent.py');
  const outputDir = path.resolve(__dirname, '../../data/discovery-results');

  // Ensure output directory exists
  await fs.mkdir(outputDir, { recursive: true });

  return new Promise((resolve, reject) => {
    const args = [
      agentPath,
      '--query', userQuery,
      '--interests', userInterests.join(', '),
      '--context', conversationContext,
      '--output-dir', outputDir,
      '--verbose',
    ];

    console.log(`[Discovery Agent] Running Python agent: python3 ${args.join(' ')}`);

    const pythonProcess = spawn('python3', args, {
      env: {
        ...process.env,
        PYTHONUNBUFFERED: '1',
      },
    });

    let stdout = '';
    let stderr = '';

    pythonProcess.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    pythonProcess.stderr.on('data', (data) => {
      stderr += data.toString();
      // Log agent progress
      const lines = data.toString().split('\n');
      for (const line of lines) {
        if (line.includes('agent_message:')) {
          console.log(`[Discovery Agent] ${line.trim()}`);
        }
      }
    });

    pythonProcess.on('close', (code) => {
      if (code !== 0) {
        console.error(`[Discovery Agent] Python agent failed with code ${code}`);
        console.error(`[Discovery Agent] stderr: ${stderr}`);
        reject(new Error(`Agent failed: ${stderr || 'Unknown error'}`));
        return;
      }

      try {
        const result = JSON.parse(stdout.trim());
        if (result.status === 'success') {
          resolve(result.result);
        } else {
          reject(new Error(result.error || 'Unknown error'));
        }
      } catch (error) {
        console.error(`[Discovery Agent] Failed to parse result: ${stdout}`);
        reject(new Error('Failed to parse agent output'));
      }
    });

    pythonProcess.on('error', (error) => {
      console.error(`[Discovery Agent] Failed to spawn process:`, error);
      reject(error);
    });
  });
}

/**
 * Handle discovery requests (finding/searching for content)
 */
export async function handleDiscoveryAgent(
  context: CommandContext,
  userContext: UserContext
): Promise<void> {
  const { from, normalizedFrom, message, twilioClient, sendSmsResponse, updateLastMessageDate } = context;

  console.log(`[Discovery Agent] Processing: "${message}"`);

  const subscriber = await getSubscriber(normalizedFrom);
  if (!subscriber) {
    await sendSmsResponse(from, '❌ Subscriber not found', twilioClient);
    await updateLastMessageDate(normalizedFrom);
    return;
  }

  try {
    // Build conversation context from thread
    let conversationContext = '';
    if (userContext.activeThread?.fullContext) {
      const thread = userContext.activeThread.fullContext;
      if (thread.lastQuery) {
        conversationContext = `Previous query: "${thread.lastQuery}"`;
        if (thread.lastResponse) {
          conversationContext += `\nPrevious response summary: ${thread.lastResponse.substring(0, 200)}...`;
        }
      }
    }

    // Run agentic discovery with web search
    console.log(`[Discovery Agent] Running agentic search...`);
    const result = await runDiscoveryAgent(
      message,
      userContext.personalization.interests || [],
      conversationContext
    );

    console.log(`[Discovery Agent] Got result (${result.length} chars)`);

    // Store results in thread context for follow-ups
    await updateThreadContext(subscriber.id, {
      lastQuery: message,
      lastResponse: result,
      timestamp: new Date().toISOString(),
    });

    await sendSmsResponse(from, result, twilioClient);
    await updateLastMessageDate(normalizedFrom);

  } catch (error) {
    console.error('[Discovery Agent] Error:', error);
    await sendSmsResponse(
      from,
      'Sorry, I had trouble searching for that. Please try again or rephrase your request.',
      twilioClient
    );
    await updateLastMessageDate(normalizedFrom);
  }
}


/**
 * CommandHandler export (not used - called via orchestrator)
 */
export const discoveryCommandHandler: import('./types.js').CommandHandler = {
  name: 'discovery',
  matches(): boolean {
    // Never matches directly - only called via orchestrator
    return false;
  },
  async handle(context: CommandContext): Promise<boolean> {
    console.warn('[Discovery] Handler called directly - should be via orchestrator');
    return false;
  },
};

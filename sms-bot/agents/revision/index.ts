/**
 * Revision Agent - TypeScript wrapper for Python agent
 *
 * Handles:
 * - Fetching current HTML from Supabase via storage-manager
 * - Spawning Python agent with inputs
 * - Parsing results and updating Supabase
 * - Returning result to controller
 */

import { spawn } from 'node:child_process';
import { mkdir, writeFile, readFile, rm } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomUUID } from 'node:crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Python path - use environment variable or default
// Use system python3 by default (works on any platform). Override with PYTHON_BIN env var if needed.
const PYTHON_BIN = process.env.PYTHON_BIN || 'python3';
const AGENT_SCRIPT = path.join(process.cwd(), 'agents', 'revision', 'agent.py');
const TEMP_DIR = path.join(process.cwd(), 'data', 'revision-temp');

// Models
const OPUS_MODEL = 'claude-opus-4-5-20251101';
const SONNET_MODEL = 'claude-sonnet-4-20250514';

export interface RevisionInput {
    appSlug: string;
    revisionRequest: string;
    userSlug: string;
    phoneNumber: string;
    useOpus?: boolean;  // If true, use Opus 4.5 (BUILD command)
}

export interface RevisionResult {
    success: boolean;
    html?: string;
    url?: string;
    error?: string;
}

interface AgentOutput {
    status: 'success' | 'error';
    html?: string;
    error?: string;
    output_file?: string;
}

function parseAgentJson(stdout: string): AgentOutput {
    const lines = stdout.split(/\r?\n/).filter((line) => line.trim().length > 0);

    // Look for JSON output from the end (agent prints JSON last)
    for (let i = lines.length - 1; i >= 0; i -= 1) {
        const line = lines[i];
        try {
            const parsed = JSON.parse(line) as AgentOutput;
            if (parsed.status === 'success' || parsed.status === 'error') {
                return parsed;
            }
        } catch {
            // Ignore non-JSON lines
        }
    }

    return { status: 'error', error: 'no_json_output' };
}

async function ensureTempDir(): Promise<string> {
    await mkdir(TEMP_DIR, { recursive: true });
    return TEMP_DIR;
}

async function cleanupTempFiles(sessionDir: string): Promise<void> {
    try {
        await rm(sessionDir, { recursive: true, force: true });
    } catch {
        // Ignore cleanup errors
    }
}

export async function processRevision(input: RevisionInput): Promise<RevisionResult> {
    const { appSlug, revisionRequest, userSlug, phoneNumber, useOpus } = input;
    const sessionId = randomUUID();
    const sessionDir = path.join(await ensureTempDir(), sessionId);

    console.log(`🔧 [Revision] Starting revision for ${userSlug}/${appSlug}`);
    console.log(`🔧 [Revision] Model: ${useOpus ? 'Opus 4.5' : 'Sonnet 4.5'}`);

    try {
        // 1. Fetch current HTML from Supabase
        const { getContentBySlug } = await import('../../engine/storage-manager.js');

        const content = await getContentBySlug(userSlug, appSlug);
        if (!content || !content.html_content) {
            return {
                success: false,
                error: `App not found: ${userSlug}/${appSlug}`
            };
        }

        const currentHtml = content.html_content;
        console.log(`🔧 [Revision] Fetched current HTML (${currentHtml.length} chars)`);

        // 2. Write HTML to temp file (avoids command line length limits)
        await mkdir(sessionDir, { recursive: true });
        const htmlFilePath = path.join(sessionDir, 'current.html');
        await writeFile(htmlFilePath, currentHtml, 'utf-8');

        // 3. Run Python agent
        const model = useOpus ? OPUS_MODEL : SONNET_MODEL;
        const agentResult = await runPythonAgent({
            appSlug,
            userSlug,
            revisionRequest,
            htmlFilePath,
            outputDir: sessionDir,
            model
        });

        if (agentResult.status !== 'success' || !agentResult.html) {
            return {
                success: false,
                error: agentResult.error || 'Agent failed to produce output'
            };
        }

        // 4. Update Supabase with new HTML
        const { updatePageInSupabase } = await import('../../engine/storage-manager.js');
        const updateSuccess = await updatePageInSupabase(userSlug, appSlug, agentResult.html);

        if (!updateSuccess) {
            return {
                success: false,
                error: 'Failed to save updated content to database'
            };
        }

        const url = `https://webtoys.ai/${userSlug}/${appSlug}`;
        console.log(`🔧 [Revision] Complete: ${url}`);

        return {
            success: true,
            html: agentResult.html,
            url
        };

    } catch (error) {
        console.error(`🔧 [Revision] Error:`, error);
        return {
            success: false,
            error: error instanceof Error ? error.message : String(error)
        };
    } finally {
        // Cleanup temp files
        await cleanupTempFiles(sessionDir);
    }
}

async function runPythonAgent(params: {
    appSlug: string;
    userSlug: string;
    revisionRequest: string;
    htmlFilePath: string;
    outputDir: string;
    model: string;
}): Promise<AgentOutput> {
    const { appSlug, userSlug, revisionRequest, htmlFilePath, outputDir, model } = params;

    const args = [
        AGENT_SCRIPT,
        '--app-slug', appSlug,
        '--user-slug', userSlug,
        '--revision-request', revisionRequest,
        '--html-file', htmlFilePath,
        '--output-dir', outputDir,
        '--model', model,
    ];

    // Environment for Python agent
    const agentEnv = {
        ...process.env,
        ANTHROPIC_API_KEY: process.env.CLAUDE_AGENT_SDK_TOKEN || process.env.ANTHROPIC_API_KEY,
        // Remove OAuth tokens to force API key usage
        CLAUDE_CODE_OAUTH_TOKEN: undefined,
    };

    console.log(`🔧 [Revision] Running Python agent with model: ${model}`);

    return new Promise((resolve) => {
        const subprocess = spawn(PYTHON_BIN, args, {
            cwd: __dirname,
            env: agentEnv,
            stdio: ['ignore', 'pipe', 'pipe'],
        });

        let stdout = '';
        let stderr = '';

        subprocess.stdout.setEncoding('utf-8');
        subprocess.stdout.on('data', (chunk) => {
            stdout += chunk;
        });

        subprocess.stderr.setEncoding('utf-8');
        subprocess.stderr.on('data', (chunk) => {
            stderr += chunk;
            // Log stderr for debugging
            console.log(`🔧 [Revision] Agent: ${chunk.trim()}`);
        });

        // Timeout after 5 minutes
        const timeout = setTimeout(() => {
            subprocess.kill('SIGTERM');
            resolve({ status: 'error', error: 'Agent timeout (5 min)' });
        }, 5 * 60 * 1000);

        subprocess.on('error', (err) => {
            clearTimeout(timeout);
            resolve({ status: 'error', error: `Spawn error: ${err.message}` });
        });

        subprocess.on('close', (code) => {
            clearTimeout(timeout);

            if (code !== 0) {
                console.error(`🔧 [Revision] Agent exited with code ${code}`);
                console.error(`🔧 [Revision] stderr: ${stderr}`);
                resolve({ status: 'error', error: stderr || `Exit code ${code}` });
                return;
            }

            const result = parseAgentJson(stdout);
            resolve(result);
        });
    });
}

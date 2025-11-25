import { spawn } from 'child_process';
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { storeAgentReport } from '../report-storage.js';
import { buildReportViewerUrl } from '../../lib/utils/report-viewer-link.js';
import { createShortLink } from '../../lib/utils/shortlink-service.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export interface ResearchPlanResult {
  summary: string;
  shortLink: string | null;
}

/**
 * Run Python research planner agent and upload plan to Supabase
 */
export async function runResearchPlannerAgent(
  researchQuestion: string,
  recipientPhone?: string
): Promise<ResearchPlanResult> {
  // Use process.cwd() to point to sms-bot root (same as other agents)
  const agentPath = path.join(process.cwd(), 'agents', 'research-planner', 'agent.py');
  const outputDir = path.join(process.cwd(), 'data', 'research-plans');

  // Ensure output directory exists
  await fs.mkdir(outputDir, { recursive: true });

  // Run the Python agent
  const agentResult = await new Promise<{ summary: string; outputFile: string; markdown: string }>((resolve, reject) => {
    const args = [
      agentPath,
      '--research-question', researchQuestion,
      '--output-dir', outputDir,
      '--verbose',
    ];

    console.log(`[Research Planner] Running Python agent: python3 ${args.join(' ')}`);

    const pythonProcess = spawn('python3', args, {
      env: {
        ...process.env,
        PYTHONUNBUFFERED: '1',
        ANTHROPIC_API_KEY: process.env.CLAUDE_AGENT_SDK_TOKEN || process.env.ANTHROPIC_API_KEY,
        CLAUDE_CODE_OAUTH_TOKEN: undefined,
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
          console.log(`[Research Planner] ${line.trim()}`);
        }
      }
    });

    pythonProcess.on('close', (code) => {
      if (code !== 0) {
        console.error(`[Research Planner] Python agent failed with code ${code}`);
        console.error(`[Research Planner] stderr: ${stderr}`);
        reject(new Error(`Agent failed: ${stderr || 'Unknown error'}`));
        return;
      }

      try {
        const result = JSON.parse(stdout.trim());
        if (result.status === 'success') {
          resolve({
            summary: result.summary || result.result?.substring(0, 300) || 'Study plan generated',
            outputFile: result.output_file,
            markdown: result.result,
          });
        } else {
          reject(new Error(result.error || 'Unknown error'));
        }
      } catch (error) {
        console.error(`[Research Planner] Failed to parse result: ${stdout}`);
        reject(new Error('Failed to parse agent output'));
      }
    });

    pythonProcess.on('error', (error) => {
      console.error(`[Research Planner] Failed to spawn process:`, error);
      reject(error);
    });
  });

  // Extract data from agent result
  const { summary, outputFile, markdown } = agentResult;

  // Read the markdown file if we have the path
  let markdownContent = markdown;
  if (outputFile && !markdownContent) {
    try {
      markdownContent = await fs.readFile(outputFile, 'utf-8');
    } catch (error) {
      console.warn(`[Research Planner] Failed to read output file: ${error}`);
      markdownContent = markdown || 'Study plan generated';
    }
  }

  // Generate date for storage (use today's date)
  const today = new Date().toISOString().split('T')[0];

  // Upload to Supabase Storage
  let shortLink: string | null = null;
  try {
    const stored = await storeAgentReport({
      agent: 'research-planner',
      date: today,
      markdown: markdownContent,
      summary: summary,
    });

    if (stored.reportPath) {
      // Build report viewer URL
      const viewerUrl = buildReportViewerUrl({
        path: stored.reportPath,
        title: 'Research Study Plan',
        agentSlug: 'research-planner',
      });

      // Create short link
      shortLink = await createShortLink(viewerUrl, {
        context: 'research-plan-viewer',
        createdBy: 'sms-bot',
        createdFor: recipientPhone || 'research-planner',
      }) || viewerUrl;
    }
  } catch (error) {
    console.error('[Research Planner] Failed to upload report:', error);
    // Continue even if upload fails - we still have the summary
  }

  return {
    summary,
    shortLink,
  };
}


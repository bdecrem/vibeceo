/**
 * Admin API Routes
 * Provides HTTP endpoints for agent preview and execution
 */

import http from 'http';
import { executeAgent, executeAgentPreview } from '../executor.js';
import { AgentDefinitionSchema } from '@vibeceo/shared-types';
import type { RunContext } from '@vibeceo/shared-types';
import { createClient } from '@supabase/supabase-js';

const PORT = 3001;
const API_KEY = process.env.ADMIN_API_KEY || 'dev-api-key';

/**
 * Start HTTP server for admin API
 */
export function startAdminAPI(): void {
  const server = http.createServer(async (req, res) => {
    // Enable CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    // Handle preflight
    if (req.method === 'OPTIONS') {
      res.writeHead(200);
      res.end();
      return;
    }

    const url = new URL(req.url || '', `http://localhost:${PORT}`);

    try {
      // Route handlers
      if (url.pathname === '/api/admin/agents/preview' && req.method === 'POST') {
        await handlePreview(req, res);
      } else if (url.pathname === '/api/admin/agents/execute' && req.method === 'POST') {
        await handleExecute(req, res);
      } else if (url.pathname.startsWith('/api/admin/agents/runs/') && req.method === 'GET') {
        await handleGetRun(req, res, url);
      } else if (url.pathname === '/health' || url.pathname === '/' ) {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'ok', service: 'admin-api' }));
      } else {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Not found' }));
      }
    } catch (error: any) {
      console.error('API error:', error);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Internal server error', message: error.message }));
    }
  });

  server.listen(PORT, () => {
    console.log(`✅ Admin API listening on port ${PORT}`);
    console.log(`   POST /api/admin/agents/preview`);
    console.log(`   POST /api/admin/agents/execute`);
    console.log(`   GET  /api/admin/agents/runs/:runId`);
  });
}

/**
 * Handle preview request (dry run without saving)
 */
async function handlePreview(req: http.IncomingMessage, res: http.ServerResponse): Promise<void> {
  try {
    const body = await readBody(req);
    const { definition, context } = JSON.parse(body);

    // Validate definition
    const validationResult = AgentDefinitionSchema.safeParse(definition);
    if (!validationResult.success) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        error: 'Invalid agent definition',
        details: validationResult.error.errors,
      }));
      return;
    }

    // Execute preview with definition directly (no database insertion)
    const runContext: RunContext = {
      agentId: context?.agentId || '00000000-0000-0000-0000-000000000000',
      agentVersionId: 'preview',
      userId: context?.userId,
      triggerType: 'preview',
      dryRun: true,
    };

    const result = await executeAgentPreview(validationResult.data, runContext);

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      success: result.success,
      preview: {
        smsOutput: result.outputs?.sms || '',
        reportMarkdown: result.outputs?.reportMarkdown || '',
        reportUrl: result.outputs?.reportUrl || null,
        itemsProcessed: result.metrics?.itemsProcessed,
        metrics: result.metrics,
        errors: result.errors,
      },
    }));

  } catch (error: any) {
    console.error('Preview error:', error);
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      success: false,
      error: error.message,
    }));
  }
}

/**
 * Handle execute request (full execution with save)
 */
async function handleExecute(req: http.IncomingMessage, res: http.ServerResponse): Promise<void> {
  try {
    // Verify API key
    const apiKey = req.headers.authorization?.replace('Bearer ', '');
    if (apiKey !== API_KEY) {
      res.writeHead(401, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Unauthorized' }));
      return;
    }

    const body = await readBody(req);
    const { agentVersionId, context } = JSON.parse(body);

    if (!agentVersionId) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'agentVersionId required' }));
      return;
    }

    const runContext: RunContext = {
      agentId: context.agentId,
      agentVersionId,
      userId: context.userId,
      triggerType: context.triggerType || 'manual',
      triggerData: context.triggerData,
      dryRun: false,
    };

    const result = await executeAgent(agentVersionId, runContext);

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(result));

  } catch (error: any) {
    console.error('Execute error:', error);
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      success: false,
      error: error.message,
    }));
  }
}

/**
 * Handle get run request
 */
async function handleGetRun(
  req: http.IncomingMessage,
  res: http.ServerResponse,
  url: URL
): Promise<void> {
  try {
    const runId = url.pathname.split('/').pop();

    if (!runId) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'runId required' }));
      return;
    }

    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_KEY!
    );

    const { data: run, error } = await supabase
      .from('agent_runs')
      .select('*')
      .eq('id', runId)
      .single();

    if (error || !run) {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Run not found' }));
      return;
    }

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(run));

  } catch (error: any) {
    console.error('Get run error:', error);
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      error: 'Failed to get run',
      message: error.message,
    }));
  }
}

/**
 * Read request body
 */
function readBody(req: http.IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
    });
    req.on('end', () => {
      resolve(body);
    });
    req.on('error', reject);
  });
}

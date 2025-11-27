/**
 * Kochi Intelligence Platform - Agent Admin Webhooks
 * Sprint 1: Manual trigger endpoint for testing agents
 */

import { Application, Request, Response } from 'express';
import { runAgent } from './runtime.js';
import type { RunContext } from '@vibeceo/shared-types';

/**
 * Setup agent admin webhooks
 */
export function setupAgentWebhooks(app: Application): void {
  // Admin token auth (simple for Sprint 1)
  const ADMIN_TOKEN = process.env.EXTENSION_AUTH_TOKEN || 'test-admin-token';

  // Middleware to check admin token
  const requireAdminAuth = (req: Request, res: Response, next: Function) => {
    const token = req.headers['authorization']?.replace('Bearer ', '');

    if (!token || token !== ADMIN_TOKEN) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    next();
  };

  /**
   * Manual trigger endpoint
   * POST /admin/run-agent/:agentVersionId
   */
  app.post('/admin/run-agent/:agentVersionId', requireAdminAuth, async (req: Request, res: Response) => {
    const { agentVersionId } = req.params;

    console.log(`\n🎯 Manual trigger request for agent version: ${agentVersionId}`);

    try {
      const context: RunContext = {
        agentId: '', // Will be loaded from database
        agentVersionId,
        triggerType: 'manual',
        userId: req.body.userId,
        userProfile: req.body.userProfile,
        triggerData: req.body.triggerData,
        dryRun: req.body.dryRun || false,
      };

      const result = await runAgent(agentVersionId, context);

      if (result.success) {
        res.status(200).json({
          success: true,
          message: 'Agent run completed successfully',
          agentRunId: result.agentRunId,
          outputs: result.outputs,
          metrics: result.metrics,
        });
      } else {
        res.status(500).json({
          success: false,
          message: 'Agent run failed',
          errors: result.errors,
          metrics: result.metrics,
        });
      }

    } catch (error: any) {
      console.error('❌ Error in manual trigger:', error);
      res.status(500).json({
        success: false,
        error: error.message,
        stack: error.stack,
      });
    }
  });

  /**
   * List all agents
   * GET /admin/agents
   */
  app.get('/admin/agents', requireAdminAuth, async (req: Request, res: Response) => {
    try {
      const { createClient } = await import('@supabase/supabase-js');

      const supabase = createClient(
        process.env.SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_KEY!
      );

      const { data, error } = await supabase
        .from('agents')
        .select('*, agent_versions(*)')
        .order('created_at', { ascending: false });

      if (error) {
        throw error;
      }

      res.status(200).json({
        success: true,
        agents: data,
      });

    } catch (error: any) {
      console.error('❌ Error listing agents:', error);
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  });

  /**
   * Get agent by ID
   * GET /admin/agents/:agentId
   */
  app.get('/admin/agents/:agentId', requireAdminAuth, async (req: Request, res: Response) => {
    const { agentId } = req.params;

    try {
      const { createClient } = await import('@supabase/supabase-js');

      const supabase = createClient(
        process.env.SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_KEY!
      );

      const { data, error } = await supabase
        .from('agents')
        .select('*, agent_versions(*), agent_runs(*)')
        .eq('id', agentId)
        .single();

      if (error) {
        throw error;
      }

      res.status(200).json({
        success: true,
        agent: data,
      });

    } catch (error: any) {
      console.error('❌ Error getting agent:', error);
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  });

  console.log('✅ Agent admin webhooks configured');
  console.log('   POST /admin/run-agent/:agentVersionId - Manually trigger agent run');
  console.log('   GET  /admin/agents                   - List all agents');
  console.log('   GET  /admin/agents/:agentId           - Get agent details');
}

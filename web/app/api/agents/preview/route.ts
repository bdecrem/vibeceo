/**
 * API Route: Preview Agent
 * Runs a dry-run execution of the agent workflow
 */

import { NextRequest, NextResponse } from 'next/server';
import { AgentDefinitionSchema } from '@vibeceo/shared-types';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { agentDefinition } = body;

    // Validate agent definition
    const validationResult = AgentDefinitionSchema.safeParse(agentDefinition);
    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: 'Invalid agent definition',
          details: validationResult.error.errors,
        },
        { status: 400 }
      );
    }

    const validated = validationResult.data;

    // Call the sms-bot runtime API to execute preview
    const runtimeUrl = process.env.RUNTIME_API_URL || 'http://localhost:3001';

    const response = await fetch(`${runtimeUrl}/api/admin/agents/preview`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.ADMIN_API_KEY}`,
      },
      body: JSON.stringify({
        definition: validated,
        context: {
          dryRun: true,
          skipNotifications: true,
        },
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Runtime API error: ${error}`);
    }

    // Check if response is JSON
    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      const text = await response.text();
      throw new Error(`Expected JSON response, got: ${text}`);
    }

    const result = await response.json();

    // Return the preview result from the execution engine
    return NextResponse.json(result);
  } catch (error: any) {
    console.error('❌ Preview execution failed:', error);

    // Return error response
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to execute preview',
        message: error.message,
      },
      { status: 500 }
    );
  }
}

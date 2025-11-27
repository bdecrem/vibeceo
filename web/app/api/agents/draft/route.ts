/**
 * API Route: Create Draft Agent
 * Saves a workflow as a draft agent in the database
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { AgentDefinitionSchema } from '@vibeceo/shared-types';

// Create server-side Supabase client with service role key to bypass RLS
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { agentDefinition, userId } = body;

    // Validate agent definition with Zod
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

    // Check if agent with same slug already exists
    let query = supabase
      .from('agents')
      .select('id')
      .eq('slug', validated.metadata.slug);

    // Handle NULL user ID properly
    if (userId) {
      query = query.eq('creator_user_id', userId);
    } else {
      query = query.is('creator_user_id', null);
    }

    const { data: existingAgent, error: existError } = await query.maybeSingle();

    let agent;
    let version;

    if (existingAgent && !existError) {
      // Update existing agent
      const { data: updatedAgent, error: updateError } = await supabase
        .from('agents')
        .update({
          name: validated.metadata.name,
          description: validated.metadata.description,
          category: validated.metadata.category,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existingAgent.id)
        .select()
        .single();

      if (updateError) throw updateError;
      agent = updatedAgent;

      // Get the latest version number
      const { data: latestVersion } = await supabase
        .from('agent_versions')
        .select('version')
        .eq('agent_id', agent.id)
        .order('version', { ascending: false })
        .limit(1)
        .single();

      const nextVersion = (latestVersion?.version || 0) + 1;

      // Create new version
      const { data: newVersion, error: versionError } = await supabase
        .from('agent_versions')
        .insert({
          agent_id: agent.id,
          version: nextVersion,
          definition_jsonb: validated,
          changelog: `Draft update v${nextVersion}`,
        })
        .select()
        .single();

      if (versionError) throw versionError;
      version = newVersion;
    } else {
      // Insert new agent
      const { data: newAgent, error: agentError } = await supabase
        .from('agents')
        .insert({
          creator_user_id: userId || null,
          name: validated.metadata.name,
          slug: validated.metadata.slug,
          description: validated.metadata.description,
          category: validated.metadata.category,
          status: 'draft',
        })
        .select()
        .single();

      if (agentError) throw agentError;
      agent = newAgent;

      // Insert initial agent version
      const { data: initialVersion, error: versionError } = await supabase
        .from('agent_versions')
        .insert({
          agent_id: agent.id,
          version: 1,
          definition_jsonb: validated,
          changelog: 'Initial draft version',
        })
        .select()
        .single();

      if (versionError) throw versionError;
      version = initialVersion;
    }

    return NextResponse.json({
      success: true,
      agent: {
        id: agent.id,
        slug: agent.slug,
        versionId: version.id,
      },
    });
  } catch (error: any) {
    console.error('Failed to create draft agent:', error);
    return NextResponse.json(
      {
        error: 'Failed to create draft agent',
        message: error.message,
      },
      { status: 500 }
    );
  }
}

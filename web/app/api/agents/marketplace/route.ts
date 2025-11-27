import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function getSupabaseClient() {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Missing Supabase environment variables');
  }

  return createClient(supabaseUrl, supabaseKey);
}

/**
 * GET /api/agents/marketplace?phone_number=xxx&category=xxx&featured=true
 * List all approved public agents (marketplace browse)
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const phone_number = searchParams.get('phone_number');
    const category = searchParams.get('category');
    const featuredOnly = searchParams.get('featured') === 'true';

    const supabase = getSupabaseClient();

    // Build query for approved agents
    let query = supabase
      .from('agents')
      .select(`
        *,
        current_version:agent_versions!agents_current_version_id_fkey(
          id,
          version,
          definition_jsonb,
          created_at
        )
      `)
      .eq('status', 'approved')
      .order('is_featured', { ascending: false })
      .order('created_at', { ascending: false });

    // Filter by category if specified
    if (category) {
      query = query.eq('category', category);
    }

    // Filter by featured if specified
    if (featuredOnly) {
      query = query.eq('is_featured', true);
    }

    const { data: agents, error: agentsError } = await query;

    if (agentsError) {
      console.error('Error fetching agents:', agentsError);
      return NextResponse.json(
        { error: 'Failed to fetch agents' },
        { status: 500 }
      );
    }

    // If phone_number provided, include subscription status for each agent
    if (phone_number) {
      const { data: subscriptions } = await supabase
        .from('subscriptions')
        .select('agent_id, status')
        .eq('phone_number', phone_number)
        .eq('status', 'active');

      const subscribedAgentIds = new Set(
        subscriptions?.map(s => s.agent_id) || []
      );

      // Add isSubscribed flag to each agent
      const agentsWithSubscription = agents?.map(agent => ({
        ...agent,
        isSubscribed: subscribedAgentIds.has(agent.id)
      }));

      return NextResponse.json({
        success: true,
        agents: agentsWithSubscription,
        total: agentsWithSubscription?.length || 0
      });
    }

    return NextResponse.json({
      success: true,
      agents: agents || [],
      total: agents?.length || 0
    });

  } catch (error: any) {
    console.error('API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/agents/marketplace
 * Create a new agent (for creators)
 * Body: { name, description, category, definition_jsonb, phone_number }
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, description, category, definition_jsonb, phone_number } = body;

    if (!name || !definition_jsonb || !phone_number) {
      return NextResponse.json(
        { error: 'Missing required fields: name, definition_jsonb, phone_number' },
        { status: 400 }
      );
    }

    const supabase = getSupabaseClient();

    // Get subscriber to find creator_user_id
    const { data: subscriber, error: subscriberError } = await supabase
      .from('sms_subscribers')
      .select('*')
      .eq('phone_number', phone_number)
      .single();

    if (subscriberError || !subscriber) {
      return NextResponse.json(
        { error: 'Subscriber not found' },
        { status: 404 }
      );
    }

    // Generate a slug from the name
    const slug = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');

    // Check if slug already exists
    const { data: existingAgent } = await supabase
      .from('agents')
      .select('slug')
      .eq('slug', slug)
      .single();

    let finalSlug = slug;
    if (existingAgent) {
      // Add random suffix to make it unique
      finalSlug = `${slug}-${Math.random().toString(36).substring(2, 8)}`;
    }

    // Create the agent
    const { data: agent, error: agentError } = await supabase
      .from('agents')
      .insert({
        creator_user_id: subscriber.supabase_id,
        name,
        slug: finalSlug,
        description,
        category,
        status: 'draft' // Starts as draft, needs approval
      })
      .select()
      .single();

    if (agentError) {
      console.error('Error creating agent:', agentError);
      return NextResponse.json(
        { error: 'Failed to create agent' },
        { status: 500 }
      );
    }

    // Create the first version
    const { data: version, error: versionError } = await supabase
      .from('agent_versions')
      .insert({
        agent_id: agent.id,
        version: 1,
        definition_jsonb,
        created_by: subscriber.supabase_id,
        changelog: 'Initial version'
      })
      .select()
      .single();

    if (versionError) {
      console.error('Error creating agent version:', versionError);
      // Cleanup: delete the agent if version creation failed
      await supabase.from('agents').delete().eq('id', agent.id);
      return NextResponse.json(
        { error: 'Failed to create agent version' },
        { status: 500 }
      );
    }

    console.log(`✅ Created agent: ${agent.name} (${agent.slug}) by ${subscriber.slug}`);

    return NextResponse.json({
      success: true,
      agent: {
        ...agent,
        current_version: version
      }
    });

  } catch (error: any) {
    console.error('API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

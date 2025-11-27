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
 * POST /api/agents/subscribe
 * Subscribe to an agent
 * Body: { agent_id, phone_number }
 */
export async function POST(req: NextRequest) {
  try {
    const { agent_id, phone_number } = await req.json();

    if (!agent_id || !phone_number) {
      return NextResponse.json(
        { error: 'Missing required fields: agent_id, phone_number' },
        { status: 400 }
      );
    }

    const supabase = getSupabaseClient();

    // Get subscriber info
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

    // Check if agent exists and is approved
    const { data: agent, error: agentError } = await supabase
      .from('agents')
      .select('*')
      .eq('id', agent_id)
      .single();

    if (agentError || !agent) {
      return NextResponse.json(
        { error: 'Agent not found' },
        { status: 404 }
      );
    }

    if (agent.status !== 'approved') {
      return NextResponse.json(
        { error: 'Agent is not available for subscription' },
        { status: 400 }
      );
    }

    // Check if already subscribed
    const { data: existingSubscription } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('phone_number', phone_number)
      .eq('agent_id', agent_id)
      .single();

    if (existingSubscription) {
      if (existingSubscription.status === 'active') {
        return NextResponse.json(
          { error: 'Already subscribed to this agent' },
          { status: 400 }
        );
      } else {
        // Reactivate cancelled subscription
        const { error: updateError } = await supabase
          .from('subscriptions')
          .update({
            status: 'active',
            cancelled_at: null,
            updated_at: new Date().toISOString()
          })
          .eq('id', existingSubscription.id);

        if (updateError) {
          return NextResponse.json(
            { error: 'Failed to reactivate subscription' },
            { status: 500 }
          );
        }

        console.log(`✅ Reactivated subscription for ${subscriber.slug} to ${agent.name}`);

        return NextResponse.json({
          success: true,
          message: 'Subscription reactivated',
          subscription: {
            ...existingSubscription,
            status: 'active'
          }
        });
      }
    }

    // Create new subscription
    const { data: subscription, error: subscriptionError } = await supabase
      .from('subscriptions')
      .insert({
        user_id: subscriber.supabase_id,
        phone_number,
        agent_id,
        status: 'active',
        is_paid: agent.is_paid
      })
      .select()
      .single();

    if (subscriptionError) {
      console.error('Error creating subscription:', subscriptionError);
      return NextResponse.json(
        { error: 'Failed to create subscription' },
        { status: 500 }
      );
    }

    console.log(`✅ Created subscription for ${subscriber.slug} to ${agent.name}`);

    return NextResponse.json({
      success: true,
      message: 'Successfully subscribed to agent',
      subscription
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
 * DELETE /api/agents/subscribe
 * Unsubscribe from an agent
 * Body: { agent_id, phone_number }
 */
export async function DELETE(req: NextRequest) {
  try {
    const { agent_id, phone_number } = await req.json();

    if (!agent_id || !phone_number) {
      return NextResponse.json(
        { error: 'Missing required fields: agent_id, phone_number' },
        { status: 400 }
      );
    }

    const supabase = getSupabaseClient();

    // Find subscription
    const { data: subscription, error: findError } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('phone_number', phone_number)
      .eq('agent_id', agent_id)
      .single();

    if (findError || !subscription) {
      return NextResponse.json(
        { error: 'Subscription not found' },
        { status: 404 }
      );
    }

    // Cancel the subscription
    const { error: updateError } = await supabase
      .from('subscriptions')
      .update({
        status: 'cancelled',
        cancelled_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', subscription.id);

    if (updateError) {
      console.error('Error cancelling subscription:', updateError);
      return NextResponse.json(
        { error: 'Failed to cancel subscription' },
        { status: 500 }
      );
    }

    console.log(`✅ Cancelled subscription ${subscription.id}`);

    return NextResponse.json({
      success: true,
      message: 'Successfully unsubscribed from agent'
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
 * GET /api/agents/subscribe?phone_number=xxx
 * List all active subscriptions for a user
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const phone_number = searchParams.get('phone_number');

    if (!phone_number) {
      return NextResponse.json(
        { error: 'Missing phone_number parameter' },
        { status: 400 }
      );
    }

    const supabase = getSupabaseClient();

    // Get all subscriptions with agent details
    const { data: subscriptions, error } = await supabase
      .from('subscriptions')
      .select(`
        *,
        agent:agents(
          id,
          name,
          slug,
          description,
          category,
          is_featured,
          is_paid
        )
      `)
      .eq('phone_number', phone_number)
      .eq('status', 'active')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching subscriptions:', error);
      return NextResponse.json(
        { error: 'Failed to fetch subscriptions' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      subscriptions: subscriptions || [],
      total: subscriptions?.length || 0
    });

  } catch (error: any) {
    console.error('API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

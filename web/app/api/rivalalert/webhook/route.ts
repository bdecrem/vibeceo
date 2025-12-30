import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

function getSupabaseClient() {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Missing Supabase environment variables');
  }

  return createClient(supabaseUrl, supabaseKey);
}

// Verify LemonSqueezy webhook signature
function verifyWebhookSignature(payload: string, signature: string): boolean {
  const secret = process.env.LEMONSQUEEZY_WEBHOOK_SECRET;
  if (!secret) {
    console.error('[RivalAlert Webhook] Missing LemonSqueezy webhook secret');
    return false;
  }

  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex');

  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );
}

export async function POST(req: NextRequest) {
  try {
    console.log('[RivalAlert Webhook] POST request received');
    const payload = await req.text();
    const signature = req.headers.get('x-signature');

    console.log(`[RivalAlert Webhook] Payload length: ${payload.length}`);
    console.log(`[RivalAlert Webhook] Signature present: ${!!signature}`);

    if (!signature) {
      console.error('[RivalAlert Webhook] Missing signature header');
      return NextResponse.json(
        { error: 'Missing signature' },
        { status: 400 }
      );
    }

    // Verify webhook signature
    if (!verifyWebhookSignature(payload, signature)) {
      console.error('[RivalAlert Webhook] Invalid webhook signature');
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 403 }
      );
    }

    console.log('[RivalAlert Webhook] Signature verified successfully');

    const webhookData = JSON.parse(payload);
    const eventType = webhookData.meta?.event_name;

    console.log(`[RivalAlert] Webhook received: ${eventType}`);
    console.log(`[RivalAlert] Full webhook data:`, JSON.stringify(webhookData, null, 2));

    // Handle different webhook events
    switch (eventType) {
      case 'subscription_created':
        await handleSubscriptionCreated(webhookData);
        break;

      case 'subscription_updated':
        await handleSubscriptionUpdated(webhookData);
        break;

      case 'subscription_cancelled':
        await handleSubscriptionCancelled(webhookData);
        break;

      case 'subscription_resumed':
        await handleSubscriptionResumed(webhookData);
        break;

      default:
        console.log(`[RivalAlert] Unhandled webhook event: ${eventType}`);
    }

    return NextResponse.json({ success: true });

  } catch (error: any) {
    console.error('[RivalAlert Webhook] Error:', error);
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    );
  }
}

async function handleSubscriptionCreated(webhookData: any) {
  const supabase = getSupabaseClient();

  try {
    const subscription = webhookData.data;
    const attributes = subscription.attributes;

    // Get custom data (should include user email)
    const customData = webhookData.meta?.custom_data || {};
    const userEmail = customData.email || attributes.user_email;

    if (!userEmail) {
      console.error('[RivalAlert] ❌ CRITICAL: Missing user email in webhook data');
      console.error('[RivalAlert] Custom data:', JSON.stringify(customData));
      return;
    }

    // Determine plan from product variant name or ID
    const variantName = attributes.variant_name || '';
    const plan = variantName.toLowerCase().includes('pro') ? 'pro' : 'standard';
    const maxCompetitors = plan === 'pro' ? 10 : 3;

    console.log(`[RivalAlert] Processing subscription for ${userEmail}: ${plan} plan`);

    // Update user with subscription info
    const { data: updateResult, error: updateError } = await supabase
      .from('ra_users')
      .update({
        plan: plan,
        lemon_squeezy_subscription_id: subscription.id,
        lemon_squeezy_customer_id: attributes.customer_id,
        subscription_status: attributes.status,
        max_competitors: maxCompetitors,
        trial_ends_at: null, // Clear trial end date
      })
      .eq('email', userEmail)
      .select('id, email, plan');

    if (updateError) {
      console.error('[RivalAlert] ❌ Failed to update user subscription:', updateError);
      return;
    }

    console.log(`[RivalAlert] ✅ Subscription created for ${userEmail}:`, {
      plan,
      maxCompetitors,
      subscriptionId: subscription.id,
      status: attributes.status
    });

    // Send confirmation email
    await sendSubscriptionEmail(userEmail, 'created', plan);

  } catch (error) {
    console.error('[RivalAlert] Error handling subscription_created:', error);
  }
}

async function handleSubscriptionUpdated(webhookData: any) {
  const supabase = getSupabaseClient();

  try {
    const subscription = webhookData.data;
    const attributes = subscription.attributes;
    const subscriptionId = subscription.id;

    console.log(`[RivalAlert] Updating subscription ${subscriptionId}: status=${attributes.status}`);

    // Determine new plan
    const variantName = attributes.variant_name || '';
    const plan = variantName.toLowerCase().includes('pro') ? 'pro' : 'standard';
    const maxCompetitors = plan === 'pro' ? 10 : 3;

    const { error: updateError } = await supabase
      .from('ra_users')
      .update({
        plan: plan,
        subscription_status: attributes.status,
        max_competitors: maxCompetitors,
      })
      .eq('lemon_squeezy_subscription_id', subscriptionId);

    if (updateError) {
      console.error('[RivalAlert] ❌ Failed to update subscription:', updateError);
      return;
    }

    console.log(`[RivalAlert] ✅ Subscription updated: ${plan} plan, status=${attributes.status}`);

  } catch (error) {
    console.error('[RivalAlert] Error handling subscription_updated:', error);
  }
}

async function handleSubscriptionCancelled(webhookData: any) {
  const supabase = getSupabaseClient();

  try {
    const subscription = webhookData.data;
    const subscriptionId = subscription.id;
    const attributes = subscription.attributes;

    console.log(`[RivalAlert] Cancelling subscription ${subscriptionId}`);

    // Update user to free plan
    const { error: updateError } = await supabase
      .from('ra_users')
      .update({
        plan: 'free',
        subscription_status: 'cancelled',
        max_competitors: 0,
      })
      .eq('lemon_squeezy_subscription_id', subscriptionId);

    if (updateError) {
      console.error('[RivalAlert] ❌ Failed to cancel subscription:', updateError);
      return;
    }

    console.log(`[RivalAlert] ✅ Subscription cancelled`);

    // Get user email to send cancellation email
    const { data: user } = await supabase
      .from('ra_users')
      .select('email')
      .eq('lemon_squeezy_subscription_id', subscriptionId)
      .single();

    if (user?.email) {
      await sendSubscriptionEmail(user.email, 'cancelled', 'free');
    }

  } catch (error) {
    console.error('[RivalAlert] Error handling subscription_cancelled:', error);
  }
}

async function handleSubscriptionResumed(webhookData: any) {
  const supabase = getSupabaseClient();

  try {
    const subscription = webhookData.data;
    const subscriptionId = subscription.id;
    const attributes = subscription.attributes;

    console.log(`[RivalAlert] Resuming subscription ${subscriptionId}`);

    // Determine plan
    const variantName = attributes.variant_name || '';
    const plan = variantName.toLowerCase().includes('pro') ? 'pro' : 'standard';
    const maxCompetitors = plan === 'pro' ? 10 : 3;

    const { error: updateError } = await supabase
      .from('ra_users')
      .update({
        plan: plan,
        subscription_status: 'active',
        max_competitors: maxCompetitors,
      })
      .eq('lemon_squeezy_subscription_id', subscriptionId);

    if (updateError) {
      console.error('[RivalAlert] ❌ Failed to resume subscription:', updateError);
      return;
    }

    console.log(`[RivalAlert] ✅ Subscription resumed: ${plan} plan`);

  } catch (error) {
    console.error('[RivalAlert] Error handling subscription_resumed:', error);
  }
}

async function sendSubscriptionEmail(email: string, eventType: 'created' | 'cancelled', plan: string) {
  try {
    const sendgridApiKey = process.env.SENDGRID_API_KEY;
    if (!sendgridApiKey) {
      console.error('[RivalAlert] Missing SendGrid API key');
      return;
    }

    const sgMail = (await import('@sendgrid/mail')).default;
    sgMail.setApiKey(sendgridApiKey);

    let subject = '';
    let text = '';

    if (eventType === 'created') {
      subject = `Welcome to RivalAlert ${plan === 'pro' ? 'Pro' : 'Standard'}!`;
      text = `Thanks for subscribing to RivalAlert!\n\nYou're now on the ${plan === 'pro' ? 'Pro' : 'Standard'} plan. We'll monitor your competitors daily and send you alerts when they make changes.\n\nManage your subscription: https://rivalalert.ai/account\n\nQuestions? Reply to this email.\n\n- The RivalAlert Team`;
    } else if (eventType === 'cancelled') {
      subject = 'Sorry to see you go - RivalAlert';
      text = `We've cancelled your RivalAlert subscription.\n\nYour monitoring will stop at the end of your billing period.\n\nIf you change your mind, you can reactivate anytime at https://rivalalert.ai\n\nWe'd love your feedback on why you cancelled: just reply to this email.\n\n- The RivalAlert Team`;
    }

    await sgMail.send({
      to: email,
      from: 'hello@rivalalert.ai', // Must be verified in SendGrid
      subject,
      text,
    });

    console.log(`[RivalAlert] Sent ${eventType} email to ${email}`);

  } catch (error) {
    console.error('[RivalAlert] Failed to send subscription email:', error);
  }
}

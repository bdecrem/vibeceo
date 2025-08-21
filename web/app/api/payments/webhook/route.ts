import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

function getSupabaseClient() {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
  
  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Missing Supabase environment variables');
  }
  
  return createClient(supabaseUrl, supabaseKey);
}

// Verify LemonSqueezy webhook signature
function verifyWebhookSignature(payload: string, signature: string): boolean {
  const secret = process.env.LEMONSQUEEZY_WEBHOOK_SECRET;
  if (!secret) {
    console.error('Missing LemonSqueezy webhook secret');
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

// Normalize phone number to E.164 format
function normalizePhoneNumber(phone: string): string {
  let cleaned = phone.replace(/\D/g, '');
  if (cleaned.length === 10) {
    cleaned = '1' + cleaned;
  }
  return '+' + cleaned;
}

export async function POST(req: NextRequest) {
  try {
    console.log('[Webhook] POST request received');
    const payload = await req.text();
    const signature = req.headers.get('x-signature');
    
    console.log(`[Webhook] Payload length: ${payload.length}`);
    console.log(`[Webhook] Signature present: ${!!signature}`);
    
    if (!signature) {
      console.error('[Webhook] Missing signature header');
      return NextResponse.json(
        { error: 'Missing signature' },
        { status: 400 }
      );
    }
    
    // Verify webhook signature
    if (!verifyWebhookSignature(payload, signature)) {
      console.error('[Webhook] Invalid webhook signature');
      console.error(`[Webhook] Expected signature format, got: ${signature.substring(0, 20)}...`);
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 403 }
      );
    }
    
    console.log('[Webhook] Signature verified successfully');
    
    const webhookData = JSON.parse(payload);
    const eventType = webhookData.meta?.event_name;
    
    console.log(`[Payments] Webhook received: ${eventType}`);
    console.log(`[Payments] Full webhook data:`, JSON.stringify(webhookData, null, 2));
    
    // Handle different webhook events
    switch (eventType) {
      case 'order_created':
        await handleOrderCreated(webhookData);
        break;
        
      case 'order_refunded':
        await handleOrderRefunded(webhookData);
        break;
        
      default:
        console.log(`[Payments] Unhandled webhook event: ${eventType}`);
    }
    
    return NextResponse.json({ success: true });
    
  } catch (error: any) {
    console.error('Webhook error:', error);
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    );
  }
}

async function handleOrderCreated(webhookData: any) {
  const supabase = getSupabaseClient();
  
  try {
    const order = webhookData.data;
    const orderAttributes = order.attributes;
    
    // LemonSqueezy sends custom data in the meta field
    const customData = webhookData.meta?.custom_data || {};
    console.log('[Webhook] Custom data:', JSON.stringify(customData));
    
    // Extract phone number and subscriber ID from custom data
    let phoneNumber = customData.phone_number;
    let subscriberId = customData.subscriber_id;
    
    if (!phoneNumber || !subscriberId) {
      console.error('❌ CRITICAL: Missing phone number or subscriber ID in webhook data');
      console.error('Custom data found:', JSON.stringify(customData));
      console.error('Could not identify user for credit update');
      return;
    }
    
    const normalizedPhone = normalizePhoneNumber(phoneNumber);
    
    // Determine credit amount based on order total
    const totalCents = orderAttributes.total;
    const creditsToAdd = Math.floor((totalCents / 100) * 2.5); // $10 = 25 credits ($1 = 2.5 credits)
    
    // Skip transaction logging - LemonSqueezy keeps all records
    console.log(`[Payments] Processing $${totalCents/100} payment for ${normalizedPhone} (${creditsToAdd} credits)`);
    
    // If order is paid, add credits to subscriber
    if (orderAttributes.status === 'paid') {
      console.log(`[Payments] ✅ Order is paid, processing credit update for subscriber ${subscriberId}`);
      
      const { data: subscriber, error: fetchError } = await supabase
        .from('sms_subscribers')
        .select('credits_remaining, phone_number, email')
        .eq('id', subscriberId)
        .single();
        
      if (fetchError || !subscriber) {
        console.error('❌ CRITICAL: Failed to fetch subscriber for credit update:', fetchError);
        console.error('Subscriber ID:', subscriberId);
        return;
      }
      
      console.log(`[Payments] 📊 Current subscriber data:`, {
        id: subscriberId,
        phone: subscriber.phone_number,
        email: subscriber.email,
        currentCredits: subscriber.credits_remaining
      });
      
      const newCredits = (subscriber.credits_remaining || 0) + creditsToAdd;
      
      console.log(`[Payments] 💳 About to update: ${subscriber.credits_remaining || 0} + ${creditsToAdd} = ${newCredits} credits`);
      
      const { data: updateResult, error: updateError } = await supabase
        .from('sms_subscribers')
        .update({
          credits_remaining: newCredits
        })
        .eq('id', subscriberId)
        .select('credits_remaining');
      
      if (updateError) {
        console.error('❌ CRITICAL: Failed to update subscriber credits:', updateError);
        console.error('Subscriber ID:', subscriberId);
        console.error('Attempted update:', { credits_remaining: newCredits });
        return;
      }
      
      console.log(`[Payments] ✅ SUCCESS: Database updated! New credits: ${updateResult?.[0]?.credits_remaining}`);
      console.log(`[Payments] Added ${creditsToAdd} credits to ${normalizedPhone} (total: ${newCredits})`);
      
      // Send SMS confirmation
      await sendPaymentConfirmationSMS(normalizedPhone, creditsToAdd, newCredits);
    } else {
      console.log(`[Payments] ⚠️ Order status is '${orderAttributes.status}', not 'paid'. Skipping credit update.`);
    }
    
  } catch (error) {
    console.error('Error handling order_created webhook:', error);
  }
}

async function handleOrderRefunded(webhookData: any) {
  // For refunds, we'll handle manually through LemonSqueezy dashboard
  // Could deduct credits here if needed, but keeping it simple for MVP
  console.log('[Payments] Refund webhook received - handle manually if needed');
}

async function sendPaymentConfirmationSMS(phoneNumber: string, creditsAdded: number, totalCredits: number) {
  try {
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const fromNumber = process.env.TWILIO_PHONE_NUMBER;
    
    if (!accountSid || !authToken || !fromNumber) {
      console.error('Missing Twilio credentials for confirmation SMS');
      return;
    }
    
    const twilio = (await import('twilio')).default;
    const client = twilio(accountSid, authToken);
    
    const message = `🎉 Payment successful! ${creditsAdded} credits added to your WEBTOYS account.\\n\\nTotal credits: ${totalCredits}\\n\\nStart creating apps by texting your ideas to this number!`;
    
    await client.messages.create({
      body: message,
      from: fromNumber,
      to: phoneNumber
    });
    
    console.log(`[Payments] Sent confirmation SMS to ${phoneNumber}`);
    
  } catch (error) {
    console.error('Failed to send confirmation SMS:', error);
  }
}
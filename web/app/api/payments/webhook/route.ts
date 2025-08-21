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
    const payload = await req.text();
    const signature = req.headers.get('x-signature');
    
    if (!signature) {
      return NextResponse.json(
        { error: 'Missing signature' },
        { status: 400 }
      );
    }
    
    // Verify webhook signature
    if (!verifyWebhookSignature(payload, signature)) {
      console.error('Invalid webhook signature');
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 403 }
      );
    }
    
    const webhookData = JSON.parse(payload);
    const eventType = webhookData.meta?.event_name;
    
    console.log(`[Payments] Webhook received: ${eventType}`);
    
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
    const customData = orderAttributes.first_order_item?.variant_name?.includes('custom') 
      ? JSON.parse(orderAttributes.user_custom_data || '{}')
      : { phone_number: '', subscriber_id: '', purpose: '' };
    
    // Extract phone number and subscriber ID from custom data
    const phoneNumber = customData.phone_number;
    const subscriberId = customData.subscriber_id;
    
    if (!phoneNumber || !subscriberId) {
      console.error('Missing phone number or subscriber ID in webhook data');
      return;
    }
    
    const normalizedPhone = normalizePhoneNumber(phoneNumber);
    
    // Determine credit amount based on order total
    const totalCents = orderAttributes.total;
    const creditsToAdd = Math.floor(totalCents / 100); // $1 = 1 credit for now, can be adjusted
    
    // Skip transaction logging - LemonSqueezy keeps all records
    console.log(`[Payments] Processing $${totalCents/100} payment for ${normalizedPhone} (${creditsToAdd} credits)`);
    
    // If order is paid, add credits to subscriber
    if (orderAttributes.status === 'paid') {
      const { data: subscriber, error: fetchError } = await supabase
        .from('sms_subscribers')
        .select('credits_remaining')
        .eq('id', subscriberId)
        .single();
        
      if (fetchError || !subscriber) {
        console.error('Failed to fetch subscriber for credit update:', fetchError);
        return;
      }
      
      const newCredits = (subscriber.credits_remaining || 0) + creditsToAdd;
      
      const { error: updateError } = await supabase
        .from('sms_subscribers')
        .update({
          credits_remaining: newCredits,
          payment_customer_id: orderAttributes.customer_id?.toString(),
        })
        .eq('id', subscriberId);
      
      if (updateError) {
        console.error('Failed to update subscriber credits:', updateError);
        return;
      }
      
      console.log(`[Payments] Added ${creditsToAdd} credits to ${normalizedPhone} (total: ${newCredits})`);
      
      // Send SMS confirmation
      await sendPaymentConfirmationSMS(normalizedPhone, creditsToAdd, newCredits);
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
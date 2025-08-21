# SMS-Centric Payment Flow Setup Guide

## Overview

This implementation adds a simple SMS-based payment flow to WEBTOYS that allows users to purchase $10 credit bundles to create apps via SMS. The flow uses phone number verification and LemonSqueezy for payment processing.

## Architecture

### Frontend Flow
1. **Welcome Page** (`/payments`) - Phone number input
2. **Verification** (`/payments/verify`) - SMS code verification
3. **Checkout** (`/payments/checkout`) - LemonSqueezy payment
4. **Success** (`/payments/success`) - Confirmation and instructions

### Backend Components
- **API Endpoints** - SMS verification and payment processing
- **Credit System** - Usage tracking in SMS bot
- **Webhook Handler** - LemonSqueezy payment completion
- **Database Schema** - Credit and transaction tracking

## Setup Instructions

### 1. Database Migration

Run the simple database migration to add credit tracking:

```sql
-- Run this in your Supabase SQL editor
\i sms-bot/migrations/add-simple-credits.sql
```

This adds just 3 fields to `sms_subscribers`:
- `credits_remaining` - How many credits user has left
- `usage_count` - Total apps created by user  
- `last_usage_date` - When user last created an app

**No separate transaction table** - LemonSqueezy keeps all payment records!

### 2. Environment Variables

Add these variables to your `web/.env.local`:

```bash
# LemonSqueezy Configuration
LEMONSQUEEZY_API_KEY=your_api_key_here
LEMONSQUEEZY_STORE_ID=your_store_id_here
LEMONSQUEEZY_VARIANT_ID=your_variant_id_here
LEMONSQUEEZY_WEBHOOK_SECRET=your_webhook_secret_here

# NextAuth Secret (for session tokens)
NEXTAUTH_SECRET=your_random_secret_here
```

### 3. LemonSqueezy Setup

1. **Create a Product** in your LemonSqueezy dashboard
   - Name: "WEBTOYS Credits"
   - Price: $10.00
   - Type: One-time purchase

2. **Get the Variant ID** from the product page

3. **Create a Webhook** pointing to:
   - URL: `https://your-domain.com/api/payments/webhook`
   - Events: `order_created`, `order_refunded`
   - Copy the webhook secret

4. **Get API Key** from Settings > API

### 4. Testing the Flow

1. Visit `https://your-domain.com/payments`
2. Enter a phone number (your test number)
3. Enter the SMS verification code
4. Complete payment with LemonSqueezy test mode
5. Verify credits were added to your account

### 5. SMS Bot Integration

The SMS bot automatically:
- Checks credits before creating apps
- Deducts 1 credit per app creation
- Sends helpful messages when credits are low
- Allows unlimited access for ADMIN/OPERATOR roles

## How It Works

### Credit Checking
Before creating any app (regular, meme, game, ZAD), the SMS bot:
1. Checks if user has credits available
2. Shows appropriate error message if insufficient
3. Deducts 1 credit after successful creation
4. Logs usage for tracking

### Payment Processing
1. **Phone Verification** - Uses existing Twilio SMS infrastructure
2. **Session Management** - Secure tokens prevent payment hijacking
3. **LemonSqueezy Integration** - Handles all payment processing
4. **Webhook Processing** - Automatically credits accounts on payment
5. **SMS Confirmation** - Notifies users when credits are added

### Security Features
- Phone number verification via SMS
- Rate limiting on verification attempts
- Secure session tokens with HMAC validation
- LemonSqueezy webhook signature verification
- No stored payment details (handled by LemonSqueezy)

## User Experience

### For New Users
1. Try to create app via SMS → Get payment link
2. Visit payment page, enter phone, verify via SMS
3. Pay $10 → Credits automatically added
4. Continue creating apps via SMS

### For Existing Users
- Credits automatically checked before each app creation
- Clear messages when credits run low
- Easy repurchase flow at same payment URL

## Admin Features

- **ADMIN/OPERATOR roles** get unlimited app creation
- **Payment tracking** in `payment_transactions` table
- **Usage analytics** via `usage_count` and `last_usage_date`
- **Credit management** can be done directly in Supabase

## Troubleshooting

### Common Issues

1. **SMS not sending** - Check Twilio credentials in `web/.env.local`
2. **Payment webhook not working** - Verify webhook URL and secret
3. **Credits not added** - Check LemonSqueezy webhook logs
4. **Rate limiting** - 3 SMS verifications per hour per phone

### Database Queries

```sql
-- Check user credits
SELECT phone_number, credits_remaining, usage_count 
FROM sms_subscribers 
WHERE phone_number = '+1234567890';

-- View payment transactions
SELECT * FROM payment_transactions 
ORDER BY created_at DESC 
LIMIT 10;

-- Add credits manually (admin)
UPDATE sms_subscribers 
SET credits_remaining = credits_remaining + 10 
WHERE phone_number = '+1234567890';
```

## Files Created/Modified

### New Files
- `web/app/payments/` - Payment flow pages
- `web/app/api/payments/` - API endpoints
- `sms-bot/lib/credit-manager.ts` - Credit checking logic
- `sms-bot/migrations/add-payment-credits-schema.sql` - Database schema

### Modified Files
- `sms-bot/engine/controller.ts` - Added credit checking to app creation
- `web/.env.example` - Added LemonSqueezy configuration

## Next Steps

1. **Run the database migration**
2. **Configure LemonSqueezy** product and webhook
3. **Set environment variables**
4. **Test the complete flow**
5. **Deploy to production**

The payment flow is now ready for use! Users can purchase credits and start creating apps via SMS immediately.
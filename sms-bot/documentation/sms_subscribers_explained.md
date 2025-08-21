# SMS Subscribers Table Documentation

This document explains the `sms_subscribers` table structure and field usage. This is a living document that will be updated as we add features.

## Table Overview

The `sms_subscribers` table stores all users who interact with the WEBTOYS SMS system, including their verification status, credits, and subscription information.

## All Fields (Current Schema)

### Core Identity
- `id` - UUID primary key, auto-generated
- `phone_number` - TEXT, unique, required - User's phone number
- `supabase_id` - UUID, unique, nullable - Link to Supabase auth user
- `slug` - TEXT, unique, nullable - User's URL slug for their creations page

### Timestamps
- `created_at` - TIMESTAMP WITH TIME ZONE, default now()
- `updated_at` - TIMESTAMP WITH TIME ZONE, default now()
- `opt_in_date` - TIMESTAMP WITH TIME ZONE, default now()
- `last_message_date` - TIMESTAMP WITH TIME ZONE, nullable
- `last_inspiration_date` - TIMESTAMP WITH TIME ZONE, nullable
- `last_usage_date` - TIMESTAMP WITHOUT TIME ZONE, nullable

### Consent & Status
- `consent_given` - BOOLEAN, default false
- `confirmed` - BOOLEAN, default false
- `unsubscribed` - BOOLEAN, default false

### Permissions & Roles
- `is_admin` - BOOLEAN, default false
- `role` - TEXT, default 'coder', check constraint for: 'user', 'coder', 'admin', 'operator', 'degen'

### Email Integration
- `email` - TEXT, nullable
- `email_confirmed` - BOOLEAN, nullable
- `email_ok_default` - BOOLEAN, nullable
- `email_from_page` - TEXT, nullable

### Social Features
- `follower_count` - INTEGER, default 0
- `following_count` - INTEGER, default 0
- `total_remix_credits` - INTEGER, default 0
- `apps_created_count` - INTEGER, default 0
- `hide_default` - BOOLEAN, nullable

### Verification System
- `verification_code` - VARCHAR(6), nullable
- `verification_expires` - TIMESTAMP WITH TIME ZONE, nullable
- `pending_phone_number` - VARCHAR(20), nullable

### Upload Authentication: Codes that enable uploading images to the user's /uploads directory on webtoys.ai
- `upload_auth_code` - TEXT, nullable
- `upload_auth_expires` - TIMESTAMP WITH TIME ZONE, nullable

### Credits & Usage Tracking
- `credits_remaining` - INTEGER, default 0
- `usage_count` - INTEGER, default 0

### Legacy/Unused
- `index_file` - TEXT, nullable

---

## Detailed Field Explanations

*This section covers fields discussed during development. We'll expand this over time.*

### Credits & Payment System

#### `credits_remaining` (INTEGER, default 0)
- **Purpose**: Track user's available credits for premium features
- **Usage**: Decremented when user uses paid features, incremented when they purchase credit packs
- **Payment Flow**: After successful LemonSqueezy payment, credits are added here
- **Example**: User buys $10 credit pack → `credits_remaining += 10`

#### `usage_count` (INTEGER, default 0)
- **Purpose**: Total lifetime usage counter for analytics
- **Usage**: Incremented each time user consumes a credit
- **Relationship**: This tracks total usage; `credits_remaining` tracks current balance
- **Example**: User creates app → `usage_count += 1` and `credits_remaining -= 1`

### Verification System

#### `verification_code` (VARCHAR(6), nullable)
- **Purpose**: Store 6-digit SMS verification codes
- **Usage**: Generated when user needs to verify phone number (signup, payment, etc.)
- **Security**: Should be cleared after successful verification
- **Format**: 6 random digits, e.g., "123456"

#### `verification_expires` (TIMESTAMP WITH TIME ZONE, nullable)
- **Purpose**: Expiration time for verification codes
- **Usage**: Codes expire after 10 minutes for security
- **Validation**: Code is rejected if current time > expiration time
- **Cleanup**: Should be cleared after successful verification

#### `payment_verification_active` (BOOLEAN, default NULL) - **NEEDS TO BE ADDED**
- **Purpose**: Flag to distinguish payment verification from regular SMS verification
- **Usage**: Set to `true` when verification code is for payment flow, `NULL` for regular verification
- **Security**: Prevents payment codes from being used for SMS bot signup and vice versa
- **Migration Needed**: `ALTER TABLE sms_subscribers ADD COLUMN payment_verification_active BOOLEAN DEFAULT NULL;`

---

## Indexes

- `idx_sms_subscribers_phone` - Fast phone number lookups
- `idx_sms_subscribers_credits_remaining` - Fast credit balance queries  
- `idx_subscribers_upload_auth` - Fast upload auth code lookups

## Triggers

- `PROD-new-subscriber` - Webhook to production SMS bot on new subscriber
- `DEV-new-subscriber-notification` - Webhook to development SMS bot on new subscriber

---

## Payment Flow Integration

### Simple $10 Credit Pack Flow

1. **User enters phone** → Lookup by `phone_number`
2. **Send verification SMS** → Store in `verification_code`, `verification_expires`, set `payment_verification_active = true`
3. **User enters code** → Verify against `verification_code` where `payment_verification_active = true`
4. **LemonSqueezy payment** → Handle payment externally
5. **Add credits** → `UPDATE sms_subscribers SET credits_remaining = credits_remaining + 10`
6. **Clear verification** → Set `verification_code = NULL`, `payment_verification_active = NULL`
7. **Usage tracking** → When user uses features: `credits_remaining -= 1`, `usage_count += 1`

This simple flow requires only adding the `payment_verification_active` field to the existing schema.

---

*Last Updated: August 21, 2025*
*Next: Add field explanations as we implement new features*
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import twilio from 'twilio';

// Note: These imports won't work directly from web/app since they're in sms-bot
// We'll need to copy the functions or create a shared package
// For now, let's implement the core logic here

function getSupabaseClient() {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Missing Supabase environment variables');
  }

  return createClient(supabaseUrl, supabaseKey);
}

function getTwilioClient() {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;

  if (!accountSid || !authToken) {
    throw new Error('Missing Twilio environment variables');
  }

  return twilio(accountSid, authToken);
}

/**
 * Send SMS notification
 */
async function sendSMS(to: string, message: string): Promise<void> {
  try {
    const client = getTwilioClient();
    const fromNumber = process.env.TWILIO_PHONE_NUMBER;

    if (!fromNumber) {
      throw new Error('TWILIO_PHONE_NUMBER not configured');
    }

    await client.messages.create({
      body: message,
      to: to,
      from: fromNumber,
    });
  } catch (error) {
    console.error('Failed to send SMS:', error);
    // Don't throw - SMS failure shouldn't block the OAuth flow
  }
}

/**
 * OAuth callback handler
 * URL: /api/oauth/gmail/callback?code=xxx&state=xxx
 */
export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const error = searchParams.get('error');

    // Check for OAuth errors
    if (error) {
      console.error('OAuth error:', error);
      return NextResponse.redirect(
        new URL(`/gmail/error?message=${encodeURIComponent('Authorization failed')}`, req.url)
      );
    }

    // Validate parameters
    if (!code || !state) {
      return NextResponse.redirect(
        new URL(`/gmail/error?message=${encodeURIComponent('Missing authorization code')}`, req.url)
      );
    }

    // Verify state parameter contains subscriber_id
    // State format: "subscriber_id:{uuid}"
    const stateMatch = state.match(/^subscriber_id:(.+)$/);
    if (!stateMatch) {
      return NextResponse.redirect(
        new URL(`/gmail/error?message=${encodeURIComponent('Invalid state parameter')}`, req.url)
      );
    }

    const subscriberId = stateMatch[1];

    // Get subscriber details
    const supabase = getSupabaseClient();
    const { data: subscriber, error: subError } = await supabase
      .from('sms_subscribers')
      .select('phone_number, slug')
      .eq('id', subscriberId)
      .single();

    if (subError || !subscriber) {
      return NextResponse.redirect(
        new URL(`/gmail/error?message=${encodeURIComponent('Subscriber not found')}`, req.url)
      );
    }

    // Exchange code for tokens
    const tokenResponse = await exchangeCodeForTokens(code);

    // Store encrypted tokens
    await storeOAuthTokens(subscriberId, tokenResponse);

    // Get user's Gmail address
    const gmailEmail = await getGmailEmail(tokenResponse.access_token);

    // Send confirmation SMS
    if (subscriber.phone_number) {
      await sendSMS(
        subscriber.phone_number,
        `✓ Gmail connected! ${gmailEmail || 'Your email'} is now linked to your account. Try: GMAIL SEARCH [query]`
      );
    }

    // Redirect to success page
    return NextResponse.redirect(
      new URL(`/gmail/success?email=${encodeURIComponent(gmailEmail || 'your Gmail account')}`, req.url)
    );

  } catch (error: any) {
    console.error('OAuth callback error:', error);
    return NextResponse.redirect(
      new URL(`/gmail/error?message=${encodeURIComponent(error.message || 'Authorization failed')}`, req.url)
    );
  }
}

/**
 * Exchange authorization code for tokens
 */
async function exchangeCodeForTokens(code: string): Promise<{
  access_token: string;
  refresh_token: string;
  expires_at: Date;
  scopes: string[];
}> {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri = process.env.GOOGLE_REDIRECT_URI || `${process.env.NEXT_PUBLIC_BASE_URL}/api/oauth/gmail/callback`;

  if (!clientId || !clientSecret) {
    throw new Error('Google OAuth credentials not configured');
  }

  const tokenUrl = 'https://oauth2.googleapis.com/token';

  const response = await fetch(tokenUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code',
    }),
  });

  if (!response.ok) {
    const errorData = await response.text();
    throw new Error(`Token exchange failed: ${errorData}`);
  }

  const data = await response.json();

  if (!data.access_token || !data.refresh_token) {
    throw new Error('Incomplete token response from Google');
  }

  return {
    access_token: data.access_token,
    refresh_token: data.refresh_token,
    expires_at: new Date(Date.now() + data.expires_in * 1000),
    scopes: data.scope?.split(' ') || [],
  };
}

/**
 * Get user's Gmail email address
 */
async function getGmailEmail(accessToken: string): Promise<string> {
  try {
    const response = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/profile', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      return '';
    }

    const data = await response.json();
    return data.emailAddress || '';
  } catch (error) {
    console.error('Failed to get Gmail email:', error);
    return '';
  }
}

/**
 * Store OAuth tokens (with encryption)
 */
async function storeOAuthTokens(
  subscriberId: string,
  tokens: {
    access_token: string;
    refresh_token: string;
    expires_at: Date;
    scopes: string[];
  }
): Promise<void> {
  // Import encryption functions
  // For now, we'll use a simple encryption approach
  // In production, use the encryption.ts module from sms-bot
  const encryptedAccessToken = encryptToken(tokens.access_token);
  const encryptedRefreshToken = encryptToken(tokens.refresh_token);

  const supabase = getSupabaseClient();

  const { error } = await supabase
    .from('user_oauth_tokens')
    .upsert({
      subscriber_id: subscriberId,
      provider: 'gmail',
      encrypted_access_token: encryptedAccessToken,
      encrypted_refresh_token: encryptedRefreshToken,
      token_expires_at: tokens.expires_at.toISOString(),
      scopes: tokens.scopes,
      updated_at: new Date().toISOString(),
    }, {
      onConflict: 'subscriber_id,provider'
    });

  if (error) {
    throw new Error(`Failed to store OAuth tokens: ${error.message}`);
  }
}

/**
 * Token encryption - matches format from sms-bot/lib/encryption.ts
 * Uses AES-256-GCM with format: salt:iv:authTag:encryptedData
 */
function encryptToken(token: string): string {
  const crypto = require('crypto');
  const algorithm = 'aes-256-gcm';
  const key = getEncryptionKey();

  // Generate random IV and salt (must match sms-bot/lib/encryption.ts)
  const iv = crypto.randomBytes(16);  // 128 bits
  const salt = crypto.randomBytes(32); // 256 bits

  const cipher = crypto.createCipheriv(algorithm, key, iv);
  const encrypted = Buffer.concat([
    cipher.update(token, 'utf8'),
    cipher.final(),
  ]);

  const authTag = cipher.getAuthTag();

  // Combine: salt:iv:authTag:encrypted (MUST match sms-bot format!)
  const combined = Buffer.concat([salt, iv, authTag, encrypted]);
  return combined.toString('base64');
}

/**
 * Get encryption key from environment
 */
function getEncryptionKey(): Buffer {
  const key = process.env.OAUTH_ENCRYPTION_KEY;

  if (!key) {
    throw new Error('OAUTH_ENCRYPTION_KEY environment variable is not set');
  }

  if (key.length !== 64) {
    throw new Error('OAUTH_ENCRYPTION_KEY must be 64 hex characters');
  }

  return Buffer.from(key, 'hex');
}

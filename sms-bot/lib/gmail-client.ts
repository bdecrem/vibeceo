/**
 * Gmail API Client
 * Handles Gmail API interactions with automatic token refresh
 */

import { google } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';
import { supabase } from './supabase.js';
import { encrypt, decrypt } from './encryption.js';

const gmail = google.gmail('v1');

/**
 * OAuth token data structure
 */
interface OAuthTokens {
  access_token: string;
  refresh_token: string;
  expires_at: Date;
  scopes: string[];
}

/**
 * Gmail search result structure
 */
export interface GmailSearchResult {
  id: string;
  threadId: string;
  snippet: string;
  subject: string;
  from: string;
  to: string;
  date: Date;
  labels: string[];
}

/**
 * Get OAuth2 client configured with credentials
 */
function getOAuth2Client(): OAuth2Client {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri = process.env.GOOGLE_REDIRECT_URI || 'https://webtoys.ai/api/oauth/gmail/callback';

  if (!clientId || !clientSecret) {
    throw new Error('Google OAuth credentials not configured');
  }

  return new google.auth.OAuth2(clientId, clientSecret, redirectUri);
}

/**
 * Generate OAuth authorization URL
 */
export function generateAuthUrl(state: string): string {
  const oauth2Client = getOAuth2Client();

  const scopes = [
    'https://www.googleapis.com/auth/gmail.readonly',
    'https://www.googleapis.com/auth/userinfo.email',
  ];

  return oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: scopes,
    state: state,
    prompt: 'consent', // Force consent to get refresh token
  });
}

/**
 * Exchange authorization code for tokens
 */
export async function exchangeCodeForTokens(code: string): Promise<OAuthTokens> {
  const oauth2Client = getOAuth2Client();

  const { tokens } = await oauth2Client.getToken(code);

  if (!tokens.access_token || !tokens.refresh_token || !tokens.expiry_date) {
    throw new Error('Incomplete token response from Google');
  }

  return {
    access_token: tokens.access_token,
    refresh_token: tokens.refresh_token,
    expires_at: new Date(tokens.expiry_date),
    scopes: tokens.scope?.split(' ') || [],
  };
}

/**
 * Store OAuth tokens for a user
 */
export async function storeOAuthTokens(
  subscriberId: string,
  tokens: OAuthTokens
): Promise<void> {
  const encryptedAccessToken = encrypt(tokens.access_token);
  const encryptedRefreshToken = encrypt(tokens.refresh_token);

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
    });

  if (error) {
    throw new Error(`Failed to store OAuth tokens: ${error.message}`);
  }

  console.log(`Stored Gmail OAuth tokens for subscriber ${subscriberId}`);
}

/**
 * Get OAuth tokens for a user
 */
async function getOAuthTokens(subscriberId: string): Promise<OAuthTokens | null> {
  const { data, error } = await supabase
    .from('user_oauth_tokens')
    .select('*')
    .eq('subscriber_id', subscriberId)
    .eq('provider', 'gmail')
    .single();

  if (error || !data) {
    return null;
  }

  try {
    const accessToken = decrypt(data.encrypted_access_token);
    const refreshToken = decrypt(data.encrypted_refresh_token);

    return {
      access_token: accessToken,
      refresh_token: refreshToken,
      expires_at: new Date(data.token_expires_at),
      scopes: data.scopes || [],
    };
  } catch (error) {
    console.log(`Failed to decrypt tokens for subscriber ${subscriberId}: ${error}`);
    return null;
  }
}

/**
 * Refresh access token if expired
 */
async function refreshAccessToken(subscriberId: string, tokens: OAuthTokens): Promise<OAuthTokens> {
  const oauth2Client = getOAuth2Client();
  oauth2Client.setCredentials({
    refresh_token: tokens.refresh_token,
  });

  const { credentials } = await oauth2Client.refreshAccessToken();

  if (!credentials.access_token || !credentials.expiry_date) {
    throw new Error('Failed to refresh access token');
  }

  const newTokens: OAuthTokens = {
    access_token: credentials.access_token,
    refresh_token: tokens.refresh_token, // Refresh token stays the same
    expires_at: new Date(credentials.expiry_date),
    scopes: tokens.scopes,
  };

  // Store the new access token
  await storeOAuthTokens(subscriberId, newTokens);

  console.log(`Refreshed access token for subscriber ${subscriberId}`);

  return newTokens;
}

/**
 * Get valid OAuth client for a user (refreshes token if needed)
 */
async function getAuthenticatedClient(subscriberId: string): Promise<OAuth2Client> {
  let tokens = await getOAuthTokens(subscriberId);

  if (!tokens) {
    throw new Error('No Gmail connection found. Use GMAIL CONNECT to authorize.');
  }

  // Check if token is expired or expiring soon (within 5 minutes)
  const now = new Date();
  const expiresIn = tokens.expires_at.getTime() - now.getTime();
  const fiveMinutes = 5 * 60 * 1000;

  if (expiresIn < fiveMinutes) {
    console.log(`Token expiring soon for subscriber ${subscriberId}, refreshing...`);
    tokens = await refreshAccessToken(subscriberId, tokens);
  }

  const oauth2Client = getOAuth2Client();
  oauth2Client.setCredentials({
    access_token: tokens.access_token,
    refresh_token: tokens.refresh_token,
  });

  // Update last_used_at
  await supabase
    .from('user_oauth_tokens')
    .update({ last_used_at: new Date().toISOString() })
    .eq('subscriber_id', subscriberId)
    .eq('provider', 'gmail');

  return oauth2Client;
}

/**
 * Search Gmail for messages matching a query
 * Uses Gmail search syntax: https://support.google.com/mail/answer/7190?hl=en
 */
export async function searchGmail(
  subscriberId: string,
  query: string,
  maxResults: number = 10
): Promise<GmailSearchResult[]> {
  try {
    const auth = await getAuthenticatedClient(subscriberId);

    // Search for messages
    const searchResponse = await gmail.users.messages.list({
      auth,
      userId: 'me',
      q: query,
      maxResults,
    });

    if (!searchResponse.data.messages || searchResponse.data.messages.length === 0) {
      return [];
    }

    // Fetch full message details for each result
    const messages = await Promise.all(
      searchResponse.data.messages.map(async (msg) => {
        const messageResponse = await gmail.users.messages.get({
          auth,
          userId: 'me',
          id: msg.id!,
          format: 'metadata',
          metadataHeaders: ['Subject', 'From', 'To', 'Date'],
        });

        const message = messageResponse.data;
        const headers = message.payload?.headers || [];

        const getHeader = (name: string): string => {
          const header = headers.find((h) => h.name?.toLowerCase() === name.toLowerCase());
          return header?.value || '';
        };

        return {
          id: message.id!,
          threadId: message.threadId!,
          snippet: message.snippet || '',
          subject: getHeader('Subject'),
          from: getHeader('From'),
          to: getHeader('To'),
          date: new Date(getHeader('Date') || Date.now()),
          labels: message.labelIds || [],
        };
      })
    );

    return messages;
  } catch (error: any) {
    if (error.code === 401) {
      throw new Error('Gmail authorization expired. Please reconnect with GMAIL CONNECT');
    }
    throw new Error(`Gmail search failed: ${error.message}`);
  }
}

/**
 * Get Gmail message content by ID
 */
export async function getMessageContent(
  subscriberId: string,
  messageId: string
): Promise<string> {
  try {
    const auth = await getAuthenticatedClient(subscriberId);

    const response = await gmail.users.messages.get({
      auth,
      userId: 'me',
      id: messageId,
      format: 'full',
    });

    const message = response.data;

    // Extract text from message body
    const getTextContent = (part: any): string => {
      if (part.mimeType === 'text/plain' && part.body?.data) {
        return Buffer.from(part.body.data, 'base64').toString('utf-8');
      }

      if (part.parts) {
        return part.parts.map(getTextContent).filter(Boolean).join('\n');
      }

      return '';
    };

    const content = getTextContent(message.payload);
    return content || message.snippet || '';
  } catch (error: any) {
    throw new Error(`Failed to get message content: ${error.message}`);
  }
}

/**
 * Check if user has Gmail connected
 */
export async function hasGmailConnected(subscriberId: string): Promise<boolean> {
  const tokens = await getOAuthTokens(subscriberId);
  return tokens !== null;
}

/**
 * Disconnect Gmail (revoke tokens)
 */
export async function disconnectGmail(subscriberId: string): Promise<void> {
  try {
    const tokens = await getOAuthTokens(subscriberId);

    if (tokens) {
      // Revoke the token with Google
      const oauth2Client = getOAuth2Client();
      oauth2Client.setCredentials({
        access_token: tokens.access_token,
      });

      try {
        await oauth2Client.revokeCredentials();
      } catch (error) {
        // Continue even if revocation fails (token might be already invalid)
        console.log(`Token revocation failed for subscriber ${subscriberId}: ${error}`);
      }
    }

    // Delete from database
    const { error } = await supabase
      .from('user_oauth_tokens')
      .delete()
      .eq('subscriber_id', subscriberId)
      .eq('provider', 'gmail');

    if (error) {
      throw new Error(`Failed to delete tokens: ${error.message}`);
    }

    console.log(`Disconnected Gmail for subscriber ${subscriberId}`);
  } catch (error: any) {
    throw new Error(`Failed to disconnect Gmail: ${error.message}`);
  }
}

/**
 * Get Gmail connection status for a user
 */
export async function getGmailStatus(subscriberId: string): Promise<{
  connected: boolean;
  email?: string;
  scopes?: string[];
  lastUsed?: Date;
}> {
  const tokens = await getOAuthTokens(subscriberId);

  if (!tokens) {
    return { connected: false };
  }

  // Get user's email from Google
  try {
    const auth = await getAuthenticatedClient(subscriberId);
    const response = await gmail.users.getProfile({
      auth,
      userId: 'me',
    });

    const { data } = await supabase
      .from('user_oauth_tokens')
      .select('last_used_at')
      .eq('subscriber_id', subscriberId)
      .eq('provider', 'gmail')
      .single();

    return {
      connected: true,
      email: response.data.emailAddress,
      scopes: tokens.scopes,
      lastUsed: data?.last_used_at ? new Date(data.last_used_at) : undefined,
    };
  } catch (error) {
    return {
      connected: true,
      scopes: tokens.scopes,
    };
  }
}

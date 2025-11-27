/**
 * Gmail source fetcher
 * Fetches emails from Gmail API
 */

import type { NormalizedItem } from '@vibeceo/shared-types';

export interface GmailConfig {
  query?: string; // Gmail search query (e.g., 'is:unread', 'from:example@gmail.com')
  maxItems?: number;
  labelIds?: string[]; // Label IDs to filter by (e.g., ['INBOX', 'UNREAD'])
}

interface GmailMessage {
  id: string;
  threadId: string;
  labelIds: string[];
  snippet: string;
  payload: {
    headers: Array<{
      name: string;
      value: string;
    }>;
    body?: {
      data?: string;
    };
    parts?: Array<{
      mimeType: string;
      body?: {
        data?: string;
      };
    }>;
  };
  internalDate: string;
}

export async function fetchGmail(config: GmailConfig): Promise<NormalizedItem[]> {
  const {
    query = 'is:unread',
    maxItems = 10,
    labelIds = ['INBOX'],
  } = config;

  console.log(`📧 Fetching Gmail messages...`);

  try {
    const accessToken = process.env.GMAIL_ACCESS_TOKEN;

    if (!accessToken) {
      console.warn('⚠️ GMAIL_ACCESS_TOKEN not set, using mock data');
      console.log('   To use Gmail API, you need to:');
      console.log('   1. Set up OAuth 2.0 credentials in Google Cloud Console');
      console.log('   2. Obtain an access token');
      console.log('   3. Set GMAIL_ACCESS_TOKEN environment variable');
      return getMockGmailData(maxItems);
    }

    // List messages matching the query
    let listUrl = `https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=${maxItems}`;
    if (query) {
      listUrl += `&q=${encodeURIComponent(query)}`;
    }
    if (labelIds.length > 0) {
      listUrl += `&labelIds=${labelIds.join('&labelIds=')}`;
    }

    const listResponse = await fetch(listUrl, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    });

    if (!listResponse.ok) {
      const errorData = await listResponse.json().catch(() => ({}));
      throw new Error(`Gmail API error: ${errorData.error?.message || listResponse.statusText}`);
    }

    const listData = await listResponse.json();
    const messageIds: Array<{ id: string }> = listData.messages || [];

    if (messageIds.length === 0) {
      console.log('✅ No messages found matching the query');
      return [];
    }

    // Fetch full message details
    const messages: GmailMessage[] = await Promise.all(
      messageIds.map(async ({ id }) => {
        const messageUrl = `https://gmail.googleapis.com/gmail/v1/users/me/messages/${id}?format=full`;
        const messageResponse = await fetch(messageUrl, {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
          },
        });

        if (!messageResponse.ok) {
          console.warn(`⚠️ Failed to fetch message ${id}`);
          return null;
        }

        return messageResponse.json();
      })
    );

    // Filter out failed fetches
    const validMessages = messages.filter((msg): msg is GmailMessage => msg !== null);

    // Normalize to NormalizedItem
    const normalized: NormalizedItem[] = validMessages.map(message => {
      const headers = message.payload.headers;
      const subject = headers.find(h => h.name.toLowerCase() === 'subject')?.value || 'No Subject';
      const from = headers.find(h => h.name.toLowerCase() === 'from')?.value || 'Unknown';
      const date = headers.find(h => h.name.toLowerCase() === 'date')?.value || message.internalDate;

      // Extract email address from "Name <email@example.com>" format
      const emailMatch = from.match(/<(.+?)>/);
      const emailAddress = emailMatch ? emailMatch[1] : from;
      const senderName = from.replace(/<.+?>/, '').trim() || emailAddress;

      // Use snippet for summary (Gmail provides this automatically)
      const summary = message.snippet || 'No preview available';

      return {
        id: `gmail-${message.id}`,
        title: subject,
        summary: `From: ${senderName} | ${summary.substring(0, 150)}${summary.length > 150 ? '...' : ''}`,
        url: `https://mail.google.com/mail/u/0/#inbox/${message.id}`,
        publishedAt: new Date(parseInt(message.internalDate, 10)).toISOString(),
        author: senderName,
        raw: message,
      };
    });

    console.log(`✅ Fetched ${normalized.length} Gmail messages`);
    return normalized;

  } catch (error: any) {
    console.error('❌ Error fetching Gmail:', error.message);
    console.log('   Falling back to mock data...');
    return getMockGmailData(maxItems);
  }
}

function getMockGmailData(maxItems: number): NormalizedItem[] {
  const mockEmails = [
    {
      id: 'gmail-mock-1',
      title: 'Weekly Team Sync - Action Items',
      summary: 'From: Sarah Johnson | Follow-up on this week\'s action items: 1) Complete API documentation 2) Review pull requests 3) Prepare demo for Friday',
      url: 'https://mail.google.com',
      publishedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
      author: 'Sarah Johnson',
    },
    {
      id: 'gmail-mock-2',
      title: 'Your invoice from Acme Corp',
      summary: 'From: billing@acmecorp.com | Your monthly invoice is ready. Amount due: $299.00. Payment due by December 15, 2024.',
      url: 'https://mail.google.com',
      publishedAt: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
      author: 'Acme Corp Billing',
    },
    {
      id: 'gmail-mock-3',
      title: 'Re: Feature Request - Dark Mode',
      summary: 'From: Mike Chen | Thanks for the suggestion! We\'re planning to add dark mode in the next release. I\'ll keep you posted on the progress.',
      url: 'https://mail.google.com',
      publishedAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
      author: 'Mike Chen',
    },
    {
      id: 'gmail-mock-4',
      title: 'Security Alert: New sign-in from Chrome on Mac',
      summary: 'From: security@example.com | We noticed a new sign-in to your account from Chrome on Mac in San Francisco, CA. If this was you, you can disregard this email.',
      url: 'https://mail.google.com',
      publishedAt: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString(),
      author: 'Security Team',
    },
  ];

  return mockEmails.slice(0, maxItems);
}

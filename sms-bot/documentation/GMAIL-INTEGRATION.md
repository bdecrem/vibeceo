# Gmail Integration for Personalization

## Overview

The Gmail integration allows kochi.to users to connect their Gmail accounts, enabling the system to:
1. **Search emails on-demand** via SMS commands
2. **Enrich AI responses** with relevant email context automatically

## Architecture

### Components

1. **Database**: `user_oauth_tokens` table stores encrypted OAuth tokens
2. **Encryption**: AES-256-GCM encryption for token security (`sms-bot/lib/encryption.ts`)
3. **Gmail Client**: API wrapper with automatic token refresh (`sms-bot/lib/gmail-client.ts`)
4. **OAuth Flow**: Web-based authorization callback (`web/app/api/oauth/gmail/callback/route.ts`)
5. **Command Handlers**: SMS commands for Gmail operations (`sms-bot/commands/gmail.ts`)
6. **Personalization**: Automatic email context injection (`sms-bot/lib/personalization-extractor.ts`)

### Security

- **Encrypted Storage**: All OAuth tokens encrypted with AES-256-GCM
- **Automatic Refresh**: Tokens refreshed before expiration
- **Row Level Security**: Supabase RLS prevents cross-user access
- **Minimal Scopes**: Only `gmail.readonly` and `userinfo.email` requested
- **Revocation Support**: Users can disconnect via `GMAIL DISCONNECT`

## Setup

### 1. Google Cloud Console Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a new project or select existing
3. Enable Gmail API:
   - Navigate to "APIs & Services" > "Library"
   - Search for "Gmail API"
   - Click "Enable"

4. Create OAuth 2.0 credentials:
   - Go to "APIs & Services" > "Credentials"
   - Click "Create Credentials" > "OAuth client ID"
   - Application type: "Web application"
   - Name: "Kochi.to Gmail Integration"
   - Authorized redirect URIs:
     - Development: `http://localhost:3000/api/oauth/gmail/callback`
     - Production: `https://webtoys.ai/api/oauth/gmail/callback`
   - Save and note the Client ID and Client Secret

5. Configure OAuth consent screen:
   - Go to "APIs & Services" > "OAuth consent screen"
   - User Type: "External" (for testing) or "Internal" (for G Suite)
   - Fill in app information
   - Add scopes:
     - `https://www.googleapis.com/auth/gmail.readonly`
     - `https://www.googleapis.com/auth/userinfo.email`
   - Add test users if in testing mode

### 2. Database Migration

Run the migration to create the `user_oauth_tokens` table:

```bash
# Apply migration to Supabase
psql $DATABASE_URL -f sms-bot/migrations/005_gmail_oauth_integration.sql

# Or use Supabase CLI
supabase db push
```

### 3. Environment Variables

Add to `.env.local` (or Railway environment variables):

```bash
# Google OAuth Credentials
GOOGLE_CLIENT_ID=your_client_id_from_google_console
GOOGLE_CLIENT_SECRET=your_client_secret_from_google_console
GOOGLE_REDIRECT_URI=https://webtoys.ai/api/oauth/gmail/callback

# Generate encryption key (run this command once)
OAUTH_ENCRYPTION_KEY=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")

# Or manually generate and set:
# OAUTH_ENCRYPTION_KEY=abc123...64_hex_characters_total
```

**CRITICAL**: The `OAUTH_ENCRYPTION_KEY` must be:
- Exactly 64 hex characters (32 bytes)
- Kept secret
- Never changed (changing it invalidates all existing tokens)
- Backed up securely

### 4. Install Dependencies

The Gmail integration requires `googleapis` package:

```bash
cd sms-bot
npm install googleapis
```

### 5. Build and Deploy

```bash
# Build sms-bot
cd sms-bot
npm run build

# Restart SMS listener
# (follow your normal deployment process)
```

## User Flow

### Connecting Gmail

1. User sends: `GMAIL CONNECT`
2. System generates OAuth URL and shortens it
3. User clicks link, authorizes Gmail access
4. User redirected to success page
5. Confirmation SMS sent
6. Tokens encrypted and stored

### Searching Emails

User sends: `GMAIL SEARCH meeting with john`

System:
- Validates Gmail connection
- Searches emails using Gmail API
- Returns top 5 results with subject, from, date, snippet
- Updates `last_used_at` timestamp

### Automatic Context (Personalization)

When a user with Gmail connected asks a question:

1. System analyzes query context (e.g., "crypto research")
2. Claude generates relevant Gmail search query
3. System searches user's emails (max 3 results)
4. Email context appended to system prompt
5. AI response enriched with email information

Example:
```
User: "What did Sarah say about the Bitcoin proposal?"

[System internally]:
- Gmail search: "from:sarah Bitcoin OR BTC proposal"
- Finds 2 relevant emails
- Adds to context:
  Email 1: From Sarah, Subject: "Re: Bitcoin Investment Proposal"...
  Email 2: From Sarah, Subject: "BTC Analysis Update"...

AI response: "Based on your emails, Sarah mentioned..."
```

### Checking Status

User sends: `GMAIL STATUS`

Returns:
- Connection status
- Connected email address
- Last usage date
- Available commands

### Disconnecting

User sends: `GMAIL DISCONNECT`

System:
- Revokes token with Google
- Deletes encrypted tokens from database
- Sends confirmation SMS

## SMS Commands

| Command | Description | Example |
|---------|-------------|---------|
| `GMAIL CONNECT` | Start OAuth authorization flow | `GMAIL CONNECT` |
| `GMAIL SEARCH [query]` | Search emails | `GMAIL SEARCH from:john meeting` |
| `GMAIL STATUS` | Check connection status | `GMAIL STATUS` |
| `GMAIL DISCONNECT` | Revoke access | `GMAIL DISCONNECT` |

### Gmail Search Syntax

Supports full Gmail search operators:

- `from:user@example.com` - Emails from specific sender
- `to:user@example.com` - Emails to specific recipient
- `subject:keyword` - Subject contains keyword
- `after:2024/01/01` - Emails after date
- `before:2024/12/31` - Emails before date
- `has:attachment` - Has attachments
- `is:unread` - Unread emails
- `label:important` - Labeled emails
- Boolean operators: `OR`, `AND`, `-` (NOT)

Examples:
```
GMAIL SEARCH from:sarah subject:proposal
GMAIL SEARCH Bitcoin OR BTC after:2024/01/01
GMAIL SEARCH has:attachment -is:unread
```

## Testing

### 1. Test Encryption

```bash
cd sms-bot
npm run build

# Test encryption/decryption
node -e "require('./dist/lib/encryption.js').testEncryption()"
```

### 2. Test OAuth Flow

1. Send `GMAIL CONNECT` via SMS
2. Click authorization link
3. Authorize Gmail access
4. Verify success page appears
5. Check confirmation SMS received

### 3. Test Search

```bash
# Send via SMS:
GMAIL SEARCH test

# Should return recent emails with "test" in them
```

### 4. Test Personalization Context

```bash
# With Gmail connected, send a query that might relate to emails:
What did John say about the project?

# System should automatically search emails and include context
```

## Troubleshooting

### "Missing Google OAuth credentials not configured"

**Cause**: Environment variables not set
**Fix**: Set `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`

### "OAUTH_ENCRYPTION_KEY environment variable is not set"

**Cause**: Encryption key not configured
**Fix**: Generate and set encryption key (see Setup section)

### "Gmail authorization expired"

**Cause**: Refresh token expired or revoked
**Fix**: User needs to reconnect with `GMAIL CONNECT`

### "Token exchange failed"

**Cause**: Incorrect OAuth configuration or expired authorization code
**Fix**:
- Verify redirect URI matches Google Console
- Ensure authorization code used within 10 minutes
- Check OAuth consent screen published

### OAuth callback shows 404

**Cause**: Web server not running or route not registered
**Fix**:
- Verify `web/app/api/oauth/gmail/callback/route.ts` exists
- Restart web server
- Check Next.js routing

## Privacy & Security

### What Access Is Granted?

- **Read-only**: Cannot send emails or modify mailbox
- **Scopes**: `gmail.readonly` and `userinfo.email` only
- **Storage**: Tokens encrypted with AES-256-GCM
- **Revocation**: User can disconnect anytime

### Data Retention

- OAuth tokens: Stored indefinitely while connected
- Email searches: Not logged or stored
- Email content: Not stored (only used in real-time for context)

### Compliance

- GDPR: Users can delete data via `GMAIL DISCONNECT`
- Data minimization: Only necessary scopes requested
- Encryption: Tokens encrypted at rest
- User consent: Explicit authorization required

## Implementation Notes

### Token Refresh Flow

1. Before each API call, check token expiration
2. If expires within 5 minutes, refresh automatically
3. Store new access token (refresh token stays same)
4. Update `token_expires_at` in database

### Error Handling

- Gmail API errors: Return user-friendly messages
- Network failures: Graceful degradation (skip Gmail context)
- Token errors: Prompt user to reconnect
- Rate limits: Implement exponential backoff

### Performance

- Token refresh: ~500ms overhead when needed
- Email search: 1-3 seconds depending on mailbox size
- Context injection: Adds ~2 seconds to general agent responses
- Caching: Consider implementing for frequently accessed emails

## Future Enhancements

### Potential Features

1. **Calendar Integration**: Include meeting context
2. **Contacts Sync**: Recognize people in conversations
3. **Email Summaries**: Daily digest of important emails
4. **Smart Filters**: Auto-categorize emails for context
5. **Multi-account**: Support multiple Gmail accounts
6. **Email Actions**: Draft replies, archive, label (requires additional scopes)

### Architecture Improvements

1. **Token caching**: Redis cache for frequently used tokens
2. **Background sync**: Periodic email indexing for faster searches
3. **Webhooks**: Gmail push notifications for real-time updates
4. **Search optimization**: Index emails locally for faster queries

## References

- [Gmail API Documentation](https://developers.google.com/gmail/api)
- [OAuth 2.0 for Web Apps](https://developers.google.com/identity/protocols/oauth2/web-server)
- [Gmail Search Operators](https://support.google.com/mail/answer/7190)
- [Google Cloud Console](https://console.cloud.google.com)

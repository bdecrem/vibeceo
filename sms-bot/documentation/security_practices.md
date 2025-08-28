# WEBTOYS Security Practices

This document outlines the security practices and architectural decisions made to protect user data and system integrity in the WEBTOYS (formerly WTAF.me) platform.

> **📋 Security Audit**: A comprehensive security audit was conducted on August 5, 2025. See [security-audit-2025-08.md](./security-audit-2025-08.md) for full details. **Result: PASSED** - No critical vulnerabilities found, one potential issue fixed.

## Table of Contents
- [General Security Principles](#general-security-principles)
- [Web Console Authentication](#web-console-authentication)
- [Database Access Patterns](#database-access-patterns)
- [API Security](#api-security)
- [Rate Limiting](#rate-limiting)
- [Command Filtering](#command-filtering)

## General Security Principles

### Core Philosophy
WEBTOYS follows a strict security model based on API-only access patterns and defense in depth. Our security architecture is designed to protect user data while enabling creative freedom.

### Fundamental Rules

#### 1. API-Only Access for Generated Content
**All WEBTOYS (user-generated web apps) MUST interact with the backend exclusively through APIs.**

```javascript
// ✅ CORRECT - Web toys use API endpoints
const data = await fetch('/api/zad/load', {
  method: 'POST',
  body: JSON.stringify({ app_id: 'my-app', type: 'blog_posts' })
});

// ❌ WRONG - Never embed Supabase credentials in web toys
const supabase = createClient('url', 'anon-key'); // FORBIDDEN
```

**Why this matters:**
- Generated content is untrusted by definition
- Direct database access would expose credentials
- APIs provide controlled, validated access paths
- Rate limiting and access control happen at API layer

#### 2. Zero Admin Data (ZAD) Pattern
Our ZAD system demonstrates secure multi-user data access:
- Web toys never see database credentials
- All data operations go through `/api/zad/save` and `/api/zad/load`
- Backend validates app ownership and data types
- Helper functions injected into pages handle the API communication

#### 3. Row Level Security (RLS) Strategy
Our security model uses different RLS policies based on table sensitivity and access patterns:

**Current RLS Implementation:**

**🔒 Service-Only Access Tables (High Security):**
These tables use `service_only_access` policy - ONLY accessible with service key:

- **`wtaf_content`** - All apps and pages
  - Policy: Service role only
  - Access: Through Next.js routes that serve HTML
  - Why: Contains all user-created content
  
- **`wtaf_submissions`** - Form submissions  
  - Policy: Service role only
  - Access: Through backend API endpoints
  - Why: Contains user-submitted data
  
- **`wtaf_users`** - User accounts
  - Policy: Service role only
  - Access: SMS bot manages accounts
  - Why: Contains authentication data
  
- **`wtaf_zero_admin_collaborative`** - ZAD app data
  - Policy: Service role only
  - Access: Through `/api/zad/save` and `/api/zad/load` endpoints
  - Why: Multi-user collaborative data
  
- **`sms_subscribers`** - SMS users
  - Policy: Service role only
  - Access: Backend only
  - Why: Contains phone numbers

**🔓 Public Access Tables (Functionality over Security):**
These tables allow anon role access for browser functionality:

- **`wtaf_desktop_config`** - Desktop settings (Added 2025-08-28)
  - Policy: `allow_all_desktop_config_access`
  - Access: Direct from browser with anon key
  - Permissions: Full READ/WRITE for anon role
  - Why: Desktop needs to save icon positions, widget locations
  - Risk: Low - only UI preferences, no sensitive data
  - Trade-off: Simpler than API approach, acceptable risk

**RLS Policy Examples:**
```sql
-- Service-only access (most tables)
CREATE POLICY "service_only_access" ON wtaf_content
  FOR ALL 
  USING (auth.jwt() ->> 'role' = 'service_role');

-- Public access (desktop config only)  
CREATE POLICY "allow_all_desktop_config_access" ON wtaf_desktop_config
  FOR ALL 
  USING (true)
  WITH CHECK (true);

GRANT ALL ON wtaf_desktop_config TO anon;
```

#### 4. Principle of Least Privilege
Every component gets only the minimum access required:
- Web toys: API access only
- Web console: Authenticated API access with rate limits
- SMS bot: Service key access (trusted system component)
- Public pages: Read-only access to published content

#### 5. Defense in Depth
Multiple security layers protect against breaches:
1. **Authentication**: Who are you?
2. **Authorization**: What can you do?
3. **Validation**: Is this request valid?
4. **Rate Limiting**: How much can you do?
5. **Sanitization**: Is this safe to process?
6. **Audit Logging**: What happened?

### Security Boundaries

#### Trusted vs Untrusted Code
- **Trusted**: SMS bot, API routes, backend services
- **Untrusted**: All generated web toys, user submissions, remix content

#### Data Classification
- **Public**: Published web toys, user profiles, app metadata
- **Private**: Phone numbers, email addresses, unpublished content
- **Sensitive**: Authentication tokens, service keys, user passwords

### API Security Standards

#### Required Headers
All API endpoints must validate:
- `Content-Type`: Prevent CSRF attacks
- `Authorization`: Bearer token for authenticated endpoints
- `X-App-ID`: For ZAD operations (identifies calling app)

#### Response Standards
- Never expose internal errors to users
- Use consistent error response format
- Include rate limit information in headers
- Sanitize all user-generated content in responses

### Future Security Roadmap

1. **Phase 1: RLS Implementation** (Current Focus)
   - Design RLS policies for all tables
   - Test policies in staging environment
   - Gradual rollout with fallback to app-layer security

2. **Phase 2: Enhanced Authentication**
   - Two-factor authentication for operators
   - API key system for programmatic access
   - OAuth integration for third-party apps

3. **Phase 3: Advanced Protection**
   - Web Application Firewall (WAF)
   - DDoS protection
   - Anomaly detection for unusual patterns

## Web Console Authentication

### Overview
The web console provides browser-based access to WTAF commands, requiring careful security measures to prevent unauthorized access while maintaining usability.

### Security Architecture

#### 1. Authentication Flow
```
User Login → Supabase Auth → Session Token → API Validation → Command Execution
```

- Users authenticate via Supabase Auth (email/password)
- Session tokens are managed by Supabase client SDK
- Every API request includes Bearer token in Authorization header
- API validates token matches the claimed user_id

#### 2. Token Validation (Added 2025-08-01)
```typescript
// In /api/wtaf/web-console/route.ts
const authHeader = req.headers.get('authorization');
const token = authHeader?.split(' ')[1];
const { data: { user }, error } = await supabase.auth.getUser(token);
if (error || !user || user.id !== user_id) {
  return NextResponse.json({ error: 'Invalid user' }, { status: 403 });
}
```

**Purpose**: Prevents users from impersonating others by claiming a different user_id

#### 3. Architectural Exception
The web console API violates our standard "no direct database access" rule for security reasons:

- **Standard Rule**: Only storage-manager.ts accesses Supabase
- **Exception**: Web console API uses service key for user verification
- **Justification**: More secure than exposing storage-manager over HTTP

### Security Measures

1. **Service Key Protection**
   - Never sent to client
   - Only used after user authentication
   - Scoped to specific user lookup operations

2. **User Isolation**
   - Users can only execute commands as themselves
   - user_id from token must match user_id in request
   - No cross-user data access

3. **Session Management**
   - Sessions expire according to Supabase settings
   - Tokens refresh automatically via SDK
   - Logout clears all session data

## Database Access Patterns

### Service Key Usage
- **Location**: Server-side API endpoints only
- **Purpose**: Bypass RLS for administrative operations
- **Risk**: Full database access if compromised
- **Mitigation**: Token validation before any service key usage

### Row Level Security (RLS)
Current implementation by table:

- `wtaf_content`: **Service-only access** (service_role policy)
- `wtaf_submissions`: **Service-only access** (service_role policy)  
- `sms_subscribers`: **Service-only access** (service_role policy)
- `wtaf_zero_admin_collaborative`: **Service-only access** (service_role policy)
- `wtaf_users`: **Service-only access** (service_role policy)
- `wtaf_desktop_config`: **Public access** (allow_all policy for anon role)

**Security Model**: Most tables restricted to service key access, with desktop config as the only public exception for UI functionality

## API Security

### Command Processing Pipeline
1. **Authentication Check**: Verify valid session token
2. **User Validation**: Ensure token user matches claimed user
3. **Role Verification**: Check user role in sms_subscribers
4. **Command Filtering**: Remove forbidden flags
5. **Rate Limiting**: Check command allowance
6. **Execution**: Forward to SMS bot for processing

### Forbidden Operations
Commands blocked in web console for security:
- `--admin`: Admin panel generation
- `--stackobjectify`: Object page creation (OPERATOR only)
- `--stackdb`: Direct database connections
- `--stackemail`: Mass email capabilities
- All testing flags (`--admin-test`, `--zad-test`, etc.)

## Rate Limiting

### Implementation
- In-memory storage (production should use Redis)
- Per-user counters with hourly reset
- Role-based limits:
  - User: 5 commands/hour
  - Coder: 10 commands/hour
  - Degen: 20 commands/hour
  - Operator: 30 commands/hour

### Rate Limit Response
```json
{
  "error": "Rate limit exceeded. Try again in X minutes.",
  "rate_limit": {
    "remaining": 0,
    "reset_in_minutes": 45
  }
}
```

## Command Filtering

### Sanitization Process
1. **Flag Detection**: Scan for forbidden flags
2. **Flag Removal**: Strip forbidden flags from command
3. **Audit Logging**: Record rejected flags
4. **User Notification**: Inform user of removed flags

### Role-Based Command Access
```javascript
const ALLOWED_COMMANDS = {
  user: ['wtaf', 'meme'],
  coder: ['wtaf', 'meme', 'edit', 'slug', 'index', 'fave'],
  degen: ['wtaf', 'meme', 'edit', 'slug', 'index', 'fave', 'remix'],
  operator: ['wtaf', 'meme', 'edit', 'slug', 'index', 'fave', 'remix', 'public', 'stackzad', 'stackpublic']
};
```

## Security Best Practices

### Do's
- ✅ Always validate user identity before database access
- ✅ Use role-based access control
- ✅ Implement rate limiting on all public endpoints
- ✅ Log security events for audit trails
- ✅ Sanitize user input before processing
- ✅ Use HTTPS for all communications
- ✅ Keep service keys server-side only

### Don'ts
- ❌ Never expose service keys to client code
- ❌ Don't trust client-provided user identifiers
- ❌ Avoid storing sensitive data in browser storage
- ❌ Don't bypass authentication "for convenience"
- ❌ Never log authentication tokens or passwords
- ❌ Don't implement custom crypto (use established libraries)

## Incident Response

### If Service Key is Compromised
1. Immediately rotate key in Supabase dashboard
2. Update all environment variables
3. Audit recent database access logs
4. Notify affected users if data was accessed
5. Review and strengthen access controls

### If User Account is Compromised
1. Invalidate all user sessions
2. Force password reset
3. Review user's recent commands
4. Check for unauthorized data access
5. Notify user of breach

## Future Security Enhancements

### Recommended Improvements
1. **Implement RLS Policies**: Add row-level security to all tables
2. **Move to Redis**: Use Redis for production rate limiting
3. **Add 2FA**: Two-factor authentication for sensitive operations
4. **API Key System**: Per-user API keys for programmatic access
5. **Audit Logging**: Comprehensive security event logging
6. **IP Allowlisting**: Restrict admin operations by IP
7. **CSRF Protection**: Add CSRF tokens to state-changing operations

### Security Monitoring
- Set up alerts for:
  - Failed authentication attempts
  - Rate limit violations
  - Forbidden command attempts
  - Unusual access patterns
  - Service key usage

## Conclusion

Security in WEBTOYS follows a defense-in-depth approach with multiple layers:
1. Authentication (who you are)
2. Authorization (what you can do)
3. Rate limiting (how much you can do)
4. Input sanitization (what we'll accept)
5. Audit logging (what happened)

While we make architectural exceptions for practical security reasons (like the web console's direct database access), each exception is carefully considered and documented with compensating controls.
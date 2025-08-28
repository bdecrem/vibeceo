# Security and Row Level Security (RLS) Policies

## Overview

WEBTOYS uses Supabase Row Level Security (RLS) to control database access. Different tables have different security models based on their use case.

## Key Concepts

### Supabase Roles

1. **`service_role`** - Full admin access
   - Used by: SMS bot backend, Next.js API routes
   - Has: Complete bypass of all RLS policies
   - Keys: Service key (kept secret on server)

2. **`anon`** - Public/anonymous access  
   - Used by: Browser apps, public visitors
   - Has: Limited access based on RLS policies
   - Keys: Anon key (visible in browser code)

3. **`authenticated`** - Logged-in users
   - Used by: Authenticated users (when auth is implemented)
   - Has: User-specific access based on RLS policies

## Table Security Policies

### 🔒 HIGH SECURITY TABLES (Service-Only Access)

These tables can ONLY be accessed with the service key. Browser apps cannot read or write directly.

#### `wtaf_content` - All Apps and Pages
**Policy**: `service_only_access`
- ✅ Service role: Full access
- ❌ Anon: No access
- ❌ Authenticated: No access

**How apps access it**: 
- Content is served through Next.js routes
- Browser loads apps via URLs like `/public/app-name`
- Server fetches from database and serves HTML

#### `wtaf_submissions` - Form Submissions
**Policy**: `service_only_access`
- ✅ Service role: Full access
- ❌ Anon: No access
- ❌ Authenticated: No access

**How apps access it**: 
- Through server API endpoints only
- Forms POST to backend routes

#### `wtaf_users` - User Accounts
**Policy**: `service_only_access`
- ✅ Service role: Full access
- ❌ Anon: No access
- ❌ Authenticated: No access

**How it's used**:
- SMS bot manages user accounts
- Authentication handled server-side

#### `wtaf_zero_admin_collaborative` - ZAD App Data
**Policy**: `service_only_access`
- ✅ Service role: Full access
- ❌ Anon: No access
- ❌ Authenticated: No access

**How apps access it**:
- Through `/api/zad/save` endpoint (writes)
- Through `/api/zad/load` endpoint (reads)
- Server validates and proxies all requests

### 🔓 PUBLIC ACCESS TABLES

These tables allow direct access from browser apps using the anon key.

#### `wtaf_desktop_config` - Desktop Settings
**Policy**: `allow_all_desktop_config_access`
- ✅ Service role: Full access
- ✅ Anon: Full access (READ, WRITE, UPDATE, DELETE)
- ✅ Authenticated: Full access

**Why it's public**:
- Desktop needs to save icon positions
- Widget positions must persist
- User preferences stored here
- No sensitive data (just UI settings)

**Security implications**:
- Anyone with anon key can modify settings
- Risk: Low (only affects desktop appearance)
- Trade-off: Simpler implementation vs API approach

**SQL Policy**:
```sql
CREATE POLICY "allow_all_desktop_config_access" ON wtaf_desktop_config
    FOR ALL 
    USING (true)
    WITH CHECK (true);

GRANT ALL ON wtaf_desktop_config TO anon;
```

### 📊 Other Tables

#### `wtaf_themes` - UI Themes
**Policy**: Typically `service_only_access`
- Stores CSS themes for apps
- Loaded server-side and injected

#### `wtaf_analytics` - Usage Analytics
**Policy**: `service_only_access`
- Tracks app usage and SMS interactions
- Write-only from backend

## Security Best Practices

### For Developers

1. **Never expose service keys** in browser code
2. **Use API endpoints** for sensitive operations
3. **Validate all inputs** on the server
4. **Check table policies** before assuming access

### API Pattern (ZAD Example)

Instead of direct database access:
```javascript
// ❌ BAD - Won't work from browser with service_only tables
const { data } = await supabase
  .from('wtaf_zero_admin_collaborative')
  .select('*');

// ✅ GOOD - Use API endpoint
const response = await fetch('/api/zad/load?app_id=my-app');
const data = await response.json();
```

### When to Use Public Access

Consider public access (like `wtaf_desktop_config`) when:
- Data is not sensitive
- Performance is critical (no API round-trip)
- Complexity of API isn't worth it
- Risk of abuse is acceptable

### When to Use Service-Only Access

Keep service-only access (like most tables) when:
- Data contains user information
- Business logic validation needed
- Rate limiting required
- Audit trail important

## Testing RLS Policies

To test if a table is accessible:

```javascript
// In browser console
const { data, error } = await supabase
  .from('table_name')
  .select('*')
  .limit(1);

if (error?.code === '42501') {
  console.log('No permission - RLS blocking access');
}
```

## Changing Policies

To modify RLS policies, use SQL in Supabase Dashboard:

```sql
-- View current policies
SELECT * FROM pg_policies WHERE tablename = 'table_name';

-- Drop and recreate
DROP POLICY IF EXISTS "policy_name" ON table_name;
CREATE POLICY "new_policy" ON table_name
  FOR ALL
  USING (condition)
  WITH CHECK (condition);
```

## Summary

- **Most tables**: Service-only access for security
- **Desktop config**: Public access for functionality  
- **Always use APIs** for service-only tables
- **Direct access** only for specifically allowed tables

This hybrid approach balances security with functionality, keeping sensitive data protected while allowing necessary browser operations.
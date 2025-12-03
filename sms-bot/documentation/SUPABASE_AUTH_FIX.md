# Supabase Email Verification Redirect Fix

## The Problem
The signup verification emails from Supabase always redirect to `http://localhost:3000` regardless of what `emailRedirectTo` parameter we pass in the API call.

## Root Cause
Supabase uses the **Site URL** configured in the project dashboard for ALL auth emails (verification, password reset, etc.), NOT the `emailRedirectTo` parameter passed in API calls.

The `emailRedirectTo` parameter only works for:
- Magic link logins
- Password reset emails (when user is already verified)
- OAuth redirects

But NOT for initial email verification links.

## The Solution

### Option 1: Update Supabase Dashboard (Recommended)
1. Go to https://supabase.com/dashboard
2. Select your project (tqniseocczttrfwtpbdr)
3. Go to Authentication > URL Configuration
4. Update **Site URL** from `http://localhost:3000` to `https://webtoys.ai`
5. Add to **Redirect URLs** (whitelist):
   - `http://localhost:3000`
   - `https://webtoys.ai`
   - `https://webtoys.io`
   - Any Railway URLs you use

### Option 2: Custom Email Templates
1. In Supabase Dashboard, go to Authentication > Email Templates
2. Edit the "Confirm signup" template
3. Use a dynamic redirect URL in the template:
   ```
   {{ .SiteURL }}/auth/confirm?token={{ .Token }}&type=signup&redirectTo={{ .RedirectTo }}
   ```

### Option 3: Proxy Endpoint (Complex but flexible)
Create a redirect handler at a fixed URL that determines where to redirect based on the request:

1. Set Site URL to: `https://webtoys.ai/auth/redirect`
2. Create an endpoint at `/auth/redirect` that:
   - Reads the token and type from query params
   - Determines the correct redirect URL based on headers/cookies
   - Redirects to the appropriate Supabase verify endpoint

## Why Our Code Changes Don't Work

The `emailRedirectTo` parameter in the signUp call:
```javascript
await supabase.auth.signUp({
  email,
  password,
  options: {
    emailRedirectTo: redirectUrl, // This is IGNORED for verification emails!
  }
})
```

This parameter is ignored for the initial verification email. Supabase always uses the Site URL from the dashboard configuration.

## Immediate Fix Required

**You need to update the Supabase Dashboard Site URL setting to fix this issue.**

The code changes we made are good for other auth flows (password reset, magic links) but won't fix the signup verification issue.
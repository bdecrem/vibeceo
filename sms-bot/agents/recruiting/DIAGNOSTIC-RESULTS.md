# Recruiting Agent Diagnostic Results

## Summary

**Issue**: Claude's candidate selection returning 0 candidates even though Apify returns 10 LinkedIn candidates.

**Root Cause**: Likely a data format mismatch between what Apify returns and what Claude expects.

**Status**: ✅ Core selection logic is WORKING. Issue is with data transformation.

---

## Key Findings

### 1. Claude Selection Logic is Working ✅

I created a mock test (`sms-bot/scripts/test-recruit-selection-mock.js`) with well-formatted candidate data. Results:

- ✅ Claude successfully selected all 10 candidates
- ✅ JSON parsing worked correctly (handles markdown code blocks)
- ✅ Match reasons were relevant and well-written
- ✅ Output format matches expectations

**Conclusion**: The AI selection logic and prompt are working correctly when given proper data.

### 2. LinkedIn Cookie Issue 🔄

When testing with real Apify calls:
- ❌ LinkedIn cookies are currently expired
- Error: "Failed to authorize with linkedin. Please retry with new cookies"

**Action Needed**: Update `LINKEDIN_COOKIE` in `.env.local` with fresh cookies from Cookie-Editor Chrome extension.

### 3. Data Format Investigation 🔍

**Enhanced Logging Added** (in `apify-client.ts:177-200` and `index.ts:315-321`):

The code now logs:
1. Raw Apify result format (first item)
2. Available field names in raw data
3. Transformed candidate data
4. Sample of what Claude receives

This will reveal if Apify returns different field names than expected.

---

## Current Code Structure

### Apify Client (`apify-client.ts`)

```typescript
// Transformation tries multiple field names:
{
  name: result.name || result.fullName || 'Unknown',
  title: result.title || result.headline,
  company: result.company || result.companyName,
  linkedinUrl: result.url || result.profileUrl || result.linkedinUrl,
  summary: result.summary || result.about,
  // ...
}
```

**Problem**: If Apify uses different field names, candidates will have:
- name: "Unknown"
- title: undefined
- company: undefined
- summary: undefined

Claude might filter out candidates with missing critical fields.

### Selection Function (`index.ts:309-426`)

```typescript
async function selectDiverseCandidates(
  linkedInCandidates: LinkedInCandidate[],
  twitterCandidates: TwitterCandidate[],
  query: string
): Promise<any[]>
```

**Fallback Logic**:
1. If Claude returns 0 → calls `buildFallbackCandidates()`
2. If Claude errors → returns first 10 LinkedIn candidates

---

## Next Steps

### 1. Update LinkedIn Cookies (REQUIRED)

```bash
# 1. Open Chrome with Cookie-Editor extension
# 2. Go to linkedin.com and log in
# 3. Click Cookie-Editor → Export → Copy all cookies as JSON
# 4. Update sms-bot/.env.local:
LINKEDIN_COOKIE=[...paste full cookie array here...]
```

### 2. Run Test with Real Data

```bash
cd sms-bot
node -r dotenv/config scripts/test-recruit-selection.js dotenv_config_path=.env.local
```

This will:
- Call Apify LinkedIn scraper
- Show raw Apify data format
- Show transformed candidate data
- Show what Claude receives
- Show Claude's response
- Show final candidate count

### 3. OR Test via SMS

Send SMS:
```
RECRUIT motion designer students in particular at School of Visual Arts and similar
```

Check logs for:
```
[Apify] Sample raw LinkedIn result (first item):
[Apify] Available fields: ...
[Apify] Sample transformed candidate:
[Recruiting] Sample LinkedIn candidate for Claude:
[Recruiting] Claude response: ...
```

### 4. Fix Data Transformation (If Needed)

Once you see the actual Apify format, update field mapping in `apify-client.ts:184-194`.

Example: If Apify returns `fullName` but not `name`:
```typescript
name: result.fullName || result.name || 'Unknown',
```

---

## Potential Issues & Fixes

### Issue A: Missing Field Names

**Symptom**: Candidates have undefined/null for most fields

**Fix**: Update transformation mapping based on actual Apify field names

**Location**: `sms-bot/agents/recruiting/apify-client.ts:184-194`

### Issue B: Claude Too Strict

**Symptom**: Claude filters out candidates even with good data

**Fix**: Make prompt more flexible:
```typescript
// Change from:
"Return EXACTLY 10 candidates as a JSON array."

// To:
"Return UP TO 10 diverse candidates as a JSON array. If fewer candidates match the criteria, return what you can find."
```

**Location**: `sms-bot/agents/recruiting/index.ts:323-343`

### Issue C: Prompt Too Large

**Symptom**: API errors or truncated responses

**Fix**: Reduce candidates sent to Claude:
```typescript
// Change from:
${JSON.stringify(linkedInCandidates.slice(0, 20), null, 2)}

// To:
${JSON.stringify(linkedInCandidates.slice(0, 15), null, 2)}
```

---

## Files Modified

1. `sms-bot/agents/recruiting/apify-client.ts` - Added logging for raw/transformed data
2. `sms-bot/agents/recruiting/index.ts` - Added logging for Claude input/output
3. `sms-bot/scripts/test-recruit-selection.js` - Created diagnostic test (requires real LinkedIn cookies)
4. `sms-bot/scripts/test-recruit-selection-mock.js` - Created mock test (proved selection logic works)

## Build Status

✅ SMS bot rebuilt with new logging (`npm run build` completed successfully)

Next time SMS bot restarts, the enhanced logging will be active.

---

## Recommendations

1. **IMMEDIATE**: Update LinkedIn cookies and run real test to see Apify data format
2. **THEN**: Fix field mapping based on actual Apify response
3. **OPTIONAL**: Make prompt more flexible if needed
4. **TEST**: Send RECRUIT command via SMS and verify candidates are selected

The core logic is sound - we just need to see what Apify actually returns to fix the data transformation.

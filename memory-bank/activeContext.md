# Active Context: EDIT Command Implementation for Degen Users

## Current Focus: IMPLEMENTING EDIT COMMAND
**Building SMS command for degen users to edit existing WTAF pages**

## Implementation Plan Overview

### Goal
Add `EDIT [index_number] [instructions]` command that allows degen role users to modify their existing WTAF pages via SMS, using the same polished workflow as WTAF creation.

### Architecture Decision: Option 2 - Minimal Monitor Extension
**Extend monitor.py with minimal complexity rather than creating separate processes**

#### Why This Approach:
- ✅ **Single process** - no new things to manage
- ✅ **Proven pattern** - follows existing WTAF workflow  
- ✅ **Reuses everything** - SMS, OG, error handling, logging
- ✅ **Minimal code** - just extending what already works (~20-30 lines)

### Implementation Flow
1. **handlers.ts**: Parse `EDIT 2 change background` → validate degen role → queue edit request
2. **monitor.py**: Process edit queue → fetch existing HTML → combine with `prompts/edits.json` → call AI
3. **monitor.py**: **UPDATE same row** in wtaf_content (preserving app_slug, user_slug, URL) → generate new OG image → send SMS
4. **User**: Gets SMS with same URL (content now updated)

### Key Benefits
- **Preserves URLs** - same app_slug means bookmarks still work
- **Leverages monitor.py** - all the SMS formatting, OG images, error handling
- **Clean database** - no duplicate entries, just updated content
- **Consistent UX** - same SMS experience as WTAF

## Current Implementation Status

### ✅ COMPLETED: Basic Structure
- Created `sms-bot/lib/degen_commands.ts` with edit command logic
- Added EDIT command detection in `sms-bot/lib/sms/handlers.ts`
- Added role-based security (degen users only)
- Updated help text to show EDIT command for degen users

### ❌ NEEDS CORRECTION: Current Issues
**Current implementation bypasses monitor.py workflow - needs to be redesigned**

- Current code does direct AI calls instead of using monitor.py
- Doesn't use `prompts/edits.json` structure
- Missing proper SMS formatting and OG image generation
- Doesn't follow established queue → process → notify pattern

### 🔄 NEXT STEPS: Proper Integration
1. **Create edit queue table** (or reuse existing queue with edit type)
2. **Add prompts/edits.json** with proper edit prompt structure
3. **Extend monitor.py** with `process_edit_queue()` function
4. **Update handlers.ts** to queue edit requests instead of direct processing
5. **Test end-to-end** workflow with degen user

## Database Structure Needed
```sql
-- Option 1: Add to existing queue
ALTER TABLE request_queue ADD COLUMN request_type VARCHAR DEFAULT 'wtaf';
-- Option 2: New table
CREATE TABLE edit_requests (
    id SERIAL PRIMARY KEY,
    user_slug VARCHAR,
    target_index INTEGER,
    edit_instructions TEXT,
    status VARCHAR DEFAULT 'pending',
    created_at TIMESTAMP
);
```

## Files Modified So Far
- `sms-bot/lib/degen_commands.ts` - **NEEDS REWORK** (currently bypasses monitor.py)
- `sms-bot/lib/sms/handlers.ts` - **NEEDS UPDATE** (change from direct processing to queueing)

## Files Still To Create/Modify
- `sms-bot/prompts/edits.json` - Edit prompt template
- `monitor.py` - Add edit queue processing (~20-30 lines)
- Database schema updates for edit queue

## Command Usage
```
EDIT 2 change the background to blue
EDIT 1 add a header that says "Welcome to my site"
EDIT 3 make the text larger and center it
```

## Role-Based Security
- Only users with `role = 'degen'` can use EDIT command
- Silent ignore for non-degen users (doesn't reveal command exists)
- Uses INDEX command numbering (1-based, ordered by created_at desc)

## Current Status: IMPLEMENTATION IN PROGRESS
Ready to correct current approach and implement proper monitor.py integration. 
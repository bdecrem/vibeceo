# ZAD API Technical Reference

## Overview

This document provides the complete technical reference for the ZAD (Zero Admin Data) API system, including architecture, database schema, API endpoints, and implementation details.

## Architecture

### System Design
ZAD is a **collaborative data storage system** designed for small group apps (≤5 users) that need **zero admin interface**. It enables rapid prototyping of collaborative apps without complex backend setup.

### Data Flow
```
Client App → ZAD Helper Functions → API Endpoints → Supabase Database
           ← Response            ← JSON Response ← Query Results
```

### Key Components
1. **Client-Side**: Helper functions in `zad-helpers.ts`
2. **API Layer**: Two endpoints (`/api/zad/save` and `/api/zad/load`)
3. **Database**: Single shared table `wtaf_zero_admin_collaborative`
4. **Auto-Fix System**: JavaScript corrections applied during deployment

## Database Schema

### wtaf_zero_admin_collaborative Table
```sql
CREATE TABLE wtaf_zero_admin_collaborative (
    id BIGSERIAL PRIMARY KEY,
    app_id TEXT NOT NULL,           -- UUID isolates apps
    participant_id TEXT NOT NULL,   -- User ID within app
    action_type TEXT NOT NULL,      -- Data category/operation
    content_data JSONB,            -- Flexible user data
    participant_data JSONB,        -- User metadata
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_zad_app_id ON wtaf_zero_admin_collaborative(app_id);
CREATE INDEX idx_zad_action_type ON wtaf_zero_admin_collaborative(action_type);
CREATE INDEX idx_zad_participant ON wtaf_zero_admin_collaborative(participant_id);
```

### Demo Mode Table
```sql
CREATE TABLE wtaf_zero_admin_collaborative_DEMO (
    -- Same schema as production table
    -- Used when participant_id starts with 'demo'
);
```

## API Endpoints

### POST /api/zad/save

**Purpose**: Handle all write operations via action_type parameter

#### Request Format
```typescript
{
    app_id: string;           // Required
    participant_id?: string;  // Optional (auto-generated if missing)
    action_type: string;      // Operation type
    content_data?: any;       // Operation-specific data
    participant_data?: any;   // User metadata
}
```

#### Supported Action Types

##### 1. Authentication Operations
- `check_slots` - Check available user slots
- `generate_user` - Generate new user credentials
- `register_user` - Register new user with credentials
- `authenticate_user` - Validate user login

##### 2. Data Operations
- `update_task` - Update existing records (prevents duplicates)
- `delete` - Delete specific records by ID
- `search` - Search/filter with advanced queries
- `count` - Count records with optional filters
- `clear` - Clear all records of a specific type
- `query` - Flexible queries with aggregation

##### 3. AI Operations
- `generate_image` - Generate images via DALL-E 3
- `generate_text` - Generate text via GPT-4

##### 4. Backend Helpers
- `greet` - Example backend processing function

##### 5. Standard Data Save
- Any other string is treated as a data type for standard save operations

#### Response Format
```typescript
// Success
{
    success: true,
    data?: any,          // Created/updated record
    result?: any,        // Operation-specific result
    count?: number,      // For count operations
    slots?: object,      // For check_slots
    image_url?: string,  // For generate_image
    text?: string        // For generate_text
}

// Error
{
    success: false,
    error: string
}
```

### GET /api/zad/load

**Purpose**: Load data from the database

#### Query Parameters
- `app_id` (required) - App UUID
- `action_type` (optional) - Filter by specific type
- `participant_id` (optional) - Filter by user

#### Response Format
```typescript
// Array of records
[
    {
        id: number,
        app_id: string,
        participant_id: string,
        action_type: string,
        content_data: object,
        participant_data: object,
        created_at: string,
        updated_at: string
    }
]
```

## Auto-Fix System

The ZAD system applies automatic JavaScript fixes during deployment to prevent common errors:

### API-Safe Fixes

#### Fix 7: Onclick Quote Escaping
```javascript
// Before: onclick="toggleCompleted('123')"
// After:  onclick="toggleCompleted(&quot;123&quot;)"
```
- Prevents JavaScript parsing errors in onclick handlers
- Only affects onclick attributes, never API calls or JSON

#### Fix 8: String ID to Number Conversion
```javascript
// Before: item.id === itemId
// After:  item.id === parseInt(itemId)
```
- Fixes "RECORD NOT FOUND" errors when database expects numbers
- Applied to record_id and generic id comparisons

### Other Fixes
- Async function corrections
- Duplicate variable removal
- Enhanced error handling
- Malformed quote fixing (outside JSON contexts)

## Implementation Details

### File Locations
```
sms-bot/
├── engine/
│   ├── zad-helpers.ts           # Client-side helper functions
│   ├── storage-manager.ts       # UUID injection & auto-fixes
│   └── classifier-builder.ts   # ZAD detection logic
├── content/
│   ├── builder-zad-comprehensive.txt  # Builder GPT template
│   └── classification/
│       └── is-it-a-zad.json    # ZAD classification rules
└── documentation/
    ├── ZAD-API-REFERENCE.md     # This file
    └── ZAD-DEVELOPER-GUIDE.md   # Usage guide

web/app/api/zad/
├── save/route.ts                # Save endpoint implementation
└── load/route.ts                # Load endpoint implementation
```

### UUID Management

#### Standard ZAD Apps
```javascript
// UUID auto-injected during deployment
window.APP_ID = 'generated-uuid';

// Helper function uses injected UUID
function getAppId() {
    return window.APP_ID || 'unknown-app';
}
```

#### Stackzad Apps (Shared Data)
```javascript
// Shared UUID injected
window.SHARED_DATA_UUID = 'source-app-uuid';

// Modified helper uses shared UUID
function getAppId() {
    if (window.SHARED_DATA_UUID) {
        return window.SHARED_DATA_UUID;
    }
    return window.APP_ID || 'unknown-app';
}
```

#### Stackobjectify Apps (Public Data)
```javascript
// Source app UUID injected
window.OBJECTIFY_SOURCE_APP_ID = 'source-app-uuid';

// Modified helper for objectified data
function getAppId() {
    if (window.OBJECTIFY_SOURCE_APP_ID) {
        return window.OBJECTIFY_SOURCE_APP_ID;
    }
    return window.APP_ID || 'unknown-app';
}
```

### Security Model

#### App Isolation
- Each app has a unique UUID
- Data filtered by app_id in all queries
- No cross-app data access (except stack commands)

#### User Management
- Up to 5 users per app
- Username + 4-digit passcode authentication
- Participant IDs track users within apps

#### Demo Mode
- Triggered when participant_id starts with 'demo'
- Uses separate database table
- Data automatically cleaned up

### Performance Optimizations

#### Database Indexes
- app_id for app isolation
- action_type for filtered queries
- participant_id for user-specific data

#### Query Optimization
- Limit default results to prevent large payloads
- Use specific action_type filters when possible
- Implement pagination for large datasets

## Maintenance

### Adding New Action Types
1. Add handler in `/api/zad/save/route.ts`
2. Document in this file
3. Add client helper if needed in `zad-helpers.ts`
4. Update Builder GPT template with examples
5. Test in demo mode

### Monitoring
- Check Supabase logs for query performance
- Monitor API response times
- Track error rates by action_type

### Common Issues
1. **"RECORD NOT FOUND"** - Usually ID type mismatch (Fix 8 addresses this)
2. **Onclick errors** - Quote escaping issues (Fix 7 addresses this)
3. **Missing data** - Check participant_id and app_id filters
4. **Demo data persistence** - Demo table is periodically cleaned

## Version History

### Current Version: 2.0
- Added advanced operations (update, delete, search, count, clear)
- Implemented AI helper functions (generate_image, generate_text)
- Enhanced auto-fix system for API compatibility
- Added demo mode support

### Version 1.0
- Basic save/load functionality
- Authentication system
- Real-time polling support

---
*Last Updated: January 2025*
*Maintained by: WEBTOYS Engineering Team*
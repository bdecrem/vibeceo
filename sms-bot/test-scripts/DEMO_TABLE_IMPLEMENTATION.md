# Demo Table Implementation

## Overview
The demo mode for ZAD apps now uses a **separate table architecture** for perfect isolation and automatic cleanup.

## Architecture

### Tables
- **Real Data:** `wtaf_zero_admin_collaborative` (production table)
- **Demo Data:** `wtaf_zero_admin_collaborative_DEMO` (demo table, identical schema)

### How It Works
1. **Demo Detection:** When `participant_id` starts with 'demo', API routes to demo table
2. **Perfect Isolation:** Demo and real data never mix - they live in separate tables
3. **Automatic Cleanup:** Demo table gets truncated every 3 minutes via pg_cron

## Implementation Details

### Backend API Changes
- **Save Endpoint:** `/api/zad/save` uses `getTableName()` to route to correct table
- **Load Endpoint:** `/api/zad/load` uses `getTableName()` to query correct table
- **Demo Detection:** `isDemoMode()` checks if `participant_id.startsWith('demo')`

### Client-Side Integration
ZAD apps detect demo mode and generate demo participant IDs:
```javascript
// In storage-manager.ts getParticipantId() function
if (isDemoMode) {
    participantId = 'demo_user_' + Math.random().toString(36).substr(2, 8);
}
```

### Cleanup System
```sql
-- Runs every 3 minutes via pg_cron
TRUNCATE TABLE wtaf_zero_admin_collaborative_DEMO;
```

## Benefits

### 🔒 **Perfect Security**
- Demo data physically separated from production
- Zero risk of demo/real data contamination
- Real database untouchable by demo users

### 🧹 **Bulletproof Cleanup**
- Truncate entire demo table (fastest operation)
- No complex WHERE clauses that could fail
- Guaranteed complete cleanup every 3 minutes

### ⚡ **Better Performance**
- Demo queries scan smaller table
- Real queries unaffected by demo volume
- No filtering overhead in production

### 🐛 **Bug-Proof**
- Even if participant_id logic breaks, real data is safe
- Worst case: demo breaks, production unaffected

## Usage

### For Users
Add `?demo=true` to any ZAD app URL:
```
https://example.com/my-app?demo=true
```

### For Testing
Use test file: `test-demo-table-routing.html` to verify isolation works correctly.

## Migration
The demo table and cleanup system are created by:
- `20250115000000_demo_table_cleanup.sql`

This approach is **much safer** than the previous participant_id filtering method and provides true data isolation. 
# External Changes - i1 (Forge)

Files and changes made outside the `incubator/i1/` folder.

## Files Created Outside incubator/i1/

### web/app/rivalalert/page.tsx
- **Created**: 2025-12-12
- **Purpose**: RivalAlert landing page
- **To remove**: Delete this file and the `web/app/rivalalert/` directory

### web/app/rivalalert/layout.tsx
- **Created**: 2025-12-18
- **Purpose**: Page metadata (title, OG tags for rivalalert.ai)
- **To remove**: Delete this file

### web/app/api/rivalalert/waitlist/route.ts
- **Created**: 2025-12-12
- **Purpose**: Waitlist signup API endpoint
- **To remove**: Delete this file and the `web/app/api/rivalalert/` directory

## Files Modified Outside incubator/i1/

### web/middleware.ts
- **Modified**: 2025-12-12
- **Change**: Added `pathname.startsWith('/rivalalert')` to bypass list (line 164)
- **To remove**: Delete this line from the if condition

- **Modified**: 2025-12-18
- **Change**: Added `isRivalAlertDomain` check and rewrite handler for rivalalert.ai domain routing (lines 19, 113-132)
- **To remove**: Delete the domain check variable and the entire `if (isRivalAlertDomain)` block

## Rollback Checklist

To completely remove RivalAlert:

1. Delete `web/app/rivalalert/` directory
2. Remove `pathname.startsWith('/rivalalert') ||` from `web/middleware.ts` line 134
3. Drop database tables (see MIGRATIONS.md)
4. Archive this folder to `incubator/graveyard/rivalalert/`

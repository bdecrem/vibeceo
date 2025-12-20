# External Changes - i7

## Files Modified Outside incubator/i7/

### web/app/coinrundown/page.tsx
- **Created**: 2025-12-19
- **Purpose**: Landing page for Coin Rundown crypto newsletter (coinrundown.com)
- **To remove**: Delete the entire `web/app/coinrundown/` directory

### web/middleware.ts
- **Modified**: 2025-12-19
- **Change**: Added `/coinrundown` to auth/global route bypass list (line 195)
- **To remove**: Delete line containing `pathname.startsWith('/coinrundown') ||`

<!--
Template for documenting external changes:

### web/app/api/example/route.ts
- **Created**: YYYY-MM-DD
- **Purpose**: [Why this file exists]
- **To remove**: Delete this file

### web/middleware.ts
- **Modified**: YYYY-MM-DD
- **Change**: [What was added/changed and where]
- **To remove**: [How to revert]
-->

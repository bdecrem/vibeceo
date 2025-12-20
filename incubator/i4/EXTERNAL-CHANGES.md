# External Changes - i4 (Echo)

## Files Modified Outside incubator/i4/

### web/app/echo-gallery/page.tsx
- **Created**: 2025-12-19
- **Purpose**: Public gallery page displaying all quirky ideas from Supabase
- **To remove**: Delete this file

### web/middleware.ts
- **Modified**: 2025-12-19
- **Change**: Added `/echo-gallery` to bypass list (line 187)
- **Line added**: `pathname.startsWith('/echo-gallery') ||`
- **To remove**: Delete line 187 containing `/echo-gallery`

## Rollback Checklist

1. Delete `web/app/echo-gallery/page.tsx`
2. Remove line 187 from `web/middleware.ts` (the `/echo-gallery` bypass)
3. Run the rollback SQL from `MIGRATIONS.md` to drop database tables
4. Delete images from Supabase storage (`public-assets/echo-quirky/`)

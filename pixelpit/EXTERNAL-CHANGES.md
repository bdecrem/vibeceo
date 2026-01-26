# External Changes - Pixelpit

All changes made outside the `pixelpit/` folder for the Pixelpit Game Studio.

## Files Modified Outside pixelpit/

### web/middleware.ts
- **Modified**: 2025-01-24
- **Change**: Added `/pixelpit` to bypass list (line ~485)
- **To remove**: Delete the line `pathname.startsWith('/pixelpit') ||`

### web/app/pixelpit/
- **Created**: 2025-01-24
- **Purpose**: Web pages for Pixelpit Game Studio
- **To remove**: Delete the entire `web/app/pixelpit/` directory

## Database Changes

### pixelpit_state table (Supabase)
- **Created**: 2025-01-24
- **Purpose**: Persistent state for all Pixelpit agents and games
- **To remove**:
```sql
DROP TABLE pixelpit_state;
DROP FUNCTION update_pixelpit_updated_at();
```

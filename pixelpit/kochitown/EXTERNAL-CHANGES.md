# External Changes - Kochitown

All changes made outside the `kochitown/` folder for the Kochitown Game Studio.

## Files Modified Outside kochitown/

### web/middleware.ts
- **Modified**: 2025-01-24
- **Change**: Added `/kochitown` to bypass list (line ~485)
- **To remove**: Delete the line `pathname.startsWith('/kochitown') ||`

### web/app/kochitown/
- **Created**: 2025-01-24
- **Purpose**: Web pages for Kochitown Game Studio
- **To remove**: Delete the entire `web/app/kochitown/` directory

## Database Changes

### kochitown_state table (Supabase)
- **Created**: 2025-01-24
- **Purpose**: Persistent state for all Kochitown agents and games
- **To remove**:
```sql
DROP TABLE kochitown_state;
DROP FUNCTION update_kochitown_updated_at();
```

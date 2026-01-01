# Migrations & External Changes - i1 (Forge)

## Supabase Tables

### ra_users
- **Created**: 2025-12-12
- **Purpose**: RivalAlert user accounts with plan info
- **To remove**: `DROP TABLE ra_users CASCADE;`

### ra_competitors
- **Created**: 2025-12-12
- **Purpose**: Tracked competitors per user
- **To remove**: `DROP TABLE ra_competitors CASCADE;`

### ra_snapshots
- **Created**: 2025-12-12
- **Purpose**: Website snapshots for change detection
- **To remove**: `DROP TABLE ra_snapshots CASCADE;`

### ra_changes
- **Created**: 2025-12-12
- **Purpose**: Detected changes with AI analysis
- **To remove**: `DROP TABLE ra_changes CASCADE;`

## Migration Files

| Version | Name | Date | Status |
|---------|------|------|--------|
| 001 | create_rivalalert_tables | 2025-12-12 | Applied |
| 002 | add_trial_ends_at_to_ra_users | 2025-12-18 | Applied |
| 003 | add_lemonsqueezy_to_ra_users | 2025-12-29 | Ready to apply |

## External Services

### LemonSqueezy Product
- **Status**: Not yet created
- **To create**: Need human to set up $29/mo and $49/mo tiers

## Rollback Command

To completely remove RivalAlert from database:
```sql
DROP TABLE IF EXISTS ra_changes CASCADE;
DROP TABLE IF EXISTS ra_snapshots CASCADE;
DROP TABLE IF EXISTS ra_competitors CASCADE;
DROP TABLE IF EXISTS ra_users CASCADE;
```

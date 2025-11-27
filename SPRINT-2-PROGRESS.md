# Sprint 2: User Defined Sources System - In Progress

## Goal
Allow internal or trusted users to define RSS and JSON API sources, normalize them, and use them inside pipelines.

## Progress

### ✅ Completed

1. **Database Migration Created** - [sms-bot/migrations/009_user_sources.sql](sms-bot/migrations/009_user_sources.sql)
   - `user_sources` table with config and normalization JSONB fields
   - `source_fetch_logs` table for debugging
   - RLS policies for multi-tenant access
   - Helper function `record_source_fetch()`

2. **Zod Schemas Defined** - [packages/shared-types/src/user-sources.ts](packages/shared-types/src/user-sources.ts)
   - `RssSourceConfig` - feed URL and max items
   - `HttpJsonSourceConfig` - URL, method, headers, JSONPath
   - `NormalizationConfig` - field mapping configuration
   - `UserSourceDefinition` - complete database model

### 🚧 In Progress

3. **Implement Source Fetchers** (Next)
   - RSS fetcher using `rss-parser`
   - HTTP JSON fetcher with JSONPath extraction
   - Normalization helper to map fields to `NormalizedItem`

### ⏳ Pending

4. Integrate user sources into runtime
5. Build internal UI to register sources
6. Add normalization mapping UI
7. Test user source with agent

## Next Steps

1. Install required packages:
   ```bash
   npm install rss-parser jsonpath-plus
   ```

2. Create source fetchers in `sms-bot/src/agents/sources/`

3. Integrate into runtime to support `user_source_ref` in `DataSourceConfig`

## Files Created

- `sms-bot/migrations/009_user_sources.sql` - Database schema
- `packages/shared-types/src/user-sources.ts` - TypeScript schemas

## Architecture Notes

- User sources are stored as JSONB for flexibility
- Normalization config uses JSONPath expressions for field mapping
- All sources convert to `NormalizedItem` for consistent pipeline processing
- Visibility levels: private (default), shared (team), public (marketplace)

---

**Status**: 2/7 tasks complete
**Next**: Implement source fetchers

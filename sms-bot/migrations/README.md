# Kochi Intelligence Platform - Database Migrations

## How to Run Migrations

### Option 1: Supabase Dashboard (Recommended for Sprint 1)

1. Go to your Supabase project dashboard:
   https://app.supabase.com/project/tqniseocczttrfwtpbdr

2. Navigate to **SQL Editor** in the left sidebar

3. Click **New Query**

4. Copy the contents of the migration file you want to run
   (e.g., `migrations/008_kochi_intelligence_agents.sql`)

5. Paste into the SQL editor

6. Click **Run** or press `Cmd/Ctrl + Enter`

7. Verify the tables were created by checking the **Table Editor**

### Option 2: Supabase CLI (For automation)

```bash
# Install Supabase CLI if you haven't
npm install -g supabase

# Link to your project
supabase link --project-ref tqniseocczttrfwtpbdr

# Run migration
supabase db push
```

### Option 3: Direct PostgreSQL Connection

If you have the database password (different from service key):

```bash
psql "postgresql://postgres:[PASSWORD]@db.tqniseocczttrfwtpbdr.supabase.co:5432/postgres" -f migrations/008_kochi_intelligence_agents.sql
```

## Migration Files

| File | Description | Status |
|------|-------------|--------|
| `008_kochi_intelligence_agents.sql` | Core agents, versions, runs, subscriptions tables | ✅ Ready |

## Next Migrations

Sprint 2 will add:
- `009_user_sources.sql` - User-defined data sources

Sprint 3+ will add:
- Sprint events and judging tables
- Additional agent metadata tables

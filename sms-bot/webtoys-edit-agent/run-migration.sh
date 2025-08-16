#!/bin/bash

# Webtoys Edit Agent Database Migration Runner
# Make sure SUPABASE_DB_URL is set in your environment

if [ -z "$SUPABASE_DB_URL" ]; then
    echo "❌ Error: SUPABASE_DB_URL environment variable not set"
    echo "Set it in your .env file or export it:"
    echo "export SUPABASE_DB_URL='postgresql://...'"
    exit 1
fi

echo "🎨 Running Webtoys Edit Agent Database Migration..."
echo "📡 Connecting to: $(echo $SUPABASE_DB_URL | sed 's/:.*/:*****@.../')"

# Run the migration
psql "$SUPABASE_DB_URL" -f database-migration-v4.sql

if [ $? -eq 0 ]; then
    echo "✅ Migration completed successfully!"
    echo ""
    echo "🎯 Next steps:"
    echo "1. Implement --revise command in controller.ts"
    echo "2. Test with a simple edit request"
else
    echo "❌ Migration failed. Check the output above for errors."
    exit 1
fi
#!/usr/bin/env npx tsx --env-file=.env.local
// sms-bot/scripts/supabase-query.ts
// Execute read-only SQL queries against Supabase for amber-daemon

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error(JSON.stringify({ error: 'Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY' }));
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  const query = process.argv[2];

  if (!query) {
    console.error(JSON.stringify({ error: 'Usage: supabase-query.ts "SELECT ..."' }));
    process.exit(1);
  }

  // Safety: only allow SELECT
  if (!query.trim().toLowerCase().startsWith('select')) {
    console.error(JSON.stringify({ error: 'Only SELECT queries allowed' }));
    process.exit(1);
  }

  try {
    const { data, error } = await supabase.rpc('exec_sql', { query });

    if (error) {
      // If exec_sql doesn't exist, try direct table query for common cases
      if (error.message.includes('exec_sql')) {
        // Fallback: parse simple queries against amber_state
        const match = query.match(/from\s+amber_state/i);
        if (match) {
          // Simple query against amber_state
          const typeMatch = query.match(/type\s*=\s*'([^']+)'/i);
          const limitMatch = query.match(/limit\s+(\d+)/i);

          let queryBuilder = supabase.from('amber_state').select('*');

          if (typeMatch) {
            queryBuilder = queryBuilder.eq('type', typeMatch[1]);
          }

          queryBuilder = queryBuilder.order('created_at', { ascending: false });

          if (limitMatch) {
            queryBuilder = queryBuilder.limit(parseInt(limitMatch[1]));
          } else {
            queryBuilder = queryBuilder.limit(10);
          }

          const { data: rows, error: queryError } = await queryBuilder;

          if (queryError) {
            console.error(JSON.stringify({ error: queryError.message }));
            process.exit(1);
          }

          console.log(JSON.stringify(rows, null, 2));
          return;
        }
      }

      console.error(JSON.stringify({ error: error.message }));
      process.exit(1);
    }

    console.log(JSON.stringify(data, null, 2));
  } catch (err: any) {
    console.error(JSON.stringify({ error: err.message }));
    process.exit(1);
  }
}

main();

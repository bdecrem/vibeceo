/**
 * Database Output Handler
 * Insert items into PostgreSQL database
 */

import type { NormalizedItem, AgentMetadata, OutputConfig } from '@vibeceo/shared-types';

/**
 * Insert items into database table
 */
export async function insertToDatabase(
  items: NormalizedItem[],
  config: OutputConfig['database'],
  agentMetadata: AgentMetadata
): Promise<boolean> {
  if (!config || !config.enabled) {
    console.log('   Database output is disabled');
    return false;
  }

  console.log(`💾 Inserting ${items.length} item(s) to database table: ${config.table}...`);

  if (!config.connectionString) {
    console.log('   ⚠️  Missing database connection string');
    return false;
  }

  try {
    // Import pg library
    const { Client } = await import('pg');

    // Connect to database
    const client = new Client({
      connectionString: config.connectionString,
      ssl: config.connectionString.includes('sslmode=require') ? { rejectUnauthorized: false } : undefined,
    });

    await client.connect();

    try {
      // Prepare batch insert
      const fieldMapping = config.fieldMapping || {
        title: 'title',
        summary: 'summary',
        url: 'url',
        author: 'author',
        published_at: 'publishedAt',
        score: 'score',
        agent_name: 'agentName',
        created_at: 'createdAt',
      };

      // Get column names and placeholders
      const columns = Object.keys(fieldMapping);
      const placeholders: string[] = [];
      const values: any[] = [];

      let paramIndex = 1;
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        const rowPlaceholders: string[] = [];

        for (const [dbColumn, itemField] of Object.entries(fieldMapping)) {
          rowPlaceholders.push(`$${paramIndex++}`);

          // Map field value
          if (itemField === 'agentName') {
            values.push(agentMetadata.name);
          } else if (itemField === 'createdAt') {
            values.push(new Date().toISOString());
          } else {
            values.push((item as any)[itemField] || null);
          }
        }

        placeholders.push(`(${rowPlaceholders.join(', ')})`);
      }

      // Build and execute INSERT query
      const query = `
        INSERT INTO ${config.table} (${columns.join(', ')})
        VALUES ${placeholders.join(', ')}
        ON CONFLICT DO NOTHING
      `;

      const result = await client.query(query, values);

      console.log(`   ✅ Inserted ${result.rowCount} row(s) to database`);
      return true;

    } finally {
      await client.end();
    }

  } catch (error: any) {
    console.error(`   ❌ Database insert failed: ${error.message}`);
    return false;
  }
}

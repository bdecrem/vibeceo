#!/usr/bin/env node
/**
 * Neo4j Database Query Utility
 *
 * Usage:
 *   node neo4j-query.js                    # Show database overview
 *   node neo4j-query.js "MATCH (n:Paper) WHERE n.title CONTAINS 'AI' RETURN n LIMIT 5"
 *
 * Environment variables required:
 *   NEO4J_URI, NEO4J_USERNAME, NEO4J_PASSWORD, NEO4J_DATABASE
 */

const neo4j = require('neo4j-driver');

const driver = neo4j.driver(
  process.env.NEO4J_URI,
  neo4j.auth.basic(process.env.NEO4J_USERNAME, process.env.NEO4J_PASSWORD)
);

async function runCustomQuery(cypherQuery) {
  const session = driver.session({ database: process.env.NEO4J_DATABASE });

  try {
    console.log(`\n=== Running Query ===`);
    console.log(cypherQuery);
    console.log('\n=== Results ===');

    const result = await session.run(cypherQuery);

    result.records.forEach((record, idx) => {
      console.log(`\n--- Record ${idx + 1} ---`);
      record.keys.forEach(key => {
        const value = record.get(key);
        if (value && typeof value === 'object' && value.properties) {
          // Neo4j node
          console.log(`${key}:`, JSON.stringify(value.properties, null, 2));
        } else if (value && typeof value === 'object' && value.low !== undefined) {
          // Neo4j integer
          console.log(`${key}:`, value.toNumber ? value.toNumber() : value.low);
        } else {
          console.log(`${key}:`, value);
        }
      });
    });

    console.log(`\n=== Total: ${result.records.length} records ===\n`);

  } finally {
    await session.close();
  }
}

async function showOverview() {
  const session = driver.session({ database: process.env.NEO4J_DATABASE });

  try {
    // Get all node labels
    console.log('\n=== NODE LABELS ===');
    const labelsResult = await session.run('CALL db.labels()');
    labelsResult.records.forEach(record => {
      console.log(`- ${record.get(0)}`);
    });

    // Get all relationship types
    console.log('\n=== RELATIONSHIP TYPES ===');
    const relsResult = await session.run('CALL db.relationshipTypes()');
    relsResult.records.forEach(record => {
      console.log(`- ${record.get(0)}`);
    });

    // Get counts for each label
    console.log('\n=== NODE COUNTS ===');
    const labels = labelsResult.records.map(r => r.get(0));
    for (const label of labels) {
      const countResult = await session.run(`MATCH (n:\`${label}\`) RETURN count(n) as count`);
      const count = countResult.records[0].get('count');
      console.log(`${label}: ${count.toNumber ? count.toNumber() : count}`);
    }

    // Sample some nodes
    console.log('\n=== SAMPLE NODES ===');
    for (const label of labels.slice(0, 3)) {
      console.log(`\n--- ${label} (first 3) ---`);
      const sampleResult = await session.run(`MATCH (n:\`${label}\`) RETURN n LIMIT 3`);
      sampleResult.records.forEach((record, idx) => {
        console.log(`\n${label} #${idx + 1}:`);
        console.log(JSON.stringify(record.get('n').properties, null, 2));
      });
    }

    // Show some relationships
    console.log('\n=== SAMPLE RELATIONSHIPS ===');
    const relTypes = relsResult.records.map(r => r.get(0));
    for (const relType of relTypes.slice(0, 2)) {
      console.log(`\n--- ${relType} (first 3) ---`);
      const relQuery = `MATCH (a)-[r:\`${relType}\`]->(b) RETURN a, r, b LIMIT 3`;
      const relResult = await session.run(relQuery);
      relResult.records.forEach((record, idx) => {
        const source = record.get('a');
        const target = record.get('b');
        console.log(`\n${relType} #${idx + 1}:`);
        console.log(`  From: ${source.labels[0]} - ${JSON.stringify(source.properties).substring(0, 100)}...`);
        console.log(`  To: ${target.labels[0]} - ${JSON.stringify(target.properties).substring(0, 100)}...`);
      });
    }

  } finally {
    await session.close();
  }
}

async function analyzeAuthorProductivity() {
  const session = driver.session({ database: process.env.NEO4J_DATABASE });

  try {
    console.log('\n=== AUTHOR PRODUCTIVITY ANALYSIS ===\n');
    console.log('Analyzing papers published Oct 21-24, 2025\n');

    // Count papers from recent batch (Oct 21-24)
    const batchQuery = `
      MATCH (p:Paper)
      WHERE p.published_date.year = 2025
        AND p.published_date.month = 10
        AND p.published_date.day >= 21
      RETURN count(p) as batchCount
    `;
    const batchResult = await session.run(batchQuery);
    const batchCount = batchResult.records[0].get('batchCount').toNumber();
    console.log(`Papers in recent batch (Oct 21-24): ${batchCount}`);

    // Find authors with papers in the batch AND earlier papers
    const returningAuthorsQuery = `
      MATCH (a:Author)-[:AUTHORED]->(p:Paper)
      WHERE p.published_date.year = 2025
        AND p.published_date.month = 10
        AND p.published_date.day >= 21
      WITH DISTINCT a
      MATCH (a)-[:AUTHORED]->(older:Paper)
      WHERE older.published_date.year < 2025
        OR (older.published_date.year = 2025 AND older.published_date.month < 10)
        OR (older.published_date.year = 2025 AND older.published_date.month = 10 AND older.published_date.day < 21)
      RETURN count(DISTINCT a) as returningAuthors
    `;
    const returningResult = await session.run(returningAuthorsQuery);
    const returningAuthors = returningResult.records[0].get('returningAuthors').toNumber();

    // Get total unique authors in batch
    const batchAuthorsQuery = `
      MATCH (a:Author)-[:AUTHORED]->(p:Paper)
      WHERE p.published_date.year = 2025
        AND p.published_date.month = 10
        AND p.published_date.day >= 21
      RETURN count(DISTINCT a) as batchAuthors
    `;
    const batchAuthorsResult = await session.run(batchAuthorsQuery);
    const totalBatchAuthors = batchAuthorsResult.records[0].get('batchAuthors').toNumber();

    console.log(`\nAuthors in recent batch: ${totalBatchAuthors}`);
    console.log(`Authors with prior papers (before Oct 21): ${returningAuthors} (${((returningAuthors/totalBatchAuthors)*100).toFixed(1)}%)`);

    // Get distribution of author paper counts (2, 3, 4+ papers)
    console.log('\n=== AUTHOR PAPER COUNTS (ALL TIME) ===\n');

    const distributionQuery = `
      MATCH (a:Author)-[:AUTHORED]->(p:Paper)
      WITH a, count(p) as paperCount
      WHERE paperCount >= 2
      RETURN
        CASE
          WHEN paperCount = 2 THEN '2 papers'
          WHEN paperCount = 3 THEN '3 papers'
          WHEN paperCount >= 4 THEN '4+ papers'
        END as category,
        count(a) as authorCount,
        paperCount
      ORDER BY paperCount
    `;

    const distResult = await session.run(distributionQuery);

    let count2 = 0, count3 = 0, count4plus = 0;

    distResult.records.forEach(record => {
      const paperCount = record.get('paperCount').toNumber();
      const authorCount = record.get('authorCount').toNumber();

      if (paperCount === 2) count2 += authorCount;
      else if (paperCount === 3) count3 += authorCount;
      else if (paperCount >= 4) count4plus += authorCount;
    });

    console.log(`Authors with exactly 2 papers: ${count2}`);
    console.log(`Authors with exactly 3 papers: ${count3}`);
    console.log(`Authors with 4 or more papers: ${count4plus}`);

    // Show top 10 most prolific authors
    console.log('\n=== TOP 10 MOST PROLIFIC AUTHORS ===\n');
    const topAuthorsQuery = `
      MATCH (a:Author)-[:AUTHORED]->(p:Paper)
      WITH a, count(p) as paperCount
      ORDER BY paperCount DESC
      LIMIT 10
      RETURN a.name as author, paperCount
    `;

    const topResult = await session.run(topAuthorsQuery);
    topResult.records.forEach((record, idx) => {
      const name = record.get('author');
      const count = record.get('paperCount').toNumber();
      console.log(`${idx + 1}. ${name}: ${count} papers`);
    });

  } finally {
    await session.close();
  }
}

async function main() {
  try {
    // Check required env vars
    if (!process.env.NEO4J_URI || !process.env.NEO4J_USERNAME || !process.env.NEO4J_PASSWORD) {
      console.error('❌ Missing required environment variables:');
      console.error('   NEO4J_URI, NEO4J_USERNAME, NEO4J_PASSWORD, NEO4J_DATABASE');
      process.exit(1);
    }

    const customQuery = process.argv[2];

    if (customQuery === '--author-analysis') {
      await analyzeAuthorProductivity();
    } else if (customQuery) {
      await runCustomQuery(customQuery);
    } else {
      await showOverview();
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    throw error;
  } finally {
    await driver.close();
  }
}

main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});

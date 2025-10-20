#!/usr/bin/env node
/**
 * Test database queries to verify data was stored
 */

import { config } from 'dotenv';
import { resolve } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment BEFORE importing database module
const envPath = resolve(__dirname, '../../.env.local');
config({ path: envPath });

// Verify environment is loaded
if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY) {
  console.error('❌ Environment variables not loaded!');
  console.error(`SUPABASE_URL: ${process.env.SUPABASE_URL ? 'SET' : 'MISSING'}`);
  console.error(`SUPABASE_SERVICE_KEY: ${process.env.SUPABASE_SERVICE_KEY ? 'SET' : 'MISSING'}`);
  process.exit(1);
}

// Now import database module (it will use the env vars)
const dbModule = await import('../../dist/agents/arxiv-research/database.js');
const db = dbModule;

async function runTests() {
  console.log('🔍 Testing database queries...\n');

  try {
    // Test 1: Get latest report
    console.log('1. Latest Report:');
    const latest = await db.getLatestDailyReport();
    if (latest) {
      console.log(`   Date: ${latest.report_date}`);
      console.log(`   Total Papers: ${latest.total_papers_fetched}`);
      console.log(`   Featured: ${latest.featured_papers_count}`);
      console.log(`   Notable Authors: ${latest.notable_authors_count}`);
    }

    // Test 2: Top authors
    console.log('\n2. Top 10 Authors by Notability:');
    const topAuthors = await db.getTopAuthors(10);
    topAuthors.forEach((author, i) => {
      console.log(`   ${i + 1}. ${author.name}`);
      console.log(`      Score: ${author.notability_score} | Papers: ${author.paper_count} | Featured: ${author.featured_paper_count}`);
    });

    // Test 3: Search an author
    console.log('\n3. Search for an author (first from top 10):');
    if (topAuthors.length > 0) {
      const searchResults = await db.searchAuthorsByName(topAuthors[0].name.split(' ')[0]);
      console.log(`   Found ${searchResults.length} matches for "${topAuthors[0].name.split(' ')[0]}"`);
      searchResults.slice(0, 3).forEach(author => {
        console.log(`   - ${author.name} (Score: ${author.notability_score})`);
      });
    }

    // Test 4: Get papers by an author
    console.log('\n4. Papers by top author:');
    if (topAuthors.length > 0) {
      const papers = await db.getPapersByAuthor(topAuthors[0].id);
      console.log(`   ${topAuthors[0].name} has ${papers.length} papers`);
      papers.slice(0, 3).forEach(paper => {
        const featured = paper.featured_in_report ? ' ⭐' : '';
        console.log(`   - ${paper.title.slice(0, 60)}...${featured}`);
      });
    }

    console.log('\n✅ All database queries working!');

  } catch (error) {
    console.error('❌ Database test failed:', error);
    process.exit(1);
  }
}

runTests();

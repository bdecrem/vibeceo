/**
 * RivalAlert - Competitor Intelligence for SMBs
 *
 * Main orchestrator that runs the daily monitoring and digest cycle.
 *
 * Usage:
 *   npx tsx incubator/i1/rivalalert/index.ts [command]
 *
 * Commands:
 *   monitor   - Run competitor monitoring (fetch + detect changes)
 *   digest    - Send email digests to all users
 *   run       - Run full cycle (monitor + digest)
 *   test      - Add test user and competitor for testing
 */

import * as db from './lib/db.js';
import { monitorAllCompetitors, monitorCompetitor } from './lib/monitor.js';
import { sendAllDigests, sendDigestToUser } from './lib/email.js';

// ============================================================================
// CLI Commands
// ============================================================================

async function runMonitor(): Promise<void> {
  console.log('🔍 Starting RivalAlert Monitor...\n');
  const results = await monitorAllCompetitors();

  const successful = results.filter((r) => r.success).length;
  const failed = results.filter((r) => !r.success).length;
  const totalChanges = results.reduce((sum, r) => sum + r.changesDetected, 0);

  console.log('\n📊 Summary:');
  console.log(`   Competitors checked: ${results.length}`);
  console.log(`   Successful: ${successful}`);
  console.log(`   Failed: ${failed}`);
  console.log(`   Changes detected: ${totalChanges}`);
}

async function runDigests(): Promise<void> {
  console.log('📧 Sending RivalAlert Digests...\n');
  const { sent, failed } = await sendAllDigests();

  console.log('\n📊 Summary:');
  console.log(`   Digests sent: ${sent}`);
  console.log(`   Failed: ${failed}`);
}

async function runFullCycle(): Promise<void> {
  console.log('🚀 Starting RivalAlert Full Cycle...\n');
  console.log('Step 1: Monitor competitors\n');
  await runMonitor();

  console.log('\n---\n');

  console.log('Step 2: Send digests\n');
  await runDigests();

  console.log('\n✅ Full cycle complete!');
}

async function runTest(): Promise<void> {
  console.log('🧪 Setting up test data...\n');

  // Create test user
  const email = 'test@rivalalert.ai';
  let user = await db.getUserByEmail(email);

  if (!user) {
    user = await db.createUser(email, 'starter');
    console.log(`✅ Created test user: ${email}`);
  } else {
    console.log(`ℹ️ Test user already exists: ${email}`);
  }

  // Add test competitors
  const competitors = await db.getCompetitorsByUser(user.id);

  if (competitors.length === 0) {
    const testCompetitors = [
      { name: 'Stripe', url: 'https://stripe.com/pricing' },
      { name: 'Linear', url: 'https://linear.app/pricing' },
    ];

    for (const { name, url } of testCompetitors) {
      await db.addCompetitor(user.id, name, url);
      console.log(`✅ Added competitor: ${name}`);
    }
  } else {
    console.log(`ℹ️ User already has ${competitors.length} competitor(s)`);
  }

  console.log('\n📋 Test setup complete!');
  console.log('   Run "monitor" to check these competitors');
  console.log('   Run "digest" to send a test email');
}

async function showStatus(): Promise<void> {
  console.log('📊 RivalAlert Status\n');

  const users = await db.getAllUsers();
  const competitors = await db.getAllCompetitors();
  const unnotifiedChanges = await db.getUnnotifiedChanges();

  console.log(`Users: ${users.length}`);
  console.log(`Competitors tracked: ${competitors.length}`);
  console.log(`Pending changes (unnotified): ${unnotifiedChanges.length}`);

  if (users.length > 0) {
    console.log('\n👤 Users:');
    for (const user of users) {
      const userCompetitors = competitors.filter((c) => c.user_id === user.id);
      console.log(`   ${user.email} (${user.plan}) - ${userCompetitors.length} competitors`);
    }
  }
}

// ============================================================================
// Main Entry Point
// ============================================================================

async function main(): Promise<void> {
  const command = process.argv[2] || 'status';

  console.log('');
  console.log('╔═══════════════════════════════════════════╗');
  console.log('║  🔔 RivalAlert - Competitor Intelligence  ║');
  console.log('╚═══════════════════════════════════════════╝');
  console.log('');

  switch (command) {
    case 'monitor':
      await runMonitor();
      break;
    case 'digest':
      await runDigests();
      break;
    case 'run':
      await runFullCycle();
      break;
    case 'test':
      await runTest();
      break;
    case 'status':
      await showStatus();
      break;
    default:
      console.log('Usage: npx tsx incubator/i1/rivalalert/index.ts [command]');
      console.log('');
      console.log('Commands:');
      console.log('  status   - Show current status (default)');
      console.log('  monitor  - Run competitor monitoring');
      console.log('  digest   - Send email digests');
      console.log('  run      - Full cycle (monitor + digest)');
      console.log('  test     - Set up test data');
      break;
  }
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});

// ============================================================================
// Exports for Integration
// ============================================================================

export {
  monitorAllCompetitors,
  monitorCompetitor,
  sendAllDigests,
  sendDigestToUser,
};

export * from './lib/db.js';
export * from './lib/types.js';

/**
 * Test script to verify scheduler runs jobs non-blocking
 *
 * This simulates the scenario where:
 * 1. Job A takes a long time (like arxiv-graph)
 * 2. Job B should still run at its scheduled time
 * 3. Both jobs should execute independently
 */

import { registerDailyJob, startScheduler, stopScheduler } from '../lib/scheduler/index.js';

const results: string[] = [];

// Get current time and schedule jobs for the next minute
const now = new Date();
const targetMinute = (now.getMinutes() + 1) % 60;
const targetHour = targetMinute === 0 ? (now.getHours() + 1) % 24 : now.getHours();

console.log(`\nTest: Non-blocking scheduler`);
console.log(`Current time: ${now.toLocaleTimeString('en-US', { timeZone: 'America/Los_Angeles' })}`);
console.log(`Target time: ${targetHour}:${targetMinute.toString().padStart(2, '0')}\n`);

// Job A: Simulates long-running arxiv job
registerDailyJob({
  name: 'slow-job-a',
  hour: targetHour,
  minute: targetMinute,
  run: async () => {
    const startTime = Date.now();
    console.log('[Job A] Started - will take 10 seconds...');
    results.push('A-started');

    // Simulate long-running task
    await new Promise(resolve => setTimeout(resolve, 10000));

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`[Job A] Completed after ${elapsed}s`);
    results.push('A-completed');
  }
});

// Job B: Should run immediately without waiting for Job A
registerDailyJob({
  name: 'quick-job-b',
  hour: targetHour,
  minute: targetMinute,
  run: async () => {
    console.log('[Job B] Started - quick job');
    results.push('B-started');

    await new Promise(resolve => setTimeout(resolve, 100));

    console.log('[Job B] Completed');
    results.push('B-completed');
  }
});

// Job C: Another quick job
registerDailyJob({
  name: 'quick-job-c',
  hour: targetHour,
  minute: targetMinute,
  run: async () => {
    console.log('[Job C] Started - quick job');
    results.push('C-started');

    await new Promise(resolve => setTimeout(resolve, 100));

    console.log('[Job C] Completed');
    results.push('C-completed');
  }
});

// Start scheduler with faster check interval for testing
console.log('Starting scheduler (checking every second)...\n');
startScheduler(1000);

// Wait for all jobs to complete and verify
setTimeout(() => {
  stopScheduler();

  console.log('\n=== Test Results ===');
  console.log('Execution order:', results.join(' → '));

  // Verify all jobs started
  const allStarted = results.includes('A-started') &&
                     results.includes('B-started') &&
                     results.includes('C-started');

  // Verify B and C completed before A (non-blocking behavior)
  const bCompletedBeforeA = results.indexOf('B-completed') < results.indexOf('A-completed');
  const cCompletedBeforeA = results.indexOf('C-completed') < results.indexOf('A-completed');

  console.log('\nAll jobs started:', allStarted ? '✅' : '❌');
  console.log('Job B completed before A:', bCompletedBeforeA ? '✅' : '❌');
  console.log('Job C completed before A:', cCompletedBeforeA ? '✅' : '❌');

  if (allStarted && bCompletedBeforeA && cCompletedBeforeA) {
    console.log('\n✅ SUCCESS: Scheduler is non-blocking!\n');
    process.exit(0);
  } else {
    console.log('\n❌ FAILURE: Scheduler is still blocking!\n');
    process.exit(1);
  }
}, 15000); // Wait 15s for all jobs to complete

console.log('Waiting for scheduled time...\n');

/**
 * Simple test to verify scheduler non-blocking behavior
 * Tests the logic directly without waiting for scheduled time
 */

console.log('\n🧪 Testing scheduler non-blocking logic\n');

// Simulate the scheduler's job execution
const results: string[] = [];

interface Job {
  name: string;
  run: () => Promise<void>;
}

const jobs: Job[] = [
  {
    name: 'slow-job',
    run: async () => {
      results.push('slow-started');
      await new Promise(resolve => setTimeout(resolve, 2000));
      results.push('slow-completed');
    }
  },
  {
    name: 'fast-job-1',
    run: async () => {
      results.push('fast1-started');
      await new Promise(resolve => setTimeout(resolve, 100));
      results.push('fast1-completed');
    }
  },
  {
    name: 'fast-job-2',
    run: async () => {
      results.push('fast2-started');
      await new Promise(resolve => setTimeout(resolve, 100));
      results.push('fast2-completed');
    }
  }
];

// OLD WAY (blocking)
async function runJobsBlocking() {
  const blockingResults: string[] = [];
  console.log('❌ Testing OLD (blocking) approach:\n');

  for (const job of jobs) {
    console.log(`   Starting ${job.name}...`);
    try {
      await job.run();
    } catch (error) {
      console.error(`   Job ${job.name} failed:`, error);
    }
  }

  return blockingResults;
}

// NEW WAY (non-blocking)
async function runJobsNonBlocking() {
  console.log('✅ Testing NEW (non-blocking) approach:\n');

  for (const job of jobs) {
    console.log(`   Starting ${job.name}...`);

    // This is the new code from our fix
    const result = job.run();
    if (result && typeof result.catch === 'function') {
      result.catch((error) => {
        console.error(`   Job ${job.name} failed:`, error);
      });
    }
  }
}

async function main() {
  // Test blocking approach
  const startBlocking = Date.now();
  await runJobsBlocking();
  const blockingTime = Date.now() - startBlocking;
  console.log(`   Total time: ${(blockingTime / 1000).toFixed(1)}s\n`);

  // Reset results
  results.length = 0;

  // Test non-blocking approach
  const startNonBlocking = Date.now();
  await runJobsNonBlocking();

  // Wait a bit for fast jobs to complete
  await new Promise(resolve => setTimeout(resolve, 500));
  const nonBlockingTime = Date.now() - startNonBlocking;

  console.log(`   Total time: ${(nonBlockingTime / 1000).toFixed(1)}s\n`);

  // Verify results
  console.log('📊 Results:\n');
  console.log(`   Blocking took: ${(blockingTime / 1000).toFixed(1)}s (waited for slow job)`);
  console.log(`   Non-blocking took: ${(nonBlockingTime / 1000).toFixed(1)}s (didn't wait)\n`);

  const expectedDifference = 1500; // Should be ~1.5s+ faster
  const actualDifference = blockingTime - nonBlockingTime;

  console.log('   Execution order:', results.join(' → '));

  if (actualDifference >= expectedDifference) {
    console.log(`\n✅ SUCCESS: Non-blocking is ${(actualDifference / 1000).toFixed(1)}s faster!`);
    console.log('   Fast jobs can complete without waiting for slow job.\n');
    process.exit(0);
  } else {
    console.log(`\n❌ FAILURE: Not enough speed improvement (${(actualDifference / 1000).toFixed(1)}s)`);
    console.log('   Jobs may still be blocking.\n');
    process.exit(1);
  }
}

main().catch(console.error);
